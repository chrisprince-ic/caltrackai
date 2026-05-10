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

  // Entries we tried to save to Firebase but the network/auth was down. We
  // retry these on every refresh and on AppState 'active'. Without this a
  // user could log a meal offline and lose it on next foreground.
  const pendingWritesRef = useRef<LoggedMealEntry[]>([]);
  const flushingRef = useRef(false);

  const flushPendingWrites = useCallback(async (): Promise<void> => {
    if (flushingRef.current) return;
    if (!user || !firebaseReady) return;
    if (pendingWritesRef.current.length === 0) return;
    flushingRef.current = true;
    try {
      const queue = pendingWritesRef.current;
      const stillPending: LoggedMealEntry[] = [];
      for (const entry of queue) {
        try {
          await saveNutritionEntry(user.uid, entry);
        } catch {
          stillPending.push(entry);
        }
      }
      pendingWritesRef.current = stillPending;
    } finally {
      flushingRef.current = false;
    }
  }, [user, firebaseReady]);

  const refreshTodayLog = useCallback(async () => {
    if (!user || !firebaseReady) {
      return;
    }
    setLogSyncing(true);
    try {
      // First try to flush any local rows whose previous save failed; if the
      // flush succeeds the remote read will already include those entries.
      await flushPendingWrites();
      const list = await fetchTodayNutritionEntries(user.uid);
      // Merge: keep any locally-added entries whose Firebase write hasn't
      // propagated yet, identified by IDs not present in the remote result.
      setEntries((prev) => {
        const remoteIds = new Set(list.map((e) => e.id));
        const pending = prev.filter((e) => !remoteIds.has(e.id));
        if (pending.length === 0) return list;
        return [...list, ...pending].sort((a, b) => b.loggedAt - a.loggedAt);
      });
    } catch {
      // On error, keep whatever is already in local state rather than wiping it.
    } finally {
      setLogSyncing(false);
    }
  }, [user, firebaseReady, flushPendingWrites]);

  useEffect(() => {
    if (!user || !firebaseReady) {
      if (!user) {
        setEntries([]);
        pendingWritesRef.current = [];
      }
      setLogSyncing(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLogSyncing(true);
      try {
        await flushPendingWrites();
        const list = await fetchTodayNutritionEntries(user.uid);
        if (!cancelled) {
          setEntries((prev) => {
            const remoteIds = new Set(list.map((e) => e.id));
            const pending = prev.filter((e) => !remoteIds.has(e.id));
            if (pending.length === 0) return list;
            return [...list, ...pending].sort((a, b) => b.loggedAt - a.loggedAt);
          });
        }
      } catch {
        // Keep local state on error
      } finally {
        if (!cancelled) setLogSyncing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, firebaseReady, flushPendingWrites]);

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
          // Network / auth blip — queue for retry on next refresh / foreground.
          pendingWritesRef.current.push(entry);
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
