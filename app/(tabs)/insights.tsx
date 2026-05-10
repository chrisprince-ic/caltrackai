import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

import { CalorieChart, ChartLegend, type ChartBar } from '@/components/insights/CalorieChart';
import { InsightsCoachCard } from '@/components/insights/InsightsCoachCard';
import { MacroBars, type MacroRow } from '@/components/insights/MacroBars';
import { CurvedHeroScreen } from '@/components/CurvedHeroScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import { insightsFromMacroHistory } from '@/lib/ai-coach';
import { computeCalorieStreak } from '@/lib/calorie-streak';
import { getDeepSeekConfig } from '@/lib/deepseek';
import {
  averageCaloriesLogged,
  countLoggedDays,
  deltaPct,
  deriveDayInsights,
  formatCoachTip,
  formatDateKeyShort,
} from '@/lib/insights-format';
import { fetchRecentDayTotals } from '@/lib/nutrition-history';
import type { DayTotals } from '@/lib/nutrition-sync';

// ---- Period configuration -------------------------------------------------

type Period = 'week' | 'month' | 'year';
type ChartMetric = 'calories' | 'protein' | 'carbs' | 'fat';

/** Days in the visible period (current slice). */
const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30, year: 84 };
/** Total fetch — current + prior of equal length so we can show a delta. */
const PERIOD_FETCH: Record<Period, number> = { week: 14, month: 60, year: 168 };

const PERIOD_SEGMENTS: { id: Period; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

const METRIC_TABS: { id: ChartMetric; label: string; color: string; unit: string }[] = [
  { id: 'calories', label: 'Calories', color: Palette.iris, unit: 'kcal' },
  { id: 'protein', label: 'Protein', color: Palette.flamingo, unit: 'g' },
  { id: 'carbs', label: 'Carbs', color: Palette.citrus, unit: 'g' },
  { id: 'fat', label: 'Fat', color: Palette.cyan, unit: 'g' },
];

const PERIOD_KICKER: Record<Period, string> = {
  week: 'THIS WEEK',
  month: 'THIS MONTH',
  year: 'PAST 12 WEEKS',
};
const PRIOR_LABEL: Record<Period, string> = {
  week: 'vs last week',
  month: 'vs last month',
  year: 'vs prior 12 weeks',
};

const PERIOD_STORAGE_KEY = 'caltrack:insights:period';

// ---- Helpers --------------------------------------------------------------

function dayValue(d: DayTotals, m: ChartMetric): number {
  switch (m) {
    case 'calories':
      return d.calories;
    case 'protein':
      return d.proteinGrams;
    case 'carbs':
      return d.carbsGrams;
    case 'fat':
      return d.fatGrams;
  }
}

function dayHasLog(d: DayTotals): boolean {
  return d.calories > 0 || d.proteinGrams > 0 || d.carbsGrams > 0 || d.fatGrams > 0;
}

function formatDayInitial(dateKey: string): string {
  try {
    return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'narrow',
    });
  } catch {
    return '';
  }
}

function buildBars(period: Period, recent: DayTotals[], metric: ChartMetric): ChartBar[] {
  // recent is most-recent-first (Firestore order). Reverse to chronological.
  const chrono = [...recent].reverse();

  if (period === 'week') {
    return chrono.slice(-7).map((d) => ({
      id: d.dateKey,
      label: formatDayInitial(d.dateKey),
      value: dayValue(d, metric),
      logged: dayHasLog(d),
    }));
  }

  if (period === 'month') {
    return chrono.slice(-30).map((d, i) => ({
      id: d.dateKey,
      label: i % 5 === 0 ? d.dateKey.slice(8) : '',
      value: dayValue(d, metric),
      logged: dayHasLog(d),
    }));
  }

  // Year: 12 weekly aggregates from the last 84 days.
  const bars: ChartBar[] = [];
  const len = chrono.length;
  for (let w = 11; w >= 0; w--) {
    const end = len - w * 7;
    const start = Math.max(0, end - 7);
    const slice = chrono.slice(start, end);
    const logged = slice.filter(dayHasLog);
    const avg = logged.length
      ? logged.reduce((s, d) => s + dayValue(d, metric), 0) / logged.length
      : 0;
    bars.push({
      id: `w-${w}`,
      label: w === 0 ? 'Now' : w % 3 === 0 ? `W${12 - w}` : '',
      value: avg,
      logged: logged.length > 0,
    });
  }
  return bars;
}

