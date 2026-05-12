import { type ReactNode, useRef } from 'react';
import {
  Animated,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuroraBackground } from '@/components/macrovia/AuroraBackground';
import { useAppTheme } from '@/contexts/AppThemeContext';

const TAB_BOTTOM_EXTRA = 108;
const HERO_FADE_PX = 140;

type Props = {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  tabRoot?: boolean;
  scrollEnabled?: boolean;
  contentPaddingBottom?: number;
  /**
   * When set, replaces aurora with a solid top-1/3 hero band (rounded bottom).
   * The band fades out on scroll and a matching overlay in the sticky header
   * fades out simultaneously so the title text stays readable against colors.bg.
   */
  heroColor?: string;
  /** Rendered above the ScrollView — stays visible as content scrolls underneath.
   *  Receives the scroll Animated.Value so child components can drive their own animations. */
  stickyHeader?: (scrollY: Animated.Value) => ReactNode;
} & Omit<Partial<ScrollViewProps>, 'children' | 'refreshControl'>;

export function MacroviaScreen({
  children,
  refreshing,
  onRefresh,
  tabRoot = true,
  scrollEnabled = true,
  contentPaddingBottom,
  heroColor,
  stickyHeader,
  ...scrollRest
}: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const bottom =
    contentPaddingBottom ??
    Math.max(insets.bottom, 12) + (tabRoot ? TAB_BOTTOM_EXTRA : 24);

  const scrollY = useRef(new Animated.Value(0)).current;

  // Both the full-screen hero band AND the sticky header overlay fade together.
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HERO_FADE_PX],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Full-screen hero band — fades away on scroll */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {heroColor ? (
          <Animated.View
            style={[
              styles.heroBand,
              { height: screenHeight / 3, backgroundColor: heroColor, opacity: heroOpacity },
            ]}
          />
        ) : (
          <AuroraBackground />
        )}
      </View>

      {/* Sticky header — sits above scroll, hero overlay fades out with the band */}
      {stickyHeader != null && (
        <View style={styles.stickyWrap}>
          {heroColor ? (
            <Animated.View
              style={[StyleSheet.absoluteFill, { backgroundColor: heroColor, opacity: heroOpacity }]}
              pointerEvents="none"
            />
          ) : null}
          {stickyHeader(scrollY)}
        </View>
      )}

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={[styles.pad, { paddingBottom: bottom }]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          ) : undefined
        }
        {...scrollRest}>
        <View style={styles.stack}>{children}</View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { paddingHorizontal: 16, paddingTop: 6 },
  stack: { gap: 14 },
  heroBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  stickyWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    overflow: 'hidden',
  },
});
