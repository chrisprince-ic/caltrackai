import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CurvedHeroScreen } from '@/components/CurvedHeroScreen';
import { IconButton } from '@/components/hero/IconButton';
import { MealPlanFeaturedCard } from '@/components/meal-plans/MealPlanFeaturedCard';
import { MealPlanIdeaCard } from '@/components/meal-plans/MealPlanIdeaCard';
import { MealPlanSortSheet } from '@/components/meal-plans/MealPlanSortSheet';
import { MEAL_PLAN_CARDS } from '@/constants/dashboard-mock';
import {
  IDEA_FILTER_CHIPS,
  inferMealSlot,
  matchesIdeaFilter,
  type IdeaFilterId,
  type IdeaSortId,
  type MealSlot,
} from '@/constants/mealCategories';
import { COLORS, Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import {
  buildTargetsFingerprint,
  clearCachedWeeklyPlan,
  getLogDateKey,
  loadCachedWeeklyPlan,
  saveCachedWeeklyPlan,
} from '@/lib/ai-meal-daily-cache';
import { suggestWeeklyMealPlan } from '@/lib/ai-coach';
import { setMealPlanSessionMeals } from '@/lib/meal-plan-session';
import type { AiMealBrief } from '@/types/ai-nutrition';

type MealCardItem = {
  id: string;
  title: string;
  kcal: number;
  prepMin: number;
  tag: string;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  recipeIdx?: number;
};

type EnrichedMeal = MealCardItem & { slot: MealSlot };

function aiBriefToCardItem(m: AiMealBrief, idx: number): MealCardItem {
  return {
    id: m.id,
    title: m.title,
    kcal: m.calories,
    prepMin: m.prepMin,
    tag: m.tag,
    proteinG: m.proteinG,
    carbsG: m.carbsG,
    fatG: m.fatG,
    recipeIdx: idx,
  };
}

function sortIdeas(list: EnrichedMeal[], sort: IdeaSortId): EnrichedMeal[] {
  const arr = [...list];
  switch (sort) {
    case 'recommended':
      return arr;
    case 'quick':
      return arr.sort((a, b) => a.prepMin - b.prepMin);
    case 'protein':
      return arr.sort((a, b) => (b.proteinG ?? 0) - (a.proteinG ?? 0));
    case 'calories':
      return arr.sort((a, b) => a.kcal - b.kcal);
    default:
      return arr;
  }
}

export default function MealPlansScreen() {
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const { dailyCalories, proteinG, carbsG, fatG, dietarySummary } = useNutritionTargets();

  const [meals, setMeals] = useState<AiMealBrief[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<IdeaFilterId>('all');
  const [sort, setSort] = useState<IdeaSortId>('recommended');
  const [sortOpen, setSortOpen] = useState(false);

  const loadPlan = useCallback(
    async (force: boolean) => {
      if (!user?.uid) {
        setMeals(null);
        return;
      }
      const dateKey = getLogDateKey();
      const targetFp = buildTargetsFingerprint({
        dailyCalories,
        proteinG,
        carbsG,
        fatG,
        dietarySummary,
      });
      try {
        let list = force ? null : await loadCachedWeeklyPlan(dateKey, targetFp);
        if (!list?.length) {
          list = await suggestWeeklyMealPlan({
            dailyCalories,
            proteinG,
            carbsG,
            fatG,
            dietaryNotes: dietarySummary,
          });
          if (list.length) {
            await saveCachedWeeklyPlan(dateKey, targetFp, list);
          }
        }
        if (list.length) setMealPlanSessionMeals(list, dateKey);
        setMeals(list);
      } catch {
        setMeals([]);
      }
    },
    [user?.uid, dailyCalories, proteinG, carbsG, fatG, dietarySummary]
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!user?.uid) {
          setMeals(null);
          return;
        }
        setLoading(true);
        try {
          await loadPlan(false);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.uid, loadPlan])
  );

  const onGenerateNew = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await clearCachedWeeklyPlan();
      await loadPlan(true);
    } finally {
      setGenerating(false);
    }
  }, [generating, loadPlan]);

  const items: MealCardItem[] = useMemo(() => {
    if (meals && meals.length > 0) {
      return meals.map(aiBriefToCardItem);
    }
    if (user?.uid) {
      return [];
    }
    return MEAL_PLAN_CARDS.map((m, i) => ({
      id: m.id,
      title: m.title,
      kcal: m.kcal,
      prepMin: m.prepMin,
      tag: m.tag,
      proteinG: m.proteinG,
      carbsG: m.carbsG,
      recipeIdx: i,
    }));
  }, [meals, user?.uid]);

  const enriched: EnrichedMeal[] = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        slot: inferMealSlot(item.title, item.tag),
      })),
    [items]
  );

  const filtered = useMemo(
    () => enriched.filter((m) => matchesIdeaFilter(m, filter)),
    [enriched, filter]
  );

  const sorted = useMemo(() => sortIdeas(filtered, sort), [filtered, sort]);

  const showLoader = loading && (meals === null || meals.length === 0);
  const hasIdeas = items.length > 0;
  const featuredHasPlan = user?.uid ? Boolean(meals && meals.length > 0) : hasIdeas;
  const featuredMealCount = user?.uid ? (meals?.length ?? 0) : items.length;
  const iconInk = isDark ? '#F4FCE8' : COLORS.ink;

  const onFilter = (id: IdeaFilterId) => {
    setFilter(id);
    void Haptics.selectionAsync().catch(() => {});
  };

  return (
    <CurvedHeroScreen
      title="Meal plans"
      subtitle="Built from your daily targets"
      tabRoot
      rightActions={
        <IconButton
          name="add"
          onPress={() => void onGenerateNew()}
          accessibilityLabel="Generate new plan"
          iconColor={iconInk}
          disabled={generating || !user?.uid}
        />
      }>
      <Animated.View entering={FadeInDown.delay(40).duration(400)}>
        <MealPlanFeaturedCard
          mealCount={featuredMealCount}
          hasIdeas={featuredHasPlan}
          generating={generating}
          canGenerate={Boolean(user?.uid)}
          onNewPlan={() => void onGenerateNew()}
        />
      </Animated.View>

      {!showLoader && hasIdeas ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
            style={styles.chipScrollView}>
            {IDEA_FILTER_CHIPS.map((c) => {
              const active = filter === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => onFilter(c.id)}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: COLORS.ink }
                      : {
                          backgroundColor: colors.surface,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: colors.border,
                        },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}>
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? COLORS.white : colors.text },
                    ]}
                    numberOfLines={1}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.sectionHead}>
            <Text style={[styles.sectionKicker, { color: colors.textMuted }]}>
              RECIPE IDEAS · {sorted.length}
            </Text>
            <Pressable
              onPress={() => setSortOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Sort recipe ideas">
              <Text style={styles.sortLink}>Sort</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {showLoader ? (
        <View style={styles.cardLoader}>
          <ActivityIndicator color={Palette.iris} />
          <Text style={[styles.cardLoaderText, { color: colors.textMuted }]}>
            Building your plan…
          </Text>
        </View>
      ) : !showLoader && !hasIdeas && user?.uid ? (
        <View style={styles.emptyFull}>
          <Ionicons name="restaurant-outline" size={64} color="#D1D5DB" />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No ideas yet</Text>
          <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
            Generate a meal plan to see recipe ideas here.
          </Text>
          <Pressable
            onPress={() => void onGenerateNew()}
            disabled={generating}
            style={({ pressed }) => [
              styles.emptyCta,
              generating && { opacity: 0.6 },
              pressed && !generating && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Generate plan">
            {generating ? (
              <ActivityIndicator color={Palette.white} />
            ) : (
              <Text style={styles.emptyCtaText}>Generate plan</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <>
          {sorted.length === 0 ? (
            <View style={[styles.filterEmpty, { borderColor: colors.border }]}>
              <Text style={[styles.filterEmptyTitle, { color: colors.text }]}>
                No meals match this filter
              </Text>
              <Pressable onPress={() => onFilter('all')} accessibilityRole="button">
                <Text style={styles.clearLink}>Clear filter</Text>
              </Pressable>
            </View>
          ) : (
            sorted.map((item, i) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(60 + i * 28).duration(360).springify()}>
                <MealPlanIdeaCard item={item} />
              </Animated.View>
            ))
          )}
        </>
      )}

      <MealPlanSortSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        sort={sort}
        onSelect={(id) => {
          setSort(id);
          void Haptics.selectionAsync().catch(() => {});
        }}
      />
    </CurvedHeroScreen>
  );
}

const styles = StyleSheet.create({
  chipScrollView: { marginBottom: 12 },
  chipScroll: {
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 2,
    alignItems: 'center',
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 100,
  },
  chipText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionKicker: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  sortLink: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Palette.iris,
  },
  cardLoader: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  cardLoaderText: { fontFamily: Fonts.regular, fontSize: 14 },
  emptyFull: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: { fontFamily: Fonts.semiBold, fontSize: 18, marginTop: 8 },
  emptyBody: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyCta: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Palette.iris,
    minWidth: 200,
    alignItems: 'center',
  },
  emptyCtaText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: COLORS.white,
  },
  filterEmpty: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  filterEmptyTitle: { fontFamily: Fonts.semiBold, fontSize: 15 },
  clearLink: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Palette.iris,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
