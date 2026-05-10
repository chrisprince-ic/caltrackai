import type { Ionicons } from '@expo/vector-icons';

/**
 * Visual differentiation for meal idea cards (Plans screen).
 * Brand green (`Palette.iris`) is reserved for primary actions — never use it as a category color.
 */

export type MealVisualCategory = 'amber' | 'green' | 'coral' | 'blue' | 'red' | 'purple';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'salad';

export type IdeaFilterId =
  | 'all'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'high_protein'
  | 'quick'
  | 'vegetarian';

export type IdeaSortId = 'recommended' | 'quick' | 'protein' | 'calories';

export const MEAL_VISUAL_HEX: Record<MealVisualCategory, string> = {
  amber: '#EF9F27',
  green: '#22C55E',
  coral: '#D85A30',
  blue: '#378ADD',
  red: '#E24B4A',
  purple: '#7F77DD',
};

/** Icon stroke / text on tinted wells — “800” contrast stop per ramp. */
export const MEAL_VISUAL_STROKE: Record<MealVisualCategory, string> = {
  amber: '#B45309',
  green: '#166534',
  coral: '#9A3412',
  blue: '#1E3A8A',
  red: '#991B1B',
  purple: '#5B52C4',
};

const TINT_OPACITY = 0.14;

export function mealCategoryTint(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${TINT_OPACITY})`;
}

export function mealCategoryIcon(
  cat: MealVisualCategory
): keyof typeof Ionicons.glyphMap {
  switch (cat) {
    case 'amber':
      return 'egg-outline';
    case 'green':
      return 'leaf-outline';
    case 'coral':
      return 'fast-food-outline';
    case 'blue':
      return 'fish-outline';
    case 'red':
      return 'flame-outline';
    case 'purple':
      return 'nutrition-outline';
  }
}

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  salad: 'Salad',
};

export function mealSlotLabel(slot: MealSlot): string {
  return SLOT_LABEL[slot];
}

/**
 * Color stripe / icon / category pill — keyword priority per product spec.
 * Fish identity wins over “salad” in names like “Salmon salad”.
 */
export function inferVisualCategory(mealName: string): MealVisualCategory {
  const t = mealName.toLowerCase();
  if (/\b(oat|pancake|toast|muffin|cereal|granola|waffle|breakfast|overnight|porridge)\b/.test(t))
    return 'amber';
  if (/\b(salmon|tuna|cod|mackerel|sardine|trout|shrimp|seafood|fish)\b/.test(t)) return 'blue';
  if (/\b(beef|steak|burger|stir[\s-]?fry|chili|pork|lamb|ribs|meatball)\b/.test(t)) return 'red';
  if (/\b(wrap|sandwich|sub\b|bagel|burrito|taco|panini|gyro|quesadilla)\b/.test(t)) return 'coral';
  if (/\b(yogurt|smoothie|parfait|cheese\b|milk|cottage|kefir)\b/.test(t)) return 'purple';
  if (/\b(salad|bowl|kale|spinach|veg|greens|grain)\b/.test(t)) return 'green';
  return 'green';
}

/**
 * Meal “slot” for category pill + filter chips (Breakfast / Lunch / …).
 */
export function inferMealSlot(title: string, tag: string): MealSlot {
  const t = `${title} ${tag}`.toLowerCase();
  if (
    /\b(oat|pancake|toast|waffle|egg|breakfast|cereal|granola|overnight|morning|porridge)\b/.test(t)
  )
    return 'breakfast';
  if (/\b(snack|smoothie|apple\b|nuts|bar\b|cracker)\b/.test(t) && !/\b(breakfast|lunch)\b/.test(t))
    return 'snack';
  if (/\b(salad|caesar|greens|kale)\b/.test(t) && !/\b(salmon|tuna|fish)\b/.test(t)) return 'salad';
  if (/\b(wrap|sandwich|burger|burrito|taco|lunch|panini|sub\b|gyro)\b/.test(t)) return 'lunch';
  return 'dinner';
}

function simpleHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function looksVegetarian(title: string, tag: string): boolean {
  const t = `${title} ${tag}`.toLowerCase();
  if (/\b(beef|steak|chicken|pork|salmon|tuna|fish|shrimp|meat|turkey|bacon|lamb)\b/.test(t))
    return false;
  return /\b(veg|vegetarian|vegan|tofu|tempeh|bean|lentil|chickpea|hummus|falafel)\b/.test(t);
}

export type DescriptiveTagStyle = 'green' | 'blue' | 'amber';

export type DescriptiveTag = {
  label: string;
  style: DescriptiveTagStyle;
};

const DESCRIPTIVE_GREEN_BG = 'rgba(34, 197, 94, 0.14)';
const DESCRIPTIVE_BLUE_BG = 'rgba(55, 138, 221, 0.14)';
const DESCRIPTIVE_AMBER_BG = 'rgba(239, 159, 39, 0.14)';
const DESCRIPTIVE_GREEN_TEXT = '#166534';
const DESCRIPTIVE_BLUE_TEXT = '#1E3A8A';
const DESCRIPTIVE_AMBER_TEXT = '#B45309';

export function descriptiveTagColors(style: DescriptiveTagStyle): {
  bg: string;
  text: string;
} {
  switch (style) {
    case 'blue':
      return { bg: DESCRIPTIVE_BLUE_BG, text: DESCRIPTIVE_BLUE_TEXT };
    case 'amber':
      return { bg: DESCRIPTIVE_AMBER_BG, text: DESCRIPTIVE_AMBER_TEXT };
    default:
      return { bg: DESCRIPTIVE_GREEN_BG, text: DESCRIPTIVE_GREEN_TEXT };
  }
}

export type MealTagInput = {
  id: string;
  title: string;
  tag: string;
  prepMin: number;
  proteinG?: number;
  carbsG?: number;
};

/**
 * At most one descriptive tag; “High protein” throttled so it doesn’t dominate the list.
 */
export function buildDescriptiveTag(m: MealTagInput): DescriptiveTag | null {
  const title = m.title.toLowerCase();
  const p = m.proteinG ?? 0;
  const prep = m.prepMin;
  const carbs = m.carbsG;

  if (/\b(salmon|tuna|cod|mackerel|sardine|trout|fish|shrimp)\b/.test(title)) {
    return { label: 'Omega-3', style: 'blue' };
  }
  if (prep <= 10) return { label: 'Quick', style: 'green' };
  if (looksVegetarian(m.title, m.tag)) return { label: 'Vegetarian', style: 'green' };
  if (carbs !== undefined && carbs <= 20) return { label: 'Low carb', style: 'green' };
  if (p >= 30) {
    const h = simpleHash(m.id);
    if (h % 2 === 0) return { label: 'High protein', style: 'green' };
    return { label: `${Math.round(p)}g protein`, style: 'amber' };
  }
  return null;
}

export function matchesIdeaFilter(
  m: MealTagInput & { slot: MealSlot },
  filter: IdeaFilterId
): boolean {
  if (filter === 'all') return true;
  if (filter === 'breakfast') return m.slot === 'breakfast';
  if (filter === 'lunch') return m.slot === 'lunch';
  if (filter === 'dinner') return m.slot === 'dinner';
  if (filter === 'high_protein') return (m.proteinG ?? 0) >= 30;
  if (filter === 'quick') return m.prepMin <= 10;
  if (filter === 'vegetarian') return looksVegetarian(m.title, m.tag);
  return true;
}

export const IDEA_FILTER_CHIPS: { id: IdeaFilterId; label: string }[] = [
  { id: 'all', label: 'All ideas' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'high_protein', label: 'High protein' },
  { id: 'quick', label: 'Quick' },
  { id: 'vegetarian', label: 'Vegetarian' },
];

export const IDEA_SORT_OPTIONS: { id: IdeaSortId; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'quick', label: 'Quickest first' },
  { id: 'protein', label: 'Highest protein' },
  { id: 'calories', label: 'Fewest calories' },
];
