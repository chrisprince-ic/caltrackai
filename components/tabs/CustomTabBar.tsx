import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
  const { isDark } = useAppTheme();
  const active = state.routes[state.index]?.name;
  const scanFocused = active === 'scan';
  const activeColor = isDark ? '#38B273' : Palette.iris;
  const mutedColor = isDark ? '#8FA293' : Palette.dusk;

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
        <View
          style={
            focused
              ? [
                  styles.activeIndicator,
                  {
                    backgroundColor: isDark
                      ? 'rgba(56,178,115,0.15)'
                      : 'rgba(31,138,91,0.12)',
                  },
                ]
              : undefined
          }>
          <Ionicons
            name={focused ? tab.iconActive : tab.icon}
            size={22}
            color={focused ? activeColor : mutedColor}
          />
        </View>
        <Text
          style={[styles.tabLabel, { color: focused ? activeColor : mutedColor }]}
          numberOfLines={1}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* barOuter: no overflow — lets FAB float above the bar */}
      <View style={styles.barOuter}>
        {/* FAB lives here, outside the overflow-hidden surface */}
        <View style={styles.fabWrap}>
          <Pressable
            onPress={() => go('scan')}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            accessibilityRole="button"
            accessibilityLabel="Scan food for calories">
            <LinearGradient
              colors={['#38B273', Palette.iris, '#0D5C3A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGrad}>
              <Ionicons name="camera" size={26} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
          <Text style={[styles.fabCaption, { color: mutedColor }]}>Scan</Text>
        </View>

        {/* barSurface: overflow hidden for BlurView clipping */}
        <View style={styles.barSurface}>
          <BlurView
            intensity={isDark ? 60 : 72}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          {/* Tint overlay */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? 'rgba(26,43,30,0.55)'
                  : 'rgba(255,255,255,0.55)',
              },
            ]}
          />
          {/* Border */}
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.barBorder,
              {
                borderColor: isDark
                  ? 'rgba(212,237,227,0.10)'
                  : 'rgba(31,138,91,0.10)',
              },
            ]}
          />

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
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
  },
  barOuter: {
    // No overflow here — FAB absolute positioning must not be clipped
    shadowColor: '#1A2820',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 18,
  },
  barSurface: {
    borderRadius: 28,
    overflow: 'hidden',
    paddingTop: 10,
    paddingBottom: 6,
  },
  barBorder: {
    borderRadius: 28,
    borderWidth: 0.5,
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
    width: 72,
  },
  fabWrap: {
    position: 'absolute',
    alignSelf: 'center',
    top: -36,
    zIndex: 20,
    alignItems: 'center',
    left: 0,
    right: 0,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 16,
  },
  fabGrad: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.92,
  },
  fabCaption: {
    marginTop: 4,
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 3,
    minWidth: 0,
    minHeight: 48,
    justifyContent: 'center',
  },
  activeIndicator: {
    borderRadius: 999,
    padding: 7,
    marginBottom: -2,
  },
  tabLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
