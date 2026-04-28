import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MEAL_PLAN_CARDS } from '@/constants/dashboard-mock';
import { useAuth } from '@/contexts/AuthContext';
import { useNutritionLog } from '@/contexts/NutritionLogContext';
import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import {
  buildTargetsFingerprint,
  getLogDateKey,
  loadCachedWeeklyPlan,
  saveCachedWeeklyPlan,
} from '@/lib/ai-meal-daily-cache';
import { computeCalorieStreak } from '@/lib/calorie-streak';
import { suggestWeeklyMealPlan } from '@/lib/ai-coach';
import { setMealPlanSessionMeals } from '@/lib/meal-plan-session';
import { fetchRecentDayTotals } from '@/lib/nutrition-history';
import type { AiMealBrief } from '@/types/ai-nutrition';
import { AppMenuSheet } from '@/components/AppMenuSheet';
import { CalorieCard } from '@/components/ui/CalorieCard';
import { MacroBar } from '@/components/ui/MacroBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { Palette } from '@/constants/palette';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { StyleSheet } from 'react-native';

const AI_CARD_ACCENTS = [
  { accent: Palette.iris, tint: Palette.haze },
  { accent: Palette.flamingo, tint: '#FFE8F0' },
  { accent: Palette.cyan, tint: '#EEF2FF' },
  { accent: Palette.citrus, tint: '#FFF7ED' },
] as const;

function aiBriefToCardItem(m: AiMealBrief, i: number): (typeof MEAL_PLAN_CARDS)[0] {
  const c = AI_CARD_ACCENTS[i % AI_CARD_ACCENTS.length];
  return {
    id: m.id,
    title: m.title,
    kcal: m.calories,
    tag: m.tag,
    prepMin: m.prepMin,
    accent: c.accent,
    tint: c.tint,
  };
}

