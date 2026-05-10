import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { GroceryAddItemSheet } from '@/components/groceries/GroceryAddItemSheet';
import { GroceryProgressRing } from '@/components/groceries/GroceryProgressRing';
import { CurvedHeroScreen } from '@/components/CurvedHeroScreen';
import { IconButton } from '@/components/hero/IconButton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  AISLE_ORDER,
  AISLE_VISUAL,
  aisleTint,
  type GroceryAisleId,
} from '@/constants/aisleCategories';
import { COLORS, Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import {
  buildTargetsFingerprint,
  getLogDateKey,
  loadCachedWeeklyGroceries,
  saveCachedWeeklyGroceries,
} from '@/lib/ai-meal-daily-cache';
import { suggestWeeklyGroceries } from '@/lib/ai-coach';
import type { AiGroceryItem } from '@/types/ai-nutrition';

const HERO_GROCERIES_EXPANDED = 230;
/** Overlap of scroll content into hero (smaller than meal plans — progress card is shorter). */
const GROCERIES_CONTENT_INSET = 50;

type ChipId = 'all' | 'remaining' | 'checked' | GroceryAisleId;

const CHIPS: { id: ChipId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'remaining', label: 'Remaining' },
  { id: 'checked', label: 'Checked' },
  ...AISLE_ORDER.map((id) => ({ id, label: AISLE_VISUAL[id].label })),
];

function formatGroceryDisplayName(name: string): string {
  return name.replace(/\(([^,()]+),\s*[^)]+\)/, '($1)').trim();
}

/**
 * Classify a grocery item into a store-aisle bucket using lightweight keyword
 * matching on the item name. Optional `reason: __aisle:<id>` overrides for custom adds.
 */
function categorize(name: string, reason?: string): GroceryAisleId {
  const override = reason?.match(/^__aisle:([a-z]+)$/);
  if (override) {
    const id = override[1] as GroceryAisleId;
    if (AISLE_ORDER.includes(id)) return id;
  }

  const t = name.toLowerCase();

  if (
    /\b(milk|cheese|yogurt|yoghurt|butter|cream|cottage|kefir|egg|eggs)\b/.test(t)
  )
    return 'dairy';

  if (
    /\b(salmon|tuna|fish|shrimp|cod|tilapia|scallop|seafood|chicken|beef|pork|turkey|lamb|bacon|sausage|ham|steak|deli|ground)\b/.test(
      t,
    )
  )
    return 'meat';

  if (
    /\b(apple|banana|berr(?:y|ies)|blueberr|strawberr|raspberr|blackberr|orange|lemon|lime|grape|melon|peach|pear|kiwi|mango|pineapple|plum|cherr|fruit|spinach|kale|lettuce|arugula|cabbage|broccoli|cauliflower|carrot|celery|cucumber|tomato|pepper|onion|garlic|potato|sweet potato|squash|zucchini|avocado|asparagus|mushroom|herb|cilantro|basil|parsley|ginger|veggie|vegetable)\b/.test(
      t,
    )
  )
    return 'produce';

  if (/\b(bread|tortilla|pita|bagel|roll|bun|muffin|wrap|loaf)\b/.test(t)) return 'bakery';

  if (/\b(frozen|ice cream)\b/.test(t)) return 'frozen';

  if (/\b(water|juice|tea|coffee|soda|kombucha|sparkling|seltzer)\b/.test(t))
    return 'beverages';

  if (
    /\b(rice|pasta|noodle|oat|oats|quinoa|barley|farro|bean|lentil|chickpea|flour|sugar|salt|spice|sauce|oil|vinegar|honey|maple|peanut butter|nut butter|almond|cashew|walnut|pecan|nut|seed|chia|flax|granola|cereal|broth|stock|protein powder|hummus|salsa|jam)\b/.test(
      t,
    )
  )
    return 'pantry';

  return 'other';
}

