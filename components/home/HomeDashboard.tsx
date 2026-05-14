import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppLinearGradient } from '@/components/ui/AppLinearGradient';
import { MEAL_PLAN_CARDS } from '@/constants/dashboard-mock';
import { MacroviaCard } from '@/components/macrovia/MacroviaCard';
import { MacroviaScreen } from '@/components/macrovia/MacroviaScreen';
import { MacroviaTopBar } from '@/components/macrovia/MacroviaTopBar';
import { MacroSpectrumBar } from '@/components/macrovia/MacroSpectrumBar';
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
import type { DayTotals } from '@/lib/nutrition-sync';
import type { AiMealBrief } from '@/types/ai-nutrition';
import type { LoggedMealEntry } from '@/types/logged-meal';
import { AppMenuSheet } from '@/components/AppMenuSheet';
import { DailyEnergyCard } from '@/components/home/DailyEnergyCard';
import { Palette } from '@/constants/palette';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';


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

// Rotating gradient palettes for meal cards — light and dark variants
const MEAL_PALETTES_LIGHT = [
  { from: '#EDE9FE', to: '#DDD6FE', icon: '#7C3AED' },  // purple
  { from: '#DCFCE7', to: '#BBF7D0', icon: '#16A34A' },  // green
  { from: '#FFEDD5', to: '#FED7AA', icon: '#EA580C' },  // orange
  { from: '#FCE7F3', to: '#FBCFE8', icon: '#DB2777' },  // pink
] as const;

const MEAL_PALETTES_DARK = [
  { from: '#2E1065', to: '#1E0A4A', icon: '#C4B5FD' },  // purple
  { from: '#052E16', to: '#14532D', icon: '#86EFAC' },  // green
  { from: '#431407', to: '#7C2D12', icon: '#FDBA74' },  // orange
  { from: '#500724', to: '#881337', icon: '#FDA4AF' },  // rose
] as const;

function RecentMealRow({ entry, index, onPress }: { entry: LoggedMealEntry; index: number; onPress: () => void }) {
  const { isDark } = useAppTheme();
  const palettes = isDark ? MEAL_PALETTES_DARK : MEAL_PALETTES_LIGHT;
  const p = palettes[index % palettes.length];
  const time = formatMealTime(entry.loggedAt);
  const textColor = isDark ? '#F9FAFB' : '#111827';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>
      <AppLinearGradient
        colors={[p.from, p.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mealCard}>
        <View style={[styles.mealCardIcon, { backgroundColor: `${p.icon}22` }]}>
          <Ionicons name="restaurant" size={20} color={p.icon} />
        </View>
        <View style={styles.mealCardBody}>
          <Text style={[styles.mealCardName, { color: textColor }]} numberOfLines={1}>
            {entry.foodName}
          </Text>
          <Text style={[styles.mealCardTime, { color: p.icon }]}>{time}</Text>
        </View>
        <View style={styles.mealCardRight}>
          <Text style={[styles.mealCardKcal, { color: textColor }]}>
            {Math.round(entry.calories).toLocaleString()}
          </Text>
          <Text style={[styles.mealCardUnit, { color: p.icon }]}>kcal</Text>
        </View>
      </AppLinearGradient>
    </Pressable>
  );
}

