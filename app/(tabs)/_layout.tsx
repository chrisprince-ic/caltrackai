import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { AiChatFAB } from '@/components/home/AiChatFAB';
import { CustomTabBar } from '@/components/tabs/CustomTabBar';
import { useAppTheme } from '@/contexts/AppThemeContext';

export default function TabLayout() {
  const { colors } = useAppTheme();
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
