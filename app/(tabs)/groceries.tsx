import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import {
  buildTargetsFingerprint,
  getLogDateKey,
  loadCachedWeeklyGroceries,
  saveCachedWeeklyGroceries,
} from '@/lib/ai-meal-daily-cache';
import { suggestWeeklyGroceries } from '@/lib/gemini-coach';
import type { AiGroceryItem } from '@/types/ai-nutrition';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

export default function GroceriesScreen() {
  const { user } = useAuth();
  const { dailyCalories, proteinG, carbsG, fatG, dietarySummary } = useNutritionTargets();
  const [items, setItems] = useState<AiGroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    }, [user?.uid, dailyCalories, proteinG, carbsG, fatG, dietarySummary])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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

        {error ? <Text style={styles.err}>{error}</Text> : null}

        {!loading && items.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.listCard}>
            {items.map((g, i) => (
              <Pressable
                key={g.id}
                style={[styles.row, i < items.length - 1 && styles.rowBorder]}
                accessibilityRole="button">
                <View style={styles.check}>
                  <Ionicons name="basket-outline" size={22} color={Palette.iris} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{g.name}</Text>
                  <Text style={styles.qty}>{g.qty}</Text>
                  {g.reason ? <Text style={styles.reason}>{g.reason}</Text> : null}
                </View>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}

        {!loading && !error && items.length === 0 && user ? (
          <Text style={styles.muted}>No items yet. Check your Gemini API key in .env.</Text>
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
  muted: { fontFamily: Fonts.regular, fontSize: 14, color: Palette.dusk, lineHeight: 20 },
  err: { fontFamily: Fonts.medium, fontSize: 14, color: Palette.overText, marginBottom: 12 },
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
  name: { fontFamily: Fonts.semiBold, fontSize: 16, color: Palette.obsidian },
  qty: { fontFamily: Fonts.regular, fontSize: 13, color: Palette.dusk, marginTop: 2 },
  reason: { fontFamily: Fonts.regular, fontSize: 12, color: Palette.lavender, marginTop: 4, fontStyle: 'italic' },
});
