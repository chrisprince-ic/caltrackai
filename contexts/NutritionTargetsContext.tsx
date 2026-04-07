import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { DASHBOARD_CALORIES, DASHBOARD_MACROS } from '@/constants/dashboard-mock';
import { fetchUserNutritionPlan } from '@/lib/nutrition-plan-sync';
import type { PersistedNutritionPlan } from '@/types/nutrition-plan-persisted';

type Ctx = {
  plan: PersistedNutritionPlan | null;
  loading: boolean;
  refresh: () => Promise<void>;
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  coachNote: string | null;
  dietarySummary: string;
};

const NutritionTargetsContext = createContext<Ctx | null>(null);

export function NutritionTargetsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PersistedNutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPlan(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const p = await fetchUserNutritionPlan(user.uid);
      setPlan(p);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => {
    const dailyCalories = plan?.dailyCalories ?? DASHBOARD_CALORIES.goal;
    const proteinG = plan?.proteinG ?? DASHBOARD_MACROS.protein.goal;
    const carbsG = plan?.carbsG ?? DASHBOARD_MACROS.carbs.goal;
    const fatG = plan?.fatG ?? DASHBOARD_MACROS.fat.goal;
    return {
      plan,
      loading,
      refresh,
      dailyCalories,
      proteinG,
      carbsG,
      fatG,
      coachNote: plan?.coachNote ?? null,
      dietarySummary: plan?.dietarySummary ?? '',
    };
  }, [plan, loading, refresh]);

  return <NutritionTargetsContext.Provider value={value}>{children}</NutritionTargetsContext.Provider>;
}

export function useNutritionTargets() {
  const ctx = useContext(NutritionTargetsContext);
  if (!ctx) {
    throw new Error('useNutritionTargets must be used within NutritionTargetsProvider');
  }
  return ctx;
}
