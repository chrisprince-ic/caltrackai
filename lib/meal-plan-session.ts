import type { AiMealBrief } from '@/types/ai-nutrition';

let sessionMeals: AiMealBrief[] | null = null;
/** Calendar day (YYYY-MM-DD) when the current in-memory plan was generated / loaded from cache. */
let sessionPlanDateKey: string | null = null;

export function setMealPlanSessionMeals(meals: AiMealBrief[], planDateKey: string) {
  sessionMeals = meals;
  sessionPlanDateKey = planDateKey;
}

export function getMealPlanSessionPlanDateKey(): string | null {
  return sessionPlanDateKey;
}

export function getMealPlanSessionMeals(): AiMealBrief[] | null {
  return sessionMeals;
}

export function getMealPlanSessionAt(index: number): AiMealBrief | null {
  if (!sessionMeals || index < 0 || index >= sessionMeals.length) return null;
  return sessionMeals[index];
}

export function clearMealPlanSession() {
  sessionMeals = null;
  sessionPlanDateKey = null;
}
