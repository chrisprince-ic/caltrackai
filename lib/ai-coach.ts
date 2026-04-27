import type { OnboardingAnswers } from '@/components/onboarding/OnboardingFlow';
import { extractJsonObject } from '@/lib/ai-json-utils';
import { deepSeekComplete, getDeepSeekConfig } from '@/lib/deepseek';
import type { NutritionPlanSummary } from '@/lib/nutrition-calculations';
import type { DayTotals } from '@/lib/nutrition-sync';
import type { AiGroceryItem, AiMealBrief, AiMealRecipe } from '@/types/ai-nutrition';

async function generateJson(prompt: string): Promise<string> {
  if (!getDeepSeekConfig()) {
    throw new Error('Missing EXPO_PUBLIC_DEEPSEEK_API_KEY');
  }
  return deepSeekComplete(prompt);
}

function summarizeAnswers(a: OnboardingAnswers): string {
  return JSON.stringify({
    gender: a.gender,
    age: a.age,
    heightUnit: a.heightUnit,
    heightCm: a.heightCm,
    heightFt: a.heightFt,
    heightIn: a.heightIn,
    weightUnit: a.weightUnit,
    weight: a.weight,
    goal: a.goal,
    targetWeight: a.targetWeight,
    timelineId: a.timelineId,
    mealsId: a.mealsId,
    budget: a.budget,
    activity: a.activity,
    dietary: a.dietary,
  });
}

/** Refine calorie + macro targets from computed plan + raw onboarding answers (becomes daily Home targets). */
export async function refineNutritionPlanWithAi(
  answers: OnboardingAnswers,
  computed: NutritionPlanSummary
): Promise<{ dailyCalories: number; proteinG: number; carbsG: number; fatG: number; coachNote: string }> {
  const prompt = `You are a registered-dietitian-style coach (not medical advice). The user finished onboarding with: gender, age, height, current weight, goal (lose/gain/maintain), target weight, timeline, how many meals/snacks per day (mealsId), grocery budget style (budget), activity level, and dietary tags (dietary).

Use ALL of that context plus the computed baseline below. Return ONLY valid JSON:
{"dailyCalories":number,"proteinG":number,"carbsG":number,"fatG":number,"coachNote":"one short sentence"}

Rules:
- These four numbers are their DAILY targets for logging food and the app home screen — be precise and consistent.
- Align calories with goal and timeline (safe deficit or surplus vs TDEE); adjust dailyCalories within ±12% of computed ${
    computed.dailyCalories
  } only when profile justifies it, otherwise stay very close to the baseline.
- Macros must approximately match dailyCalories (protein 4 kcal/g, carbs 4, fat 9); use whole grams.
- Respect dietary (e.g. vegan/vegetarian/halal): keep targets realistic; mention the main focus in coachNote if helpful.
- Consider activity and mealsId when choosing macro emphasis (e.g. protein for active users; coachNote can mention meal rhythm).
- coachNote: max 200 chars, encouraging, specific to this person.

Full onboarding answers JSON: ${summarizeAnswers(answers)}
Computed baseline plan JSON: ${JSON.stringify({
    dailyCalories: computed.dailyCalories,
    tdee: computed.tdee,
    bmr: computed.bmr,
    macros: computed.macros,
    effectiveGoal: computed.effectiveGoal,
    weeksTotal: computed.weeksTotal,
    currentWeightKg: computed.currentWeightKg,
    targetWeightKg: computed.targetWeightKg,
  })}`;

  const raw = await generateJson(prompt);
  const data = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>;
  const dailyCalories = Math.round(Number(data.dailyCalories) || computed.dailyCalories);
  const proteinG = Math.round(Number(data.proteinG) || computed.macros.proteinG);
  const carbsG = Math.round(Number(data.carbsG) || computed.macros.carbsG);
  const fatG = Math.round(Number(data.fatG) || computed.macros.fatG);
  const coachNote =
    typeof data.coachNote === 'string' ? data.coachNote.trim().slice(0, 220) : 'Your plan is tuned to your goal and activity.';
  return { dailyCalories, proteinG, carbsG, fatG, coachNote };
}

