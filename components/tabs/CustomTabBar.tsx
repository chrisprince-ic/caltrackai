import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLinearGradient } from '@/components/ui/AppLinearGradient';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';

type TabDef = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

/** Macrovia layout: Today · Meals · FAB scan · Groceries · Progress */
const SIDE_TABS: [TabDef, TabDef][] = [
  [
    { name: 'index', label: 'Today', icon: 'home-outline', iconActive: 'home' },
    { name: 'meal-plans', label: 'Meals', icon: 'restaurant-outline', iconActive: 'restaurant' },
  ],
  [
    { name: 'groceries', label: 'Groceries', icon: 'basket-outline', iconActive: 'basket' },
    {
      name: 'insights',
      label: 'Progress',
      icon: 'trending-up-outline',
      iconActive: 'trending-up',
    },
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
  const muted = colors.textMuted;

  if (active === 'scan') return null;

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
          style={[
            styles.iconBubble,
            focused && { backgroundColor: `${colors.accent}22` },
          ]}>
          <Ionicons
            name={focused ? tab.iconActive : tab.icon}
            size={21}
            color={focused ? colors.accentDeep : muted}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            { color: muted },
            focused && { color: colors.accentDeep },
            focused && { fontFamily: Fonts.semiBold },
          ]}
          numberOfLines={1}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  const tabRow = (
    <View style={styles.surfaceInner}>
      <View style={styles.rowInner}>
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
      <Pressable
        onPress={() => go('scan')}
        style={({ pressed }) => [
          styles.fabPress,
          styles.fabWrap,
          pressed && { transform: [{ scale: 0.97 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Scan food">
        <AppLinearGradient
          colors={[colors.accent, colors.accentDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}>
          <Ionicons name="scan-outline" size={26} color="#fff" />
        </AppLinearGradient>
      </Pressable>
    </View>
  );

  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.outer, { paddingBottom: bottomInset }]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={38}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.surface,
            {
              borderColor: colors.glassStroke,
              backgroundColor: isDark ? 'rgba(28,34,31,0.65)' : 'rgba(255,255,255,0.76)',
            },
          ]}>
          {tabRow}
        </BlurView>
      ) : (
        <View
          style={[
            styles.surface,
            {
              borderColor: colors.glassStroke,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.92)',
            },
          ]}>
          {tabRow}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    overflow: 'visible',
  },
  surface: {
    borderRadius: 28,
    overflow: 'visible',
    paddingTop: 8,
    paddingBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      default: { elevation: 20 },
    }),
  },
  surfaceInner: {
    overflow: 'visible',
    paddingTop: 22,
    position: 'relative',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    minHeight: 52,
    position: 'relative',
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
    left: '50%',
    marginLeft: -29,
    top: -34,
    zIndex: 20,
    elevation: 24,
  },
  fabPress: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
      },
      default: { elevation: 10 },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    minWidth: 0,
  },
  iconBubble: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tabLabel: {
    fontFamily: Fonts.medium,
    fontSize: 9.5,
    letterSpacing: 0.2,
  },
});
