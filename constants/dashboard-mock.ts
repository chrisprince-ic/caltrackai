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
};

export const MEAL_PLAN_CARDS: MealPlanCard[] = [
  {
    id: '1',
    title: 'Mediterranean lunch bowl',
    kcal: 520,
    tag: 'High protein',
    prepMin: 15,
    accent: '#4B23C8',
    tint: '#F0ECFF',
  },
  {
    id: '2',
    title: 'Lean chicken & quinoa',
    kcal: 480,
    tag: 'Balanced',
    prepMin: 25,
    accent: '#FF6B9D',
    tint: '#FFE8F0',
  },
  {
    id: '3',
    title: 'Citrus salmon salad',
    kcal: 445,
    tag: 'Omega-3',
    prepMin: 20,
    accent: '#00C2D1',
    tint: '#E0F8FA',
  },
  {
    id: '4',
    title: 'Overnight oats & berries',
    kcal: 380,
    tag: 'Breakfast',
    prepMin: 5,
    accent: '#F5A623',
    tint: '#FFF8EB',
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
