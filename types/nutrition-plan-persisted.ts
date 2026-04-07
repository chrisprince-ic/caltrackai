export type PersistedNutritionPlan = {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  coachNote?: string;
  /** For AI meal / grocery prompts */
  dietarySummary?: string;
  updatedAt: number;
};
