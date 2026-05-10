import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  buildDescriptiveTag,
  descriptiveTagColors,
  inferMealSlot,
  inferVisualCategory,
  mealCategoryIcon,
  mealCategoryTint,
  mealSlotLabel,
  MEAL_VISUAL_HEX,
  MEAL_VISUAL_STROKE,
  type MealTagInput,
} from '@/constants/mealCategories';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';

export type MealPlanIdeaCardModel = MealTagInput & {
  kcal: number;
  recipeIdx?: number;
};

type Props = { item: MealPlanIdeaCardModel };

const CHEVRON = '#D1D5DB';

export function MealPlanIdeaCard({ item }: Props) {
  const router = useRouter();
  const { colors } = useAppTheme();

  const visual = inferVisualCategory(item.title);
  const slot = inferMealSlot(item.title, item.tag);
  const stroke = MEAL_VISUAL_STROKE[visual];
  const tint = mealCategoryTint(MEAL_VISUAL_HEX[visual]);
  const iconName = mealCategoryIcon(visual);
  const categoryLabel = mealSlotLabel(slot);
  const descriptive = buildDescriptiveTag({ ...item, id: item.id });

  const onPress = () =>
    item.recipeIdx != null
      ? router.push(`/meal-recipe?idx=${item.recipeIdx}` as Href)
      : router.push('/meal-plan/weekly' as Href);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
      <View style={[styles.stripe, { backgroundColor: MEAL_VISUAL_HEX[visual] }]} />
      <Pressable
        onPress={onPress}
        style={styles.inner}
        android_ripple={{ color: 'rgba(15,31,8,0.06)' }}>
        <View style={[styles.iconWell, { backgroundColor: tint }]}>
          <Ionicons name={iconName} size={22} color={stroke} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
            {item.kcal} kcal · {item.prepMin} min
          </Text>
          <View style={styles.tagRow}>
            <View style={[styles.tagPill, { backgroundColor: tint }]}>
              <Text style={[styles.tagPillText, { color: stroke }]} numberOfLines={1}>
                {categoryLabel}
              </Text>
            </View>
            {descriptive ? (
              <View
                style={[
                  styles.tagPill,
                  { backgroundColor: descriptiveTagColors(descriptive.style).bg },
                ]}>
                <Text
                  style={[
                    styles.tagPillText,
                    { color: descriptiveTagColors(descriptive.style).text },
                  ]}
                  numberOfLines={1}>
                  {descriptive.label}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={CHEVRON} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  stripe: { width: 4 },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    minHeight: 52,
  },
  iconWell: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 20,
  },
  meta: { fontFamily: Fonts.regular, fontSize: 12 },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    alignItems: 'center',
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 1,
  },
  tagPillText: { fontFamily: Fonts.semiBold, fontSize: 11, letterSpacing: 0.2 },
});
