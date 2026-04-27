import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MEAL_PLAN_CARDS } from '@/constants/dashboard-mock';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

export default function MealPlansScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Meal plans</Text>
          <Text style={styles.subtitle}>AI-built plans from your calorie and macro targets.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).duration(400)}>
          <Pressable
            style={styles.heroCard}
            onPress={() => router.push('/meal-plan/weekly' as Href)}
            android_ripple={{ color: 'rgba(75,35,200,0.12)' }}>
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={28} color={Palette.iris} />
            </View>
            <View style={styles.heroBody}>
              <Text style={styles.heroTitle}>Your AI week</Text>
              <Text style={styles.heroMeta}>7 meals · recipes on tap · matches your plan</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={Palette.dusk} style={{ opacity: 0.45 }} />
          </Pressable>
        </Animated.View>

        <Text style={styles.sectionLabel}>Ideas</Text>
        {MEAL_PLAN_CARDS.map((item, i) => (
          <Animated.View
            key={item.id}
            entering={FadeInDown.delay(80 + i * 40).duration(380).springify()}
            style={styles.rowCard}>
            <Pressable
              style={styles.rowInner}
              onPress={() => router.push('/meal-plan/weekly' as Href)}
              android_ripple={{ color: 'rgba(75,35,200,0.08)' }}>
              <View style={[styles.thumb, { backgroundColor: item.tint }]}>
                <Ionicons name="restaurant" size={24} color={item.accent} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>
                  {item.kcal} kcal · {item.prepMin} min · {item.tag}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Palette.dusk} style={{ opacity: 0.4 }} />
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.ghost },
  scroll: { padding: 20, paddingBottom: 120 },
  title: { fontFamily: Fonts.bold, fontSize: 28, color: Palette.obsidian },
  subtitle: { fontFamily: Fonts.regular, fontSize: 15, color: Palette.dusk, marginTop: 6, marginBottom: 20 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.12)',
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Palette.haze,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: { flex: 1, minWidth: 0 },
  heroTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Palette.obsidian },
  heroMeta: { fontFamily: Fonts.regular, fontSize: 13, color: Palette.dusk, marginTop: 4 },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Palette.dusk,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.08)',
    overflow: 'hidden',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Palette.obsidian },
  rowMeta: { fontFamily: Fonts.regular, fontSize: 13, color: Palette.dusk, marginTop: 4 },
});
