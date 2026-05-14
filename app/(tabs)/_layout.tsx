import * as Notifications from 'expo-notifications';
import { type Href, Tabs, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { AiChatFAB } from '@/components/home/AiChatFAB';
import { CustomTabBar } from '@/components/tabs/CustomTabBar';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIAP } from '@/contexts/IAPContext';

export default function TabLayout() {
  const { colors } = useAppTheme();
  const { isPro, ready } = useIAP();
  const { user } = useAuth();
  const router = useRouter();
  const gatedRef = useRef(false);
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledNotifRef = useRef<string | null>(null);

  // One-time live check after IAP initialises — catches subscriptions that
  // lapsed since the last cached value was written to AsyncStorage.
  useEffect(() => {
    if (!ready || gatedRef.current) return;
    gatedRef.current = true;
    if (user && !isPro) {
      router.replace('/subscription?welcome=1' as Href);
    }
  }, [ready, isPro, user, router]);

  // Navigate when user taps a notification
  useEffect(() => {
    const id = lastResponse?.notification.request.identifier;
    if (!id || handledNotifRef.current === id) return;
    handledNotifRef.current = id;
    const screen = lastResponse?.notification.request.content.data?.screen;
    if (screen === 'insights') {
      router.push('/(tabs)/insights' as Href);
    }
  }, [lastResponse, router]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          sceneStyle: { backgroundColor: colors.bg },
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            shadowOffset: { width: 0, height: 0 },
            shadowColor: 'transparent',
            overflow: 'visible',
          },
          tabBarBackground: () => <View style={{ flex: 1, backgroundColor: 'transparent' }} />,
        }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="meal-plans" options={{ title: 'Meal plans' }} />
        <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
        <Tabs.Screen name="groceries" options={{ title: 'Groceries' }} />
        <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      </Tabs>
      <AiChatFAB />
    </View>
  );
}
