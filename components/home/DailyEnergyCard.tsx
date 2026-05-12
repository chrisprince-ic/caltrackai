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
import { StatTile } from '@/components/home/energy/StatTile';
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
const ORANGE = '#F97316';
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
  const cardBorder = isDark ? colors.border : 'rgba(34, 197, 94, 0.12)';

  return (
    <View style={styles.wrap}>
      <View style={[styles.cardOuter, { shadowColor: isDark ? '#000000' : BRAND }]}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.cardPad}>
            <View style={styles.loggedStrip}>
              <View style={styles.loggedStripInner}>
                <View style={styles.loggedStripLeft}>
                  <View style={[styles.loggedIconWell, { backgroundColor: isDark ? 'rgba(34,197,94,0.18)' : BRAND_SOFT }]}>
                    <Ionicons name="restaurant" size={18} color={BRAND} />
                  </View>
                  <View style={styles.loggedTextCol}>
                    <Text
                      style={[styles.loggedKicker, { color: muted }]}
                      numberOfLines={1}
                      ellipsizeMode="tail">
                      Logged today
                    </Text>
                    <Text
                      style={[styles.loggedMain, { color: ink }]}
                      numberOfLines={1}
                      ellipsizeMode="tail">
                      <Text style={styles.loggedMainNum}>{eaten.toLocaleString()}</Text>
                      <Text style={[styles.loggedSlash, { color: muted }]}> / </Text>
                      <Text style={[styles.loggedTarget, { color: muted }]}>
                        {adjustedTarget.toLocaleString()} kcal
                      </Text>
                    </Text>
                  </View>
                </View>
                <View style={styles.loggedStripEnd}>
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
                  {remaining >= 0 && adjustedTarget > 0 ? (
                    <View
                      style={[
                        styles.remainChip,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5' },
                      ]}>
                      <Text style={[styles.remainChipText, { color: muted }]}>
                        {remaining.toLocaleString()} left
                      </Text>
                    </View>
                  ) : overPortion ? (
                    <View style={[styles.remainChip, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
                      <Text style={[styles.remainChipText, { color: ORANGE }]}>Over target</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {healthDrivesTarget ? (
              <View
                style={[
                  styles.energySources,
                  { borderColor: isDark ? colors.border : '#E8F0EC', backgroundColor: isDark ? colors.bg : '#FAFAFA' },
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

            <View
              style={[
                styles.statTrio,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FBF9',
                  borderColor: isDark ? 'rgba(52, 211, 153, 0.14)' : 'rgba(34, 197, 94, 0.08)',
                },
              ]}>
              <StatTile
                label="Eaten"
                value={eaten}
                icon="restaurant-outline"
                variant="side"
                accentColor={BRAND}
                countDelay={200}
                reducedMotion={reducedMotion}
                onPress={() => setStatTip('eaten')}
              />
              <View style={[styles.statDivider, { backgroundColor: divider }]} />
              <StatTile
                label={remaining < 0 ? 'Over' : 'Remaining'}
                value={remaining < 0 ? Math.abs(remaining) : remaining}
                icon="locate-outline"
                variant="brand"
                accentColor={BRAND}
                countDelay={320}
                reducedMotion={reducedMotion}
                valueColorOverride={remaining < 0 || overPortion ? ORANGE : undefined}
                onPress={() => setStatTip('remaining')}
              />
              <View style={[styles.statDivider, { backgroundColor: divider }]} />
              <StatTile
                label="Burned"
                value={active}
                icon="flame-outline"
                variant="side"
                accentColor={ORANGE}
                countDelay={440}
                reducedMotion={reducedMotion}
                valueText={
                  burnLoading
                    ? '…'
                    : hk.healthKitStatus === 'unavailable' || hk.healthKitStatus === 'denied'
                      ? '—'
                      : undefined
                }
                onPress={() => setStatTip('burned')}
              />
            </View>

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
                    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : BRAND_SOFT,
                    borderColor: isDark ? 'rgba(52,211,153,0.3)' : 'rgba(34,197,94,0.25)',
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Learn how activity adjusts your target">
                <Ionicons name="sparkles" size={18} color={BRAND_DARK} />
                <Text style={[styles.insightText, { color: BRAND_DARK }]} numberOfLines={2}>
                  +{activityAdd.toLocaleString()} kcal from today&apos;s activity — how we adjust your target
                </Text>
                <Ionicons name="chevron-forward" size={18} color={BRAND_DARK} />
              </Pressable>
            ) : null}

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
                  <Text style={[styles.formulaNum, { color: ORANGE }]}>{active.toLocaleString()}</Text>
                  <Text style={[styles.formulaTiny, { color: muted }]}> × {eatBackLabel}</Text>
                </Text>
                <Text style={[styles.formulaPlus, { color: muted }]}>=</Text>
                <Text style={[styles.formulaText, { color: muted }]}>
                  Target{' '}
                  <Text style={[styles.formulaNum, { color: BRAND_DARK }]}>{adjustedTarget.toLocaleString()}</Text>
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
                  accent={BRAND}
                />
              </View>
            ) : (
              <View style={styles.footerRow}>
                <View
                  style={[
                    styles.goalChip,
                    {
                      backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : BRAND_SOFT,
                      borderColor: isDark ? 'rgba(52,211,153,0.25)' : 'rgba(34,197,94,0.2)',
                    },
                  ]}>
                  <Text style={[styles.goalChipText, { color: BRAND_DARK }]}>{goalWord} goal</Text>
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
            <Pressable onPress={() => setInsightOpen(false)} style={[styles.modalBtn, { backgroundColor: BRAND }]}>
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
                    ? 'Today’s budget is your base target plus a share of active calories from Apple Health (50% when losing weight, 100% when maintaining or gaining), minus what you’ve logged.'
                    : 'Your daily calorie target minus what you’ve eaten so far.'
                  : 'Active calories from Apple Health for today (when connected).'}
            </Text>
            <Pressable onPress={() => setStatTip(null)} style={[styles.modalBtn, { backgroundColor: BRAND }]}>
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
  cardPad: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
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
  loggedStrip: {
    paddingVertical: 14,
    paddingHorizontal: 0,
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  loggedStripInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    rowGap: 10,
    columnGap: 12,
  },
  loggedStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 200,
  },
  loggedTextCol: {
    flex: 1,
    minWidth: 120,
  },
  loggedStripEnd: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexGrow: 0,
    flexShrink: 0,
  },
  loggedIconWell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loggedKicker: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  loggedMain: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  loggedMainNum: { fontFamily: Fonts.bold, fontSize: 22, color: BRAND },
  loggedSlash: { fontFamily: Fonts.bold, fontSize: 20 },
  loggedTarget: { fontFamily: Fonts.medium, fontSize: 18 },
  remainChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexShrink: 0,
  },
  remainChipText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
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
  statTrio: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
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