/** Meal ideas when user still has room in calories / macros. */
export async function suggestMealsForRemaining(input: {
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number };
  consumed: { calories: number; proteinG: number; carbsG: number; fatG: number };
  dietaryNotes: string;
}): Promise<AiMealBrief[]> {
  const rem = {
    calories: Math.max(0, input.targets.calories - input.consumed.calories),
    proteinG: Math.max(0, input.targets.proteinG - input.consumed.proteinG),
    carbsG: Math.max(0, input.targets.carbsG - input.consumed.carbsG),
    fatG: Math.max(0, input.targets.fatG - input.consumed.fatG),
  };
  const prompt = `Suggest 4 meal ideas for the rest of the day. Return ONLY JSON: {"meals":[{"id":"m1","title":"string","calories":number,"proteinG":number,"carbsG":number,"fatG":number,"prepMin":number,"tag":"short"}]}
Remaining budget today: ${JSON.stringify(rem)}. Dietary: ${input.dietaryNotes || 'none'}.
Each meal should fit mostly within remaining macros; calories realistic integers.`;

  const raw = await generateJson(prompt);
  const data = JSON.parse(extractJsonObject(raw)) as { meals?: unknown[] };
  const meals = Array.isArray(data.meals) ? data.meals : [];
  return meals.map((m, i) => {
    const o = m as Record<string, unknown>;
    return {
      id: String(o.id ?? `meal-${i}`),
      title: String(o.title ?? 'Meal'),
      calories: Math.round(Number(o.calories) || 0),
      proteinG: Math.round(Number(o.proteinG) || 0),
      carbsG: Math.round(Number(o.carbsG) || 0),
      fatG: Math.round(Number(o.fatG) || 0),
      prepMin: Math.round(Number(o.prepMin) || 20),
      tag: String(o.tag ?? 'Balanced'),
    };
  });
}

/** One consolidated shopping list for ~7 days (pair with daily AsyncStorage cache). */
export async function suggestWeeklyGroceries(input: {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  dietaryNotes: string;
}): Promise<AiGroceryItem[]> {
  const prompt = `Return ONLY JSON: {"items":[{"id":"g1","name":"string","qty":"string","reason":"short optional"}]}
Suggest ONE consolidated grocery list for a full week (about 7 days) of home cooking to meet these DAILY targets on average.
Include 15–22 items: produce, proteins, grains, dairy or alternatives, pantry staples; quantities should cover the week (e.g. "2 lb", "1 dozen", "32 oz").
Daily targets: ${JSON.stringify({
    dailyCalories: input.dailyCalories,
    proteinG: input.proteinG,
    carbsG: input.carbsG,
    fatG: input.fatG,
  })}. Dietary: ${input.dietaryNotes || 'none'}.`;

  const raw = await generateJson(prompt);
  const data = JSON.parse(extractJsonObject(raw)) as { items?: unknown[] };
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((it, i) => {
    const o = it as Record<string, unknown>;
    return {
      id: String(o.id ?? `g-${i}`),
      name: String(o.name ?? 'Item'),
      qty: String(o.qty ?? '1'),
      reason: typeof o.reason === 'string' ? o.reason : undefined,
    };
  });
}

export async function suggestWeeklyMealPlan(input: {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  dietaryNotes: string;
}): Promise<AiMealBrief[]> {
  const prompt = `Return ONLY JSON: {"meals":[{"id":"w1","title":"string","calories":number,"proteinG":number,"carbsG":number,"fatG":number,"prepMin":number,"tag":"Breakfast|Lunch|Dinner|Snack"}]}
Create 7 varied meals (mix of breakfast, lunch, dinner) approximating daily targets spread across the day.
Daily targets: ${JSON.stringify(input)}. Dietary: ${input.dietaryNotes || 'none'}.`;

  const raw = await generateJson(prompt);
  const data = JSON.parse(extractJsonObject(raw)) as { meals?: unknown[] };
  const meals = Array.isArray(data.meals) ? data.meals : [];
  return meals.map((m, i) => {
    const o = m as Record<string, unknown>;
    return {
      id: String(o.id ?? `w-${i}`),
      title: String(o.title ?? 'Meal'),
      calories: Math.round(Number(o.calories) || 0),
      proteinG: Math.round(Number(o.proteinG) || 0),
      carbsG: Math.round(Number(o.carbsG) || 0),
      fatG: Math.round(Number(o.fatG) || 0),
      prepMin: Math.round(Number(o.prepMin) || 25),
      tag: String(o.tag ?? 'Meal'),
    };
  });
}

