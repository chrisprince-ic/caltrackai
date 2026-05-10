/** Daily targets — “eaten” totals come from `NutritionLogContext` (scan + log). */
export const DASHBOARD_CALORIES = {
  goal: 2100,
};

export const DASHBOARD_MACROS = {
  protein: { goal: 140 },
  carbs: { goal: 200 },
  fat: { goal: 70 },
};

export type MealPlanCard = {
  id: string;
  title: string;
  kcal: number;
  tag: string;
  prepMin: number;
  accent: string;
  tint: string;
  proteinG?: number;
  carbsG?: number;
};

export const MEAL_PLAN_CARDS: MealPlanCard[] = [
  {
    id: '1',
    title: 'Mediterranean lunch bowl',
    kcal: 520,
    tag: 'Balanced',
    prepMin: 15,
    accent: '#22C55E',
    tint: '#DCFCE7',
    proteinG: 32,
    carbsG: 48,
  },
  {
    id: '2',
    title: 'Lean chicken & quinoa',
    kcal: 480,
    tag: 'High protein',
    prepMin: 25,
    accent: '#FF6B9D',
    tint: '#FFE8F0',
    proteinG: 42,
    carbsG: 38,
  },
  {
    id: '3',
    title: 'Citrus salmon salad',
    kcal: 445,
    tag: 'Omega-3',
    prepMin: 20,
    accent: '#00C2D1',
    tint: '#E0F8FA',
    proteinG: 36,
    carbsG: 28,
  },
  {
    id: '4',
    title: 'Overnight oats & berries',
    kcal: 380,
    tag: 'Breakfast',
    prepMin: 5,
    accent: '#F5A623',
    tint: '#FFF8EB',
    proteinG: 14,
    carbsG: 58,
  },
  {
    id: '5',
    title: 'Turkey wrap with hummus',
    kcal: 410,
    tag: 'Lunch',
    prepMin: 8,
    accent: '#D85A30',
    tint: '#FFF1E8',
    proteinG: 28,
    carbsG: 42,
  },
  {
    id: '6',
    title: 'Greek yogurt parfait',
    kcal: 290,
    tag: 'Snack',
    prepMin: 5,
    accent: '#7F77DD',
    tint: '#EDE9FF',
    proteinG: 18,
    carbsG: 36,
  },
];

export type GroceryItem = {
  id: string;
  name: string;
  qty: string;
  checked?: boolean;
};

export const GROCERY_SUGGESTIONS: GroceryItem[] = [
  { id: 'g1', name: 'Greek yogurt', qty: '2 tubs' },
  { id: 'g2', name: 'Baby spinach', qty: '1 bag' },
  { id: 'g3', name: 'Salmon fillets', qty: '4 pcs' },
  { id: 'g4', name: 'Steel-cut oats', qty: '1 box' },
  { id: 'g5', name: 'Blueberries', qty: '2 pints' },
];
