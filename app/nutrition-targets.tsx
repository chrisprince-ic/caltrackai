import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { getDeepSeekConfig } from '@/lib/deepseek';
import { macroPercentsFromGrams } from '@/lib/nutrition-calculations';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

function MacroRow({
  label,
  grams,
  pct,
  color,
  trackBg,
}: {
  label: string;
  grams: number;
  pct: number;
  color: string;
  trackBg: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.macroBlock}>
      <View style={styles.macroTop}>
        <Text style={[styles.macroLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.macroGrams, { color: colors.textMuted }]}>
          {grams}g · {pct}% of kcal
        </Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: trackBg }]}>
        <View style={[styles.macroFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function NutritionTargetsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { plan, dailyCalories, proteinG, carbsG, fatG, coachNote, dietarySummary, loading } = useNutritionTargets();
  const aiCoachEnabled = getDeepSeekConfig();

  const macroPct = useMemo(
    () => macroPercentsFromGrams(proteinG, carbsG, fatG),
    [proteinG, carbsG, fatG]
  );

  const updatedLabel = useMemo(() => {
    if (!plan?.updatedAt) return null;
    try {
      return new Date(plan.updatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return null;
    }
  }, [plan?.updatedAt]);

  const hasSavedPlan = plan != null;

  const proteinTrackBg = isDark ? 'rgba(236,72,153,0.15)' : '#FFE8F0';
  const carbsTrackBg = isDark ? 'rgba(249,115,22,0.15)' : '#FFF8EB';
  const fatTrackBg = isDark ? 'rgba(99,102,241,0.15)' : '#E0E0FE';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lead, { color: colors.textMuted }]}>
          These numbers power your home dashboard, meal suggestions, and insights. Meal logs and history are never
          cleared when you update targets.
        </Text>

        {loading ? (
          <Text style={[styles.muted, { color: colors.textMuted }]}>Loading targets…</Text>
        ) : !hasSavedPlan ? (
          <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={22} color={Palette.iris} />
            <Text style={[styles.noticeText, { color: colors.text }]}>
              No saved plan found for this account yet. Run onboarding once to set custom calories and macros (defaults
              are shown below until then).
            </Text>
          </View>
        ) : null}

        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.heroBadge}>
            <Ionicons name="flame" size={16} color={Palette.iris} />
            <Text style={styles.heroBadgeText}>Daily calorie target</Text>
          </View>
          <Text style={styles.calValue}>{dailyCalories.toLocaleString()}</Text>
          <Text style={[styles.calUnit, { color: colors.textMuted }]}>kcal / day</Text>
          {updatedLabel ? (
            <Text style={[styles.updated, { color: colors.textMuted }]}>Last updated {updatedLabel}</Text>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Macro targets</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>Grams per day (same as Home)</Text>
          <MacroRow
            label="Protein"
            grams={proteinG}
            pct={macroPct.proteinPct}
            color={Palette.flamingo}
            trackBg={proteinTrackBg}
          />
          <MacroRow
            label="Carbs"
            grams={carbsG}
            pct={macroPct.carbsPct}
            color={Palette.citrus}
            trackBg={carbsTrackBg}
          />
          <MacroRow label="Fats" grams={fatG} pct={macroPct.fatPct} color={Palette.cyan} trackBg={fatTrackBg} />
        </View>

        {dietarySummary ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Dietary context</Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>{dietarySummary}</Text>
          </View>
        ) : null}

        {coachNote ? (
          <View style={[styles.coachCard, { backgroundColor: colors.haze, borderColor: colors.borderStrong }]}>
            <Ionicons name="sparkles" size={22} color={Palette.iris} />
            <View style={{ flex: 1 }}>
              <Text style={styles.coachTitle}>AI coach note</Text>
              <Text style={[styles.body, { color: colors.textMuted }]}>{coachNote}</Text>
            </View>
          </View>
        ) : hasSavedPlan && aiCoachEnabled ? (
          <Text style={[styles.muted, { color: colors.textMuted }]}>
            No AI coach note on file. After you re-run onboarding with DeepSeek configured, a short personalized note can
            appear here.
          </Text>
        ) : null}

        {!aiCoachEnabled ? (
          <Text style={[styles.muted, { color: colors.textMuted }]}>
            AI coaching is not available on this account. Re-run onboarding to update your targets.
          </Text>
        ) : null}

        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push('/(tabs)/insights' as Href)}
          accessibilityRole="button"
          accessibilityLabel="View Insights: charts, trends, and coaching">
          <Ionicons name="stats-chart-outline" size={20} color="#FFFFFF" />
          <Text style={styles.primaryBtnText} numberOfLines={1}>
            View Insights
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
          onPress={() => router.push('/onboarding?updateTargets=1' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Adjust calorie and macro targets by running onboarding again">
          <Ionicons name="refresh-outline" size={20} color={Palette.iris} />
          <Text style={styles.secondaryBtnText} numberOfLines={1}>
            Adjust targets
          </Text>
        </Pressable>
        <Text style={[styles.reassure, { color: colors.textMuted }]}>
          Runs setup again for new targets only. Your meal logs, scans, and streaks are unchanged.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  lead: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  muted: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  notice: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  heroCard: {
    borderRadius: 22,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  heroBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 1,
    color: Palette.lavender,
    textTransform: 'uppercase',
  },
  calValue: {
    fontFamily: Fonts.bold,
    fontSize: 44,
    color: Palette.iris,
  },
  calUnit: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    marginTop: 4,
  },
  updated: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    marginTop: 12,
  },
  card: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    marginBottom: 4,
  },
  cardSub: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    marginBottom: 16,
  },
  macroBlock: { marginBottom: 16 },
  macroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  macroLabel: { fontFamily: Fonts.semiBold, fontSize: 15 },
  macroGrams: { fontFamily: Fonts.medium, fontSize: 13 },
  macroTrack: {
    height: 9,
    borderRadius: 6,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 6,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  coachCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  coachTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Palette.iris,
    marginBottom: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Palette.iris,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  primaryBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  secondaryBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Palette.iris,
    flexShrink: 1,
  },
  reassure: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
