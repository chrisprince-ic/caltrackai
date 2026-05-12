import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { HealthConnectTile } from '@/components/home/HealthConnectTile';
import {
  SemiTripleEnergyGauge,
  type SemiTripleGaugeColors,
} from '@/components/home/energy/SemiTripleEnergyGauge';
import { SegmentedPill } from '@/components/ui/SegmentedPill';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useNutritionLog } from '@/contexts/NutritionLogContext';
import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import { useCalories } from '@/hooks/useCalories';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  activityEatBackFactor,
  computeAdjustedDailyTarget,
  goalDirectionLabel,
} from '@/lib/daily-energy';
import { saveUserNutritionPlan } from '@/lib/nutrition-plan-sync';
import type { WeightGoalDirection } from '@/types/nutrition-plan-persisted';

const WEIGHT_GOAL_SEGMENTS = [
  { id: 'lose' as const, label: 'Lose' },
  { id: 'maintain' as const, label: 'Maintain' },
  { id: 'gain' as const, label: 'Gain' },
];

type BadgeKind = 'ok' | 'warn' | 'over' | 'mute';

function formatRelativeUpdated(atMs: number): string {
  const s = Math.floor((Date.now() - atMs) / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return new Date(atMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function healthAdjustsDailyTarget(hk: ReturnType<typeof useCalories>): boolean {
  if (!hk.platformSupported || hk.needsAuthCTA) return false;
  const s = hk.healthKitStatus;
  if (s === 'unavailable' || s === 'denied') return false;
  return true;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function tripleGaugeVisualHeight(width: number) {
  const baseLineY = Math.round(width * 0.362);
  return Math.ceil(baseLineY + width * 0.084);
}

function bendMacroTowardHit(g: number, t: number) {
  if (t <= 0) return 1;
  const r = g / t;
  return clamp01(r > 1 ? Math.max(0, 2 - r) : r);
}

function energySubtitle(opts: {
  adjustedTarget: number;
  overPortion: boolean;
  pctLogged: number;
  midFrac: number;
  innerFrac: number;
}) {
  const { adjustedTarget, overPortion, pctLogged, midFrac, innerFrac } = opts;
  if (adjustedTarget <= 0) return `Set calorie & macro targets to personalize this ribbon.`;
  if (overPortion) return `A little elevated — hydrate and lighten the next picks.`;
  if (pctLogged >= 86 && pctLogged <= 114 && midFrac >= 0.72 && innerFrac >= 0.72)
    return `Sitting in the sweet spot.`;
  if (pctLogged < 76) return `Room ahead of you — steady fuel builds momentum.`;
  if (pctLogged > 112) return `Running fuller today — lean toward protein-leading plates.`;
  return `Balanced glide — macros are pacing well.`;
}

function energyBadge(opts: {
  adjustedTarget: number;
  overPortion: boolean;
  pctLogged: number;
}): { label: string; tone: BadgeKind } {
  const { adjustedTarget, overPortion, pctLogged } = opts;
  if (adjustedTarget <= 0) return { label: 'Configure', tone: 'mute' };
  if (overPortion) return { label: 'Over', tone: 'over' };
  if (pctLogged < 78) return { label: 'Fuel up', tone: 'warn' };
  if (pctLogged > 108) return { label: 'Ease back', tone: 'warn' };
  return { label: 'On track', tone: 'ok' };
}

export function DailyEnergyCard() {
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { totals } = useNutritionLog();
  const {
    dailyCalories: baseGoal,
    weightGoal,
    plan,
    proteinG,
    carbsG,
    fatG,
    refresh: refreshNutritionTargets,
  } = useNutritionTargets();
  const hk = useCalories({ initialWeightGoal: weightGoal });

  const eaten = Math.round(Math.max(0, totals.calories));
  const base = Math.round(Math.max(0, baseGoal));

  const active = Math.round(Math.max(0, hk.activeKcal));
  const resting = Math.round(Math.max(0, hk.basalKcal));

  const { target: adjustedTarget, add: activityAdd } = resolveAdjustedTarget(
    base,
    active,
    weightGoal,
    hk
  );

  const burnLoading =
    hk.platformSupported &&
    !hk.needsAuthCTA &&
    (hk.refreshing || (hk.loading && !hk.fetchedOnce));

  const remaining = adjustedTarget - eaten;
  const pctLogged =
    adjustedTarget > 0 ? Math.min(100, Math.round((eaten / Math.max(1, adjustedTarget)) * 100)) : 0;

  const overPortion = eaten > adjustedTarget && adjustedTarget > 0;

  const goalWord = goalDirectionLabel(weightGoal);

  const muted = colors.textMuted;

  const divider = isDark ? 'rgba(255,255,255,0.08)' : '#F1F1F0';

  const healthDrivesTarget = healthAdjustsDailyTarget(hk);

  const showInsight = active > 0 && hk.healthKitStatus === 'connected';
  const showFormula = healthDrivesTarget;

  const showHealthTile =
    hk.healthKitStatus === 'denied' || hk.healthKitStatus === 'unavailable';

  const [insightOpen, setInsightOpen] = useState(false);
  const [statTip, setStatTip] = useState<'burned' | 'deficit' | 'score' | null>(null);

  const ink = colors.text;

  const syncFooter =
    hk.healthKitStatus === 'connected' && hk.platformSupported && !hk.needsAuthCTA ? (
      <Text style={[styles.syncLine, { color: muted }]} numberOfLines={3}>
        <Text style={[styles.syncBullet, { color: colors.accent }]}>● </Text>
        <Text>
          Synced · Active {active.toLocaleString()} · Resting {resting.toLocaleString()}
          {hk.lastSyncedAt ? ` · Updated ${formatRelativeUpdated(hk.lastSyncedAt)}` : ''}
        </Text>
      </Text>
    ) : null;

  const handleHealthConnect = useCallback(async () => {
    const granted = await hk.requestAccess();
    return granted;
  }, [hk]);

  const handleWeightGoalChange = useCallback(
    async (g: WeightGoalDirection) => {
      if (!user?.uid || g === weightGoal) return;
      await saveUserNutritionPlan(user.uid, {
        dailyCalories: Math.round(Math.max(0, baseGoal)),
        proteinG,
        carbsG,
        fatG,
        coachNote: plan?.coachNote,
        dietarySummary: plan?.dietarySummary ?? '',
        weightGoal: g,
      });
      await refreshNutritionTargets();
    },
    [
      user?.uid,
      weightGoal,
      baseGoal,
      proteinG,
      carbsG,
      fatG,
      plan?.coachNote,
      plan?.dietarySummary,
      refreshNutritionTargets,
    ]
  );

  const eatBackFactor = activityEatBackFactor(weightGoal);
  const eatBackLabel = eatBackFactor < 1 ? '50%' : '100%';

  const hkConnected =
    hk.healthKitStatus === 'connected' && hk.platformSupported && !hk.needsAuthCTA;

  const screenW = Dimensions.get('window').width;
  const gaugeW = Math.min(332, Math.max(268, screenW - 72));
  const gaugeH = tripleGaugeVisualHeight(gaugeW);
  const digitsBandMaxW = Math.round(gaugeW * 0.56);
  const digitsMaxFontSize = Math.round(gaugeW * 0.102);
  const calorieRatio = adjustedTarget > 0 ? eaten / adjustedTarget : 0;
  const outerGreenArc = calorieRatio >= 1 ? 0.997 : Math.min(calorieRatio, 0.997);
  const orangeOverArc = calorieRatio > 1 ? Math.min(calorieRatio - 1, 0.65) : 0;
  const midFrac = proteinG > 0 ? clamp01(Math.min(totals.proteinGrams / proteinG, 1.06)) : 0;
  const innerFrac = carbsG > 0 ? clamp01(Math.min(totals.carbsGrams / carbsG, 1.06)) : 0;

  const gaugePalette: SemiTripleGaugeColors = {
    track: isDark ? 'rgba(255,255,255,0.13)' : colors.hairline,
    outer: colors.accentDeep,
    outerOverflow: colors.warm,
    middle: colors.accent,
    inner: colors.warm,
  };

  const subtitle = energySubtitle({
    adjustedTarget,
    overPortion,
    pctLogged,
    midFrac,
    innerFrac,
  });
  const { label: badgeLabel, tone: badgeTone } = energyBadge({
    adjustedTarget,
    overPortion,
    pctLogged,
  });

  const calorieBalanceHarmony =
    adjustedTarget <= 0
      ? 0.4
      : clamp01(1 - Math.min(1.1, Math.abs(eaten - adjustedTarget) / Math.max(adjustedTarget, 1)));
  const harmony =
    (bendMacroTowardHit(totals.proteinGrams, proteinG) +
      bendMacroTowardHit(totals.carbsGrams, carbsG) +
      bendMacroTowardHit(totals.fatGrams, fatG)) /
    3;
  let wellnessScore = Math.round(calorieBalanceHarmony * 56 + harmony * 38 + (hkConnected ? 5 : 0));
  if (eaten <= 0) wellnessScore -= 14;
  wellnessScore = Math.min(96, Math.max(52, wellnessScore));

  const burnedPrimary = burnLoading
    ? '…'
    : hkConnected
      ? `${Math.round(active + resting).toLocaleString()} kcal`
      : '—';

  const deficitPrimary =
    adjustedTarget <= 0 ? '—' : overPortion ? `${Math.abs(remaining)} kcal` : `${Math.max(0, remaining)} kcal`;
  const deficitSub =
    adjustedTarget <= 0 ? '' : overPortion ? 'beyond budget' : 'under target';

  let badgeDot = badgeTone === 'ok' ? '#FFFFFF' : colors.warm;
  let badgeFg = badgeTone === 'ok' ? '#FFFFFF' : colors.accentDeep;
  let badgeBg = colors.accent;
  let badgeBorder: string | undefined;
  const padH = badgeTone === 'ok' ? 12 : 10;
  switch (badgeTone) {
    case 'over':
      badgeBg = `${colors.warm}24`;
      badgeFg = colors.warm;
      badgeDot = colors.warm;
      break;
    case 'warn':
      badgeBg = colors.warmSoft;
      badgeFg = colors.accentDeep;
      badgeDot = colors.warm;
      badgeBorder = colors.glassStroke;
      break;
    case 'mute':
      badgeBg = colors.surfaceMuted;
      badgeFg = colors.textMuted;
      badgeDot = colors.textMuted;
      badgeBorder = colors.glassStroke;
      break;
    default:
      break;
  }

  const accessibilityEnergy = `Today's energy ${eaten} of ${adjustedTarget} kilocalories. Triple arcs: calories, protein, carbs.`;

  const cardBg = isDark ? colors.surface : '#FFFFFF';
  const cardBorder = isDark ? colors.border : colors.glassStroke;

  return (
    <View style={styles.wrap}>
      <View style={[styles.cardOuter, { shadowColor: isDark ? '#000' : `${colors.shadow}` }]}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.cardPad}>
            <View
              accessible
              accessibilityRole="summary"
              accessibilityLabel={accessibilityEnergy}
              style={styles.energySheet}>
              <View style={styles.todayHeader}>
                <View style={styles.todayHeaderLeft}>
                  <Text style={[styles.todayKicker, { color: muted }]}>Today's energy</Text>
                  <Text style={[styles.todaySubtitle, { color: muted }]} numberOfLines={2}>
                    {subtitle}
                  </Text>
                </View>
                <View style={styles.todayHeaderActions}>
                  {hk.healthKitStatus === 'connected' && hk.platformSupported ? (
                    <Pressable
                      onPress={() => void hk.refresh()}
                      style={[styles.iconCircle, { backgroundColor: colors.surfaceMuted }]}
                      hitSlop={8}
                      accessibilityLabel="Refresh Apple Health data">
                      {hk.refreshing ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <Ionicons name="refresh" size={17} color={colors.accent} />
                      )}
                    </Pressable>
                  ) : null}
                  <View
                    style={[
                      styles.badgePill,
                      {
                        backgroundColor: badgeBg,
                        paddingHorizontal: padH,
                        borderColor: badgeBorder,
                        borderWidth: badgeBorder ? StyleSheet.hairlineWidth : 0,
                      },
                    ]}>
                    <View style={[styles.badgeDot, { backgroundColor: badgeDot }]} />
                    <Text style={[styles.badgeText, { color: badgeFg }]}>{badgeLabel}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.gaugeWrap, { width: gaugeW, minHeight: gaugeH }]}>
                <SemiTripleEnergyGauge
                  width={gaugeW}
                  outerProgress01={outerGreenArc}
                  outerOverflow01={orangeOverArc}
                  middleProgress01={midFrac}
                  innerProgress01={innerFrac}
                  colors={gaugePalette}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.gaugeLabels,
                    {
                      top: gaugeH - gaugeW * 0.491,
                      width: digitsBandMaxW,
                      left: '50%',
                      marginLeft: Math.round(-digitsBandMaxW / 2),
                    },
                  ]}>
                  <Text style={[styles.gaugeLabelsKicker, { color: muted }]}>Energy</Text>
                  <Text
                    style={[
                      styles.gaugeDigits,
                      { color: ink, fontSize: digitsMaxFontSize, width: '100%', maxWidth: digitsBandMaxW },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.48}
                    maxFontSizeMultiplier={1}
                    selectable={false}>
                    {eaten.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.gaugeAgainst,
                      { color: muted, width: '100%', maxWidth: digitsBandMaxW },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    maxFontSizeMultiplier={1}>
                    of {adjustedTarget.toLocaleString()} kcal
                  </Text>
                </View>
              </View>

              <View style={[styles.metricRowTopRule, { borderTopColor: divider }]} />

              <View style={styles.bottomMetrics}>
                <View style={styles.metricRowThree}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Burned ${burnedPrimary}. active plus bmr`}
                    onPress={() => setStatTip('burned')}
                    style={styles.metricCol}>
                    <Text style={[styles.metricLbl, { color: muted }]}>Burned</Text>
                    <Text style={[styles.metricPrimary, { color: ink }]} numberOfLines={2}>
                      {burnedPrimary}
                    </Text>
                    <Text style={[styles.metricSub, { color: muted }]}>active + bmr</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Deficit: ${deficitPrimary}. ${deficitSub}`}
                    onPress={() => setStatTip('deficit')}
                    style={styles.metricCol}>
                    <Text style={[styles.metricLbl, { color: muted }]}>Deficit</Text>
                    <Text style={[styles.metricPrimary, { color: overPortion ? colors.warm : colors.accentDeep }]}>
                      {deficitPrimary}
                    </Text>
                    <Text style={[styles.metricSub, { color: muted }]}>{deficitSub}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Wellness score ${wellnessScore}`}
                    onPress={() => setStatTip('score')}
                    style={styles.metricCol}>
                    <Text style={[styles.metricLbl, { color: muted }]}>Score</Text>
                    <Text style={[styles.metricPrimary, { color: ink }]}>
                      {wellnessScore}
                    </Text>
                    <Text style={[styles.metricSub, { color: muted }]}>wellness index</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {healthDrivesTarget ? (
              <View
                style={[
                  styles.energySources,
                  {
                    borderColor: colors.glassStroke,
                    backgroundColor: isDark ? colors.surfaceMuted : colors.chipOnLight,
                  },
                ]}>
                <View style={styles.energySourceItem}>
                  <Ionicons name="flash-outline" size={16} color={colors.accent} />
                  <Text style={[styles.energySourceLabel, { color: muted }]}>Active</Text>
                  <Text style={[styles.energySourceVal, { color: ink }]}>
                    {burnLoading ? '…' : active.toLocaleString()}
                    <Text style={[styles.energySourceUnit, { color: muted }]}> kcal</Text>
                  </Text>
                </View>
                <View style={[styles.energySourceDivider, { backgroundColor: divider }]} />
                <View style={styles.energySourceItem}>
                  <Ionicons name="moon-outline" size={16} color={muted} />
                  <Text style={[styles.energySourceLabel, { color: muted }]}>Resting</Text>
                  <Text style={[styles.energySourceVal, { color: ink }]}>
                    {burnLoading ? '…' : resting.toLocaleString()}
                    <Text style={[styles.energySourceUnit, { color: muted }]}> kcal</Text>
                  </Text>
                </View>
                <View style={[styles.energySourceDivider, { backgroundColor: divider }]} />
                <View style={styles.energySourceItem}>
                  <Ionicons name="flag-outline" size={16} color={muted} />
                  <Text style={[styles.energySourceLabel, { color: muted }]}>Base goal</Text>
                  <Text style={[styles.energySourceVal, { color: ink }]}>
                    {base.toLocaleString()}
                    <Text style={[styles.energySourceUnit, { color: muted }]}> kcal</Text>
                  </Text>
                </View>
              </View>
            ) : null}

            {showHealthTile ? (
              <HealthConnectTile
                variant={hk.healthKitStatus === 'denied' ? 'connect' : 'unavailable'}
                onConnect={hk.healthKitStatus === 'denied' ? handleHealthConnect : undefined}
                reducedMotion={reducedMotion}
              />
            ) : null}

            {showInsight ? (
              <Pressable
                onPress={() => setInsightOpen(true)}
                style={({ pressed }) => [
                  styles.insightChip,
                  {
                    backgroundColor: isDark ? `${colors.accent}26` : colors.accentSoft,
                    borderColor: colors.glassStroke,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Learn how activity adjusts your target">
                <Ionicons name="sparkles" size={18} color={colors.accentDeep} />
                <Text style={[styles.insightText, { color: colors.accentDeep }]} numberOfLines={2}>
                  +{activityAdd.toLocaleString()} kcal from today&apos;s activity — how we adjust your target
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.accentDeep} />
              </Pressable>
            ) : null}

            {showFormula ? (
              <View
                style={[
                  styles.formulaStrip,
                  {
                    backgroundColor: isDark ? colors.surfaceMuted : colors.chipOnLight,
                    borderColor: colors.glassStroke,
                  },
                ]}>
                <Text style={[styles.formulaText, { color: muted }]}>
                  Base{' '}
                  <Text style={[styles.formulaNum, { color: ink }]}>{base.toLocaleString()}</Text>
                </Text>
                <Text style={[styles.formulaPlus, { color: muted }]}>+</Text>
                <Text style={[styles.formulaText, { color: muted }]}>
                  Active{' '}
                  <Text style={[styles.formulaNum, { color: colors.warm }]}>{active.toLocaleString()}</Text>
                  <Text style={[styles.formulaTiny, { color: muted }]}> × {eatBackLabel}</Text>
                </Text>
                <Text style={[styles.formulaPlus, { color: muted }]}>=</Text>
                <Text style={[styles.formulaText, { color: muted }]}>
                  Target{' '}
                  <Text style={[styles.formulaNum, { color: colors.accentDeep }]}>
                    {adjustedTarget.toLocaleString()}
                  </Text>
                </Text>
              </View>
            ) : null}

            {hkConnected && user?.uid ? (
              <View style={styles.goalSegmentBlock}>
                <Text style={[styles.goalSegmentCaption, { color: muted }]}>
                  Weight goal · {eatBackLabel} of active calories add to today&apos;s budget
                </Text>
                <SegmentedPill
                  segments={WEIGHT_GOAL_SEGMENTS}
                  value={weightGoal}
                  onChange={handleWeightGoalChange}
                  accent={colors.accent}
                />
              </View>
            ) : (
              <View style={styles.footerRow}>
                <View
                  style={[
                    styles.goalChip,
                    {
                      backgroundColor: isDark ? `${colors.accent}26` : colors.accentSoft,
                      borderColor: colors.glassStroke,
                    },
                  ]}>
                  <Text style={[styles.goalChipText, { color: colors.accentDeep }]}>{goalWord} goal</Text>
                </View>
                {!showHealthTile && syncFooter ? (
                  <>
                    <Text style={[styles.footerSep, { color: muted }]}> · </Text>
                    {syncFooter}
                  </>
                ) : null}
              </View>
            )}

            {hkConnected && user?.uid ? (
              !showHealthTile && syncFooter ? (
                <View style={[styles.footerRow, styles.syncBelowGoal]}>{syncFooter}</View>
              ) : null
            ) : null}

            {hk.error ? <Text style={[styles.err, { color: '#DC2626' }]}>{hk.error}</Text> : null}
          </View>
        </View>
      </View>

      <Modal
        visible={insightOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInsightOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setInsightOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: isDark ? colors.surface : '#FFF' }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: ink }]}>Activity adjustment</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalBody, { color: muted }]}>
                Your profile sets a base calorie target. When Apple Health reports active calories, we add{' '}
                {activityEatBackFactor(weightGoal) < 1 ? 'half of those calories' : 'those calories'} to
                today&apos;s intake target for your {goalWord.toLowerCase()} goal. Resting energy is already in
                your base target, so we never double-count it.
              </Text>
            </ScrollView>
            <Pressable onPress={() => setInsightOpen(false)} style={[styles.modalBtn, { backgroundColor: colors.accent }]}>
              <Text style={styles.modalBtnText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={statTip !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setStatTip(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setStatTip(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: isDark ? colors.surface : '#FFF' }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: ink }]}>
              {statTip === 'burned'
                ? 'Burned energy'
                : statTip === 'deficit'
                  ? 'Budget vs logged'
                  : 'Wellness index'}
            </Text>
            <Text style={[styles.modalBody, { color: muted }]}>
              {statTip === 'burned'
                ? hkConnected
                  ? 'Estimated total burn today: Apple Health active calories plus resting energy (included in many goal calculations). Connect Health on supported devices.'
                  : 'Connect Apple Health to see active calories and resting energy summed here.'
                : statTip === 'deficit'
                  ? healthDrivesTarget
                    ? 'Compared to today’s adjusted intake target from your base budget plus eligible activity calories, this is calories still available or overrun.'
                    : 'Calories still available versus your fixed daily calorie target—or how far past it you’ve gone.'
                  : 'A blended 0–100 score from calorie balance around your daily target plus how evenly you’re pacing protein, carbs, and fat—it’s explanatory, not medical advice.'}
            </Text>
            <Pressable onPress={() => setStatTip(null)} style={[styles.modalBtn, { backgroundColor: colors.accent }]}>
              <Text style={styles.modalBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function resolveAdjustedTarget(
  base: number,
  active: number,
  weightGoal: WeightGoalDirection,
  hk: ReturnType<typeof useCalories>
): { target: number; add: number } {
  const baseR = Math.round(Math.max(0, base));
  if (!healthAdjustsDailyTarget(hk)) {
    return { target: baseR, add: 0 };
  }
  const target = computeAdjustedDailyTarget(baseR, active, weightGoal);
  return { target, add: Math.max(0, target - baseR) };
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 0,
    alignSelf: 'stretch',
  },
  cardOuter: {
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 22,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardPad: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energySheet: { marginBottom: 2 },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  todayHeaderLeft: { flex: 1, minWidth: 0, paddingRight: 6 },
  todayKicker: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: 1.05,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  todaySubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.1,
  },
  todayHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 999,
    maxWidth: 140,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 3.5 },
  badgeText: { fontFamily: Fonts.semiBold, fontSize: 11 },
  gaugeWrap: { alignSelf: 'center', position: 'relative', marginBottom: 4 },
  gaugeLabels: {
    position: 'absolute',
    alignItems: 'center',
  },
  gaugeLabelsKicker: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  gaugeDigits: {
    fontFamily: Fonts.bold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.7,
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
    textAlign: 'center',
  },
  gaugeAgainst: { fontFamily: Fonts.medium, fontSize: 12, textAlign: 'center' },
  metricRowTopRule: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    marginHorizontal: -2,
  },
  bottomMetrics: { marginBottom: 0 },
  metricRowThree: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 2,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  metricLbl: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: 0.75,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 2,
  },
  metricPrimary: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  metricSub: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
    opacity: 0.92,
  },
  energySources: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    marginBottom: 0,
    overflow: 'hidden',
  },
  energySourceItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
  },
  energySourceDivider: { width: StyleSheet.hairlineWidth },
  energySourceLabel: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  energySourceVal: { fontFamily: Fonts.semiBold, fontSize: 14 },
  energySourceUnit: { fontFamily: Fonts.regular, fontSize: 12 },
  insightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginTop: 14,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  insightText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  formulaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  formulaText: { fontFamily: Fonts.regular, fontSize: 13 },
  formulaTiny: { fontFamily: Fonts.medium, fontSize: 11 },
  formulaNum: { fontFamily: Fonts.bold, fontSize: 13 },
  formulaPlus: { fontFamily: Fonts.medium, fontSize: 15 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 0,
    marginTop: 4,
  },
  goalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
  },
  goalChipText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  goalSegmentBlock: {
    marginBottom: 8,
    gap: 8,
    marginTop: 14,
  },
  goalSegmentCaption: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  footerSep: { fontFamily: Fonts.regular, fontSize: 11, lineHeight: 18 },
  syncBelowGoal: {
    marginTop: 4,
  },
  syncLine: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
    minWidth: 0,
  },
  syncBullet: { fontSize: 11 },
  err: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 22,
    padding: 22,
    maxHeight: '70%',
  },
  modalScroll: { maxHeight: 220, marginBottom: 16 },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: 19,
    marginBottom: 10,
  },
  modalBody: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
