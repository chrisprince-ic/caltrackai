import { get, ref, set } from 'firebase/database';

import { getFirebaseDatabase, isFirebaseConfigured } from '@/lib/firebase';

export type DailyCaloriesBurnedRecord = {
  burned: number;
  timestamp: number;
};

/**
 * Realtime Database path: users/{uid}/dailyCalories/{YYYY-MM-DD}
 * (Same shape as a Firestore doc would be; this project uses RTDB.)
 */
export function dailyCaloriesBurnedPath(uid: string, dateKey: string) {
  return `users/${uid}/dailyCalories/${dateKey}`;
}

/** Writes only when `burned` changed to avoid redundant RTDB writes. */
export async function syncDailyCaloriesBurnedIfChanged(
  uid: string,
  dateKey: string,
  burned: number
): Promise<void> {
  if (!isFirebaseConfigured() || !Number.isFinite(burned)) return;
  const db = getFirebaseDatabase();
  const r = ref(db, dailyCaloriesBurnedPath(uid, dateKey));
  try {
    const snap = await get(r);
    if (snap.exists()) {
      const prev = Number((snap.val() as DailyCaloriesBurnedRecord | null)?.burned);
      if (prev === burned) return;
    }
    const payload: DailyCaloriesBurnedRecord = { burned, timestamp: Date.now() };
    await set(r, payload);
  } catch {
    /* network / rules */
  }
}
