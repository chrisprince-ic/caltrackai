import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarketingBackdrop } from '@/components/auth/MarketingBackdrop';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAuth } from '@/contexts/AuthContext';
import { hasAppSplashCompleted, markAppSplashComplete } from '@/lib/app-splash-gate';

/** Brief branded splash before routing to welcome (signed out) or home tabs (signed in). */
const MIN_SPLASH_MS = 700;

function routeAfterSplash(user: ReturnType<typeof useAuth>['user'], router: ReturnType<typeof useRouter>) {
  markAppSplashComplete();
  if (user) {
    router.replace('/(tabs)' as Href);
  } else {
    router.replace('/welcome' as Href);
  }
}

export default function Index() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const splashStartRef = useRef(Date.now());
  const navigatedRef = useRef(false);
  const skipSplash = hasAppSplashCompleted();

  useLayoutEffect(() => {
    if (!skipSplash || initializing || navigatedRef.current) return;
    navigatedRef.current = true;
    if (user) {
      router.replace('/(tabs)' as Href);
    } else {
      router.replace('/welcome' as Href);
    }
  }, [skipSplash, initializing, user, router]);

  useEffect(() => {
    if (skipSplash) return;
    if (initializing) return;

    const elapsed = Date.now() - splashStartRef.current;
    const delay = Math.max(0, MIN_SPLASH_MS - elapsed);

    const timer = setTimeout(() => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      routeAfterSplash(user, router);
    }, delay);

    return () => clearTimeout(timer);
  }, [skipSplash, initializing, user, router]);

  if (skipSplash) {
    return <View style={styles.hold} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <MarketingBackdrop />
      <View style={styles.center}>
        <Animated.Text entering={FadeInDown.duration(520).springify()} style={styles.welcome}>
          Welcome
        </Animated.Text>
        <Animated.View
          entering={FadeIn.delay(120).duration(400)}
          style={styles.logoSquircle}
          accessibilityRole="image"
          accessibilityLabel="CalTrack">
          <Ionicons name="person" size={32} color={Palette.white} />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(200).duration(480).springify()} style={styles.brand}>
          CalTrack
        </Animated.Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hold: {
    flex: 1,
    backgroundColor: Palette.ghost,
  },
  safe: {
    flex: 1,
    backgroundColor: Palette.ghost,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 22,
  },
  welcome: {
    fontFamily: Fonts.bold,
    fontSize: 36,
    color: Palette.obsidian,
    letterSpacing: -0.8,
  },
  logoSquircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Palette.iris,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
  },
  brand: {
    fontFamily: Fonts.semiBold,
    fontSize: 21,
    color: Palette.lavender,
    letterSpacing: 2,
  },
});
