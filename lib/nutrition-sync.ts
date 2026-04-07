import { get, ref, set } from 'firebase/database';

import { normalizeLoggedMealEntry } from '@/lib/nutrition-entry-sanitize';
import type { LoggedMealEntry } from '@/types/logged-meal';
import { getFirebaseDatabase } from '@/lib/firebase';

/**
 * Calendar day key YYYY-MM-DD in the device local timezone.
 * Using local date matches Home "today" and avoids UTC vs local mismatches from `toISOString()`.
 */
export function getLogDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function fetchTodayNutritionEntries(uid: string): Promise<LoggedMealEntry[]> {
  const db = getFirebaseDatabase();
  const dateKey = getLogDateKey();
  const snap = await get(ref(db, `users/${uid}/days/${dateKey}/entries`));
  if (!snap.exists()) return [];
  const val = snap.val() as Record<
    string,
    {
      foodName: string;
      calories: number;
      proteinGrams: number;
      carbsGrams: number;
      fatGrams: number;
      imageUri?: string | null;
      loggedAt: number;
    }
  >;
  return Object.entries(val)
    .map(([id, data]) =>
      normalizeLoggedMealEntry({
        id,
        foodName: String(data.foodName ?? ''),
        calories: Number(data.calories),
        proteinGrams: Number(data.proteinGrams),
        carbsGrams: Number(data.carbsGrams),
        fatGrams: Number(data.fatGrams),
        imageUri: data.imageUri ?? undefined,
        loggedAt: Number(data.loggedAt),
      })
    )
    .sort((a, b) => b.loggedAt - a.loggedAt);
}

export async function saveNutritionEntry(uid: string, entry: LoggedMealEntry) {
  const db = getFirebaseDatabase();
  const clean = normalizeLoggedMealEntry(entry);
  const dateKey = getLogDateKey(new Date(clean.loggedAt));
  await set(ref(db, `users/${uid}/days/${dateKey}/entries/${clean.id}`), {
    foodName: clean.foodName,
    calories: clean.calories,
    proteinGrams: clean.proteinGrams,
    carbsGrams: clean.carbsGrams,
    fatGrams: clean.fatGrams,
    imageUri: clean.imageUri ?? null,
    loggedAt: clean.loggedAt,
  });
  await set(ref(db, `users/${uid}/dayIndex/${dateKey}`), true);
}

export async function fetchNutritionEntriesForDate(uid: string, dateKey: string): Promise<LoggedMealEntry[]> {
  const db = getFirebaseDatabase();
  const snap = await get(ref(db, `users/${uid}/days/${dateKey}/entries`));
  if (!snap.exists()) return [];
  const val = snap.val() as Record<
    string,
    {
      foodName: string;
      calories: number;
      proteinGrams: number;
      carbsGrams: number;
      fatGrams: number;
      imageUri?: string | null;
      loggedAt: number;
    }
  >;
  return Object.entries(val)
    .map(([id, data]) =>
      normalizeLoggedMealEntry({
        id,
        foodName: String(data.foodName ?? ''),
        calories: Number(data.calories),
        proteinGrams: Number(data.proteinGrams),
        carbsGrams: Number(data.carbsGrams),
        fatGrams: Number(data.fatGrams),
        imageUri: data.imageUri ?? undefined,
        loggedAt: Number(data.loggedAt),
      })
    )
    .sort((a, b) => b.loggedAt - a.loggedAt);
}

export async function fetchLoggedDateKeys(uid: string): Promise<string[]> {
  const db = getFirebaseDatabase();
  const snap = await get(ref(db, `users/${uid}/dayIndex`));
  if (!snap.exists()) return [];
  return Object.keys(snap.val() as Record<string, boolean>).sort();
}

export type DayTotals = {
  dateKey: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

export async function fetchDayTotals(uid: string, dateKey: string): Promise<DayTotals> {
  const entries = await fetchNutritionEntriesForDate(uid, dateKey);
  return entries.reduce(
    (acc, e) => ({
      dateKey,
      calories: acc.calories + e.calories,
      proteinGrams: acc.proteinGrams + e.proteinGrams,
      carbsGrams: acc.carbsGrams + e.carbsGrams,
      fatGrams: acc.fatGrams + e.fatGrams,
    }),
    { dateKey, calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 }
  );
}
