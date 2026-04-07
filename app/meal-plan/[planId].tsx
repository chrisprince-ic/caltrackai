import { Ionicons } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import {
  buildTargetsFingerprint,
  getLogDateKey,
  loadCachedWeeklyPlan,
  saveCachedWeeklyPlan,
} from '@/lib/ai-meal-daily-cache';
import { suggestWeeklyMealPlan } from '@/lib/gemini-coach';
import { setMealPlanSessionMeals } from '@/lib/meal-plan-session';
import type { AiMealBrief } from '@/types/ai-nutrition';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

const ACCENTS = [Palette.iris, Palette.flamingo, Palette.cyan, Palette.citrus];

export default function MealPlanListScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { dailyCalories, proteinG, carbsG, fatG, dietarySummary } = useNutritionTargets();
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
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>AI meal plan</Text>
        <Text style={styles.sub}>
          Suggested meals for ~{dailyCalories.toLocaleString()} kcal/day · tap for full recipe · refreshed once per day
        </Text>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Palette.iris} />
            <Text style={styles.loadingText}>Generating your plan…</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {!loading &&
          meals?.map((m, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <Pressable
                key={m.id}
                style={styles.row}
                onPress={() =>
                  router.push(`/meal-recipe?idx=${i}` as Href)
                }>
                <View style={[styles.thumb, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
                  <Ionicons name="restaurant" size={22} color={accent} />
                </View>
                <View style={styles.body}>
                  <Text style={styles.rowTitle}>{m.title}</Text>
                  <Text style={styles.rowMeta}>
                    {m.calories} kcal · {m.prepMin} min · P{m.proteinG} C{m.carbsG} F{m.fatG} · {m.tag}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Palette.dusk} style={{ opacity: 0.4 }} />
              </Pressable>
            );
          })}
        {!loading && meals?.length === 0 && !error ? (
          <Text style={styles.err}>No meals returned. Check Gemini API key and try again.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.ghost },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontFamily: Fonts.bold, fontSize: 24, color: Palette.obsidian },
  sub: { fontFamily: Fonts.regular, fontSize: 14, color: Palette.dusk, marginTop: 8, marginBottom: 20, lineHeight: 20 },
  center: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontFamily: Fonts.medium, fontSize: 14, color: Palette.dusk },
  err: { fontFamily: Fonts.regular, fontSize: 14, color: Palette.overText, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.08)',
    gap: 14,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.haze,
  },
  body: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Palette.obsidian },
  rowMeta: { fontFamily: Fonts.regular, fontSize: 12, color: Palette.dusk, marginTop: 4 },
});
