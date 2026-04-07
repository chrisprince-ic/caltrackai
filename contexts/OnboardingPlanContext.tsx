import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { OnboardingAnswers } from '@/components/onboarding/OnboardingFlow';

type Ctx = {
  answers: OnboardingAnswers | null;
  setAnswers: (a: OnboardingAnswers) => void;
  clear: () => void;
};

const OnboardingPlanContext = createContext<Ctx | null>(null);

export function OnboardingPlanProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswersState] = useState<OnboardingAnswers | null>(null);
  const setAnswers = useCallback((a: OnboardingAnswers) => {
    setAnswersState(a);
  }, []);
  const clear = useCallback(() => setAnswersState(null), []);
  const value = useMemo(() => ({ answers, setAnswers, clear }), [answers, setAnswers, clear]);
  return <OnboardingPlanContext.Provider value={value}>{children}</OnboardingPlanContext.Provider>;
}

export function useOnboardingPlan() {
  const ctx = useContext(OnboardingPlanContext);
  if (!ctx) {
    throw new Error('useOnboardingPlan must be used within OnboardingPlanProvider');
  }
  return ctx;
}
