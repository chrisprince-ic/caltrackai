/** Matches onboarding goal direction — drives activity eat-back on Home. */
export type WeightGoalDirection = 'lose' | 'maintain' | 'gain';

export type PersistedNutritionPlan = {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  coachNote?: string;
  /** For AI meal / grocery prompts */
  dietarySummary?: string;
  /** From onboarding; never edited from Home. */
  weightGoal?: WeightGoalDirection;
  updatedAt: number;
};
