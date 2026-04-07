/** Normalized output from Gemini food vision */
export type FoodAnalysisResult = {
  foodName: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};
