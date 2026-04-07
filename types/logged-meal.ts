export type LoggedMealEntry = {
  id: string;
  foodName: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  imageUri?: string;
  loggedAt: number;
};
