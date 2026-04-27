import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import {
  buildDietaryFingerprint,
  buildTargetsFingerprint,
  getLogDateKey,
  loadCachedRecipe,
  loadCachedWeeklyPlan,
  saveCachedRecipe,
} from '@/lib/ai-meal-daily-cache';
import { expandMealToRecipe } from '@/lib/ai-coach';
import {
  getMealPlanSessionAt,
  getMealPlanSessionPlanDateKey,
  setMealPlanSessionMeals,
} from '@/lib/meal-plan-session';
import type { AiMealRecipe } from '@/types/ai-nutrition';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

export default function MealRecipeScreen() {
  const router = useRouter();
  const { idx } = useLocalSearchParams<{ idx?: string }>();
  const { dailyCalories, proteinG, carbsG, fatG, dietarySummary } = useNutritionTargets();
  const index = Math.max(0, parseInt(idx ?? '0', 10) || 0);
  const [recipe, setRecipe] = useState<AiMealRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const dateKey = getLogDateKey();
    const targetFp = buildTargetsFingerprint({
      dailyCalories,
      proteinG,
      carbsG,
      fatG,
      dietarySummary,
    });
    let brief = getMealPlanSessionAt(index);
    let planDateKey = getMealPlanSessionPlanDateKey();
    if (!brief) {
      const cachedPlan = await loadCachedWeeklyPlan(dateKey, targetFp);
      if (cachedPlan?.[index]) {
        brief = cachedPlan[index];
        planDateKey = dateKey;
        setMealPlanSessionMeals(cachedPlan, dateKey);
      }
    }
    if (!brief || !planDateKey) {
      setError("Open this recipe from today's meal plan list.");
      setLoading(false);
      return;
    }
    const dietaryFp = buildDietaryFingerprint(dietarySummary);
    setLoading(true);
    setError(null);
    try {
      const cachedRecipe = await loadCachedRecipe(planDateKey, index, brief, dietaryFp);
      if (cachedRecipe) {
        setRecipe(cachedRecipe);
        return;
      }
      const full = await expandMealToRecipe(brief, dietarySummary);
      await saveCachedRecipe(planDateKey, index, brief, dietaryFp, full);
      setRecipe(full);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load recipe');
    } finally {
      setLoading(false);
    }
  }, [index, dietarySummary, dailyCalories, proteinG, carbsG, fatG]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Palette.iris} />
            <Text style={styles.muted}>Writing your recipe…</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.center}>
            <Text style={styles.err}>{error}</Text>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backBtnText}>Go back</Text>
            </Pressable>
          </View>
        ) : null}
        {recipe && !loading ? (
          <>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons name="flame" size={28} color={Palette.citrus} />
              </View>
              <Text style={styles.title}>{recipe.title}</Text>
              <Text style={styles.meta}>
                {recipe.prepMin} min · {recipe.calories} kcal · {recipe.tag}
              </Text>
              <Text style={styles.macroLine}>
                Macros · P {recipe.proteinG}g · C {recipe.carbsG}g · F {recipe.fatG}g
              </Text>
            </View>
            <Text style={styles.section}>Ingredients</Text>
            {recipe.ingredients.map((line, i) => (
              <View key={i} style={styles.lineRow}>
                <View style={styles.dot} />
                <Text style={styles.lineText}>{line}</Text>
              </View>
            ))}
            <Text style={[styles.section, { marginTop: 22 }]}>How to prepare</Text>
            {recipe.steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepNum}>{i + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.ghost },
  scroll: { padding: 20, paddingBottom: 40 },
  center: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  hero: { marginBottom: 20 },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF8EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontFamily: Fonts.bold, fontSize: 26, color: Palette.obsidian, lineHeight: 32 },
  meta: { fontFamily: Fonts.medium, fontSize: 15, color: Palette.dusk, marginTop: 8 },
  macroLine: { fontFamily: Fonts.regular, fontSize: 14, color: Palette.iris, marginTop: 6 },
  section: { fontFamily: Fonts.bold, fontSize: 18, color: Palette.obsidian, marginBottom: 12 },
  lineRow: { flexDirection: 'row', gap: 10, marginBottom: 8, paddingRight: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.lavender,
    marginTop: 6,
  },
  lineText: { flex: 1, fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: Palette.obsidian },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  stepNum: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Palette.iris,
    width: 24,
  },
  stepText: { flex: 1, fontFamily: Fonts.regular, fontSize: 15, lineHeight: 23, color: Palette.obsidian },
  muted: { fontFamily: Fonts.regular, fontSize: 14, color: Palette.dusk },
  err: { fontFamily: Fonts.medium, fontSize: 15, color: Palette.overText, textAlign: 'center' },
  backBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Palette.haze,
    borderRadius: 999,
  },
  backBtnText: { fontFamily: Fonts.semiBold, fontSize: 15, color: Palette.iris },
});
