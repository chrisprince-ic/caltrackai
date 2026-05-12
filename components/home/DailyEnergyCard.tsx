import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { HealthConnectTile } from '@/components/home/HealthConnectTile';
import { SmartStatusPill } from '@/components/home/SmartStatusPill';
import { EnergyRing, ENERGY_RING_SIZE } from '@/components/home/energy/EnergyRing';
import { SegmentedPill } from '@/components/ui/SegmentedPill';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
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

const BRAND = Palette.iris;
const BRAND_DARK = Palette.lavender;
const BRAND_SOFT = Palette.haze;
const AMBER = Palette.amber;
const AMBER_SOFT = Palette.amberSoft;
const OVER_COLOR = Palette.rose;
const OVER_SOFT = Palette.roseSoft;
const INK = '#1A2B26';

const WEIGHT_GOAL_SEGMENTS = [
  { id: 'lose' as const, label: 'Lose' },
  { id: 'maintain' as const, label: 'Maintain' },
  { id: 'gain' as const, label: 'Gain' },
];

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
  const overPortion = eaten > adjustedTarget && adjustedTarget > 0;

  const goalWord = goalDirectionLabel(weightGoal);

  const muted = isDark ? colors.textMuted : '#6B7280';
  const divider = isDark ? 'rgba(255,255,255,0.08)' : '#F1F1F0';

  const healthDrivesTarget = healthAdjustsDailyTarget(hk);

  const showInsight = active > 0 && hk.healthKitStatus === 'connected';
  const showFormula = healthDrivesTarget;

  const showHealthTile =
    hk.healthKitStatus === 'denied' || hk.healthKitStatus === 'unavailable';

  const [insightOpen, setInsightOpen] = useState(false);
  const [statTip, setStatTip] = useState<'eaten' | 'remaining' | 'burned' | null>(null);

  const ink = isDark ? colors.text : INK;

  const syncFooter =
    hk.healthKitStatus === 'connected' && hk.platformSupported && !hk.needsAuthCTA ? (
      <Text style={[styles.syncLine, { color: muted }]} numberOfLines={3}>
        <Text style={styles.syncBullet}>● </Text>
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
  const showStatusPill = eaten > 0 && adjustedTarget > 0;

  const cardBg = isDark ? colors.surface : '#FFFFFF';
  const cardBorder = isDark ? colors.border : 'rgba(31, 138, 91, 0.12)';

  const pct = adjustedTarget > 0 ? Math.min(Math.round((eaten / adjustedTarget) * 100), 999) : 0;
  const eatenColor = overPortion ? OVER_COLOR : BRAND;

  const burnedDisplay =
    burnLoading
      ? '…'
      : hk.healthKitStatus === 'unavailable' || hk.healthKitStatus === 'denied'
        ? '—'
        : active.toLocaleString();

  return (
    <View style={styles.wrap}>
      <View style={[styles.cardOuter, { shadowColor: isDark ? '#000000' : BRAND }]}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {/* Aurora glow blob */}
          <View
            style={[
              styles.auroraBlob,
              {
                backgroundColor: isDark
                  ? 'rgba(56,178,115,0.14)'
                  : 'rgba(150,228,186,0.38)',
              },
            ]}
          />

          <View style={styles.cardPad}>
            {/* ── Header ── */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={[styles.headerEyebrow, { color: muted }]}>DAILY ENERGY</Text>
                <Text style={[styles.headerSub, { color: ink }]}>
                  {goalWord} goal
                </Text>
              </View>
              <View style={styles.headerActions}>
                {hk.healthKitStatus === 'connected' && hk.platformSupported ? (
                  <Pressable
                    onPress={() => void hk.refresh()}
                    style={[
                      styles.iconCircle,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F4F4F5' },
                    ]}
                    hitSlop={8}
                    accessibilityLabel="Refresh Apple Health data">
                    {hk.refreshing ? (
                      <ActivityIndicator size="small" color={BRAND} />
                    ) : (
                      <Ionicons name="refresh" size={18} color={BRAND} />
                    )}
                  </Pressable>
                ) : null}
                {showStatusPill ? (
                  <SmartStatusPill
                    eatenToday={eaten}
                    adjustedTarget={adjustedTarget}
                    reducedMotion={reducedMotion}
                  />
                ) : null}
              </View>
            </View>

            {/* ── Ring Hero ── */}
            <View style={styles.ringWrap}>
              <EnergyRing
                eaten={eaten}
                adjustedTarget={adjustedTarget}
                burnedCalories={active}
                reducedMotion={reducedMotion}
                isDark={isDark}
              />
              <View style={[StyleSheet.absoluteFill, styles.ringOverlay]}>
                {adjustedTarget > 0 ? (
                  <>
                    <Text style={[styles.ringPct, { color: eatenColor }]}>{pct}%</Text>
                    <Text style={[styles.ringEaten, { color: ink }]}>
                      {eaten.toLocaleString()}
                    </Text>
                    <Text style={[styles.ringUnit, { color: muted }]}>kcal eaten</Text>
                    <Text style={[styles.ringGoal, { color: muted }]}>
                      of {adjustedTarget.toLocaleString()}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.ringEmpty, { color: muted }]}>Log a meal</Text>
                )}
              </View>
            </View>

            {/* ── Ring legend ── */}
            <View style={styles.ringLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: eatenColor }]} />
                <Text style={[styles.legendText, { color: muted }]}>Eaten</Text>
              </View>
              {hk.healthKitStatus === 'connected' && active > 0 ? (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: AMBER }]} />
                  <Text style={[styles.legendText, { color: muted }]}>Active burn</Text>
                </View>
              ) : null}
            </View>

            {/* ── Stats strip ── */}
            <View
              style={[
                styles.statsStrip,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FBF9',
                  borderColor: isDark
                    ? 'rgba(56,178,115,0.14)'
                    : 'rgba(31,138,91,0.08)',
                },
              ]}>
              {/* Eaten */}
              <Pressable
                style={styles.statCell}
                onPress={() => setStatTip('eaten')}
                accessibilityRole="button"
                accessibilityLabel={`Eaten: ${eaten} kcal`}>
                <View style={[styles.statIcon, { backgroundColor: BRAND_SOFT }]}>
                  <Ionicons name="restaurant-outline" size={15} color={BRAND} />
                </View>
                <Text style={[styles.statNum, { color: BRAND }]}>
                  {eaten.toLocaleString()}
                </Text>
                <Text style={[styles.statLbl, { color: muted }]}>Eaten</Text>
              </Pressable>

              <View style={[styles.statDivider, { backgroundColor: divider }]} />

              {/* Left / Over */}
              <Pressable
                style={styles.statCell}
                onPress={() => setStatTip('remaining')}
                accessibilityRole="button"
                accessibilityLabel={`${remaining < 0 ? 'Over' : 'Remaining'}: ${Math.abs(remaining)} kcal`}>
                <View
                  style={[
                    styles.statIcon,
                    {
                      backgroundColor: remaining < 0
                        ? isDark ? 'rgba(196,74,53,0.18)' : OVER_SOFT
                        : BRAND_SOFT,
                    },
                  ]}>
                  <Ionicons
                    name="flag-outline"
                    size={15}
                    color={remaining < 0 ? OVER_COLOR : BRAND}
                  />
                </View>
                <Text
                  style={[
                    styles.statNum,
                    { color: remaining < 0 ? OVER_COLOR : ink },
                  ]}>
                  {adjustedTarget > 0
                    ? Math.abs(remaining).toLocaleString()
                    : '—'}
                </Text>
                <Text
                  style={[
                    styles.statLbl,
                    { color: remaining < 0 ? OVER_COLOR : muted },
                  ]}>
                  {remaining < 0 ? 'Over' : 'Left'}
                </Text>
              </Pressable>

              <View style={[styles.statDivider, { backgroundColor: divider }]} />

              {/* Burned */}
              <Pressable
                style={styles.statCell}
                onPress={() => setStatTip('burned')}
                accessibilityRole="button"
                accessibilityLabel={`Burned: ${active} kcal`}>
                <View
                  style={[
                    styles.statIcon,
                    {
                      backgroundColor: isDark
                        ? 'rgba(200,151,10,0.18)'
                        : AMBER_SOFT,
                    },
                  ]}>
                  <Ionicons name="flame-outline" size={15} color={AMBER} />
                </View>
                <Text style={[styles.statNum, { color: AMBER }]}>{burnedDisplay}</Text>
                <Text style={[styles.statLbl, { color: muted }]}>Burned</Text>
              </Pressable>
            </View>

            {/* ── Energy sources (healthkit) ── */}
            {healthDrivesTarget ? (
              <View
                style={[
                  styles.energySources,
                  {
                    borderColor: isDark ? colors.border : '#E8F0EC',
                    backgroundColor: isDark ? colors.bg : '#FAFAFA',
                  },
                ]}>
                <View style={styles.energySourceItem}>
                  <Ionicons name="flash-outline" size={16} color={BRAND} />
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

            {/* ── Health connect tile ── */}
            {showHealthTile ? (
              <HealthConnectTile
                variant={hk.healthKitStatus === 'denied' ? 'connect' : 'unavailable'}
                onConnect={hk.healthKitStatus === 'denied' ? handleHealthConnect : undefined}
                reducedMotion={reducedMotion}
              />
            ) : null}

            {/* ── Insight chip ── */}
            {showInsight ? (
              <Pressable
                onPress={() => setInsightOpen(true)}
                style={({ pressed }) => [
                  styles.insightChip,
                  {
                    backgroundColor: isDark ? 'rgba(31,138,91,0.15)' : BRAND_SOFT,
                    borderColor: isDark ? 'rgba(56,178,115,0.3)' : 'rgba(31,138,91,0.25)',
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Learn how activity adjusts your target">
                <Ionicons name="sparkles" size={18} color={BRAND_DARK} />
                <Text style={[styles.insightText, { color: BRAND_DARK }]} numberOfLines={2}>
                  +{activityAdd.toLocaleString()} kcal from today&apos;s activity — how we adjust
                  your target
                </Text>
                <Ionicons name="chevron-forward" size={18} color={BRAND_DARK} />
              </Pressable>
            ) : null}

            {/* ── Formula strip ── */}
            {showFormula ? (
              <View
                style={[
                  styles.formulaStrip,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                    borderColor: isDark ? colors.border : '#E2E8F0',
                  },
                ]}>
                <Text style={[styles.formulaText, { color: muted }]}>
                  Base{' '}
                  <Text style={[styles.formulaNum, { color: ink }]}>{base.toLocaleString()}</Text>
                </Text>
                <Text style={[styles.formulaPlus, { color: muted }]}>+</Text>
                <Text style={[styles.formulaText, { color: muted }]}>
                  Active{' '}
                  <Text style={[styles.formulaNum, { color: AMBER }]}>
                    {active.toLocaleString()}
                  </Text>
                  <Text style={[styles.formulaTiny, { color: muted }]}> × {eatBackLabel}</Text>
                </Text>
                <Text style={[styles.formulaPlus, { color: muted }]}>=</Text>
                <Text style={[styles.formulaText, { color: muted }]}>
                  Target{' '}
                  <Text style={[styles.formulaNum, { color: BRAND_DARK }]}>
                    {adjustedTarget.toLocaleString()}
                  </Text>
                </Text>
              </View>
            ) : null}

            {/* ── Goal segment or footer ── */}
            {hkConnected && user?.uid ? (
              <View style={styles.goalSegmentBlock}>
                <Text style={[styles.goalSegmentCaption, { color: muted }]}>
                  Weight goal · {eatBackLabel} of active calories add to today&apos;s budget
                </Text>
                <SegmentedPill
                  segments={WEIGHT_GOAL_SEGMENTS}
                  value={weightGoal}
                  onChange={handleWeightGoalChange}
                  accent={BRAND}
                />
              </View>
            ) : (
              <View style={styles.footerRow}>
                <View
                  style={[
                    styles.goalChip,
                    {
                      backgroundColor: isDark ? 'rgba(31,138,91,0.15)' : BRAND_SOFT,
                      borderColor: isDark
                        ? 'rgba(56,178,115,0.25)'
                        : 'rgba(31,138,91,0.2)',
                    },
                  ]}>
                  <Text style={[styles.goalChipText, { color: BRAND_DARK }]}>
                    {goalWord} goal
                  </Text>
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

            {hk.error ? (
              <Text style={[styles.err, { color: '#DC2626' }]}>{hk.error}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Insight modal ── */}
      <Modal
        visible={insightOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInsightOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setInsightOpen(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: isDark ? colors.surface : '#FFF' }]}
            onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: ink }]}>Activity adjustment</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalBody, { color: muted }]}>
                Your profile sets a base calorie target. When Apple Health reports active calories,
                we add{' '}
                {activityEatBackFactor(weightGoal) < 1
                  ? 'half of those calories'
                  : 'those calories'}{' '}
                to today&apos;s intake target for your {goalWord.toLowerCase()} goal. Resting
                energy is already in your base target, so we never double-count it.
              </Text>
            </ScrollView>
            <Pressable
              onPress={() => setInsightOpen(false)}
              style={[styles.modalBtn, { backgroundColor: BRAND }]}>
              <Text style={styles.modalBtnText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Stat tip modal ── */}
      <Modal
        visible={statTip !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setStatTip(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setStatTip(null)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: isDark ? colors.surface : '#FFF' }]}
            onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: ink }]}>
              {statTip === 'eaten'
                ? 'Calories eaten'
                : statTip === 'remaining'
                  ? 'Remaining budget'
                  : 'Active burn'}
            </Text>
            <Text style={[styles.modalBody, { color: muted }]}>
              {statTip === 'eaten'
                ? 'Total calories logged today from meals and snacks.'
                : statTip === 'remaining'
                  ? healthDrivesTarget
                    ? "Today's budget is your base target plus a share of active calories from Apple Health (50% when losing weight, 100% when maintaining or gaining), minus what you've logged."
                    : "Your daily calorie target minus what you've eaten so far."
                  : 'Active calories from Apple Health for today (when connected).'}
            </Text>
            <Pressable
              onPress={() => setStatTip(null)}
              style={[styles.modalBtn, { backgroundColor: BRAND }]}>
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
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  cardOuter: {
    borderRadius: 26,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.11,
        shadowRadius: 24,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  card: {
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  auroraBlob: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 1,
  },
  cardPad: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    gap: 2,
  },
  headerEyebrow: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerSub: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ring
  ringWrap: {
    width: ENERGY_RING_SIZE,
    height: ENERGY_RING_SIZE,
    alignSelf: 'center',
    marginBottom: 8,
  },
  ringOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  ringPct: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    letterSpacing: -1,
    lineHeight: 32,
  },
  ringEaten: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    letterSpacing: -0.5,
    lineHeight: 24,
    marginTop: 2,
  },
  ringUnit: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    letterSpacing: 0.2,
    lineHeight: 14,
  },
  ringGoal: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  ringEmpty: {
    fontFamily: Fonts.medium,
    fontSize: 13,
  },

  // Legend
  ringLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    letterSpacing: 0.1,
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNum: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  statLbl: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 4,
  },

  // Energy sources
  energySources: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
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

  // Insight chip
  insightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  insightText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  // Formula strip
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

  // Footer
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 0,
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
  syncBullet: { color: BRAND, fontSize: 11 },
  err: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 8 },

  // Modals
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
