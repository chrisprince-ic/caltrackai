import type { ActivityId, GenderId, GoalId, OnboardingAnswers } from '@/components/onboarding/OnboardingFlow';

export type MacroSplit = {
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
};

export type WeekMilestone = { week: number; weightKg: number };

export type NutritionPlanSummary = {
  dailyCalories: number;
  tdee: number;
  bmr: number;
  macros: MacroSplit;
  weeksTotal: number;
  currentWeightKg: number;
  targetWeightKg: number;
  weightPlan: WeekMilestone[];
  effectiveGoal: GoalId;
};

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function answersToMetrics(a: OnboardingAnswers) {
  const age = parseInt(a.age, 10);
  let heightCm: number;
  if (a.heightUnit === 'metric') {
    heightCm = parseNum(a.heightCm) ?? 0;
  } else {
    const ft = parseNum(a.heightFt) ?? 0;
    const inch = parseNum(a.heightIn) ?? 0;
    heightCm = (ft * 12 + inch) * 2.54;
  }
  let weightKg: number;
  if (a.weightUnit === 'metric') {
    weightKg = parseNum(a.weight) ?? 0;
  } else {
    weightKg = (parseNum(a.weight) ?? 0) * 0.453592;
  }
  let targetKg: number;
  if (a.weightUnit === 'metric') {
    targetKg = parseNum(a.targetWeight) ?? 0;
  } else {
    targetKg = (parseNum(a.targetWeight) ?? 0) * 0.453592;
  }
  return { age, heightCm, weightKg, targetKg };
}

function activityMultiplier(activity: ActivityId): number {
  const m: Record<ActivityId, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return m[activity];
}

export function timelineIdToWeeks(id: string | null): number {
  if (!id) return 12;
  const w: Record<string, number> = {
    '4w': 4,
    '8w': 8,
    '12w': 12,
    '3m': 13,
    '6m': 26,
    '12m': 52,
  };
  return w[id] ?? 12;
}

function bmr(weightKg: number, heightCm: number, age: number, gender: GenderId): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78;
}

function roundCal(n: number) {
  return Math.round(n / 10) * 10;
}

function buildWeightMilestones(currentKg: number, targetKg: number, weeks: number, goal: GoalId): WeekMilestone[] {
  if (goal === 'maintain' || Math.abs(targetKg - currentKg) < 0.05) {
    return [
      { week: 0, weightKg: Math.round(currentKg * 10) / 10 },
      { week: weeks, weightKg: Math.round(currentKg * 10) / 10 },
    ];
  }
  const markers = new Set<number>([0, weeks]);
  if (weeks >= 4) markers.add(Math.min(4, weeks));
  if (weeks >= 8) markers.add(Math.min(Math.floor(weeks / 2), weeks - 1));
  if (weeks >= 12) markers.add(Math.min(Math.floor((weeks * 3) / 4), weeks - 1));
  const sorted = [...markers].filter((w) => w >= 0 && w <= weeks).sort((a, b) => a - b);
  return sorted.map((w) => {
    const t = weeks === 0 ? 0 : w / weeks;
    const kg = currentKg + (targetKg - currentKg) * t;
    return { week: w, weightKg: Math.round(kg * 10) / 10 };
  });
}

export function computeNutritionPlan(a: OnboardingAnswers): NutritionPlanSummary | null {
  if (!a.gender || !a.goal || !a.activity || !a.timelineId) return null;
  const { age, heightCm, weightKg, targetKg } = answersToMetrics(a);
  if (!age || !heightCm || !weightKg || !targetKg) return null;

  const weeks = timelineIdToWeeks(a.timelineId);
  const bmrVal = bmr(weightKg, heightCm, age, a.gender);
  const tdee = bmrVal * activityMultiplier(a.activity);

  let effectiveGoal: GoalId = a.goal;
  let dailyCalories = roundCal(tdee);

  if (a.goal === 'lose' && targetKg >= weightKg - 0.1) {
    effectiveGoal = 'maintain';
    dailyCalories = roundCal(tdee);
  } else if (a.goal === 'gain' && targetKg <= weightKg + 0.1) {
    effectiveGoal = 'maintain';
    dailyCalories = roundCal(tdee);
  } else if (a.goal === 'lose') {
    const deltaKg = weightKg - targetKg;
    const days = Math.max(weeks * 7, 1);
    let deficit = (deltaKg * 7700) / days;
    deficit = Math.min(1000, Math.max(300, deficit));
    dailyCalories = roundCal(tdee - deficit);
  } else if (a.goal === 'gain') {
    const deltaKg = targetKg - weightKg;
    const days = Math.max(weeks * 7, 1);
    let surplus = (deltaKg * 7700) / days;
    surplus = Math.min(600, Math.max(200, surplus));
    dailyCalories = roundCal(tdee + surplus);
  }

  dailyCalories = Math.max(1200, Math.min(5000, dailyCalories));

  const pct =
    effectiveGoal === 'lose'
      ? { p: 0.32, c: 0.38, f: 0.3 }
      : effectiveGoal === 'gain'
        ? { p: 0.28, c: 0.42, f: 0.3 }
        : { p: 0.3, c: 0.4, f: 0.3 };

  const macros: MacroSplit = {
    proteinG: Math.round((dailyCalories * pct.p) / 4),
    carbsG: Math.round((dailyCalories * pct.c) / 4),
    fatG: Math.round((dailyCalories * pct.f) / 9),
    proteinPct: Math.round(pct.p * 100),
    carbsPct: Math.round(pct.c * 100),
    fatPct: Math.round(pct.f * 100),
  };

  const weightPlan = buildWeightMilestones(weightKg, targetKg, weeks, effectiveGoal);

  return {
    dailyCalories,
    tdee: Math.round(tdee),
    bmr: Math.round(bmrVal),
    macros,
    weeksTotal: weeks,
    currentWeightKg: Math.round(weightKg * 10) / 10,
    targetWeightKg: Math.round(targetKg * 10) / 10,
    weightPlan,
    effectiveGoal,
  };
}

export function formatWeightFromKg(kg: number, unit: 'metric' | 'imperial'): string {
  if (unit === 'metric') return `${kg.toFixed(1)} kg`;
  const lb = kg / 0.453592;
  return `${lb.toFixed(1)} lb`;
}

/** Calorie-share percents from gram targets (for AI-refined macros on plan summary / home). */
export function macroPercentsFromGrams(proteinG: number, carbsG: number, fatG: number) {
  const pk = proteinG * 4;
  const ck = carbsG * 4;
  const fk = fatG * 9;
  const total = pk + ck + fk;
  if (total <= 0) {
    return { proteinPct: 0, carbsPct: 0, fatPct: 0 };
  }
  return {
    proteinPct: Math.round((pk / total) * 100),
    carbsPct: Math.round((ck / total) * 100),
    fatPct: Math.round((fk / total) * 100),
  };
}
