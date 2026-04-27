/** Scan pipeline: Google Vision cues + Gemini multimodal analysis */
export type FoodAnalysisResult = {
  foodName: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  /** Full description of visible meal, sides, garnishes, sauces */
  sceneDescription?: string;
  /** Each line: ingredient or component with rough portion */
  ingredients?: string[];
};
