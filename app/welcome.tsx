import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarketingBackdrop } from '@/components/auth/MarketingBackdrop';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

const FEATURES = [
  {
    key: 'lookup',
    icon: 'flash' as const,
    iconColor: Palette.iris,
    pillBg: 'rgba(75, 35, 200, 0.1)',
    text: 'Instant calorie lookup from millions of foods',
  },
  {
    key: 'macros',
    icon: 'pie-chart' as const,
    iconColor: Palette.flamingo,
    pillBg: 'rgba(255, 107, 157, 0.12)',
    text: 'Clear macro splits for protein, carbs, and fat',
  },
  {
    key: 'trends',
    icon: 'trending-up' as const,
    iconColor: Palette.cyan,
    pillBg: 'rgba(0, 194, 209, 0.12)',
    text: 'Trends and insights that keep you on track',
  },
] as const;

function triggerLightHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <MarketingBackdrop />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.hero}>
            <View style={styles.logoMark}>
              <Ionicons name="nutrition" size={30} color={Palette.white} />
            </View>
            <Text style={styles.eyebrow}>CALTRACK</Text>
            <Text style={styles.headline}>Fuel smarter.{'\n'}Track with clarity.</Text>
            <Text style={styles.subhead}>
              Log meals in seconds, see your macros at a glance, and build habits that stick.
            </Text>
          </Animated.View>

          <View style={styles.cardsColumn}>
            {FEATURES.map((item, index) => (
              <Animated.View
                key={item.key}
                entering={FadeInDown.delay(120 + index * 70).duration(420).springify()}
                style={styles.featureCard}>
                <View style={[styles.iconPill, { backgroundColor: item.pillBg }]}>
                  <Ionicons name={item.icon} size={20} color={item.iconColor} />
                </View>
                <Text style={styles.featureText}>{item.text}</Text>
                <Ionicons name="chevron-forward" size={18} color={Palette.dusk} style={styles.chevron} />
              </Animated.View>
            ))}
          </View>

          <Animated.View entering={FadeInDown.delay(380).duration(450).springify()} style={styles.ctaCard}>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
              onPress={() => {
                triggerLightHaptic();
                router.replace('/auth/login' as Href);
              }}>
              <Text style={styles.btnPrimaryLabel}>Sign in</Text>
              <Ionicons name="arrow-forward" size={20} color={Palette.white} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
              onPress={() => {
                triggerLightHaptic();
                router.replace('/auth/sign-up' as Href);
              }}>
              <Text style={styles.btnSecondaryLabel}>Create account</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
              onPress={() => router.replace('/onboarding' as Href)}>
              <Text style={styles.btnGhostLabel}>Continue as guest</Text>
            </Pressable>
          </Animated.View>

          <Animated.Text entering={FadeIn.delay(500)} style={styles.footer}>
            <Text style={styles.footerMuted}>Free to start · </Text>
            <Text style={styles.footerAccent}>No card required</Text>
          </Animated.Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Palette.ghost,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 28,
  },
  inner: {
    flex: 1,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 12,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Palette.iris,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  eyebrow: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: 3.2,
    color: Palette.lavender,
    marginBottom: 12,
  },
  headline: {
    fontFamily: Fonts.bold,
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
    color: Palette.obsidian,
    marginBottom: 14,
    letterSpacing: -0.6,
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
  cardsColumn: {
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.07)',
    shadowColor: '#1C1530',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    gap: 14,
  },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    color: Palette.obsidian,
  },
  chevron: { opacity: 0.45 },
  ctaCard: {
    backgroundColor: Palette.white,
    borderRadius: 24,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.08)',
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.09,
    shadowRadius: 28,
    elevation: 6,
    marginBottom: 22,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Palette.iris,
    paddingVertical: 16,
    borderRadius: 16,
  },
  btnPrimaryLabel: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Palette.white,
  },
  btnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Palette.haze,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 92, 232, 0.35)',
  },
  btnSecondaryLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Palette.iris,
  },
  btnGhost: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  btnGhostLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Palette.dusk,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(139, 126, 170, 0.45)',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  footer: {
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  footerMuted: {
    color: Palette.dusk,
  },
  footerAccent: {
    fontFamily: Fonts.semiBold,
    color: Palette.lavender,
  },
});
