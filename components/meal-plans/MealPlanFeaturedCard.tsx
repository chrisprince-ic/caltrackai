import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

type Props = {
  mealCount: number;
  hasIdeas: boolean;
  generating: boolean;
  canGenerate: boolean;
  onNewPlan: () => void;
};

export function MealPlanFeaturedCard({
  mealCount,
  hasIdeas,
  generating,
  canGenerate,
  onNewPlan,
}: Props) {
  const router = useRouter();
  const { colors } = useAppTheme();

  const openWeekly = () => {
    router.push('/meal-plan/weekly' as Href);
  };

  if (!hasIdeas) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}>
        <View style={styles.topRow}>
          <View style={[styles.sparkleWell, { backgroundColor: colors.haze }]}>
            <Ionicons name="sparkles" size={24} color={Palette.iris} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.text }]}>Generate your first plan</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Set your nutrition targets and we&apos;ll build a week of meal ideas matched to your
              goals.
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onNewPlan}
          disabled={!canGenerate || generating}
          style={({ pressed }) => [
            styles.primaryFull,
            (!canGenerate || generating) && { opacity: 0.5 },
            pressed && canGenerate && !generating && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Generate plan">
          {generating ? (
            <ActivityIndicator color={Palette.white} />
          ) : (
            <Text style={styles.primaryFullText}>Generate plan</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={[styles.sparkleWell, { backgroundColor: colors.haze }]}>
          <Ionicons name="sparkles" size={24} color={Palette.iris} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.text }]}>Your week is ready</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {mealCount} {mealCount === 1 ? 'meal' : 'meals'} tuned to your daily macro and calorie
            targets
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={openWeekly}
          style={({ pressed }) => [styles.primaryHalf, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open weekly plan">
          <Text style={styles.primaryHalfText} numberOfLines={1}>
            Open plan →
          </Text>
        </Pressable>
        <Pressable
          onPress={onNewPlan}
          disabled={!canGenerate || generating}
          style={({ pressed }) => [
            styles.secondaryHalf,
            { borderColor: Palette.iris, backgroundColor: colors.surface },
            (!canGenerate || generating) && { opacity: 0.5 },
            pressed && canGenerate && !generating && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Generate a new plan">
          {generating ? (
            <ActivityIndicator size="small" color={Palette.iris} />
          ) : (
            <>
              <Ionicons name="refresh" size={16} color={Palette.iris} />
              <Text style={styles.secondaryHalfText} numberOfLines={1}>
                New plan
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
    shadowColor: '#0F1F08',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  topRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  sparkleWell: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1, minWidth: 0, gap: 4 },
  title: {
    fontFamily: Fonts.medium,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: { flexDirection: 'row', gap: 10 },
  primaryHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: Palette.iris,
    gap: 6,
  },
  primaryHalfText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Palette.white,
  },
  secondaryHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: Palette.white,
    borderWidth: 0.5,
    borderColor: Palette.iris,
  },
  secondaryHalfText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Palette.iris,
  },
  primaryFull: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Palette.iris,
    minHeight: 44,
  },
  primaryFullText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Palette.white,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});
