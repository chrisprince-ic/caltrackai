import type { WeightGoalDirection } from '@/types/nutrition-plan-persisted';

/** Eat-back multiplier for today's active calories (resting is already in base goal). */
export function activityEatBackFactor(goal: WeightGoalDirection): number {
  if (goal === 'lose') return 0.5;
  return 1;
}

export function computeAdjustedDailyTarget(
  baseGoal: number,
  activeCaloriesToday: number,
  goal: WeightGoalDirection
): number {
  const add = activeCaloriesToday * activityEatBackFactor(goal);
  return Math.round(Math.max(0, baseGoal + add));
}

export type EnergyDayStatus = 'on_track' | 'on_target' | 'over';

/** Thresholds from product spec (percent of adjusted target). */
export function computeEnergyStatus(eaten: number, adjustedTarget: number): EnergyDayStatus {
  if (adjustedTarget <= 0) return 'on_track';
  const pct = (eaten / adjustedTarget) * 100;
  if (pct < 90) return 'on_track';
  if (pct <= 105) return 'on_target';
  return 'over';
}

export function goalDirectionLabel(goal: WeightGoalDirection): string {
  switch (goal) {
    case 'lose':
      return 'Lose';
    case 'gain':
      return 'Gain';
    default:
      return 'Maintain';
  }
}