function trendStyle(currentAvg: number, priorAvg: number, goal: number): 'better' | 'worse' | 'neutral' {
  if (priorAvg <= 0 || goal <= 0 || currentAvg <= 0) return 'neutral';
  const tolerance = Math.max(50, goal * 0.02);
  const cur = Math.abs(currentAvg - goal);
  const prior = Math.abs(priorAvg - goal);
  if (cur < prior - tolerance) return 'better';
  if (cur > prior + tolerance) return 'worse';
  return 'neutral';
}

function formatTimeAgo(ms: number | null): string | null {
  if (!ms) return null;
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'Updated just now';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 3_600_000);
  if (hours < 24) return `Updated ${hours}h ago`;
  return 'Updated yesterday';
}

// ---- Screen ---------------------------------------------------------------

export default function InsightsScreen() {
  const router = useRouter();
  const { user, firebaseReady } = useAuth();
  const { dailyCalories, proteinG, carbsG, fatG, coachNote, dietarySummary } =
    useNutritionTargets();
  const { colors } = useAppTheme();

  const [period, setPeriod] = useState<Period>('week');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('calories');
  const [days, setDays] = useState<DayTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiRetryKey, setAiRetryKey] = useState(0);
  const [showAiRetry, setShowAiRetry] = useState(false);
  const [aiUpdatedAt, setAiUpdatedAt] = useState<number | null>(null);
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);

  // Restore the user's last-selected period from AsyncStorage on mount.
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(PERIOD_STORAGE_KEY)
      .then((v) => {
        if (cancelled) return;
        if (v === 'week' || v === 'month' || v === 'year') setPeriod(v);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const onChangePeriod = useCallback((p: Period) => {
    setPeriod(p);
    void Haptics.selectionAsync().catch(() => {});
    void AsyncStorage.setItem(PERIOD_STORAGE_KEY, p).catch(() => {});
  }, []);

  // Fetch totals (current + prior period) when user or period changes.
  useFocusEffect(
    useCallback(() => {
      if (!user?.uid || !firebaseReady) {
        setDays([]);
        setLoading(false);
        return;
      }
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const list = await fetchRecentDayTotals(user.uid, PERIOD_FETCH[period]);
          if (!cancelled) setDays(list);
        } catch {
          if (!cancelled) setDays([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.uid, firebaseReady, period]),
  );

  // ---- Derived data ------------------------------------------------------

  const recent = useMemo(() => days.slice(0, PERIOD_DAYS[period]), [days, period]);
  const prior = useMemo(
    () => days.slice(PERIOD_DAYS[period], PERIOD_DAYS[period] * 2),
    [days, period],
  );

  const recentAvgCal = useMemo(() => averageCaloriesLogged(recent), [recent]);
  const priorAvgCal = useMemo(() => averageCaloriesLogged(prior), [prior]);
  const recentLoggedDays = useMemo(() => countLoggedDays(recent), [recent]);

  const calDelta = deltaPct(recentAvgCal, priorAvgCal);
  const calTrend = trendStyle(recentAvgCal, priorAvgCal, dailyCalories);

  const streak = useMemo(
    () =>
      computeCalorieStreak(
        dailyCalories,
        days.map((d) => ({ dateKey: d.dateKey, calories: d.calories })),
      ),
    [dailyCalories, days],
  );

  // Per-period chart goal + bars.
  const chartGoal = useMemo(() => {
    switch (chartMetric) {
      case 'calories':
        return dailyCalories;
      case 'protein':
        return proteinG;
      case 'carbs':
        return carbsG;
      case 'fat':
        return fatG;
    }
  }, [chartMetric, dailyCalories, proteinG, carbsG, fatG]);

  const bars = useMemo(
    () => buildBars(period, recent, chartMetric),
    [period, recent, chartMetric],
  );

  const activeMetric = METRIC_TABS.find((m) => m.id === chartMetric) ?? METRIC_TABS[0];

  // Macro bar rows with prior-period delta captions.
  const macroRows: MacroRow[] = useMemo(() => {
    function avgGrams(arr: DayTotals[], k: keyof DayTotals): number {
      const logged = arr.filter(dayHasLog);
      if (!logged.length) return 0;
      const sum = logged.reduce((s, d) => s + (d[k] as number), 0);
      return sum / logged.length;
    }
    const make = (
      id: 'protein' | 'carbs' | 'fat',
      label: string,
      color: string,
      target: number,
      key: keyof DayTotals,
    ): MacroRow => {
      const recAvg = avgGrams(recent, key);
      const priAvg = avgGrams(prior, key);
      let caption: string | null = null;
      if (target > 0) {
        if (priAvg > 0) {
          const diffG = Math.round(recAvg - priAvg);
          if (Math.abs(diffG) < 3) caption = 'Steady vs last period';
          else if (diffG > 0) caption = `↑ ${diffG}g vs last period`;
          else caption = `↓ ${Math.abs(diffG)}g vs last period`;
        } else if (recAvg > 0) {
          const ratio = recAvg / target;
          caption =
            ratio >= 0.9 && ratio <= 1.1
              ? 'On target'
              : ratio < 0.9
                ? 'Below target'
                : 'Above target';
        }
      }
      return { id, label, color, actual: recAvg, target, caption };
    };
    return [
      make('protein', 'Protein', Palette.flamingo, proteinG, 'proteinGrams'),
      make('carbs', 'Carbs', Palette.citrus, carbsG, 'carbsGrams'),
      make('fat', 'Fat', Palette.cyan, fatG, 'fatGrams'),
    ];
  }, [recent, prior, proteinG, carbsG, fatG]);

  const dayInsights = useMemo(() => deriveDayInsights(recent, dailyCalories), [recent, dailyCalories]);

  const coachTip = useMemo(() => formatCoachTip(aiSummary), [aiSummary]);

  // Adherence count for prompt context (kept as-is for the AI service).
  const adherence = useMemo(() => {
    if (dailyCalories <= 0) return { hits: 0, total: recent.length };
    const total = recent.length;
    const hits = recent.filter(
      (d) => d.calories >= dailyCalories * 0.9 && d.calories <= dailyCalories * 1.12,
    ).length;
    return { hits, total };
  }, [recent, dailyCalories]);

  // ---- AI fetch ----------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) {
        setAiSummary(null);
        setShowAiRetry(false);
        return;
      }
      let cancelled = false;
      setAiLoading(true);
      (async () => {
        void aiRetryKey;
        try {
          const label =
            period === 'week'
              ? 'Past week'
              : period === 'month'
                ? 'Past month'
                : 'Past ~12 weeks';
          const insight = await insightsFromMacroHistory({
            periodLabel: label,
            targets: { calories: dailyCalories, proteinG, carbsG, fatG },
            days: recent,
            coachNote,
            dietarySummary: dietarySummary || undefined,
            adherenceHits: adherence.hits,
            adherenceTotal: adherence.total,
          });
          if (!cancelled) {
            setAiSummary(insight.summary);
            setShowAiRetry(false);
            setAiUpdatedAt(Date.now());
          }
        } catch {
          if (!cancelled) {
            const hasKey = Boolean(getDeepSeekConfig());
            setShowAiRetry(hasKey);
            setAiSummary(
              hasKey
                ? "We couldn't reach the coach. Check your connection and try again."
                : 'Add EXPO_PUBLIC_DEEPSEEK_API_KEY in your .env to unlock coaching.',
            );
          }
        } finally {
          if (!cancelled) setAiLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [
      user?.uid,
      period,
      recent,
      dailyCalories,
      proteinG,
      carbsG,
      fatG,
      coachNote,
      dietarySummary,
      adherence.hits,
      adherence.total,
      aiRetryKey,
    ]),
  );

  // Sparkline data — last 7 days of the recent slice, chronological.
  const sparkValues = useMemo(() => {
    const slice = [...recent].slice(0, 7).reverse();
    while (slice.length < 7) slice.unshift({ dateKey: '', calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 });
    return slice;
  }, [recent]);
  const sparkMax = useMemo(
    () => Math.max(1, ...sparkValues.map((d) => d.calories), dailyCalories || 0),
    [sparkValues, dailyCalories],
  );

  // ---- Render ------------------------------------------------------------

  const noDataAtAll = !loading && recentLoggedDays === 0;
  const trendColor =
    calTrend === 'better' ? '#16A34A' : calTrend === 'worse' ? '#DC2626' : colors.textMuted;
  const trendArrow = calDelta == null ? '' : calDelta > 0 ? '↑' : calDelta < 0 ? '↓' : '·';

  return (
    <CurvedHeroScreen
      title="Progress"
      subtitle="Your trends & streaks"
      heroBackground="sage"
      tabRoot
      rightActions={
        <View style={{ flexShrink: 0 }}>
          <CompactToggle
            segments={PERIOD_SEGMENTS}
            value={period}
            onChange={(v) => onChangePeriod(v)}
          />
        </View>
      }>
          <View>
            {/* Streak banner — only when streak ≥ 2 */}
            {streak >= 2 ? (
              <Animated.View
                entering={FadeInDown.delay(40).duration(360)}
                layout={LinearTransition}>
                <Pressable
                  onPress={() => router.push('/manual-entry' as Href)}
                  accessibilityRole="button"
                  accessibilityLabel={`${streak}-day streak. Open meal log to keep it going.`}
                  style={({ pressed }) => [
                    styles.streakBanner,
                    {
                      backgroundColor: colors.streakBg,
                      borderColor: 'rgba(251,146,60,0.22)',
                    },
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.streakIcon}>
                    <Ionicons name="flame" size={22} color="#F97316" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.streakTitle, { color: colors.streakText }]}>
                      {streak}-day streak
                    </Text>
                    <Text
                      style={[styles.streakHint, { color: colors.streakHint }]}
                      numberOfLines={1}>
                      Keep it going — log today's meals
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.streakHint}
                    style={{ opacity: 0.55 }}
                  />
                </Pressable>
              </Animated.View>
            ) : null}

            {/* Empty state — no logs at all in current period */}
            {noDataAtAll ? (
              <Animated.View
                entering={FadeInDown.delay(80).duration(380)}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <EmptyState
                  icon="bar-chart-outline"
                  title="Not enough data yet"
                  body="Log meals for a few days and your insights will appear here."
                  cta={{
                    label: 'Log your first meal',
                    icon: 'add-circle-outline',
                    onPress: () => router.push('/manual-entry' as Href),
                  }}
                />
              </Animated.View>
            ) : null}

            {/* Hero metric — only when we have data */}
            {!noDataAtAll ? (
              <Animated.View
                entering={FadeInDown.delay(60).duration(400)}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <Text style={[styles.kicker, { color: colors.textMuted }]}>
                  {PERIOD_KICKER[period]}
                </Text>
                <View style={styles.heroNumberRow}>
                  <Text style={[styles.heroNumber, { color: colors.text }]} numberOfLines={1}>
                    {recentAvgCal > 0 ? recentAvgCal.toLocaleString() : '—'}
                  </Text>
                  <Text style={[styles.heroUnit, { color: colors.textMuted }]} numberOfLines={1}>
                    avg kcal / day
                  </Text>
                </View>
                <View style={styles.heroFooter}>
                  <View style={styles.trendRow}>
                    {calDelta != null ? (
                      <>
                        <Text style={[styles.trendText, { color: trendColor }]}>
                          {trendArrow} {Math.abs(calDelta)}%
                        </Text>
                        <Text style={[styles.trendLabel, { color: colors.textMuted }]}>
                          {PRIOR_LABEL[period]}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.trendLabel, { color: colors.textMuted }]}>
                        Not enough history to compare
                      </Text>
                    )}
                  </View>
                  <View style={styles.spark}>
                    {sparkValues.map((d, i) => {
                      const h =
                        d.calories > 0 ? Math.max(3, (d.calories / sparkMax) * 22) : 3;
                      const isLogged = d.calories > 0;
                      return (
                        <View
                          key={`spark-${i}-${d.dateKey || i}`}
                          style={{
                            width: 4,
                            height: h,
                            borderRadius: 2,
                            backgroundColor: isLogged ? Palette.iris : colors.borderStrong,
                            opacity: isLogged ? 1 : 0.55,
                          }}
                        />
                      );
                    })}
                  </View>
                </View>
              </Animated.View>
            ) : null}

            {/* Daily calories chart with metric tabs above title */}
            {!noDataAtAll ? (
              <Animated.View
                entering={FadeInDown.delay(80).duration(420)}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <View style={styles.metricTabs}>
                  {METRIC_TABS.map((m) => {
                    const active = m.id === chartMetric;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => {
                          setChartMetric(m.id);
                          void Haptics.selectionAsync().catch(() => {});
                        }}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        style={styles.metricTab}>
                        <Text
                          style={[
                            styles.metricTabText,
                            { color: active ? m.color : colors.textMuted },
                          ]}
                          numberOfLines={1}>
                          {m.label}
                        </Text>
                        {active ? (
                          <Animated.View
                            entering={FadeIn.duration(180)}
                            style={[styles.metricUnderline, { backgroundColor: m.color }]}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                      {chartMetric === 'calories' ? 'Daily calories' : `Daily ${activeMetric.label.toLowerCase()}`}
                    </Text>
                    <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                      {recentLoggedDays}/{recent.length} days logged
                    </Text>
                  </View>
                </View>
                <CalorieChart
                  data={bars}
                  goal={chartGoal}
                  accent={activeMetric.color}
                  unit={activeMetric.unit}
                />
                <ChartLegend />
              </Animated.View>
            ) : null}

            {/* Macro balance — horizontal bars with deltas */}
            {!noDataAtAll ? (
              <Animated.View
                entering={FadeInDown.delay(100).duration(420)}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Average macros</Text>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                  How your week compared to targets
                </Text>
                <View style={{ marginTop: 14 }}>
                  <MacroBars rows={macroRows} />
                </View>
              </Animated.View>
            ) : null}

            {/* AI Coach card — distinct cream tint, headline + body + chips */}
            {!noDataAtAll || aiSummary ? (
              <Animated.View entering={FadeInDown.delay(120).duration(420)} style={styles.coachWrap}>
                <InsightsCoachCard
                  headline={coachTip.headline}
                  body={coachTip.body}
                  loading={aiLoading}
                  showRetry={showAiRetry}
                  onRetry={() => setAiRetryKey((k) => k + 1)}
                  updatedLabel={formatTimeAgo(aiUpdatedAt)}
                />
              </Animated.View>
            ) : null}

            {/* Insight accordions */}
            {!noDataAtAll &&
            (dayInsights.bestDay || dayInsights.hardestDay || dayInsights.mostConsistentMacro) ? (
              <Animated.View
                entering={FadeInDown.delay(140).duration(420)}
                style={styles.accordionList}
                layout={LinearTransition.springify().damping(20)}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Highlights</Text>
                {dayInsights.bestDay ? (
                  <Accordion
                    id="best"
                    expanded={expandedAccordion === 'best'}
                    onToggle={(id) =>
                      setExpandedAccordion((cur) => (cur === id ? null : id))
                    }
                    icon="trophy-outline"
                    iconBg="#DCFCE7"
                    iconColor="#16A34A"
                    title="Best day"
                    summary={`${formatDateKeyShort(dayInsights.bestDay.dateKey)} · ${dayInsights.bestDay.calories.toLocaleString()} kcal · all macros on target`}
                    detail={
                      <Text style={[styles.accordionDetail, { color: colors.textMuted }]}>
                        Closest to your daily calorie target with protein, carbs, and fats all
                        logged. Aim to repeat this day's meal pattern when you can.
                      </Text>
                    }
                  />
                ) : null}
                {dayInsights.hardestDay ? (
                  <Accordion
                    id="hard"
                    expanded={expandedAccordion === 'hard'}
                    onToggle={(id) =>
                      setExpandedAccordion((cur) => (cur === id ? null : id))
                    }
                    icon="cloud-offline-outline"
                    iconBg="#FEE2E2"
                    iconColor="#DC2626"
                    title="Hardest day"
                    summary={`${formatDateKeyShort(dayInsights.hardestDay.dateKey)} · little or nothing logged`}
                    detail={
                      <Text style={[styles.accordionDetail, { color: colors.textMuted }]}>
                        Even a quick estimate beats no log — you can backfill from the meal
                        plan or scan a snack to keep your trend honest.
                      </Text>
                    }
                  />
                ) : null}
                {dayInsights.mostConsistentMacro ? (
                  <Accordion
                    id="consistent"
                    expanded={expandedAccordion === 'consistent'}
                    onToggle={(id) =>
                      setExpandedAccordion((cur) => (cur === id ? null : id))
                    }
                    icon="ribbon-outline"
                    iconBg="#FCE7F3"
                    iconColor={Palette.flamingo}
                    title="Most consistent macro"
                    summary={`${capitalize(dayInsights.mostConsistentMacro.id)} · logged on ${dayInsights.mostConsistentMacro.daysLogged} of ${dayInsights.mostConsistentMacro.totalDays} days`}
                    detail={
                      <Text style={[styles.accordionDetail, { color: colors.textMuted }]}>
                        You're the most reliable on this macro. Use it as the anchor when
                        planning the rest of your day's meals.
                      </Text>
                    }
                  />
                ) : null}
              </Animated.View>
            ) : null}

            {!user ? (
              <Text style={[styles.muted, { color: colors.textMuted }]}>
                Sign in to get a personalized analysis.
              </Text>
            ) : null}
          </View>
    </CurvedHeroScreen>
  );
}

// ---- CompactToggle (purpose-built 36pt segmented control) ----------------

type CompactToggleProps<T extends string> = {
  segments: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
};

function CompactToggle<T extends string>({ segments, value, onChange }: CompactToggleProps<T>) {
  const { colors, isDark } = useAppTheme();
  return (
    <View
      style={[
        compactStyles.outer,
        {
          // Slightly darker track than `colors.bg` so the rail reads clearly on
          // the white sticky bar (avoids “one big white pill” confusion).
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#D1D5DB',
        },
      ]}>
      {segments.map((seg) => {
        const active = seg.id === value;
        return (
          <Pressable
            key={seg.id}
            onPress={() => onChange(seg.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              compactStyles.knob,
              active && [
                compactStyles.knobOn,
                { backgroundColor: isDark ? colors.surface : '#FFFFFF' },
              ],
            ]}>
            <Text
              style={[
                compactStyles.label,
                { color: active ? Palette.iris : colors.textMuted },
              ]}
              numberOfLines={1}>
              {seg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const compactStyles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
    gap: 3,
  },
  knob: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  knobOn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});

// ---- Accordion ------------------------------------------------------------

type AccordionProps = {
  id: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  summary: string;
  detail: React.ReactNode;
};

function Accordion({
  id,
  expanded,
  onToggle,
  icon,
  iconBg,
  iconColor,
  title,
  summary,
  detail,
}: AccordionProps) {
  const { colors } = useAppTheme();
  return (
    <Animated.View
      layout={LinearTransition.springify().damping(20)}
      style={[
        styles.accordionCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
      <Pressable
        onPress={() => {
          onToggle(id);
          void Haptics.selectionAsync().catch(() => {});
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.accordionHead, pressed && { opacity: 0.85 }]}>
        <View style={[styles.accordionIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.accordionTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text
            style={[styles.accordionSummary, { color: colors.textMuted }]}
            numberOfLines={expanded ? undefined : 1}>
            {summary}
          </Text>
        </View>
        <Ionicons
          name="chevron-down"
          size={18}
          color={colors.textMuted}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {expanded ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(120)}
          style={[styles.accordionBody, { borderTopColor: colors.border }]}>
          {detail}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---- Styles ---------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 10,
    gap: 12,
  },
  cardTitle: { fontFamily: Fonts.bold, fontSize: 17 },
  cardSub: { fontFamily: Fonts.regular, fontSize: 13, marginTop: 2, lineHeight: 18 },

  // Streak banner
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingRight: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  streakIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249,115,22,0.14)',
  },
  streakTitle: { fontFamily: Fonts.semiBold, fontSize: 15 },
  streakHint: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 1 },

  // Hero metric card
  kicker: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  heroNumber: { fontFamily: Fonts.bold, fontSize: 46, letterSpacing: -1 },
  heroUnit: { fontFamily: Fonts.medium, fontSize: 13 },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  trendRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flex: 1, minWidth: 0 },
  trendText: { fontFamily: Fonts.semiBold, fontSize: 13 },
  trendLabel: { fontFamily: Fonts.regular, fontSize: 12 },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 22 },

  // Metric tabs
  metricTabs: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 4,
  },
  metricTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  metricTabText: { fontFamily: Fonts.semiBold, fontSize: 13 },
  metricUnderline: {
    height: 2,
    width: '60%',
    borderRadius: 999,
    marginTop: 6,
  },

  // AI Coach
  coachWrap: { marginBottom: 12 },

  // Accordion
  accordionList: { gap: 10 },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  accordionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  accordionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionTitle: { fontFamily: Fonts.semiBold, fontSize: 14 },
  accordionSummary: { fontFamily: Fonts.regular, fontSize: 13, marginTop: 2, lineHeight: 18 },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accordionDetail: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 19, marginTop: 12 },

  muted: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 20,
  },

  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
