import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

type TabDef = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const SIDE_TABS: [TabDef, TabDef][] = [
  [
    { name: 'index', label: 'Home', icon: 'home-outline', iconActive: 'home' },
    { name: 'meal-plans', label: 'Plans', icon: 'calendar-outline', iconActive: 'calendar' },
  ],
  [
    { name: 'groceries', label: 'Groceries', icon: 'basket-outline', iconActive: 'basket' },
    { name: 'insights', label: 'Charts', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  ],
];

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const active = state.routes[state.index]?.name;
  const scanFocused = active === 'scan';
  const muted = colors.textMuted;
  const activeColor = Palette.iris;

  // Camera screen owns the full viewport (no floating FAB / no tab bar peeking
  // through). Hiding here is simpler than fighting Tabs' tabBarStyle.
  if (scanFocused) {
    return null;
  }

  const go = (name: string) => {
    haptic();
    navigation.navigate(name as never);
  };

  const TabItem = ({ tab }: { tab: TabDef }) => {
    const focused = active === tab.name;
    return (
      <Pressable
        onPress={() => go(tab.name)}
        style={styles.tabItem}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={`${tab.label} tab`}>
        <Ionicons
          name={focused ? tab.iconActive : tab.icon}
          size={22}
          color={focused ? activeColor : muted}
        />
        <Text
          style={[styles.tabLabel, { color: muted }, focused && { color: activeColor }]}
          numberOfLines={1}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.surface, { backgroundColor: isDark ? colors.surface : 'rgba(255,255,255,0.95)', borderColor: colors.border }]}>
        <View style={styles.fabWrap}>
          <Pressable
            onPress={() => go('scan')}
            style={({ pressed }) => [
              styles.fab,
              { borderColor: isDark ? Palette.obsidian : Palette.ghost },
              scanFocused && styles.fabFocused,
              pressed && styles.fabPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Scan food for calories">
            <Ionicons name="camera" size={28} color={Palette.white} />
          </Pressable>
          <Text
            style={[styles.fabCaption, { color: muted }, scanFocused && { color: activeColor }]}>
            Scan
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.side}>
            {SIDE_TABS[0].map((tab) => (
              <TabItem key={tab.name} tab={tab} />
            ))}
          </View>
          <View style={styles.fabSpacer} />
          <View style={styles.side}>
            {SIDE_TABS[1].map((tab) => (
              <TabItem key={tab.name} tab={tab} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: 'transparent',
  },
  surface: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 12,
    marginTop: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.1)',
    shadowColor: Palette.lavender,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  fabSpacer: {
    width: 76,
  },
  fabWrap: {
    position: 'absolute',
    alignSelf: 'center',
    top: -36,
    zIndex: 20,
    alignItems: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.iris,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 16,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.95,
  },
  fabFocused: {
    borderColor: Palette.lavender,
    shadowOpacity: 0.45,
  },
  fabCaption: {
    marginTop: 4,
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Palette.dusk,
  },
  fabCaptionActive: {
    color: Palette.iris,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4,
    minWidth: 0,
    minHeight: 48,
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: Fonts.medium,
    fontSize: 10,
  },
});
