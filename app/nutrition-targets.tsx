import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
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
  return (
    <View style={styles.macroBlock}>
      <View style={styles.macroTop}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroGrams}>
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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          These numbers power your home dashboard, meal suggestions, and insights. Meal logs and history are never
          cleared when you update targets.
        </Text>

        {loading ? (
          <Text style={styles.muted}>Loading targets…</Text>
        ) : !hasSavedPlan ? (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={22} color={Palette.iris} />
            <Text style={styles.noticeText}>
              No saved plan found for this account yet. Run onboarding once to set custom calories and macros (defaults
              are shown below until then).
            </Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Ionicons name="flame" size={16} color={Palette.iris} />
            <Text style={styles.heroBadgeText}>Daily calorie target</Text>
          </View>
          <Text style={styles.calValue}>{dailyCalories.toLocaleString()}</Text>
          <Text style={styles.calUnit}>kcal / day</Text>
          {updatedLabel ? (
            <Text style={styles.updated}>Last updated {updatedLabel}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Macro targets</Text>
          <Text style={styles.cardSub}>Grams per day (same as Home)</Text>
          <MacroRow
            label="Protein"
            grams={proteinG}
            pct={macroPct.proteinPct}
            color={Palette.flamingo}
            trackBg="#FFE8F0"
          />
          <MacroRow
            label="Carbs"
            grams={carbsG}
            pct={macroPct.carbsPct}
            color={Palette.citrus}
            trackBg="#FFF8EB"
          />
          <MacroRow label="Fats" grams={fatG} pct={macroPct.fatPct} color={Palette.cyan} trackBg="#E0F8FA" />
        </View>

        {dietarySummary ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dietary context</Text>
            <Text style={styles.body}>{dietarySummary}</Text>
          </View>
        ) : null}

        {coachNote ? (
          <View style={styles.coachCard}>
            <Ionicons name="sparkles" size={22} color={Palette.iris} />
            <View style={{ flex: 1 }}>
              <Text style={styles.coachTitle}>AI coach note</Text>
              <Text style={styles.body}>{coachNote}</Text>
            </View>
          </View>
        ) : hasSavedPlan && aiCoachEnabled ? (
          <Text style={styles.muted}>
            No AI coach note on file. After you re-run onboarding with DeepSeek configured, a short personalized note can
            appear here.
          </Text>
        ) : null}

        {!aiCoachEnabled ? (
          <Text style={styles.muted}>
            AI coaching is not available on this account. Re-run onboarding to update your targets.
          </Text>
        ) : null}

        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push('/(tabs)/insights' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Open insights and trends">
          <Ionicons name="stats-chart-outline" size={20} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Open Insights (trends & coaching)</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.push('/onboarding?updateTargets=1' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Update nutrition targets with onboarding">
          <Ionicons name="refresh-outline" size={20} color={Palette.iris} />
          <Text style={styles.secondaryBtnText}>Update targets — re-run onboarding</Text>
        </Pressable>
        <Text style={styles.reassure}>
          Re-running onboarding only changes your calorie and macro targets. Scans, logs, and streaks stay on your
          account.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.ghost },
  scroll: { padding: 20, paddingBottom: 40 },
  lead: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Palette.dusk,
    marginBottom: 20,
  },
  muted: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Palette.dusk,
    marginBottom: 16,
  },
  notice: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.1)',
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Palette.obsidian,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.08)',
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
    color: Palette.dusk,
    marginTop: 4,
  },
  updated: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Palette.dusk,
    marginTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.08)',
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Palette.obsidian,
    marginBottom: 4,
  },
  cardSub: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Palette.dusk,
    marginBottom: 16,
  },
  macroBlock: { marginBottom: 16 },
  macroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  macroLabel: { fontFamily: Fonts.semiBold, fontSize: 15, color: Palette.obsidian },
  macroGrams: { fontFamily: Fonts.medium, fontSize: 13, color: Palette.dusk },
  macroTrack: {
    height: 10,
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
    color: Palette.obsidian,
  },
  coachCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Palette.haze,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.12)',
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
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.2)',
    marginBottom: 12,
  },
  secondaryBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Palette.iris,
  },
  reassure: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Palette.dusk,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
