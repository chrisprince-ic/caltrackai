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
import { createHomeDashboardStyles } from '@/components/home/dashboardStyles';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

function clampPct(n: number) {
  return Math.min(100, Math.max(0, n));
}

type DashboardStyles = ReturnType<typeof createHomeDashboardStyles>;

function MacroRingRow({
  label,
  current,
  goal,
  color,
  tint,
  icon,
  delay,
  ds,
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
  tint: string;
  icon: keyof typeof Ionicons.glyphMap;
  delay: number;
  ds: DashboardStyles;
}) {
  const pct = clampPct((current / goal) * 100);
  const remain = Math.max(0, goal - current);
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380).springify()} style={ds.macroCard}>
      <View style={[ds.macroIconBlob, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={ds.macroCardBody}>
        <View style={ds.macroCardTop}>
          <Text style={ds.macroName}>{label}</Text>
          <Text style={ds.macroNums}>
            <Text style={ds.macroCurrent}>{current}</Text>
            <Text style={ds.macroSlash}>/{goal}g</Text>
          </Text>
        </View>
        <View style={[ds.macroTrack, { backgroundColor: tint }]}>
          <View style={[ds.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
        <Text style={ds.macroRemain}>{remain}g left today</Text>
      </View>
    </Animated.View>
  );
}

function MealPlanCard({
  item,
  width,
  onPress,
  ds,
}: {
  item: (typeof MEAL_PLAN_CARDS)[0];
  width: number;
  onPress?: () => void;
  ds: DashboardStyles;
}) {
  return (
    <Pressable onPress={onPress} style={[ds.mealCard, { width }]}>
      <View style={[ds.mealAccent, { backgroundColor: item.tint }]}>
        <Ionicons name="restaurant" size={26} color={item.accent} />
      </View>
      <Text style={ds.mealTag}>{item.tag}</Text>
      <Text style={ds.mealTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={ds.mealMeta}>
        <View style={ds.mealMetaChip}>
          <Ionicons name="flame-outline" size={14} color={Palette.citrus} />
          <Text style={ds.mealMetaText}>{item.kcal} kcal</Text>
        </View>
        <View style={ds.mealMetaChip}>
          <Ionicons name="time-outline" size={14} color={Palette.dusk} />
          <Text style={ds.mealMetaText}>{item.prepMin} min</Text>
        </View>
      </View>
    </Pressable>
  );
}

const AI_CARD_ACCENTS = [
  { accent: '#4B23C8', tint: '#F0ECFF' },
  { accent: '#FF6B9D', tint: '#FFE8F0' },
  { accent: '#00C2D1', tint: '#E0F8FA' },
  { accent: '#F5A623', tint: '#FFF8EB' },
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

export function HomeDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createHomeDashboardStyles(colors), [colors]);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, firebaseReady } = useAuth();
  const { totals, refreshTodayLog, logSyncing } = useNutritionLog();
  const { dailyCalories, proteinG, carbsG, fatG, dietarySummary, refresh: refreshNutritionTargets } =
    useNutritionTargets();
  const cardW = Math.min(268, width * 0.72);
  const [streak, setStreak] = useState(0);
  const [weeklyPlanMeals, setWeeklyPlanMeals] = useState<AiMealBrief[] | null>(null);
  const [weeklyPlanLoading, setWeeklyPlanLoading] = useState(false);

  /** One fetch per signed-in user per app session; avoids reload on every home focus. */
  const mealPlanSessionCache = useRef<{
    forUserId: string | null;
    settled: boolean;
    meals: AiMealBrief[] | null;
  }>({ forUserId: null, settled: false, meals: null });

  const mealPlanTargetsRef = useRef({
    dailyCalories,
    proteinG,
    carbsG,
    fatG,
    dietarySummary,
  });
  mealPlanTargetsRef.current = {
    dailyCalories,
    proteinG,
    carbsG,
    fatG,
    dietarySummary,
  };

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
          const s = computeCalorieStreak(
            dailyCalories,
            days.map((d) => ({ dateKey: d.dateKey, calories: d.calories }))
          );
          setStreak(s);
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
        const meals = cache.meals;
        if (meals && meals.length) {
          setMealPlanSessionMeals(meals, getLogDateKey());
        }
        return;
      }

      let cancelled = false;
      setWeeklyPlanLoading(true);
      (async () => {
        const t = mealPlanTargetsRef.current;
        const dateKey = getLogDateKey();
        const targetFp = buildTargetsFingerprint({
          dailyCalories: t.dailyCalories,
          proteinG: t.proteinG,
          carbsG: t.carbsG,
          fatG: t.fatG,
          dietarySummary: t.dietarySummary,
        });
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
            if (list.length) {
              await saveCachedWeeklyPlan(dateKey, targetFp, list);
            }
          }
          if (cancelled) return;
          if (list.length) {
            setMealPlanSessionMeals(list, dateKey);
          }
          mealPlanSessionCache.current = {
            forUserId: uid,
            settled: true,
            meals: list,
          };
          setWeeklyPlanMeals(list);
        } catch {
          if (!cancelled) {
            mealPlanSessionCache.current = {
              forUserId: uid,
              settled: true,
              meals: [],
            };
            setWeeklyPlanMeals([]);
          }
        } finally {
          if (!cancelled) setWeeklyPlanLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.uid])
  );

  const consumedCal = totals.calories;
  const calPct = clampPct((consumedCal / dailyCalories) * 100);
  const remaining = Math.max(0, dailyCalories - consumedCal);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const calState = calPct < 85 ? 'onTrack' : calPct < 100 ? 'watch' : 'over';

  const showMealPlanLoading = Boolean(
    user?.uid && (weeklyPlanMeals === null || weeklyPlanLoading)
  );

  const suggestedSlice =
    weeklyPlanMeals && weeklyPlanMeals.length > 0 ? weeklyPlanMeals.slice(0, 4) : [];
  const displayMealsWithRecipeIdx: {
    item: ReturnType<typeof aiBriefToCardItem>;
    recipeIdx: number | null;
  }[] =
    suggestedSlice.length > 0
      ? suggestedSlice.map((m, i) => ({
          item: aiBriefToCardItem(m, i),
          recipeIdx: i,
        }))
      : MEAL_PLAN_CARDS.map((item) => ({ item, recipeIdx: null }));

  const calBarColors = useMemo(
    () =>
      ({
        onTrack: {
          fill: Palette.iris,
          track: isDark ? 'rgba(75, 35, 200, 0.35)' : Palette.haze,
        },
        watch: {
          fill: Palette.citrus,
          track: isDark ? 'rgba(245, 166, 35, 0.22)' : '#FFF8EB',
        },
        over: {
          fill: '#E85D8E',
          track: isDark ? 'rgba(232, 93, 142, 0.22)' : '#FFE8F2',
        },
      }) as const,
    [isDark]
  );
  const bar = calBarColors[calState];

  const statusChipTheme = useMemo(
    () =>
      ({
        onTrack: {
          bg: isDark ? 'rgba(232, 224, 255, 0.18)' : Palette.haze,
          text: isDark ? '#D4C8FA' : Palette.iris,
        },
        watch: {
          bg: isDark ? 'rgba(245, 166, 35, 0.2)' : '#FFF8EB',
          text: isDark ? '#FFD699' : '#7A4B00',
        },
        over: {
          bg: isDark ? 'rgba(255, 232, 242, 0.14)' : '#FFE8F2',
          text: Palette.overText,
        },
      }) as const,
    [isDark]
  );
  const chipT = statusChipTheme[calState];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces>
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.dateLine}>{dateLabel}</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={styles.proBtn}
                onPress={() => router.push('/subscription')}
                accessibilityRole="button"
                accessibilityLabel="CalTrack Pro subscription">
                <Ionicons name="sparkles" size={20} color={Palette.iris} />
              </Pressable>
              <Pressable
                style={styles.menuBtn}
                onPress={() => setMenuOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Open app menu">
                <Ionicons name="person-circle-outline" size={26} color={Palette.iris} />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(380).springify()} style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakLine}>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakSuffix}> day streak</Text>
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(420).springify()} style={styles.calCard}>
          <View style={styles.calGlow} />
          <View style={styles.calHeader}>
            <View style={styles.calBadge}>
              <Ionicons name="nutrition" size={14} color={Palette.iris} />
              <Text style={styles.calBadgeText}>Today</Text>
              {user && logSyncing ? (
                <ActivityIndicator size="small" color={Palette.iris} style={styles.calSyncSpinner} />
              ) : null}
            </View>
            <View style={[styles.statusChip, { backgroundColor: chipT.bg }]}>
              <Text style={[styles.statusChipText, { color: chipT.text }]}>
                {calState === 'onTrack' ? 'On track' : calState === 'watch' ? 'Nearing goal' : 'Over goal'}
              </Text>
            </View>
          </View>
          <View style={styles.calHero}>
            <View>
              <Text style={styles.calConsumed}>{consumedCal.toLocaleString()}</Text>
              <Text style={styles.calLabel}>calories eaten</Text>
            </View>
            <View style={styles.calDivider} />
            <View>
              <Text style={styles.calGoal}>{dailyCalories.toLocaleString()}</Text>
              <Text style={styles.calLabel}>daily goal</Text>
            </View>
          </View>
          <View style={[styles.calProgressTrack, { backgroundColor: bar.track }]}>
            <View style={[styles.calProgressFill, { width: `${calPct}%`, backgroundColor: bar.fill }]} />
          </View>
          <Text style={styles.calFoot}>
            <Text style={styles.calFootStrong}>{remaining.toLocaleString()} kcal</Text> remaining today
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Macros</Text>
            <Pressable onPress={() => router.push('/nutrition-targets' as Href)} accessibilityRole="button">
              <Text style={styles.sectionLink}>Edit targets</Text>
            </Pressable>
          </View>
          <MacroRingRow
            label="Protein"
            current={Math.round(totals.proteinGrams)}
            goal={proteinG}
            color={Palette.flamingo}
            tint="#FFE8F0"
            icon="fitness-outline"
            delay={120}
            ds={styles}
          />
          <MacroRingRow
            label="Carbs"
            current={Math.round(totals.carbsGrams)}
            goal={carbsG}
            color={Palette.citrus}
            tint="#FFF8EB"
            icon="leaf-outline"
            delay={150}
            ds={styles}
          />
          <MacroRingRow
            label="Fats"
            current={Math.round(totals.fatGrams)}
            goal={fatG}
            color={Palette.cyan}
            tint="#E0F8FA"
            icon="water-outline"
            delay={180}
            ds={styles}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(400).springify()}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Suggested meals</Text>
            <Pressable onPress={() => router.push('/meal-plan/weekly' as Href)}>
              <Text style={styles.sectionLink}>Full week plan</Text>
            </Pressable>
          </View>
          {showMealPlanLoading ? (
            <View style={styles.mealPlanLoading}>
              <ActivityIndicator size="small" color={Palette.iris} />
              <Text style={styles.mealPlanLoadingText}>Loading your plan…</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mealScroll}
              decelerationRate="fast"
              snapToInterval={cardW + 12}>
              {displayMealsWithRecipeIdx.map(({ item, recipeIdx }) => (
                <MealPlanCard
                  key={item.id}
                  item={item}
                  width={cardW}
                  ds={styles}
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

        <Animated.View entering={FadeInDown.delay(180).duration(400).springify()} style={styles.groceryCard}>
          <View style={styles.groceryHeader}>
            <View style={styles.groceryTitleRow}>
              <View style={styles.groceryIconWrap}>
                <Ionicons name="cart-outline" size={20} color={Palette.iris} />
              </View>
              <View style={styles.groceryTitleTextCol}>
                <Text style={styles.groceryTitle}>Suggested groceries</Text>
                <Text style={styles.grocerySubtitle} numberOfLines={2}>
                  Weekly list from your targets. Refreshes once per day.
                </Text>
              </View>
            </View>
          </View>
          <Pressable style={styles.addListBtn} onPress={() => router.push('/(tabs)/groceries')}>
            <Ionicons name="basket-outline" size={20} color={Palette.iris} />
            <Text style={styles.addListText}>Open AI grocery suggestions</Text>
          </Pressable>
        </Animated.View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
