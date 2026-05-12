import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CurvedHeroScreen } from '@/components/CurvedHeroScreen';
import { IconButton } from '@/components/hero/IconButton';
import { TimeOfDayIcon } from '@/components/home/energy/TimeOfDayIcon.skia';

import { HERO } from '@/constants/hero';
import { MEAL_PLAN_CARDS } from '@/constants/dashboard-mock';
import { useAuth } from '@/contexts/AuthContext';
import { useNutritionLog } from '@/contexts/NutritionLogContext';
import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import {
  buildTargetsFingerprint,
  getLogDateKey,
  loadCachedWeeklyPlan,
  saveCachedWeeklyPlan,
  subscribeWeeklyPlanInvalidation,
} from '@/lib/ai-meal-daily-cache';
import { computeCalorieStreak } from '@/lib/calorie-streak';
import { suggestWeeklyMealPlan } from '@/lib/ai-coach';
import { setMealPlanSessionMeals } from '@/lib/meal-plan-session';
import { fetchRecentDayTotals } from '@/lib/nutrition-history';
import type { AiMealBrief } from '@/types/ai-nutrition';
import type { LoggedMealEntry } from '@/types/logged-meal';
import { AppMenuSheet } from '@/components/AppMenuSheet';
import { DailyEnergyCard } from '@/components/home/DailyEnergyCard';
import { MacroBar } from '@/components/ui/MacroBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { COLORS, Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const AI_CARD_ACCENTS = [
  { accent: Palette.iris, tint: Palette.haze },
  { accent: Palette.amber, tint: Palette.amberSoft },
  { accent: Palette.violet, tint: Palette.violetSoft },
  { accent: Palette.rose, tint: Palette.roseSoft },
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

function mealSlotLabel(hour: number): string {
  if (hour < 11) return 'Breakfast';
  if (hour < 16) return 'Lunch';
  if (hour < 19) return 'Snack';
  return 'Dinner';
}

function formatMealTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
      <Text style={[styles.mealTag, { color: item.accent }]}>{item.tag}</Text>
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

function RecentMealRow({
  entry,
  colors,
  onPress,
}: {
  entry: LoggedMealEntry;
  colors: {
    surface: string;
    border: string;
    text: string;
    textMuted: string;
  };
  onPress: () => void;
}) {
  const d = new Date(entry.loggedAt);
  const slot = mealSlotLabel(d.getHours());
  const sub = `${slot} · ${formatMealTime(entry.loggedAt)}`;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.recentRow,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.92 },
      ]}>
      <View style={[styles.recentIcon, { backgroundColor: Palette.haze }]}>
        <Ionicons name="restaurant" size={18} color={Palette.lavender} />
      </View>
      <View style={styles.recentMid}>
        <View style={styles.recentTopLine}>
          <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>
            {entry.foodName}
          </Text>
          <Text style={[styles.recentKcal, { color: colors.text }]}>
            {Math.round(entry.calories).toLocaleString()} kcal
          </Text>
        </View>
        <Text style={[styles.recentSub, { color: colors.textMuted }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </Pressable>
  );
}

