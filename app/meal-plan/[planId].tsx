import { Ionicons } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import { useAppTheme } from '@/contexts/AppThemeContext';
import {
  buildTargetsFingerprint,
  getLogDateKey,
  loadCachedWeeklyPlan,
  saveCachedWeeklyPlan,
} from '@/lib/ai-meal-daily-cache';
import { suggestWeeklyMealPlan } from '@/lib/ai-coach';
import { setMealPlanSessionMeals } from '@/lib/meal-plan-session';
import type { AiMealBrief } from '@/types/ai-nutrition';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

const ACCENTS = [Palette.iris, Palette.flamingo, Palette.cyan, Palette.citrus];

export default function MealPlanListScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { dailyCalories, proteinG, carbsG, fatG, dietarySummary } = useNutritionTargets();
  const { colors } = useAppTheme();
  const [meals, setMeals] = useState<AiMealBrief[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const dateKey = getLogDateKey();
    const targetFp = buildTargetsFingerprint({
      dailyCalories,
      proteinG,
      carbsG,
      fatG,
      dietarySummary,
    });
    try {
      const cached = await loadCachedWeeklyPlan(dateKey, targetFp);
      if (cached?.length) {
        setMeals(cached);
        setMealPlanSessionMeals(cached, dateKey);
        return;
      }
      const list = await suggestWeeklyMealPlan({
        dailyCalories,
        proteinG,
        carbsG,
        fatG,
        dietaryNotes: dietarySummary,
      });
      await saveCachedWeeklyPlan(dateKey, targetFp, list);
      setMeals(list);
      setMealPlanSessionMeals(list, dateKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load meals');
      setMeals([]);
    } finally {
      setLoading(false);
    }
  }, [dailyCalories, proteinG, carbsG, fatG, dietarySummary]);

  useEffect(() => {
    void load();
  }, [load, planId]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>AI meal plan</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Suggested meals for ~{dailyCalories.toLocaleString()} kcal/day · tap for full recipe · refreshed once per day
        </Text>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Palette.iris} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Generating your plan…</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {!loading &&
          meals?.map((m, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <Pressable
                key={m.id}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.92 },
                ]}
                onPress={() => router.push(`/meal-recipe?idx=${i}` as Href)}>
                <View style={[styles.thumb, { borderLeftColor: accent, borderLeftWidth: 3, backgroundColor: colors.haze }]}>
                  <Ionicons name="restaurant" size={22} color={accent} />
                </View>
                <View style={styles.body}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{m.title}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
                    {m.calories} kcal · {m.prepMin} min · P{m.proteinG} C{m.carbsG} F{m.fatG} · {m.tag}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{ opacity: 0.5 }} />
              </Pressable>
            );
          })}
        {!loading && meals?.length === 0 && !error ? (
          <Text style={styles.err}>No meals returned. Check EXPO_PUBLIC_DEEPSEEK_API_KEY and try again.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontFamily: Fonts.bold, fontSize: 24 },
  sub: { fontFamily: Fonts.regular, fontSize: 14, marginTop: 8, marginBottom: 20, lineHeight: 20 },
  center: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontFamily: Fonts.medium, fontSize: 14 },
  err: { fontFamily: Fonts.regular, fontSize: 14, color: Palette.overText, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 14,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: Fonts.semiBold, fontSize: 16 },
  rowMeta: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 4 },
});
