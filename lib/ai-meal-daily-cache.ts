import AsyncStorage from '@react-native-async-storage/async-storage';

import { getLogDateKey } from '@/lib/nutrition-sync';
import type { AiGroceryItem, AiMealBrief, AiMealRecipe } from '@/types/ai-nutrition';

const WEEKLY_PREFIX = '@caltrackai/dailyAi/weekly/';
const GROCERY_PREFIX = '@caltrackai/dailyAi/groceries/';
const RECIPE_PREFIX = '@caltrackai/dailyAi/recipe/';

export type NutritionTargetsForCache = {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  dietarySummary: string;
};

/** Bump if cache shape changes (invalidates old entries). */
const CACHE_VERSION = '1';

export function buildTargetsFingerprint(t: NutritionTargetsForCache): string {
  return `${CACHE_VERSION}|${t.dailyCalories}|${t.proteinG}|${t.carbsG}|${t.fatG}|${t.dietarySummary.trim()}`;
}

export function buildDietaryFingerprint(dietarySummary: string): string {
  return `${CACHE_VERSION}|${dietarySummary.trim().slice(0, 160)}`;
}

type WeeklyStored = { targetFp: string; meals: AiMealBrief[] };

export async function loadCachedWeeklyPlan(
  dateKey: string,
  targetFingerprint: string
): Promise<AiMealBrief[] | null> {
  try {
    const raw = await AsyncStorage.getItem(WEEKLY_PREFIX + dateKey);
    if (!raw) return null;
    const data = JSON.parse(raw) as WeeklyStored;
    if (data.targetFp !== targetFingerprint || !Array.isArray(data.meals) || data.meals.length === 0) {
      return null;
    }
    return data.meals;
  } catch {
    return null;
  }
}

export async function saveCachedWeeklyPlan(
  dateKey: string,
  targetFingerprint: string,
  meals: AiMealBrief[]
): Promise<void> {
  try {
    const payload: WeeklyStored = { targetFp: targetFingerprint, meals };
    await AsyncStorage.setItem(WEEKLY_PREFIX + dateKey, JSON.stringify(payload));
  } catch {
    /* non-fatal */
  }
}

type GroceryStored = { targetFp: string; items: AiGroceryItem[] };

export async function loadCachedWeeklyGroceries(
  dateKey: string,
  targetFingerprint: string
): Promise<AiGroceryItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(GROCERY_PREFIX + dateKey);
    if (!raw) return null;
    const data = JSON.parse(raw) as GroceryStored;
    if (data.targetFp !== targetFingerprint || !Array.isArray(data.items) || data.items.length === 0) {
      return null;
    }
    return data.items;
  } catch {
    return null;
  }
}

export async function saveCachedWeeklyGroceries(
  dateKey: string,
  targetFingerprint: string,
  items: AiGroceryItem[]
): Promise<void> {
  try {
    const payload: GroceryStored = { targetFp: targetFingerprint, items };
    await AsyncStorage.setItem(GROCERY_PREFIX + dateKey, JSON.stringify(payload));
  } catch {
    /* non-fatal */
  }
}

type RecipeStored = { mealId: string; dietaryFp: string; recipe: AiMealRecipe };

function recipeKey(planDateKey: string, mealIndex: number): string {
  return `${RECIPE_PREFIX}${planDateKey}/${mealIndex}`;
}

export async function loadCachedRecipe(
  planDateKey: string,
  mealIndex: number,
  brief: AiMealBrief,
  dietaryFingerprint: string
): Promise<AiMealRecipe | null> {
  try {
    const raw = await AsyncStorage.getItem(recipeKey(planDateKey, mealIndex));
    if (!raw) return null;
    const data = JSON.parse(raw) as RecipeStored;
    if (
      data.mealId !== brief.id ||
      data.dietaryFp !== dietaryFingerprint ||
      !data.recipe?.ingredients ||
      !data.recipe?.steps
    ) {
      return null;
    }
    return data.recipe;
  } catch {
    return null;
  }
}

export async function saveCachedRecipe(
  planDateKey: string,
  mealIndex: number,
  brief: AiMealBrief,
  dietaryFingerprint: string,
  recipe: AiMealRecipe
): Promise<void> {
  try {
    const payload: RecipeStored = {
      mealId: brief.id,
      dietaryFp: dietaryFingerprint,
      recipe,
    };
    await AsyncStorage.setItem(recipeKey(planDateKey, mealIndex), JSON.stringify(payload));
  } catch {
    /* non-fatal */
  }
}

export { getLogDateKey };
