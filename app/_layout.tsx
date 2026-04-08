import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppThemeProvider, useAppTheme } from '@/contexts/AppThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NutritionLogProvider } from '@/contexts/NutritionLogContext';
import { NutritionTargetsProvider } from '@/contexts/NutritionTargetsContext';
import { RevenueCatProvider } from '@/contexts/RevenueCatContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  /** Root `app/index.tsx` is the splash gate before welcome or tabs. */
  anchor: 'index',
};

function RootLayoutBody() {
  const { navigationTheme, isDark } = useAppTheme();
  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider>
        <NutritionTargetsProvider>
          <RevenueCatProvider>
            <NutritionLogProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="welcome" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="subscription" options={{ headerShown: true, title: 'CalTrack Pro' }} />
                <Stack.Screen name="meal-plan/[planId]" options={{ headerShown: true, title: 'Meal plan' }} />
                <Stack.Screen
                  name="meal-recipe"
                  options={{
                    headerShown: true,
                    title: 'Recipe',
                    headerBackTitleVisible: false,
                    headerBackTitle: '',
                  }}
                />
                <Stack.Screen name="nutrition-targets" options={{ headerShown: true, title: 'Nutrition targets' }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
              </Stack>
              <StatusBar style={isDark ? 'light' : 'dark'} />
            </NutritionLogProvider>
          </RevenueCatProvider>
        </NutritionTargetsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppThemeProvider>
      <RootLayoutBody />
    </AppThemeProvider>
  );
}
