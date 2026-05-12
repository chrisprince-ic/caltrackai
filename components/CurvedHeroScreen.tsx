import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import {
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  type ComponentRef,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/hero/BackButton';
import { HeroBackground } from '@/components/hero/HeroBackground';
import {
  HERO,
  HERO_BACKGROUNDS,
  HERO_GREEN_GRADIENT_DARK_MODE,
  HERO_GREEN_SOLID_DARK,
  type HeroBackgroundVariant,
} from '@/constants/hero';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';

const TAB_FAB_BOTTOM_PAD = 100;
const STACK_BOTTOM_PAD = 24;

export type CurvedHeroScreenProps = {
  title: string;
  subtitle?: string;
  rightActions?: ReactNode;
  showBackButton?: boolean;
  onBackPress?: () => void;
  /** Use close (X) instead of chevron — e.g. modal routes. */
  modalClose?: boolean;
  heroBackground?: HeroBackgroundVariant;
  heroExpanded?: number;
  heroCollapsed?: number;
  children: ReactNode;
  /** Overlap of first content into hero (default 80). */
  contentInset?: number;
  scrollEnabled?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  formMode?: boolean;
  /** Larger bottom padding for tab roots (FAB clearance). */
  tabRoot?: boolean;
  /** Reset vertical scroll when screen gains focus (tab roots). */
  resetScrollOnFocus?: boolean;
  /** Home: dual title weight crossfade + 18px collapsed size. */
  titleDualWeight?: boolean;
  titleSizeExpanded?: number;
  titleSizeCollapsed?: number;
  paddingHorizontal?: number;
  refreshProgressOffset?: number;
  /** Max characters before subtitle ellipsis (default 30). */
  subtitleMaxLength?: number;
  /** Rendered inline at the end of the title row (e.g. time-of-day glyph). */
  titleAffix?: ReactNode;
};

function truncateSubtitle(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function CurvedHeroScreen({
  title,
  subtitle,
  rightActions,
  showBackButton = false,
  onBackPress,
  modalClose = false,
  heroBackground = 'green',
  heroExpanded = HERO.EXPANDED,
  heroCollapsed = HERO.COLLAPSED,
  children,
  contentInset = 80,
  scrollEnabled = true,
  refreshing,
  onRefresh,
  formMode = false,
  tabRoot = false,
  resetScrollOnFocus = true,
  titleDualWeight = false,
  titleSizeExpanded = 24,
  titleSizeCollapsed = 17,
  paddingHorizontal = 20,
  refreshProgressOffset,
  subtitleMaxLength = 30,
  titleAffix,
}: CurvedHeroScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const scrollRef = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const scrollY = useSharedValue(0);

  const theme = HERO_BACKGROUNDS[heroBackground];
  const subtitleDisplay = subtitle ? truncateSubtitle(subtitle, subtitleMaxLength) : undefined;

  const gradientColors = useMemo((): readonly [string, string, string] => {
    if (heroBackground === 'green' && isDark) {
      return [
        HERO_GREEN_GRADIENT_DARK_MODE[0],
        HERO_GREEN_GRADIENT_DARK_MODE[1],
        HERO_GREEN_GRADIENT_DARK_MODE[2],
      ];
    }
    return [theme.gradient[0], theme.gradient[1], theme.gradient[2]];
  }, [heroBackground, isDark, theme.gradient]);

  /** Flat green header — no diagonal gradient (light + dark green variants). */
  const heroSolidColor = useMemo(() => {
    if (heroBackground !== 'green') return undefined;
    return isDark ? HERO_GREEN_SOLID_DARK : HERO_BACKGROUNDS.green.headerSolid;
  }, [heroBackground, isDark]);

  const pageBg =
    heroBackground === 'green' && isDark ? colors.bg : theme.pageBg;

  const titleColor =
    heroBackground === 'green' && isDark ? '#F4FCE8' : theme.titleColor;
  const subtitleColor =
    heroBackground === 'green' && isDark
      ? 'rgba(244,252,232,0.72)'
      : theme.subtitleColor;
  const iconInk =
    heroBackground === 'green' && isDark ? '#F4FCE8' : heroBackground === 'green' ? '#1A2B26' : theme.titleColor;

  const trigger = HERO.TRIGGER;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const headerSurfaceStyle = useAnimatedStyle(() => {
    const transparent = isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)';
    const opaque = isDark ? 'rgba(13,25,18,0.96)' : 'rgba(255,255,255,0.96)';
    return {
      backgroundColor: interpolateColor(scrollY.value, [0, trigger], [transparent, opaque]),
      borderBottomWidth: interpolate(scrollY.value, [0, trigger], [0, 0.5], Extrapolation.CLAMP),
      borderBottomColor: 'rgba(0,0,0,0.06)',
    };
  });

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, trigger],
      [heroExpanded, heroCollapsed],
      Extrapolation.CLAMP
    ),
    borderBottomLeftRadius: interpolate(
      scrollY.value,
      [0, trigger],
      [HERO.CORNER_RADIUS, 0],
      Extrapolation.CLAMP
    ),
    borderBottomRightRadius: interpolate(
      scrollY.value,
      [0, trigger],
      [HERO.CORNER_RADIUS, 0],
      Extrapolation.CLAMP
    ),
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    fontSize: interpolate(scrollY.value, [0, trigger], [titleSizeExpanded, titleSizeCollapsed], Extrapolation.CLAMP),
    lineHeight: interpolate(
      scrollY.value,
      [0, trigger],
      [titleSizeExpanded + 6, titleSizeCollapsed + 5],
      Extrapolation.CLAMP
    ),
  }));

  const mediumOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [8, trigger * 0.75], [1, 0], Extrapolation.CLAMP),
  }));

  const boldOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [8, trigger * 0.75], [0, 1], Extrapolation.CLAMP),
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, trigger * 0.6], [1, 0], Extrapolation.CLAMP),
    maxHeight: interpolate(scrollY.value, [0, trigger], [20, 0], Extrapolation.CLAMP),
    marginTop: interpolate(scrollY.value, [0, trigger], [4, 0], Extrapolation.CLAMP),
  }));

  const expoStatusStyle = theme.statusBarStyle === 'dark' ? 'dark' : 'light';

  useFocusEffect(
    useCallback(() => {
      RNStatusBar.setBarStyle(
        theme.statusBarStyle === 'dark' ? 'dark-content' : 'light-content',
        true
      );
      return () => {};
    }, [theme.statusBarStyle])
  );

  useFocusEffect(
    useCallback(() => {
      if (!resetScrollOnFocus) return;
      scrollY.value = 0;
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    }, [resetScrollOnFocus, scrollY])
  );

  const onBack = useCallback(() => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (router.canGoBack()) router.back();
  }, [onBackPress, router]);

  const bottomPad =
    (tabRoot ? TAB_FAB_BOTTOM_PAD : STACK_BOTTOM_PAD) + insets.bottom;

  const padTop = heroExpanded - contentInset;

  const scrollContentStyle = useMemo(
    () => [
      styles.scrollContent,
      {
        paddingTop: padTop,
        paddingBottom: bottomPad,
        paddingHorizontal,
      },
    ],
    [bottomPad, padTop, paddingHorizontal]
  );

  const staticContentPadding = useMemo(
    () => ({
      paddingTop: padTop,
      paddingBottom: bottomPad,
      paddingHorizontal,
    }),
    [bottomPad, padTop, paddingHorizontal]
  );

  const inner = scrollEnabled ? (
    <Animated.ScrollView
      ref={scrollRef}
      style={styles.scrollView}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      bounces
      scrollEnabled
      contentContainerStyle={scrollContentStyle}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            progressViewOffset={refreshProgressOffset ?? insets.top + 40}
          />
        ) : undefined
      }>
      {children}
    </Animated.ScrollView>
  ) : (
    <View style={[styles.scrollView, staticContentPadding]}>{children}</View>
  );

  const titleBlock = titleDualWeight ? (
    <View style={styles.titleStack}>
      <Animated.Text
        style={[
          styles.titleWide,
          { color: titleColor },
          titleAnimatedStyle,
          mediumOpacityStyle,
          { fontFamily: Fonts.medium },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}>
        {title}
      </Animated.Text>
      <Animated.Text
        style={[
          styles.titleBoldLayer,
          { color: titleColor },
          titleAnimatedStyle,
          boldOpacityStyle,
          { fontFamily: Fonts.bold },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}>
        {title}
      </Animated.Text>
    </View>
  ) : (
    <Animated.Text
      style={[
        styles.titleWide,
        { color: titleColor, fontFamily: Fonts.semiBold },
        titleAnimatedStyle,
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.85}>
      {title}
    </Animated.Text>
  );

  const body = (
    <>
      <ExpoStatusBar style={expoStatusStyle} />
      <HeroBackground
        heroAnimatedStyle={heroAnimatedStyle}
        gradientColors={gradientColors}
        solidColor={heroSolidColor}
      />

      <Animated.View
        style={[
          styles.headerBar,
          headerSurfaceStyle,
          { paddingTop: insets.top + 12, paddingHorizontal },
        ]}>
        <View style={styles.headerMainRow}>
          {showBackButton ? (
            <BackButton
              onPress={onBack}
              useCloseIcon={modalClose}
              iconColor={iconInk}
            />
          ) : null}
          <View style={[styles.headerLeft, showBackButton && styles.headerLeftIndented]}>
            <View style={styles.titleRow}>
              <View style={styles.titleRowMain}>{titleBlock}</View>
              {titleAffix ? <View style={styles.titleAffix}>{titleAffix}</View> : null}
            </View>
            {subtitleDisplay ? (
              <Animated.View style={[styles.subtitleClip, subtitleAnimatedStyle]}>
                <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={1}>
                  {subtitleDisplay}
                </Text>
              </Animated.View>
            ) : null}
          </View>
          {rightActions ? (
            <View style={styles.headerActions} collapsable={false}>
              {rightActions}
            </View>
          ) : null}
        </View>
      </Animated.View>

      {inner}
    </>
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: pageBg }]}
      edges={['bottom', 'left', 'right']}>
      {formMode ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollView: { flex: 1, zIndex: 2 },
  scrollContent: {},
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerLeft: { flex: 1, minWidth: 0 },
  headerLeftIndented: { paddingLeft: 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    width: '100%',
  },
  titleRowMain: { flex: 1, minWidth: 0 },
  titleAffix: { paddingTop: 3, justifyContent: 'center', alignItems: 'center' },
  titleStack: {
    position: 'relative',
    width: '100%',
    minHeight: 28,
  },
  titleWide: { width: '100%' },
  titleBoldLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    width: '100%',
  },
  subtitleClip: { overflow: 'hidden' as const },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
});
