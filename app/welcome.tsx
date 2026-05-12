import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MarketingBackdrop } from '@/components/auth/MarketingBackdrop';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { openLegalUrl } from '@/lib/legal-browser';

const FEATURE_SLIDES = [
  {
    key: 'lookup',
    icon: 'flash' as const,
    iconColor: Palette.iris,
    iconBg: 'rgba(31, 138, 91, 0.12)',
    title: 'Instant calorie lookup',
    body: 'Search from millions of foods and log a meal in under 5 seconds — no manual entry, no guessing.',
  },
  {
    key: 'macros',
    icon: 'pie-chart' as const,
    iconColor: Palette.flamingo,
    iconBg: 'rgba(236, 72, 153, 0.12)',
    title: 'Macros made simple',
    body: 'See your protein, carbs, and fat at a glance with clean visual breakdowns — never overthink a meal again.',
  },
  {
    key: 'trends',
    icon: 'trending-up' as const,
    iconColor: Palette.cyan,
    iconBg: 'rgba(99, 102, 241, 0.12)',
    title: 'Trends that keep you on track',
    body: "Weekly insights and progress patterns help you stay consistent — even on the days you don't feel like it.",
  },
] as const;

const TOTAL_SLIDES = 5;
const CTA_INDEX = TOTAL_SLIDES - 1;

function triggerLightHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function PageDot({ active, onPress }: { active: boolean; onPress: () => void }) {
  const w = useSharedValue(active ? 24 : 8);
  useEffect(() => {
    w.value = withTiming(active ? 24 : 8, { duration: 220 });
  }, [active, w]);
  const animStyle = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Current slide' : 'Go to slide'}>
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: active ? Palette.iris : '#E5E7EB' },
          animStyle,
        ]}
      />
    </Pressable>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = useCallback(
    (i: number) => {
      scrollRef.current?.scrollTo({ x: i * width, animated: true });
    },
    [width]
  );

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.max(0, Math.min(TOTAL_SLIDES - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
      if (next !== index) setIndex(next);
    },
    [index, width]
  );

  const goSkip = useCallback(() => {
    triggerLightHaptic();
    goTo(CTA_INDEX);
  }, [goTo]);

  const slidePadTop = insets.top + 12;
  const slidePadBottom = insets.bottom + 84;

  return (
    <View style={styles.root}>
      <MarketingBackdrop />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        bounces={false}
        style={styles.pager}>
        {/* Slide 1 — Brand intro */}
        <View style={[styles.slide, { width, paddingTop: slidePadTop, paddingBottom: slidePadBottom }]}>
          <Animated.View entering={FadeIn.duration(420)} style={styles.brandSlide}>
            <View style={styles.brandTopBlock}>
              <View style={styles.logoMark}>
                <Ionicons name="nutrition" size={30} color={Palette.white} />
              </View>
              <Text style={styles.eyebrow}>CALTRACK</Text>
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.headline}>Fuel smarter.{'\n'}Track with clarity.</Text>
              <Text style={styles.subhead}>
                Log meals in seconds, see your macros at a glance, and build habits that stick.
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Slides 2–4 — Features */}
        {FEATURE_SLIDES.map((f) => (
          <View
            key={f.key}
            style={[styles.slide, { width, paddingTop: slidePadTop, paddingBottom: slidePadBottom }]}>
            <View style={styles.featureSlide}>
              <View style={styles.smallBrandRow}>
                <View style={styles.logoMarkSmall}>
                  <Ionicons name="nutrition" size={18} color={Palette.white} />
                </View>
                <Text style={styles.eyebrowSmall}>CALTRACK</Text>
              </View>
              <View style={styles.featureCenter}>
                <View style={[styles.featureIconBox, { backgroundColor: f.iconBg }]}>
                  <Ionicons name={f.icon} size={48} color={f.iconColor} />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Slide 5 — CTA */}
        <View style={[styles.slide, { width, paddingTop: slidePadTop, paddingBottom: slidePadBottom }]}>
          <View style={styles.ctaSlide}>
            <View style={styles.brandTopBlock}>
              <View style={styles.logoMark}>
                <Ionicons name="nutrition" size={28} color={Palette.white} />
              </View>
              <Text style={styles.eyebrow}>CALTRACK</Text>
            </View>
            <View style={styles.ctaCopy}>
              <Text style={styles.ctaHeadline}>Ready to start?</Text>
              <Text style={styles.ctaSub}>Join thousands tracking smarter, not harder.</Text>
            </View>
            <View style={styles.ctaActions}>
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  router.replace('/auth/login' as Href);
                }}
                style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Sign in">
                <Text style={styles.btnPrimaryLabel}>Sign in</Text>
                <Ionicons name="arrow-forward" size={20} color={Palette.white} />
              </Pressable>
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  router.replace('/auth/sign-up' as Href);
                }}
                style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Create account">
                <Text style={styles.btnSecondaryLabel}>Create account</Text>
              </Pressable>
              <Text style={styles.legal}>
                By continuing you agree to our{' '}
                <Text
                  style={styles.legalLink}
                  onPress={() => void openLegalUrl('terms')}
                  accessibilityRole="link">
                  Terms of Use
                </Text>
                {' '}and{' '}
                <Text
                  style={styles.legalLink}
                  onPress={() => void openLegalUrl('privacy')}
                  accessibilityRole="link">
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Skip — slides 1–4 only */}
      {index < CTA_INDEX ? (
        <Pressable
          onPress={goSkip}
          style={({ pressed }) => [styles.skipBtn, { top: insets.top + 10 }, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding">
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      ) : null}

      {/* Page indicator dots */}
      <View
        style={[styles.dotsRow, { bottom: insets.bottom + 24 }]}
        pointerEvents="box-none">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <PageDot key={i} active={i === index} onPress={() => goTo(i)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.ghost },
  pager: { flex: 1 },
  slide: {
    flex: 1,
    paddingHorizontal: 22,
  },

  /* Brand-intro & CTA shared logo block */
  brandTopBlock: {
    alignItems: 'center',
    marginTop: 48,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Palette.iris,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  logoMarkSmall: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Palette.iris,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  eyebrow: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 3.4,
    color: Palette.lavender,
  },
  eyebrowSmall: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: 3.0,
    color: Palette.lavender,
  },

  /* Slide 1 */
  brandSlide: { flex: 1 },
  brandCopy: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headline: {
    fontFamily: Fonts.bold,
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
    color: Palette.obsidian,
    letterSpacing: -0.6,
    marginBottom: 14,
  },
  subhead: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: Palette.dusk,
    paddingHorizontal: 12,
    maxWidth: 340,
  },

  /* Feature slides */
  featureSlide: { flex: 1 },
  smallBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
    marginTop: 20,
  },
  featureCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 6,
  },
  featureIconBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 6,
  },
  featureTitle: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    color: Palette.obsidian,
    letterSpacing: -0.4,
    paddingHorizontal: 8,
  },
  featureBody: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: Palette.dusk,
    paddingHorizontal: 8,
    maxWidth: 360,
  },

  /* CTA slide */
  ctaSlide: { flex: 1, justifyContent: 'space-between' },
  ctaCopy: { alignItems: 'center', paddingHorizontal: 6 },
  ctaHeadline: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    color: Palette.obsidian,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  ctaSub: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: Palette.dusk,
    maxWidth: 320,
  },
  ctaActions: { gap: 12, paddingBottom: 4 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Palette.iris,
    height: 56,
    borderRadius: 16,
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
  btnPrimaryLabel: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Palette.white,
  },
  btnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(31, 138, 91, 0.55)',
  },
  btnSecondaryLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Palette.iris,
  },
  legal: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: Palette.dusk,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  legalLink: {
    fontFamily: Fonts.semiBold,
    color: Palette.iris,
    textDecorationLine: 'underline',
  },

  /* Skip */
  skipBtn: {
    position: 'absolute',
    right: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(31, 138, 91, 0.18)',
  },
  skipText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Palette.lavender,
  },

  /* Dots */
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },

  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
