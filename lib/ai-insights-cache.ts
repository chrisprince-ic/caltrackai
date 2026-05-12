import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@caltrackai/insights/';
const TTL_MS = 30 * 60 * 1000; // 30 minutes

type InsightsPayload = {
  summary: string;
  proteinPctVsTarget: number;
  carbsPctVsTarget: number;
  fatPctVsTarget: number;
};

type Stored = {
  fp: string;
  at: number;
  data: InsightsPayload;
};

export function buildInsightsCacheKey(
  userId: string,
  period: string,
  fingerprint: string,
): string {
  return `${PREFIX}${userId}/${period}/${fingerprint.slice(0, 40)}`;
}

export async function loadCachedInsights(
  userId: string,
  period: string,
  fingerprint: string,
): Promise<InsightsPayload | null> {
  try {
    const key = buildInsightsCacheKey(userId, period, fingerprint);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored;
    if (stored.fp !== fingerprint) return null;
    if (Date.now() - stored.at > TTL_MS) return null;
    return stored.data;
  } catch {
    return null;
  }
}

export async function saveCachedInsights(
  userId: string,
  period: string,
  fingerprint: string,
  data: InsightsPayload,
): Promise<void> {
  try {
    const key = buildInsightsCacheKey(userId, period, fingerprint);
    const payload: Stored = { fp: fingerprint, at: Date.now(), data };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* non-fatal */
  }
}

export function buildInsightsFingerprint(params: {
  period: string;
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  loggedDayCount: number;
}): string {
  return `${params.period}|${params.dailyCalories}|${params.proteinG}|${params.carbsG}|${params.fatG}|${params.loggedDayCount}`;
}