function MealCard({
  item,
  width,
  onPress,
}: {
  item: (typeof MEAL_PLAN_CARDS)[0];
  width: number;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.mealCard,
        { width, backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.9 },
      ]}>
      <View style={[styles.mealAccent, { backgroundColor: item.tint }]}>
        <Ionicons name="restaurant" size={26} color={item.accent} />
      </View>
      <Text style={[styles.mealTag, { color: Palette.iris }]}>{item.tag}</Text>
      <Text style={[styles.mealTitle, { color: colors.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={styles.mealMeta}>
        <View style={[styles.metaChip, { backgroundColor: colors.chipOnLight }]}>
          <Ionicons name="flame-outline" size={13} color={Palette.citrus} />
          <Text style={[styles.metaText, { color: colors.text }]}>{item.kcal} kcal</Text>
        </View>
        <View style={[styles.metaChip, { backgroundColor: colors.chipOnLight }]}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.text }]}>{item.prepMin} min</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function HomeDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, firebaseReady } = useAuth();
  const { totals, refreshTodayLog, logSyncing } = useNutritionLog();
  const { dailyCalories, proteinG, carbsG, fatG, dietarySummary, refresh: refreshNutritionTargets } =
    useNutritionTargets();
  const cardW = Math.min(268, width * 0.72);
  const [streak, setStreak] = useState(0);
  const [weeklyPlanMeals, setWeeklyPlanMeals] = useState<AiMealBrief[] | null>(null);
  const [weeklyPlanLoading, setWeeklyPlanLoading] = useState(false);

  const mealPlanSessionCache = useRef<{
    forUserId: string | null;
    settled: boolean;
    meals: AiMealBrief[] | null;
  }>({ forUserId: null, settled: false, meals: null });

  const mealPlanTargetsRef = useRef({ dailyCalories, proteinG, carbsG, fatG, dietarySummary });
  mealPlanTargetsRef.current = { dailyCalories, proteinG, carbsG, fatG, dietarySummary };

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void refreshTodayLog();
        void refreshNutritionTargets();
      }
    }, [user, refreshTodayLog, refreshNutritionTargets])
  );

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid || !firebaseReady) { setStreak(0); return; }
      let cancelled = false;
      (async () => {
        try {
          const days = await fetchRecentDayTotals(user.uid, 120);
          if (cancelled) return;
          setStreak(computeCalorieStreak(
            dailyCalories,
            days.map((d) => ({ dateKey: d.dateKey, calories: d.calories }))
          ));
        } catch {
          if (!cancelled) setStreak(0);
        }
      })();
      return () => { cancelled = true; };
    }, [user?.uid, firebaseReady, dailyCalories])
  );

  useFocusEffect(
    useCallback(() => {
      const uid = user?.uid;
      if (!uid) {
        mealPlanSessionCache.current = { forUserId: null, settled: false, meals: null };
        setWeeklyPlanMeals(null);
        setWeeklyPlanLoading(false);
        return;
      }
      const cache = mealPlanSessionCache.current;
      if (cache.settled && cache.forUserId === uid) {
        setWeeklyPlanMeals(cache.meals);
        setWeeklyPlanLoading(false);
        if (cache.meals?.length) setMealPlanSessionMeals(cache.meals, getLogDateKey());
        return;
      }
      let cancelled = false;
      setWeeklyPlanLoading(true);
      (async () => {
        const t = mealPlanTargetsRef.current;
        const dateKey = getLogDateKey();
        const targetFp = buildTargetsFingerprint(t);
        try {
          let list = await loadCachedWeeklyPlan(dateKey, targetFp);
          if (!list?.length) {
            list = await suggestWeeklyMealPlan({
              dailyCalories: t.dailyCalories, proteinG: t.proteinG,
              carbsG: t.carbsG, fatG: t.fatG, dietaryNotes: t.dietarySummary,
            });
            if (list.length) await saveCachedWeeklyPlan(dateKey, targetFp, list);
          }
          if (cancelled) return;
          if (list.length) setMealPlanSessionMeals(list, dateKey);
          mealPlanSessionCache.current = { forUserId: uid, settled: true, meals: list };
          setWeeklyPlanMeals(list);
        } catch {
          if (!cancelled) {
            mealPlanSessionCache.current = { forUserId: uid, settled: true, meals: [] };
            setWeeklyPlanMeals([]);
          }
        } finally {
          if (!cancelled) setWeeklyPlanLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [user?.uid])
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
    []
  );

  const showMealPlanLoading = Boolean(user?.uid && (weeklyPlanMeals === null || weeklyPlanLoading));
  const suggestedSlice = weeklyPlanMeals?.length ? weeklyPlanMeals.slice(0, 4) : [];
  const displayMeals =
    suggestedSlice.length > 0
      ? suggestedSlice.map((m, i) => ({ item: aiBriefToCardItem(m, i), recipeIdx: i }))
      : MEAL_PLAN_CARDS.map((item) => ({ item, recipeIdx: null }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
      <AppMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces>

        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.greeting, { color: colors.text }]}>{greeting}</Text>
              <Text style={[styles.dateLine, { color: colors.textMuted }]}>{dateLabel}</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={[styles.iconBtn, { backgroundColor: colors.iconWell, borderColor: colors.iconWellBorder }]}
                onPress={() => router.push('/subscription')}
                accessibilityRole="button"
                accessibilityLabel="CalTrack Pro">
                <Ionicons name="sparkles" size={20} color={Palette.iris} />
              </Pressable>
              <Pressable
                style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setMenuOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Open app menu">
                <Ionicons name="person-circle-outline" size={26} color={Palette.iris} />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Streak banner */}
        {streak > 0 ? (
          <Animated.View
            entering={FadeInDown.delay(30).duration(380).springify()}
            style={[styles.streakCard, { backgroundColor: colors.streakBg, borderColor: colors.border }]}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={[styles.streakNum, { color: colors.streakText }]}>{streak}</Text>
            <Text style={[styles.streakSuffix, { color: colors.streakText }]}> day streak</Text>
          </Animated.View>
        ) : null}

        {/* Calorie card */}
        <Animated.View entering={FadeInDown.delay(60).duration(420).springify()}>
          <CalorieCard
            consumed={totals.calories}
            goal={dailyCalories}
            syncing={Boolean(user && logSyncing)}
            isDark={isDark}
          />
        </Animated.View>

        {/* Macros */}
        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <SectionHeader
            title="Macros"
            actionLabel="Edit targets"
            onAction={() => router.push('/nutrition-targets' as Href)}
          />
          <MacroBar
            label="Protein"
            current={Math.round(totals.proteinGrams)}
            goal={proteinG}
            color={Palette.flamingo}
            colorEnd="#F472B6"
            tint="#FFE8F0"
            icon="fitness-outline"
            delay={120}
          />
          <MacroBar
            label="Carbs"
            current={Math.round(totals.carbsGrams)}
            goal={carbsG}
            color={Palette.citrus}
            colorEnd="#FBBF24"
            tint="#FFF7ED"
            icon="leaf-outline"
            delay={150}
          />
          <MacroBar
            label="Fats"
            current={Math.round(totals.fatGrams)}
            goal={fatG}
            color={Palette.cyan}
            colorEnd="#818CF8"
            tint="#EEF2FF"
            icon="water-outline"
            delay={180}
          />
        </Animated.View>

        {/* Suggested meals */}
        <Animated.View entering={FadeInDown.delay(140).duration(400).springify()}>
          <SectionHeader
            title="Suggested meals"
            actionLabel="Full week plan"
            onAction={() => router.push('/meal-plan/weekly' as Href)}
          />
          {showMealPlanLoading ? (
            <View style={styles.mealLoader}>
              <ActivityIndicator size="small" color={Palette.iris} />
              <Text style={[styles.mealLoaderText, { color: colors.textMuted }]}>Loading your plan…</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mealScroll}
              decelerationRate="fast"
              snapToInterval={cardW + 12}>
              {displayMeals.map(({ item, recipeIdx }) => (
                <MealCard
                  key={item.id}
                  item={item}
                  width={cardW}
                  onPress={() =>
                    recipeIdx !== null
                      ? router.push(`/meal-recipe?idx=${recipeIdx}` as Href)
                      : router.push('/meal-plan/weekly' as Href)
                  }
                />
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* Groceries teaser */}
        <Animated.View
          entering={FadeInDown.delay(180).duration(400).springify()}
          style={[styles.groceryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.groceryRow}>
            <View style={[styles.groceryIcon, { backgroundColor: colors.iconWell }]}>
              <Ionicons name="cart-outline" size={20} color={Palette.iris} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.groceryTitle, { color: colors.text }]}>Suggested groceries</Text>
              <Text style={[styles.grocerySub, { color: colors.textMuted }]} numberOfLines={2}>
                Weekly list from your targets. Refreshes once per day.
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.groceryBtn, { backgroundColor: colors.chipOnLight, borderColor: colors.borderStrong }]}
            onPress={() => router.push('/(tabs)/groceries' as Href)}
            accessibilityRole="button">
            <Ionicons name="basket-outline" size={18} color={Palette.iris} />
            <Text style={[styles.groceryBtnText, { color: Palette.iris }]}>Open AI grocery suggestions</Text>
          </Pressable>
        </Animated.View>

        <View style={{ height: 24 }} />
      </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0FDF4' },
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 20,
  },
  greeting: { fontFamily: Fonts.bold, fontSize: 28, lineHeight: 34 },
  dateLine: { fontFamily: Fonts.regular, fontSize: 15, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  streakEmoji: { fontSize: 26 },
  streakNum: { fontFamily: Fonts.bold, fontSize: 24, letterSpacing: -0.5 },
  streakSuffix: { fontFamily: Fonts.semiBold, fontSize: 16 },
  mealLoader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 24, paddingHorizontal: 4,
  },
  mealLoaderText: { fontFamily: Fonts.regular, fontSize: 14 },
  mealScroll: { paddingRight: 20, gap: 12, paddingBottom: 8 },
  mealCard: {
    borderRadius: 20, padding: 16, marginRight: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  mealAccent: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  mealTag: {
    fontFamily: Fonts.semiBold, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
  },
  mealTitle: {
    fontFamily: Fonts.bold, fontSize: 17, lineHeight: 22,
    marginBottom: 12, minHeight: 44,
  },
  mealMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  metaText: { fontFamily: Fonts.medium, fontSize: 12 },
  groceryCard: {
    borderRadius: 24, padding: 18, marginTop: 20, borderWidth: 1,
  },
  groceryRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 12, marginBottom: 14,
  },
  groceryIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  groceryTitle: { fontFamily: Fonts.bold, fontSize: 17 },
  grocerySub: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, marginTop: 4 },
  groceryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1,
  },
  groceryBtnText: { fontFamily: Fonts.semiBold, fontSize: 14 },
});
