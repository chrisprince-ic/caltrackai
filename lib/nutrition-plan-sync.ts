import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, ref, set } from 'firebase/database';

import type { PersistedNutritionPlan } from '@/types/nutrition-plan-persisted';
import { getFirebaseDatabase } from '@/lib/firebase';

const PATH = 'nutritionPlan';
const LOCAL_KEY = (uid: string) => `@caltrackai/nutritionPlan_v1_${uid}`;

/** RTDB / JSON can surface numbers as strings; normalize so Home never falls back to mock 2100 incorrectly. */
export function normalizePersistedPlan(v: unknown): PersistedNutritionPlan | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const dailyCalories = Math.round(Number(o.dailyCalories));
  const proteinG = Math.round(Number(o.proteinG));
  const carbsG = Math.round(Number(o.carbsG));
  const fatG = Math.round(Number(o.fatG));
  if (![dailyCalories, proteinG, carbsG, fatG].every((n) => Number.isFinite(n))) {
    return null;
  }
  const updatedAt = Math.round(Number(o.updatedAt));
  return {
    dailyCalories,
    proteinG,
    carbsG,
    fatG,
    coachNote: typeof o.coachNote === 'string' ? o.coachNote : undefined,
    dietarySummary: typeof o.dietarySummary === 'string' ? o.dietarySummary : undefined,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
  };
}

export async function saveUserNutritionPlan(uid: string, plan: Omit<PersistedNutritionPlan, 'updatedAt'>) {
  const payload: PersistedNutritionPlan = {
    ...plan,
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(LOCAL_KEY(uid), JSON.stringify(payload));
  try {
    const db = getFirebaseDatabase();
    await set(ref(db, `users/${uid}/${PATH}`), payload);
  } catch {
    /* local copy still holds targets until RTDB succeeds */
  }
}

export async function fetchUserNutritionPlan(uid: string): Promise<PersistedNutritionPlan | null> {
  const readLocal = async (): Promise<PersistedNutritionPlan | null> => {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_KEY(uid));
      if (!raw) return null;
      return normalizePersistedPlan(JSON.parse(raw));
    } catch {
      return null;
    }
  };

  try {
    const db = getFirebaseDatabase();
    const snap = await get(ref(db, `users/${uid}/${PATH}`));
    if (snap.exists()) {
      const normalized = normalizePersistedPlan(snap.val());
      if (normalized) {
        await AsyncStorage.setItem(LOCAL_KEY(uid), JSON.stringify(normalized));
        return normalized;
      }
    }
  } catch {
    /* fall through to local */
  }

  return readLocal();
}
