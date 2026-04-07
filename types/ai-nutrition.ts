/** Gemini meal suggestion (list / plan). */
export type AiMealBrief = {
  id: string;
  title: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  prepMin: number;
  tag: string;
};

/** Full recipe for a meal plan item. */
export type AiMealRecipe = AiMealBrief & {
  ingredients: string[];
  steps: string[];
};

export type AiGroceryItem = {
  id: string;
  name: string;
  qty: string;
  reason?: string;
};