export function HomeDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const { colors, isDark } = useAppTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user, firebaseReady } = useAuth();
  const { totals, refreshTodayLog, logSyncing, entries } = useNutritionLog();
  const { dailyCalories, proteinG, carbsG, fatG, dietarySummary, refresh: refreshNutritionTargets } =
    useNutritionTargets();
  const cardW = Math.min(268, width * 0.72);
  const [streak, setStreak] = useState(0);
  const [weeklyPlanMeals, setWeeklyPlanMeals] = useState<AiMealBrief[] | null>(null);
  const [weeklyPlanLoading, setWeeklyPlanLoading] = useState(false);

  const iconInk = isDark ? '#F4FCE8' : '#1A2B26';

  const mealPlanSessionCache = useRef<{
    forUserId: string | null;
    settled: boolean;
    meals: AiMealBrief[] | null;
  }>({ forUserId: null, settled: false, meals: null });

  const mealPlanTargetsRef = useRef({ dailyCalories, proteinG, carbsG, fatG, dietarySummary });
  mealPlanTargetsRef.current = { dailyCalories, proteinG, carbsG, fatG, dietarySummary };

  const [planInvalidationTick, setPlanInvalidationTick] = useState(0);
  useEffect(() => {
    return subscribeWeeklyPlanInvalidation(() => {
      mealPlanSessionCache.current = { forUserId: null, settled: false, meals: null };
      setWeeklyPlanMeals(null);
      setPlanInvalidationTick((t) => t + 1);
    });
  }, []);

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
      if (!user?.uid || !firebaseReady) {
        setStreak(0);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          const days = await fetchRecentDayTotals(user.uid, 120);
          if (cancelled) return;
          setStreak(
            computeCalorieStreak(
              dailyCalories,
              days.map((d) => ({ dateKey: d.dateKey, calories: d.calories }))
            )
          );
        } catch {
          if (!cancelled) setStreak(0);
        }
      })();
      return () => {
        cancelled = true;
      };
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
              dailyCalories: t.dailyCalories,
              proteinG: t.proteinG,
              carbsG: t.carbsG,
              fatG: t.fatG,
              dietaryNotes: t.dietarySummary,
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
      return () => {
        cancelled = true;
      };
    }, [user?.uid, planInvalidationTick])
  );

  const firstName = user?.displayName?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const phrase =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const fullGreeting = `${phrase}, ${firstName}`;
  const displayGreeting = fullGreeting.length > 22 ? `Hi, ${firstName}` : fullGreeting;
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user) {
        await Promise.all([refreshTodayLog(), refreshNutritionTargets()]);
      }
    } finally {
      setRefreshing(false);
    }
  }, [user, refreshTodayLog, refreshNutritionTargets]);

  const showMealPlanLoading = Boolean(user?.uid && (weeklyPlanMeals === null || weeklyPlanLoading));
  const suggestedSlice = weeklyPlanMeals?.length ? weeklyPlanMeals.slice(0, 4) : [];
  const displayMeals =
    suggestedSlice.length > 0
      ? suggestedSlice.map((m, i) => ({ item: aiBriefToCardItem(m, i), recipeIdx: i }))
      : MEAL_PLAN_CARDS.map((item) => ({ item, recipeIdx: null }));

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.loggedAt - a.loggedAt),
    [entries]
  );

  return (
    <>
      <CurvedHeroScreen
        title={displayGreeting}
        titleAffix={<TimeOfDayIcon reducedMotion={reducedMotion} />}
        subtitle={dateLabel}
        heroExpanded={HERO.EXPANDED}
        /** Pull first card up so it sits on the green hero (~overlap px = this value). */
        contentInset={80}
        titleSizeExpanded={22}
        rightActions={
          <>
            <IconButton
              name="sparkles"
              onPress={() => router.push('/subscription')}
              accessibilityLabel="CalTrack Pro"
              iconColor={iconInk}
            />
            <IconButton
              name="person-outline"
              onPress={() => setMenuOpen(true)}
              accessibilityLabel="Open app menu"
              iconColor={iconInk}
            />
          </>
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
        tabRoot
        titleDualWeight
        titleSizeCollapsed={18}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <DailyEnergyCard />
        </Animated.View>

        {streak > 0 ? (
          <Animated.View
            entering={FadeInDown.delay(30).duration(380).springify()}
            style={[styles.streakCard, { backgroundColor: colors.streakBg, borderColor: colors.border }]}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={[styles.streakNum, { color: colors.streakText }]}>{streak}</Text>
            <Text style={[styles.streakSuffix, { color: colors.streakText }]}> day streak</Text>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <SectionHeader
            title="Macros"
            syncing={Boolean(user && logSyncing)}
            actionLabel="Edit targets"
            actionColor={COLORS.brandGreen}
            onAction={() => router.push('/nutrition-targets' as Href)}
            primaryAction={{
              label: '+ Log meal',
              onPress: () => router.push('/manual-entry' as Href),
            }}
            primaryActionTone="dark"
          />
          <MacroBar
            label="Protein"
            current={Math.round(totals.proteinGrams)}
            goal={proteinG}
            color={Palette.flamingo}
            colorEnd="#38B273"
            tint={Palette.haze}
            icon="fitness-outline"
            delay={120}
          />
          <MacroBar
            label="Carbs"
            current={Math.round(totals.carbsGrams)}
            goal={carbsG}
            color={Palette.citrus}
            colorEnd="#E5B840"
            tint={Palette.amberSoft}
            icon="leaf-outline"
            delay={150}
          />
          <MacroBar
            label="Fats"
            current={Math.round(totals.fatGrams)}
            goal={fatG}
            color={Palette.cyan}
            colorEnd="#8E70D0"
            tint={Palette.violetSoft}
            icon="water-outline"
            delay={180}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(400).springify()} style={styles.recentBlock}>
          <SectionHeader title="Recent meals" />
          {sortedEntries.length === 0 ? (
            <Pressable
              onPress={() => router.push('/manual-entry' as Href)}
              style={({ pressed }) => [
                styles.recentEmpty,
                { borderColor: colors.border },
                pressed && { opacity: 0.9 },
              ]}>
              <Ionicons name="add-circle-outline" size={22} color={COLORS.brandGreenDark} />
              <Text style={[styles.recentEmptyText, { color: colors.textMuted }]}>
                + Log your first meal
              </Text>
            </Pressable>
          ) : (
            <View style={styles.recentList}>
              {sortedEntries.map((e) => (
                <RecentMealRow
                  key={e.id}
                  entry={e}
                  colors={colors}
                  onPress={() => router.push('/manual-entry' as Href)}
                />
              ))}
            </View>
          )}
        </Animated.View>

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
            <Text style={[styles.groceryBtnText, { color: Palette.iris }]}>Open grocery list</Text>
          </Pressable>
        </Animated.View>

        <View style={{ height: 24 }} />
      </CurvedHeroScreen>
      <AppMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 20,
    paddingVertical: 13,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  streakEmoji: { fontSize: 24 },
  streakNum: { fontFamily: Fonts.bold, fontSize: 22, letterSpacing: -0.5 },
  streakSuffix: { fontFamily: Fonts.semiBold, fontSize: 15 },
  mealLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
    paddingHorizontal: 4,
  },
  mealLoaderText: { fontFamily: Fonts.regular, fontSize: 14 },
  mealScroll: { paddingRight: 20, gap: 12, paddingBottom: 8 },
  mealCard: {
    borderRadius: 22,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  mealAccent: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mealTag: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  mealTitle: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 12,
    minHeight: 44,
  },
  mealMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaText: { fontFamily: Fonts.medium, fontSize: 12 },
  recentBlock: { marginTop: 4 },
  recentList: { gap: 10 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentMid: { flex: 1, minWidth: 0 },
  recentTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  recentName: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 15 },
  recentKcal: { fontFamily: Fonts.semiBold, fontSize: 14, flexShrink: 0 },
  recentSub: { fontFamily: Fonts.regular, fontSize: 13 },
  recentEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  recentEmptyText: { fontFamily: Fonts.semiBold, fontSize: 15 },
  groceryCard: {
    borderRadius: 24,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
  },
  groceryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  groceryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groceryTitle: { fontFamily: Fonts.bold, fontSize: 17 },
  grocerySub: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, marginTop: 4 },
  groceryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  groceryBtnText: { fontFamily: Fonts.semiBold, fontSize: 14 },
});