export async function expandMealToRecipe(meal: AiMealBrief, dietaryNotes: string): Promise<AiMealRecipe> {
  const prompt = `Return ONLY JSON for one recipe with keys id, title, calories, proteinG, carbsG, fatG, prepMin, tag, ingredients (string array), steps (string array).
Base meal: ${JSON.stringify(meal)}
ingredients: 5–12 lines with amounts. steps: 5–10 clear sentences. Dietary: ${dietaryNotes || 'none'}.`;

  const raw = await generateJson(prompt);
  const data = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>;
  const ingredients = Array.isArray(data.ingredients) ? data.ingredients.map(String) : [];
  const steps = Array.isArray(data.steps) ? data.steps.map(String) : [];
  return {
    id: String(data.id ?? meal.id),
    title: String(data.title ?? meal.title),
    calories: Math.round(Number(data.calories) || meal.calories),
    proteinG: Math.round(Number(data.proteinG) || meal.proteinG),
    carbsG: Math.round(Number(data.carbsG) || meal.carbsG),
    fatG: Math.round(Number(data.fatG) || meal.fatG),
    prepMin: Math.round(Number(data.prepMin) || meal.prepMin),
    tag: String(data.tag ?? meal.tag),
    ingredients,
    steps,
  };
}

export async function insightsFromMacroHistory(input: {
  periodLabel: string;
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number };
  days: DayTotals[];
  /** From saved nutrition plan (onboarding + AI) */
  coachNote?: string | null;
  dietarySummary?: string;
  /** Days logged within ~90–112% of calorie goal vs days in range */
  adherenceHits?: number;
  adherenceTotal?: number;
}): Promise<{ summary: string; proteinPctVsTarget: number; carbsPctVsTarget: number; fatPctVsTarget: number }> {
  const avg = input.days.length
    ? input.days.reduce(
        (a, d) => ({
          cal: a.cal + d.calories,
          p: a.p + d.proteinGrams,
          c: a.c + d.carbsGrams,
          f: a.f + d.fatGrams,
        }),
        { cal: 0, p: 0, c: 0, f: 0 }
      )
    : { cal: 0, p: 0, c: 0, f: 0 };
  const n = Math.max(1, input.days.length);
  const av = { cal: avg.cal / n, p: avg.p / n, c: avg.c / n, f: avg.f / n };
  const profileBits = [
    input.dietarySummary ? `Dietary preferences/tags: ${input.dietarySummary}` : null,
    input.coachNote ? `Prior plan note from onboarding AI: ${input.coachNote}` : null,
    input.adherenceHits != null && input.adherenceTotal != null
      ? `Calorie-goal adherence this period: ${input.adherenceHits} of ${input.adherenceTotal} logged days roughly on target (about 90–112% of calorie goal).`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `You are a pragmatic nutrition coach (not medical advice). Use EVERYTHING below: saved targets, dietary context, adherence summary, and per-day logs.

Return ONLY valid JSON:
{"summary":"string","proteinPctVsTarget":number,"carbsPctVsTarget":number,"fatPctVsTarget":number}

Field rules:
- summary: 3–6 sentences. Be specific and realistic. Tie recommendations to their actual averages, adherence, and dietary tags. If there are few or no logged days, say so and give concrete next steps (what to log, one example day structure, macro emphasis). Mention 1–2 actionable tweaks (meals, timing, or macro shifts), not generic platitudes.
- proteinPctVsTarget, carbsPctVsTarget, fatPctVsTarget: average daily grams vs targets as percentages (e.g. 88 = 88% of protein target). Integers. If there are zero logged days with data, use 100 for all three.

Period: ${input.periodLabel}
Daily targets (kcal + macro grams): ${JSON.stringify(input.targets)}
${profileBits ? `${profileBits}\n` : ''}
Per-day totals, most recent first (may be empty): ${JSON.stringify(
    input.days.map((d) => ({
      date: d.dateKey,
      kcal: d.calories,
      protein: d.proteinGrams,
      carbs: d.carbsGrams,
      fat: d.fatGrams,
    }))
  )}
Computed averages over logged days (if any): ${JSON.stringify(av)}`;

  const raw = await generateJson(prompt);
  const data = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>;
  return {
    summary: String(data.summary ?? 'Keep logging meals for richer insights.'),
    proteinPctVsTarget: Math.round(Number(data.proteinPctVsTarget) || 100),
    carbsPctVsTarget: Math.round(Number(data.carbsPctVsTarget) || 100),
    fatPctVsTarget: Math.round(Number(data.fatPctVsTarget) || 100),
  };
}
