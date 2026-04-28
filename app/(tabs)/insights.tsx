import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { insightsFromMacroHistory } from '@/lib/ai-coach';
import { getDeepSeekConfig } from '@/lib/deepseek';
import { fetchRecentDayTotals } from '@/lib/nutrition-history';
import type { DayTotals } from '@/lib/nutrition-sync';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { ScreenBackground } from '@/components/ui/ScreenBackground';

type Period = 'week' | 'month' | 'year';
const DAY_FETCH: Record<Period, number> = { week: 7, month: 30, year: 84 };

function chronological(days: DayTotals[]) {
  return [...days].reverse();
}

function chartBars(period: Period, days: DayTotals[], goal: number) {
  const chrono = chronological(days);
  if (goal <= 0) return chrono.map(() => ({ label: '', pct: 0 }));
  if (period === 'year') {
    const bars: { label: string; pct: number }[] = [];
    const n = chrono.length;
    for (let w = 0; w < 12; w++) {
      const end = n - w * 7;
      const start = Math.max(0, end - 7);
      const slice = chrono.slice(start, end);
      const avg = slice.length ? slice.reduce((a, d) => a + d.calories, 0) / slice.length : 0;
      bars.push({ label: `W${12 - w}`, pct: Math.min(100, (avg / goal) * 100) });
    }
    return bars.reverse();
  }
  if (period === 'week') {
    return chrono.slice(-7).map((d) => ({
      label: new Date(`${d.dateKey}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' }),
      pct: Math.min(100, (d.calories / goal) * 100),
    }));
  }
  return chrono.slice(-30).map((d, i) => ({
    label: i % 5 === 0 ? d.dateKey.slice(8) : '',
    pct: Math.min(100, (d.calories / goal) * 100),
  }));
}

function countGoalHits(days: DayTotals[], goal: number) {
  if (goal <= 0) return { hits: 0, total: 0 };
  const total = days.length;
  const hits = days.filter((d) => d.calories >= goal * 0.9 && d.calories <= goal * 1.12).length;
  return { hits, total };
}

export default function InsightsScreen() {
  const { user, firebaseReady } = useAuth();
  const { dailyCalories, proteinG, carbsG, fatG, coachNote, dietarySummary } = useNutritionTargets();
  const { colors } = useAppTheme();
  const [period, setPeriod] = useState<Period>('week');
  const [days, setDays] = useState<DayTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [macroPct, setMacroPct] = useState({ p: 100, c: 100, f: 100 });
  const [aiRetryKey, setAiRetryKey] = useState(0);
  const [showAiRetry, setShowAiRetry] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid || !firebaseReady) { setDays([]); setLoading(false); return; }
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const list = await fetchRecentDayTotals(user.uid, DAY_FETCH[period]);
          if (!cancelled) setDays(list);
        } catch {
          if (!cancelled) setDays([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [user?.uid, firebaseReady, period])
  );

  const adherence = useMemo(() => countGoalHits(days, dailyCalories), [days, dailyCalories]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) { setAiSummary(null); setShowAiRetry(false); return; }
      let cancelled = false;
      setAiLoading(true);
      (async () => {
        void aiRetryKey;
        try {
          const label = period === 'week' ? 'Past week' : period === 'month' ? 'Past month' : 'Past ~12 weeks';
          const insight = await insightsFromMacroHistory({
            periodLabel: label,
            targets: { calories: dailyCalories, proteinG, carbsG, fatG },
            days, coachNote,
            dietarySummary: dietarySummary || undefined,
            adherenceHits: adherence.hits,
            adherenceTotal: adherence.total,
          });
          if (!cancelled) {
            setAiSummary(insight.summary);
            setShowAiRetry(false);
            setMacroPct({ p: insight.proteinPctVsTarget, c: insight.carbsPctVsTarget, f: insight.fatPctVsTarget });
          }
        } catch {
          if (!cancelled) {
            const hasKey = Boolean(getDeepSeekConfig());
            setShowAiRetry(hasKey);
            setAiSummary(
              hasKey
                ? 'We could not reach the AI service. Check your connection and tap Retry, or try again later.'
                : 'Add EXPO_PUBLIC_DEEPSEEK_API_KEY in your project .env to enable AI coaching on this screen.'
            );
            setMacroPct({ p: 100, c: 100, f: 100 });
          }
        } finally {
          if (!cancelled) setAiLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [user?.uid, days, period, dailyCalories, proteinG, carbsG, fatG, coachNote, dietarySummary, adherence.hits, adherence.total, aiRetryKey])
  );

  const bars = useMemo(() => chartBars(period, days, dailyCalories), [period, days, dailyCalories]);
  const { hits, total } = useMemo(() => countGoalHits(days, dailyCalories), [days, dailyCalories]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={[styles.title, { color: colors.text }]}>Insights</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Macros vs targets and AI coaching from your logs.</Text>
        </Animated.View>

        {/* Period selector */}
        <View style={styles.segRow}>
          {(['week', 'month', 'year'] as Period[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.segBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                period === p && { backgroundColor: Palette.iris, borderColor: Palette.iris },
              ]}>
              <Text style={[
                styles.segBtnText,
                { color: colors.textMuted },
                period === p && { color: Palette.white },
              ]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={Palette.iris} />
          </View>
        ) : null}

        {/* Calorie adherence chart */}
        <Animated.View
          entering={FadeInDown.delay(70).duration(420).springify()}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Calorie adherence</Text>
            <View style={[styles.pill, { backgroundColor: colors.haze }]}>
              <Text style={[styles.pillText, { color: Palette.iris }]}>
                {total ? `${hits}/${total} days` : 'No data'}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>Bar height ≈ % of daily calorie goal logged</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
            <View style={styles.chartRow}>
              {bars.map((d, i) => (
                <View key={`${d.label}-${i}`} style={styles.barCol}>
                  <View style={[styles.barTrack, { backgroundColor: colors.haze }]}>
                    <View
                      style={[
                        styles.barFill,
                        { height: Math.max(6, (d.pct / 100) * 100), backgroundColor: d.pct >= 90 && d.pct <= 112 ? Palette.iris : Palette.citrus },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: colors.textMuted }]} numberOfLines={1}>{d.label || '·'}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Macro balance */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(420).springify()}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Macro balance</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>AI estimate vs your targets (average for period)</Text>
          {aiLoading ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={Palette.iris} />
          ) : (
            <View style={styles.legend}>
              {([
                { color: Palette.flamingo, label: 'Protein vs target', val: macroPct.p },
                { color: Palette.citrus, label: 'Carbs vs target', val: macroPct.c },
                { color: Palette.cyan, label: 'Fats vs target', val: macroPct.f },
              ] as const).map(({ color, label, val }) => (
                <View key={label} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>{label}</Text>
                  <Text style={[styles.legendVal, { color: Palette.iris }]}>{val}%</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* AI coaching tip */}
        <Animated.View
          entering={FadeInDown.delay(170).duration(420).springify()}
          style={[styles.tipCard, { backgroundColor: colors.haze, borderColor: colors.border }]}>
          <Ionicons name="sparkles" size={22} color={Palette.iris} />
          <View style={styles.tipBody}>
            <Text style={[styles.tipText, { color: colors.text }]}>
              {aiSummary || 'Sign in and log meals to see AI-powered suggestions based on your macro history.'}
            </Text>
            {showAiRetry && !aiLoading ? (
              <Pressable
                style={[styles.retryBtn, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
                onPress={() => setAiRetryKey((k) => k + 1)}
                accessibilityRole="button"
                accessibilityLabel="Retry AI insights">
                <Ionicons name="refresh" size={18} color={Palette.iris} />
                <Text style={[styles.retryBtnText, { color: Palette.iris }]}>Retry</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>
    </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0FDF4' },
  scroll: { padding: 20, paddingBottom: 120 },
  title: { fontFamily: Fonts.bold, fontSize: 28 },
  subtitle: { fontFamily: Fonts.regular, fontSize: 15, marginTop: 6, marginBottom: 16 },
  segRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  segBtn: {
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 999, borderWidth: 1,
  },
  segBtnText: { fontFamily: Fonts.semiBold, fontSize: 14 },
  loader: { paddingVertical: 24, alignItems: 'center' },
  card: {
    borderRadius: 22, padding: 20, marginBottom: 14, borderWidth: 1,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontFamily: Fonts.bold, fontSize: 18 },
  cardSub: { fontFamily: Fonts.regular, fontSize: 13, marginBottom: 16 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontFamily: Fonts.semiBold, fontSize: 12 },
  chartScroll: { paddingBottom: 4 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, minWidth: '100%' },
  barCol: { width: 28, alignItems: 'center' },
  barTrack: { height: 100, width: 28, borderRadius: 10, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabel: { marginTop: 8, fontFamily: Fonts.medium, fontSize: 10, maxWidth: 32, textAlign: 'center' },
  legend: { gap: 14 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1, fontFamily: Fonts.regular, fontSize: 15 },
  legendVal: { fontFamily: Fonts.semiBold, fontSize: 15 },
  tipCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    borderRadius: 18, padding: 16, borderWidth: 1, marginTop: 6,
  },
  tipBody: { flex: 1, gap: 12 },
  tipText: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 21 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 8, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1,
  },
  retryBtnText: { fontFamily: Fonts.semiBold, fontSize: 15 },
});
