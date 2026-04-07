import { Tabs } from 'expo-router';

import { CustomTabBar } from '@/components/tabs/CustomTabBar';
import { useAppTheme } from '@/contexts/AppThemeContext';

export default function TabLayout() {
  const { colors } = useAppTheme();
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="meal-plans" options={{ title: 'Meal plans' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
      <Tabs.Screen name="groceries" options={{ title: 'Groceries' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
    </Tabs>
  );
}
