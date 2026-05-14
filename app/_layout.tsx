import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { type Href, Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

import { initNotifications } from '@/lib/notifications';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppThemeProvider, useAppTheme } from '@/contexts/AppThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NutritionLogProvider } from '@/contexts/NutritionLogContext';
import { NutritionTargetsProvider } from '@/contexts/NutritionTargetsContext';
import { IAPProvider } from '@/contexts/IAPContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  /** Root `app/index.tsx` is the splash gate before welcome or tabs. */
  anchor: 'index',
};

function RootLayoutBody() {
  const { navigationTheme, isDark } = useAppTheme();
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledIdRef = useRef<string | null>(null);

  useEffect(() => {
    void initNotifications();
  }, []);

  useEffect(() => {
    const id = lastResponse?.notification.request.identifier;
    if (!id || handledIdRef.current === id) return;
    handledIdRef.current = id;
    const screen = lastResponse?.notification.request.content.data?.screen;
    if (screen === 'insights') {
      router.push('/(tabs)/insights' as Href);
    }
  }, [lastResponse, router]);

  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider>
        <NutritionTargetsProvider>
          <IAPProvider>
            <NutritionLogProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  // Hide the iOS back-button label globally so the route group
                  // folder name (e.g. "(tabs)") never leaks into the UI. The
                  // chevron alone is universally understood, matching modern
                  // iOS app conventions.
                  headerBackTitle: '',
                  // @ts-expect-error native-stack supports hiding back title; Expo Router stack types omit it
                  headerBackTitleVisible: false,
                  headerBackButtonDisplayMode: 'minimal',
                }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="welcome" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="subscription" options={{ headerShown: false }} />
                <Stack.Screen name="meal-plan/[planId]" options={{ headerShown: true, title: 'Meal plan' }} />
                <Stack.Screen name="meal-recipe" options={{ headerShown: true, title: 'Recipe' }} />
                <Stack.Screen name="nutrition-targets" options={{ headerShown: true, title: 'Nutrition targets' }} />
                <Stack.Screen
                  name="manual-entry"
                  options={{ headerShown: true, title: 'Log a meal', presentation: 'modal' }}
                />
                <Stack.Screen name="legal/privacy-policy" options={{ headerShown: true, title: 'Privacy Policy' }} />
                <Stack.Screen name="legal/terms" options={{ headerShown: true, title: 'Terms of Service' }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
              </Stack>
              <StatusBar style={isDark ? 'light' : 'dark'} />
            </NutritionLogProvider>
          </IAPProvider>
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
    <ErrorBoundary>
      <AppThemeProvider>
        <RootLayoutBody />
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
