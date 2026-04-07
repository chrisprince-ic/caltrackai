import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { normalizeLoggedMealEntry } from '@/lib/nutrition-entry-sanitize';
import { fetchTodayNutritionEntries, saveNutritionEntry } from '@/lib/nutrition-sync';
import type { LoggedMealEntry } from '@/types/logged-meal';

export type { LoggedMealEntry } from '@/types/logged-meal';

type AddInput = {
  foodName: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  imageUri?: string;
};

type Ctx = {
  entries: LoggedMealEntry[];
  totals: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  addEntry: (input: AddInput) => Promise<void>;
  /** Reload today’s rows from Realtime DB (signed-in only). */
  refreshTodayLog: () => Promise<void>;
  /** True while fetching today’s log from the server */
  logSyncing: boolean;
};

const NutritionLogContext = createContext<Ctx | null>(null);

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function NutritionLogProvider({ children }: { children: ReactNode }) {
  const { user, firebaseReady } = useAuth();
  const [entries, setEntries] = useState<LoggedMealEntry[]>([]);
  const [logSyncing, setLogSyncing] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const refreshTodayLog = useCallback(async () => {
    if (!user || !firebaseReady) {
      return;
    }
    setLogSyncing(true);
    try {
      const list = await fetchTodayNutritionEntries(user.uid);
      setEntries(list);
    } catch {
      setEntries([]);
    } finally {
      setLogSyncing(false);
    }
  }, [user, firebaseReady]);

  useEffect(() => {
    if (!user || !firebaseReady) {
      if (!user) {
        setEntries([]);
      }
      setLogSyncing(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLogSyncing(true);
      try {
        const list = await fetchTodayNutritionEntries(user.uid);
        if (!cancelled) setEntries(list);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLogSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, firebaseReady]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'active' && prev !== 'active' && user && firebaseReady) {
        void refreshTodayLog();
      }
    });
    return () => sub.remove();
  }, [user, firebaseReady, refreshTodayLog]);

  const addEntry = useCallback(
    async (input: AddInput) => {
      const entry = normalizeLoggedMealEntry({
        id: randomId(),
        foodName: input.foodName,
        calories: input.calories,
        proteinGrams: input.proteinGrams,
        carbsGrams: input.carbsGrams,
        fatGrams: input.fatGrams,
        imageUri: input.imageUri,
        loggedAt: Date.now(),
      });
      setEntries((prev) => [entry, ...prev]);
      if (user && firebaseReady) {
        try {
          await saveNutritionEntry(user.uid, entry);
        } catch {
          /* local row kept; RTDB rules / network may block */
        }
      }
    },
    [user, firebaseReady]
  );

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        proteinGrams: acc.proteinGrams + e.proteinGrams,
        carbsGrams: acc.carbsGrams + e.carbsGrams,
        fatGrams: acc.fatGrams + e.fatGrams,
      }),
      { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 }
    );
  }, [entries]);

  const value = useMemo(
    () => ({ entries, totals, addEntry, refreshTodayLog, logSyncing }),
    [entries, totals, addEntry, refreshTodayLog, logSyncing]
  );

  return <NutritionLogContext.Provider value={value}>{children}</NutritionLogContext.Provider>;
}

export function useNutritionLog() {
  const ctx = useContext(NutritionLogContext);
  if (!ctx) {
    throw new Error('useNutritionLog must be used within NutritionLogProvider');
  }
  return ctx;
}
