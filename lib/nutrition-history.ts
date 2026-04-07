import { fetchDayTotals, getLogDateKey, type DayTotals } from '@/lib/nutrition-sync';

export async function fetchRecentDayTotals(uid: string, numDays: number): Promise<DayTotals[]> {
  const out: DayTotals[] = [];
  const d = new Date();
  for (let i = 0; i < numDays; i++) {
    const key = getLogDateKey(d);
    out.push(await fetchDayTotals(uid, key));
    d.setDate(d.getDate() - 1);
  }
  return out;
}
