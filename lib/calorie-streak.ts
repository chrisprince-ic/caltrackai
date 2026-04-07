import { getLogDateKey } from '@/lib/nutrition-sync';

/** Consider goal "hit" when intake is within this band of daily target (under-eating breaks streak). */
const LOWER = 0.9;
const UPPER = 1.12;

function totalsMap(totals: { dateKey: string; calories: number }[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of totals) {
    m[t.dateKey] = t.calories;
  }
  return m;
}

/**
 * Consecutive days ending at `cursorDate` (local) where calories hit the goal band.
 * If today is not yet a hit, streak counts from yesterday backward (today doesn't break streak).
 */
export function computeCalorieStreak(goal: number, dailyTotals: { dateKey: string; calories: number }[]): number {
  if (goal <= 0) return 0;
  const byDate = totalsMap(dailyTotals);
  let streak = 0;
  const cursor = new Date();
  const todayKey = getLogDateKey(cursor);
  const todayCals = byDate[todayKey] ?? 0;
  const todayHit = todayCals >= goal * LOWER && todayCals <= goal * UPPER;
  if (!todayHit) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (let i = 0; i < 400; i++) {
    const key = getLogDateKey(cursor);
    const cals = byDate[key] ?? 0;
    const hit = cals >= goal * LOWER && cals <= goal * UPPER;
    if (!hit) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
