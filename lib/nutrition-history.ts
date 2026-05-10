import { fetchDayTotals, getLogDateKey, type DayTotals } from '@/lib/nutrition-sync';

/**
 * Fetch the last `numDays` of daily totals for a user.
 *
 * Returns most-recent first (today at index 0). Internally fetches every day
 * in parallel via `Promise.all` — Firebase RTDB happily fans out single-day
 * reads, and the previous sequential implementation was the slowest part of
 * opening the Insights screen on a cold cache.
 *
 * Any individual day failure falls back to a zeroed `DayTotals` so the chart
 * still renders.
 */
export async function fetchRecentDayTotals(uid: string, numDays: number): Promise<DayTotals[]> {
  const safeNum = Math.max(0, Math.floor(numDays));
  if (safeNum === 0) return [];

  const today = new Date();
  const keys: string[] = [];
  for (let i = 0; i < safeNum; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keys.push(getLogDateKey(d));
  }

  const results = await Promise.all(
    keys.map((key) =>
      fetchDayTotals(uid, key).catch(
        (): DayTotals => ({
          dateKey: key,
          calories: 0,
          proteinGrams: 0,
          carbsGrams: 0,
          fatGrams: 0,
        })
      )
    )
  );
  return results;
}
