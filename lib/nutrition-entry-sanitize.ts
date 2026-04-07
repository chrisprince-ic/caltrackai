import type { LoggedMealEntry } from '@/types/logged-meal';

const MAX_FOOD_NAME_LEN = 200;
const MAX_CALORIES = 20000;
const MAX_MACRO_G = 2000;
const MAX_IMAGE_URI_LEN = 2048;

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : parseInt(String(n), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

/** Strip control chars and trim; avoid huge strings from RTDB abuse. */
export function sanitizeFoodName(raw: string): string {
  const s = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return s.slice(0, MAX_FOOD_NAME_LEN) || 'Meal';
}

export function sanitizeImageUri(uri: string | null | undefined): string | undefined {
  if (uri == null || typeof uri !== 'string') return undefined;
  const t = uri.trim();
  if (!t || t.length > MAX_IMAGE_URI_LEN) return undefined;
  return t;
}

/** Normalize one entry from client or server before display / persistence. */
export function normalizeLoggedMealEntry(e: LoggedMealEntry): LoggedMealEntry {
  return {
    id: String(e.id).slice(0, 120),
    foodName: sanitizeFoodName(e.foodName),
    calories: clampInt(e.calories, 0, MAX_CALORIES, 0),
    proteinGrams: clampInt(e.proteinGrams, 0, MAX_MACRO_G, 0),
    carbsGrams: clampInt(e.carbsGrams, 0, MAX_MACRO_G, 0),
    fatGrams: clampInt(e.fatGrams, 0, MAX_MACRO_G, 0),
    imageUri: sanitizeImageUri(e.imageUri),
    loggedAt: sanitizeLoggedAt(e.loggedAt),
  };
}

function sanitizeLoggedAt(raw: unknown): number {
  const t = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  const now = Date.now();
  if (!Number.isFinite(t) || t < 1_600_000_000_000 || t > now + 86400000 * 7) {
    return now;
  }
  return Math.round(t);
}