export function HomeDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user, firebaseReady } = useAuth();
  const { totals, refreshTodayLog, entries } = useNutritionLog();
  const {
    dailyCalories,
    proteinG,
    carbsG,
    fatG,
    dietarySummary,
    refresh: refreshNutritionTargets,
  } = useNutritionTargets();
  const cardW = Math.min(268, width * 0.72);
  const [historyDays, setHistoryDays] = useState<DayTotals[]>([]);
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
        setHistoryDays([]);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          const days = await fetchRecentDayTotals(user.uid, 120);
          if (cancelled) return;
          setHistoryDays(days);
          setStreak(
            computeCalorieStreak(
              dailyCalories,
              days.map((d) => ({ dateKey: d.dateKey, calories: d.calories }))
            )
          );
        } catch {
          if (!cancelled) {
            setStreak(0);
            setHistoryDays([]);
          }
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
      <MacroviaScreen
        refreshing={refreshing}
        onRefresh={onRefresh}
        tabRoot
        heroColor={colors.accentDeep}
        stickyHeader={(scrollY) => (
          <MacroviaTopBar
            title="Macrovia"
            scrollY={scrollY}
            userInitial={firstName.charAt(0).toUpperCase() || '•'}
            onPressProfile={() => setMenuOpen(true)}
          />
        )}>


        <Animated.View entering={FadeInDown.duration(420)}>
          <Text style={[styles.heroOverline, { color: 'rgba(255,255,255,0.7)' }]}>{dateLabel}</Text>
          <Text style={[styles.heroTitle, { color: '#fff' }]}>{displayGreeting}</Text>
          <Text style={[styles.heroSub, { color: 'rgba(255,255,255,0.82)' }]}>
            {streak > 0 ? (
              <>
                Day <Text style={[styles.heroEmph, { color: '#fff' }]}>{streak}</Text> streak — keep it going.
              </>
            ) : (
              <>
                Daily target:{' '}
                <Text style={[styles.heroEmph, { color: '#fff' }]}>
                  {Math.round(dailyCalories).toLocaleString()} kcal
                </Text>
              </>
            )}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(420)}>
          <DailyEnergyCard />
        </Animated.View>

        {streak > 0 ? (
          <Animated.View
            entering={FadeInDown.delay(56).duration(380).springify()}
            style={[styles.streakInline, { backgroundColor: colors.streakBg }]}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={[styles.streakNum, { color: colors.streakText }]}>{streak}</Text>
            <Text style={[styles.streakSuffix, { color: colors.textSecondary }]}>day streak</Text>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(80).duration(420)}>
          <MacroviaCard glass padding={18}>
            <View style={styles.spectrumHead}>
              <Text style={[styles.macrosLabel, { color: colors.accentDeep }]}>MACROS</Text>
              <Pressable
                onPress={() => router.push('/nutrition-targets' as Href)}
                style={[styles.syncBtn, { borderColor: colors.accent }]}
                accessibilityRole="button"
                accessibilityLabel="Edit nutrition targets">
                <Text style={[styles.syncBtnTxt, { color: colors.accentDeep }]}>Sync targets ↑</Text>
              </Pressable>
            </View>
            <MacroSpectrumBar
              protein={Math.max(0, totals.proteinGrams)}
              carbs={Math.max(0, totals.carbsGrams)}
              fat={Math.max(0, totals.fatGrams)}
              targetP={proteinG}
              targetC={carbsG}
              targetF={fatG}
            />
          </MacroviaCard>
        </Animated.View>



        {sortedEntries.length > 0 && (
          <Animated.View entering={FadeInDown.delay(140).duration(420)} style={styles.recentBlock}>
            <View style={styles.sectionRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{`Today's meals`}</Text>
              <Pressable
                onPress={() => router.push('/manual-entry' as Href)}
                style={styles.seeAllBtn}
                accessibilityRole="button">
                <Text style={[styles.seeAllTxt, { color: colors.textMuted }]}>Add meal</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.recentList}>
              {sortedEntries.map((e, i) => (
                <RecentMealRow key={e.id} entry={e} index={i} onPress={() => router.push('/manual-entry' as Href)} />
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(160).duration(420)}>
          <View style={styles.sectionRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Suggested meals</Text>
            <Pressable onPress={() => router.push('/meal-plan/weekly' as Href)} style={styles.seeAllBtn}>
              <Text style={[styles.seeAllTxt, { color: colors.textMuted }]}>Full week</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
          {showMealPlanLoading ? (
            <View style={styles.mealLoader}>
              <ActivityIndicator size="small" color={colors.accent} />
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

        <Animated.View entering={FadeInDown.delay(190).duration(420)}>
          <MacroviaCard
            glass={false}
            padding={16}
            style={{
              marginTop: 6,
              backgroundColor: colors.surface,
              borderColor: colors.glassStroke,
            }}>
            <View style={styles.groceryRow}>
              <AppLinearGradient
                colors={[colors.warm, '#E8A749']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.groceryIconGrad}>
                <Ionicons name="cart" size={22} color="#fff" />
              </AppLinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.groceryTitle, { color: colors.text }]}>Suggested groceries</Text>
                <Text style={[styles.grocerySub, { color: colors.textMuted }]} numberOfLines={2}>
                  Weekly list from your targets. Refreshes once per day.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
            <Pressable
              style={[styles.groceryBtn, { backgroundColor: colors.chipOnLight }]}
              onPress={() => router.push('/(tabs)/groceries' as Href)}
              accessibilityRole="button">
              <Ionicons name="basket-outline" size={18} color={colors.warm} />
              <Text style={[styles.groceryBtnText, { color: colors.warm }]}>Open grocery list</Text>
            </Pressable>
          </MacroviaCard>
        </Animated.View>

        <View style={{ height: 8 }} />

        {/* DEBUG ONLY — remove before shipping */}
        {__DEV__ && (
          <Pressable
            onPress={() => router.push('/subscription' as Href)}
            style={styles.debugBtn}>
            <Text style={styles.debugBtnText}>DEV: Open Paywall</Text>
          </Pressable>
        )}
      </MacroviaScreen>
      <AppMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  heroOverline: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 28,
    letterSpacing: -0.6,
    lineHeight: 34,
    marginBottom: 6,
  },
  heroSub: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  heroEmph: {
    fontFamily: Fonts.semiBold,
  },
  streakInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  streakEmoji: { fontSize: 22 },
  streakNum: { fontFamily: Fonts.bold, fontSize: 20, letterSpacing: -0.5 },
  streakSuffix: { fontFamily: Fonts.medium, fontSize: 13 },
  spectrumHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  cardSub: { fontFamily: Fonts.regular, fontSize: 12 },
  macrosLabel: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  syncBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  syncBtnTxt: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  aiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: { fontFamily: Fonts.semiBold, fontSize: 13 },
  aiMeta: { fontFamily: Fonts.regular, fontSize: 10, marginTop: 1 },
  aiBadge: { fontFamily: Fonts.semiBold, fontSize: 9 },
  aiBody: { fontFamily: Fonts.medium, fontSize: 15, lineHeight: 22, letterSpacing: -0.2 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllTxt: { fontFamily: Fonts.semiBold, fontSize: 13 },
  groceryIconGrad: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    borderRadius: 20,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
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
  recentList: { gap: 8 },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 18,
    overflow: 'hidden',
  },
  mealCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mealCardBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  mealCardName: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  mealCardTime: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  mealCardRight: {
    alignItems: 'flex-end',
    gap: 1,
    flexShrink: 0,
  },
  mealCardKcal: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    letterSpacing: -0.4,
  },
  mealCardUnit: {
    fontFamily: Fonts.medium,
    fontSize: 11,
  },
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
  debugBtn: {
    margin: 16,
    padding: 14,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    alignItems: 'center',
  },
  debugBtnText: { fontFamily: Fonts.bold, fontSize: 14, color: '#fff' },
});
