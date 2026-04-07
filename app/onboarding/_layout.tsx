import { Stack } from 'expo-router';

import { OnboardingPlanProvider } from '@/contexts/OnboardingPlanContext';

export default function OnboardingLayout() {
  return (
    <OnboardingPlanProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="summary" />
      </Stack>
    </OnboardingPlanProvider>
  );
}
