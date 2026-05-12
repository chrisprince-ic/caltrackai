import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MEAL_PLAN_CARDS } from '@/constants/dashboard-mock';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { ScreenBackground } from '@/components/ui/ScreenBackground';

export default function MealPlansScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={[styles.title, { color: colors.text }]}>Meal plans</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>AI-built plans from your calorie and macro targets.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).duration(400)}>
          <Pressable
            style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/meal-plan/weekly' as Href)}
            android_ripple={{ color: 'rgba(31,138,91,0.1)' }}>
            <View style={[styles.heroIcon, { backgroundColor: colors.iconWell }]}>
              <Ionicons name="sparkles" size={28} color={Palette.iris} />
            </View>
            <View style={styles.heroBody}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Your AI week</Text>
              <Text style={[styles.heroMeta, { color: colors.textMuted }]}>7 meals · recipes on tap · matches your plan</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} style={{ opacity: 0.45 }} />
          </Pressable>
        </Animated.View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Ideas</Text>
        {MEAL_PLAN_CARDS.map((item, i) => (
          <Animated.View
            key={item.id}
            entering={FadeInDown.delay(80 + i * 40).duration(380).springify()}
            style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              style={styles.rowInner}
              onPress={() => router.push('/meal-plan/weekly' as Href)}
              android_ripple={{ color: 'rgba(31,138,91,0.08)' }}>
              <View style={[styles.thumb, { backgroundColor: item.tint }]}>
                <Ionicons name="restaurant" size={24} color={item.accent} />
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
                  {item.kcal} kcal · {item.prepMin} min · {item.tag}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{ opacity: 0.4 }} />
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0FDF4' },
  scroll: { padding: 20, paddingBottom: 120 },
  title: { fontFamily: Fonts.bold, fontSize: 28 },
  subtitle: { fontFamily: Fonts.regular, fontSize: 15, marginTop: 6, marginBottom: 20 },
  heroCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, padding: 16, marginBottom: 22, gap: 14, borderWidth: 1,
  },
  heroIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroBody: { flex: 1, minWidth: 0 },
  heroTitle: { fontFamily: Fonts.bold, fontSize: 18 },
  heroMeta: { fontFamily: Fonts.regular, fontSize: 13, marginTop: 4 },
  sectionLabel: {
    fontFamily: Fonts.semiBold, fontSize: 13,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6,
  },
  rowCard: { borderRadius: 18, marginBottom: 10, borderWidth: 1, overflow: 'hidden' },
  rowInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  thumb: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: Fonts.semiBold, fontSize: 16 },
  rowMeta: { fontFamily: Fonts.regular, fontSize: 13, marginTop: 4 },
});
