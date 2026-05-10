import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { getLogDateKey } from '@/lib/nutrition-sync';
import { syncDailyCaloriesBurnedIfChanged } from '@/lib/daily-calories-burned-sync';
import {
  AuthorizationRequestStatus,
  fetchLast7DaysTotalBurnedKcal,
  fetchTodayEnergyBurned,
  getEnergyAuthRequestStatus,
  isHealthKitPlatform,
  requestEnergyReadAuthorization,
} from '@/services/healthkit';

export type WeightGoalMode = 'lose' | 'maintain' | 'gain';

const GOAL_ADJUST_KCAL: Record<WeightGoalMode, number> = {
  lose: -400,
  maintain: 0,
  gain: 400,
};

const CACHE_KEY = '@caltrackai/health_burn_cache_v1';

type BurnCache = {
  dateKey: string;
  totalKcal: number;
  activeKcal: number;
  basalKcal: number;
  at: number;
};

async function readCache(): Promise<BurnCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as BurnCache;
    if (typeof p?.dateKey !== 'string' || typeof p?.totalKcal !== 'number') return null;
    return p;
  } catch {
    return null;
  }
}

async function writeCache(c: BurnCache) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

/** Normalized Health integration state for UI (see DailyEnergyCard). */
export type HealthKitUiStatus = 'connected' | 'unavailable' | 'denied' | 'loading';

export type UseCaloriesState = {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  activeKcal: number;
  basalKcal: number;
  totalKcal: number;
  needsAuthCTA: boolean;
  showEmptyBurn: boolean;
  weekTotals: number[];
  suggestedIntakeKcal: number | null;
  weightGoal: WeightGoalMode;
  setWeightGoal: (g: WeightGoalMode) => void;
  refresh: () => Promise<void>;
  requestAccess: () => Promise<boolean>;
  openHealthSettings: () => void;
  platformSupported: boolean;
  /** Derived connection state for calorie cards. */
  healthKitStatus: HealthKitUiStatus;
  /** Wall-clock ms after a successful energy fetch (Apple Health only). */
  lastSyncedAt: number | null;
  /** After first energy fetch attempt (used to avoid treat-in-progress refresh as "loading" UI). */
  fetchedOnce: boolean;
};

export function useCalories(options?: { initialWeightGoal?: WeightGoalMode }): UseCaloriesState {
  const { user, firebaseReady } = useAuth();
  const [weightGoal, setWeightGoal] = useState<WeightGoalMode>(options?.initialWeightGoal ?? 'maintain');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeKcal, setActiveKcal] = useState(0);
  const [basalKcal, setBasalKcal] = useState(0);
  const [totalKcal, setTotalKcal] = useState(0);
  const [authRequestStatus, setAuthRequestStatus] = useState<AuthorizationRequestStatus | null>(null);
  const [weekTotals, setWeekTotals] = useState<number[]>(() => Array(7).fill(0));
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const platformSupported = isHealthKitPlatform();

  useEffect(() => {
    const g = options?.initialWeightGoal;
    if (g === 'lose' || g === 'maintain' || g === 'gain') {
      setWeightGoal(g);
    }
  }, [options?.initialWeightGoal]);

  const runFetch = useCallback(
    async (isPull: boolean) => {
      if (!platformSupported) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (isPull) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const status = await getEnergyAuthRequestStatus();
        setAuthRequestStatus(status);

        const needsPrompt =
          status === AuthorizationRequestStatus.shouldRequest ||
          status === AuthorizationRequestStatus.unknown;
        if (needsPrompt) {
          const cached = await readCache();
          const todayKey = getLogDateKey();
          if (cached?.dateKey === todayKey) {
            setActiveKcal(cached.activeKcal);
            setBasalKcal(cached.basalKcal);
            setTotalKcal(cached.totalKcal);
          }
          setFetchedOnce(true);
          return;
        }

        await requestEnergyReadAuthorization();
        setAuthRequestStatus(await getEnergyAuthRequestStatus());

        const [today, week] = await Promise.all([fetchTodayEnergyBurned(), fetchLast7DaysTotalBurnedKcal()]);
        setActiveKcal(today.activeKcal);
        setBasalKcal(today.basalKcal);
        setTotalKcal(today.totalKcal);
        setWeekTotals(week);

        const todayKey = getLogDateKey();
        await writeCache({
          dateKey: todayKey,
          totalKcal: today.totalKcal,
          activeKcal: today.activeKcal,
          basalKcal: today.basalKcal,
          at: Date.now(),
        });

        if (user?.uid && firebaseReady) {
          void syncDailyCaloriesBurnedIfChanged(user.uid, todayKey, today.totalKcal);
        }
        setFetchedOnce(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load Health data');
        setFetchedOnce(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [platformSupported, user?.uid, firebaseReady]
  );

  useEffect(() => {
    void readCache().then((c) => {
      const todayKey = getLogDateKey();
      if (c?.dateKey === todayKey) {
        setActiveKcal(c.activeKcal);
        setBasalKcal(c.basalKcal);
        setTotalKcal(c.totalKcal);
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!platformSupported) {
        setLoading(false);
        return;
      }
      void runFetch(false);
    }, [platformSupported, runFetch])
  );

  useEffect(() => {
    if (!platformSupported) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void runFetch(true);
    });
    return () => sub.remove();
  }, [platformSupported, runFetch]);

  const needsAuthCTA = useMemo(() => {
    if (!platformSupported) return false;
    return (
      authRequestStatus === AuthorizationRequestStatus.shouldRequest ||
      authRequestStatus === AuthorizationRequestStatus.unknown
    );
  }, [platformSupported, authRequestStatus]);

  const healthKitStatus = useMemo((): HealthKitUiStatus => {
    if (!platformSupported) return 'unavailable';
    if (needsAuthCTA) return 'denied';
    if (loading && !fetchedOnce) return 'loading';
    return 'connected';
  }, [platformSupported, needsAuthCTA, loading, fetchedOnce]);

  const showEmptyBurn = useMemo(
    () =>
      platformSupported &&
      fetchedOnce &&
      !loading &&
      !needsAuthCTA &&
      totalKcal <= 0,
    [platformSupported, fetchedOnce, loading, needsAuthCTA, totalKcal]
  );

  const suggestedIntakeKcal = useMemo(() => {
    if (!platformSupported || needsAuthCTA || totalKcal <= 0) return null;
    const adj = GOAL_ADJUST_KCAL[weightGoal];
    return Math.max(0, Math.round(totalKcal + adj));
  }, [platformSupported, needsAuthCTA, totalKcal, weightGoal]);

  const refresh = useCallback(async () => {
    await runFetch(true);
  }, [runFetch]);

  const requestAccess = useCallback(async (): Promise<boolean> => {
    if (!platformSupported) return false;
    setError(null);
    try {
      const granted = await requestEnergyReadAuthorization();
      setAuthRequestStatus(await getEnergyAuthRequestStatus());
      await runFetch(true);
      return granted;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authorization failed');
      return false;
    }
  }, [platformSupported, runFetch]);

  const openHealthSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      void Linking.openURL('app-settings:');
    }
  }, []);

  return {
    loading,
    refreshing,
    error,
    activeKcal,
    basalKcal,
    totalKcal,
    needsAuthCTA,
    showEmptyBurn,
    weekTotals,
    suggestedIntakeKcal,
    weightGoal,
    setWeightGoal,
    refresh,
    requestAccess,
    openHealthSettings,
    platformSupported,
    healthKitStatus,
    lastSyncedAt,
    fetchedOnce,
  };
}
