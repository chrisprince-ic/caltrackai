import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import { useAppTheme } from '@/contexts/AppThemeContext';
import {
  buildTargetsFingerprint,
  getLogDateKey,
  loadCachedWeeklyGroceries,
  saveCachedWeeklyGroceries,
} from '@/lib/ai-meal-daily-cache';
import { suggestWeeklyGroceries } from '@/lib/ai-coach';
import type { AiGroceryItem } from '@/types/ai-nutrition';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

export default function GroceriesScreen() {
  const { user } = useAuth();
  const { dailyCalories, proteinG, carbsG, fatG, dietarySummary } = useNutritionTargets();
  const { colors } = useAppTheme();
  const [items, setItems] = useState<AiGroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [retryKey, setRetryKey] = useState(0);

  function toggleChecked(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            if (list.length) {
              await saveCachedWeeklyGroceries(dateKey, targetFp, list);
            }
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
    }, [user?.uid, dailyCalories, proteinG, carbsG, fatG, dietarySummary, retryKey])
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Groceries</Text>
          <Text style={styles.subtitle}>
            One weekly shopping list from your targets · same list all day · refreshes when your plan day or targets change
          </Text>
        </Animated.View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Palette.iris} />
            <Text style={styles.muted}>Building your list…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={Palette.overText} />
            <Text style={styles.err}>{error}</Text>
            <Pressable
              onPress={() => setError(null)}
              style={styles.retryBtn}
              onPress={() => setRetryKey((k) => k + 1)}
              accessibilityRole="button"
              accessibilityLabel="Retry loading groceries">
              <Ionicons name="refresh" size={16} color={Palette.iris} />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && items.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.listCard}>
            {items.map((g, i) => {
              const done = checked.has(g.id);
              return (
                <Pressable
                  key={g.id}
                  onPress={() => toggleChecked(g.id)}
                  style={({ pressed }) => [
                    styles.row,
                    i < items.length - 1 && styles.rowBorder,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={`${g.name}, ${done ? 'checked' : 'unchecked'}`}>
                  <View style={[styles.check, done && styles.checkDone]}>
                    <Ionicons
                      name={done ? 'checkmark-circle' : 'basket-outline'}
                      size={22}
                      color={done ? Palette.iris : Palette.dusk}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, done && styles.nameChecked]}>{g.name}</Text>
                    <Text style={styles.qty}>{g.qty}</Text>
                    {g.reason ? <Text style={styles.reason}>{g.reason}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        ) : null}

        {!loading && !error && items.length === 0 && user ? (
          <View style={styles.emptyState}>
            <Ionicons name="basket-outline" size={44} color={Palette.dusk} style={{ opacity: 0.45 }} />
            <Text style={styles.emptyTitle}>No suggestions yet</Text>
            <Text style={styles.muted}>AI grocery ideas will appear here once your nutrition targets are set up.</Text>
          </View>
        ) : null}

        {!user ? <Text style={styles.muted}>Sign in to get personalized grocery ideas.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.ghost },
  scroll: { padding: 20, paddingBottom: 120 },
  title: { fontFamily: Fonts.bold, fontSize: 28, color: Palette.obsidian },
  subtitle: { fontFamily: Fonts.regular, fontSize: 15, color: Palette.dusk, marginTop: 6, marginBottom: 20 },
  center: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  muted: { fontFamily: Fonts.regular, fontSize: 14, color: Palette.dusk, lineHeight: 20, textAlign: 'center' },
  errorCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFE8F2',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(155, 31, 82, 0.12)',
    marginBottom: 14,
  },
  err: { flex: 1, fontFamily: Fonts.medium, fontSize: 14, color: Palette.overText },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.2)',
  },
  retryText: { fontFamily: Fonts.semiBold, fontSize: 13, color: Palette.iris },
  emptyState: { paddingVertical: 48, alignItems: 'center', gap: 10 },
  emptyTitle: { fontFamily: Fonts.semiBold, fontSize: 17, color: Palette.obsidian },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.08)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(75, 35, 200, 0.08)',
  },
  check: { width: 28, paddingTop: 2 },
  checkDone: { opacity: 0.7 },
  name: { fontFamily: Fonts.semiBold, fontSize: 16, color: Palette.obsidian },
  nameChecked: { textDecorationLine: 'line-through', opacity: 0.45 },
  qty: { fontFamily: Fonts.regular, fontSize: 13, color: Palette.dusk, marginTop: 2 },
  reason: { fontFamily: Fonts.regular, fontSize: 12, color: Palette.lavender, marginTop: 4, fontStyle: 'italic' },
});