function makeId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildShareMessage(items: AiGroceryItem[], checked: Set<string>): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const total = items.length;
  const done = items.filter((g) => checked.has(g.id)).length;
  const lines: string[] = [`CalTrack Groceries — ${dateStr} · ${done} of ${total} checked`, ''];

  const byAisle = new Map<GroceryAisleId, AiGroceryItem[]>();
  for (const g of items) {
    const a = categorize(g.name, g.reason);
    if (!byAisle.has(a)) byAisle.set(a, []);
    byAisle.get(a)!.push(g);
  }

  for (const aisle of AISLE_ORDER) {
    const list = byAisle.get(aisle);
    if (!list?.length) continue;
    lines.push(AISLE_VISUAL[aisle].label.toUpperCase());
    const sorted = [...list].sort(
      (a, b) => Number(checked.has(a.id)) - Number(checked.has(b.id)),
    );
    for (const g of sorted) {
      const mark = checked.has(g.id) ? '☑' : '☐';
      const nm = formatGroceryDisplayName(g.name);
      lines.push(`${mark} ${nm}${g.qty ? ` · ${g.qty}` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

type GroceryRowProps = {
  item: AiGroceryItem;
  done: boolean;
  vis: (typeof AISLE_VISUAL)[GroceryAisleId];
  isLast: boolean;
  borderColor: string;
  textColor: string;
  onToggle: () => void;
};

function GroceryListRow({
  item,
  done,
  vis,
  isLast,
  borderColor,
  textColor,
  onToggle,
}: GroceryRowProps) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const displayName = formatGroceryDisplayName(item.name);
  const qtyBg = done ? '#F9FAFB' : aisleTint(vis.hex);
  const qtyText = done ? '#9CA3AF' : vis.stroke;

  return (
    <Animated.View layout={Layout.springify().damping(20)} exiting={FadeOut.duration(160)}>
      <Pressable
        onPress={() => {
          scale.value = withSequence(withSpring(1.12, { damping: 12 }), withSpring(1));
          onToggle();
        }}
        style={({ pressed }) => [
          styles.row,
          !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
          pressed && { opacity: 0.92 },
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${item.name}${item.qty ? `, ${item.qty}` : ''}, ${done ? 'checked' : 'unchecked'}`}>
        <Animated.View
          style={[
            styles.checkbox,
            done ? styles.checkboxOn : { borderColor: '#D1D5DB', backgroundColor: '#FFFFFF' },
            anim,
          ]}>
          {done ? <Ionicons name="checkmark" size={12} color={Palette.white} /> : null}
        </Animated.View>
        <Text
          style={[styles.itemName, { color: done ? '#9CA3AF' : textColor }, done && styles.itemNameChecked]}
          numberOfLines={1}>
          {displayName}
        </Text>
        {item.qty ? (
          <View style={[styles.qtyPill, { backgroundColor: qtyBg }]}>
            <Text style={[styles.qtyText, { color: qtyText }]} numberOfLines={1}>
              {item.qty}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export default function GroceriesScreen() {
  const { user } = useAuth();
  const { dailyCalories, proteinG, carbsG, fatG, dietarySummary } = useNutritionTargets();
  const { colors, isDark } = useAppTheme();

  const [items, setItems] = useState<AiGroceryItem[]>([]);
  const [customItems, setCustomItems] = useState<AiGroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [retryKey, setRetryKey] = useState(0);
  const [chip, setChip] = useState<ChipId>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSheetInitialName, setAddSheetInitialName] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), 150);
    return () => clearTimeout(t);
  }, [searchInput]);

  const allItems = useMemo(() => [...items, ...customItems], [items, customItems]);
  const total = allItems.length;
  const completed = allItems.filter((g) => checked.has(g.id)).length;
  const remaining = total - completed;
  const progress = total > 0 ? completed / total : 0;

  const chipCounts = useMemo(() => {
    const c: Record<string, number> = {
      all: total,
      remaining: allItems.filter((g) => !checked.has(g.id)).length,
      checked: completed,
    };
    for (const id of AISLE_ORDER) {
      c[id] = allItems.filter((g) => categorize(g.name, g.reason) === id).length;
    }
    return c as Record<ChipId, number>;
  }, [allItems, checked, completed, total]);

  const sections = useMemo(() => {
    let list = allItems;
    if (chip === 'remaining') list = list.filter((g) => !checked.has(g.id));
    else if (chip === 'checked') list = list.filter((g) => checked.has(g.id));
    else if (chip !== 'all') list = list.filter((g) => categorize(g.name, g.reason) === chip);

    if (debouncedSearch) {
      list = list.filter((g) => g.name.toLowerCase().includes(debouncedSearch));
    }

    const groups = new Map<GroceryAisleId, AiGroceryItem[]>();
    for (const item of list) {
      const aisle = categorize(item.name, item.reason);
      if (!groups.has(aisle)) groups.set(aisle, []);
      groups.get(aisle)!.push(item);
    }
    for (const arr of groups.values()) {
      arr.sort((a, b) => Number(checked.has(a.id)) - Number(checked.has(b.id)));
    }
    return Array.from(groups.entries()).sort(
      ([a], [b]) => AISLE_ORDER.indexOf(a) - AISLE_ORDER.indexOf(b),
    );
  }, [allItems, checked, chip, debouncedSearch]);

  const searchNoResults =
    Boolean(debouncedSearch) &&
    sections.length === 0 &&
    total > 0 &&
    !(chip === 'remaining' && remaining === 0);

  function toggleChecked(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) {
        setItems([]);
        setLoading(false);
        return;
      }
      let cancelled = false;
      setLoading(true);
      setError(null);
      (async () => {
        const dateKey = getLogDateKey();
        const targetFp = buildTargetsFingerprint({
          dailyCalories,
          proteinG,
          carbsG,
          fatG,
          dietarySummary,
        });
        try {
          let list = await loadCachedWeeklyGroceries(dateKey, targetFp);
          if (!list?.length) {
            list = await suggestWeeklyGroceries({
              dailyCalories,
              proteinG,
              carbsG,
              fatG,
              dietaryNotes: dietarySummary,
            });
            if (list.length) await saveCachedWeeklyGroceries(dateKey, targetFp, list);
          }
          if (!cancelled) setItems(list);
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : 'Could not load suggestions');
            setItems([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.uid, dailyCalories, proteinG, carbsG, fatG, dietarySummary, retryKey]),
  );

  const onShare = useCallback(async () => {
    if (allItems.length === 0) return;
    const message = buildShareMessage(allItems, checked);
    try {
      await Share.share({ message });
    } catch {
      /* user cancelled */
    }
  }, [allItems, checked]);

  const onSaveCustom = useCallback(
    (payload: { name: string; qty: string; aisle: GroceryAisleId }) => {
      setCustomItems((prev) => [
        ...prev,
        {
          id: makeId(),
          name: payload.name,
          qty: payload.qty,
          reason: `__aisle:${payload.aisle}`,
        },
      ]);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    [],
  );

  const iconInk = isDark ? '#F4FCE8' : COLORS.ink;
  const heroSubtitle = loading ? 'Loading your list…' : 'Refreshed when your plan changes';

  const headerFilterIsRemaining = chip === 'remaining';

  return (
    <CurvedHeroScreen
      title="Groceries"
      subtitle={heroSubtitle}
      tabRoot
      heroExpanded={HERO_GROCERIES_EXPANDED}
      contentInset={GROCERIES_CONTENT_INSET}
      subtitleMaxLength={42}
      rightActions={
        <>
          {!loading && total > 0 ? (
            <View style={{ flexShrink: 0 }}>
              <IconButton
                name="filter-outline"
                onPress={() => {
                  setChip((c) => (c === 'remaining' ? 'all' : 'remaining'));
                  void Haptics.selectionAsync().catch(() => {});
                }}
                accessibilityLabel={
                  headerFilterIsRemaining ? 'Show all items' : 'Show remaining only'
                }
                iconColor={iconInk}
              />
            </View>
          ) : null}
          <IconButton
            name="share-outline"
            onPress={() => void onShare()}
            accessibilityLabel="Share list"
            iconColor={iconInk}
            disabled={total === 0}
          />
        </>
      }>
      {!loading && total > 0 ? (
        <Animated.View
          entering={FadeInDown.delay(30).duration(360)}
          style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <GroceryProgressRing
            progress={progress}
            trackColor="#E8EDD8"
            fillColor={Palette.iris}
            inkColor={isDark ? colors.text : COLORS.ink}
          />
          <View style={styles.progressTextCol}>
            <Text style={[styles.progressCount, { color: colors.text }]}>
              {completed} of {total} items checked
            </Text>
            <Text style={[styles.progressSub, { color: colors.textMuted }]}>
              {completed === 0
                ? 'Tap items as you go through the store'
                : completed === total
                  ? 'All done — nice work'
                  : `${remaining} item${remaining === 1 ? '' : 's'} to go`}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {!loading && total > 0 ? (
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color="#9AA890" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search items..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchInput.length > 0 ? (
            <Pressable
              onPress={() => setSearchInput('')}
              hitSlop={8}
              accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color="#9AA890" />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!loading && total > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
          style={styles.chipScrollView}>
          {CHIPS.map((c) => {
            const active = chip === c.id;
            const count = chipCounts[c.id] ?? 0;
            return (
              <Pressable
                key={String(c.id)}
                onPress={() => {
                  setChip(c.id);
                  void Haptics.selectionAsync().catch(() => {});
                }}
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
                <Text style={[styles.chipLabel, { color: active ? COLORS.white : colors.text }]}>
                  {c.label}
                </Text>
                <Text style={styles.chipDot}>·</Text>
                <View
                  style={[
                    styles.chipBadge,
                    {
                      backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.chipBadgeText,
                      { color: active ? COLORS.white : colors.textMuted },
                    ]}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Palette.iris} />
          <Text style={[styles.muted, { color: colors.textMuted }]}>Building your list…</Text>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.errorCard, { backgroundColor: Palette.overBg }]}>
          <Ionicons name="alert-circle-outline" size={20} color={Palette.overText} />
          <Text style={[styles.err, { color: Palette.overText }]}>{error}</Text>
          <Pressable
            onPress={() => setRetryKey((k) => k + 1)}
            style={[
              styles.retryBtn,
              { backgroundColor: colors.surface, borderColor: colors.borderStrong },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading groceries">
            <Ionicons name="refresh" size={16} color={Palette.iris} />
            <Text style={[styles.retryText, { color: Palette.iris }]}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && chip === 'remaining' && total > 0 && remaining === 0 ? (
        <Animated.View entering={FadeInDown.duration(360)} style={styles.cleanCard}>
          <View style={[styles.cleanIcon, { backgroundColor: colors.haze }]}>
            <Ionicons name="checkmark-done" size={28} color={Palette.iris} />
          </View>
          <Text style={[styles.cleanTitle, { color: colors.text }]}>Cart&apos;s empty — nice work</Text>
          <Text style={[styles.cleanBody, { color: colors.textMuted }]}>
            Choose &quot;All&quot; in the chip row to see everything you grabbed.
          </Text>
        </Animated.View>
      ) : null}

      {searchNoResults ? (
        <View style={styles.searchEmpty}>
          <Text style={[styles.searchEmptyText, { color: colors.textMuted }]}>
            No items match &apos;{debouncedSearch}&apos;.
          </Text>
          <Pressable
            onPress={() => {
              setAddSheetInitialName(searchInput.trim());
              setAddSheetOpen(true);
            }}
            accessibilityRole="button">
            <Text style={styles.addFromSearchLink}>+ Add as custom item</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && sections.length > 0
        ? sections.map(([aisle, list], sIdx) => {
            const vis = AISLE_VISUAL[aisle];
            const tint = aisleTint(vis.hex);
            return (
              <Animated.View
                key={aisle}
                entering={FadeInDown.delay(60 + sIdx * 24).duration(360)}
                layout={Layout.springify().damping(18)}
                style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.sectionIconWell, { backgroundColor: tint }]}>
                      <Ionicons name={vis.icon} size={16} color={vis.stroke} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: COLORS.ink }]} numberOfLines={1}>
                      {vis.label.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
                    {list.length} {list.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.listCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}>
                  {list.map((g, i) => {
                    const done = checked.has(g.id);
                    const isLast = i === list.length - 1;
                    return (
                      <GroceryListRow
                        key={g.id}
                        item={g}
                        done={done}
                        vis={vis}
                        isLast={isLast}
                        borderColor={colors.border}
                        textColor={colors.text}
                        onToggle={() => toggleChecked(g.id)}
                      />
                    );
                  })}
                </View>
              </Animated.View>
            );
          })
        : null}

      {!loading && (total > 0 || user) ? (
        <Pressable
          onPress={() => {
            setAddSheetInitialName('');
            setAddSheetOpen(true);
          }}
          style={({ pressed }) => [
            styles.addDashed,
            { borderColor: 'rgba(15,31,8,0.2)' },
            pressed && { opacity: 0.88 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add custom item">
          <Ionicons name="add-circle-outline" size={18} color={Palette.iris} />
          <Text style={styles.addDashedText}>Add custom item</Text>
        </Pressable>
      ) : null}

      {!loading && !error && items.length === 0 && customItems.length === 0 && user ? (
        <EmptyState
          icon="basket-outline"
          title="No suggestions yet"
          body="Grocery ideas will appear here once your nutrition targets are set up."
        />
      ) : null}

      {!user ? (
        <Text style={[styles.muted, { color: colors.textMuted }]}>
          Sign in to get a personalized grocery list.
        </Text>
      ) : null}

      <GroceryAddItemSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        initialName={addSheetInitialName}
        onSave={onSaveCustom}
      />
    </CurvedHeroScreen>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F1F08',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  progressTextCol: { flex: 1, minWidth: 0, gap: 4 },
  progressCount: { fontFamily: Fonts.medium, fontSize: 15, fontWeight: '500' },
  progressSub: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 17 },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, paddingVertical: 0 },

  chipScrollView: { marginBottom: 14 },
  chipScroll: { flexDirection: 'row', gap: 7, alignItems: 'center', paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 100,
    gap: 4,
  },
  chipLabel: { fontFamily: Fonts.medium, fontSize: 12 },
  chipDot: { fontSize: 12, opacity: 0.55 },
  chipBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  chipBadgeText: { fontFamily: Fonts.semiBold, fontSize: 11 },

  center: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  muted: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  errorCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
  },
  err: { flex: 1, fontFamily: Fonts.medium, fontSize: 14 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  retryText: { fontFamily: Fonts.semiBold, fontSize: 13 },

  cleanCard: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  cleanIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cleanTitle: { fontFamily: Fonts.semiBold, fontSize: 16 },
  cleanBody: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },

  searchEmpty: { paddingVertical: 16, alignItems: 'center', gap: 8 },
  searchEmptyText: { fontFamily: Fonts.regular, fontSize: 14, textAlign: 'center' },
  addFromSearchLink: { fontFamily: Fonts.semiBold, fontSize: 14, color: Palette.iris },

  section: { marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  sectionIconWell: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    letterSpacing: 1.6,
    flexShrink: 1,
  },
  sectionCount: { fontFamily: Fonts.medium, fontSize: 11 },

  listCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 48,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxOn: {
    backgroundColor: Palette.iris,
    borderColor: Palette.iris,
  },
  itemName: {
    flex: 1,
    minWidth: 0,
    fontFamily: Fonts.medium,
    fontSize: 15,
  },
  itemNameChecked: { textDecorationLine: 'line-through' },
  qtyPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    maxWidth: 88,
    flexShrink: 0,
  },
  qtyText: { fontFamily: Fonts.semiBold, fontSize: 11 },

  addDashed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addDashedText: { fontFamily: Fonts.semiBold, fontSize: 14, color: Palette.iris },
});
