import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

const FEATURES = [
  {
    key: 'lookup',
    icon: 'checkmark-circle' as const,
    iconColor: Palette.iris,
    boxBg: Palette.haze,
    text: 'Instant calorie lookup from 2M+ foods',
  },
  {
    key: 'macros',
    icon: 'bag-handle' as const,
    iconColor: Palette.flamingo,
    boxBg: '#FFE8F0',
    text: 'Macro breakdowns for protein, carbs & fat',
  },
  {
    key: 'trends',
    icon: 'add' as const,
    iconColor: Palette.cyan,
    boxBg: '#E0F8FA',
    text: 'Weekly trends and progress insights',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <View style={styles.logoSquircle}>
            <Ionicons name="person" size={36} color="#FFFFFF" />
          </View>

          <Text style={styles.eyebrow}>TRACK SMARTER</Text>
          <Text style={styles.headline}>Fuel your body, know your numbers</Text>
          <Text style={styles.subhead}>
            Log meals in seconds. Understand your macros. Hit your goals every day.
          </Text>

          <View style={styles.featureList}>
            {FEATURES.map((item) => (
              <View key={item.key} style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: item.boxBg }]}>
                  <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>
                <Text style={styles.featureText}>{item.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
              onPress={() => router.replace('/auth/login' as Href)}>
              <Text style={styles.btnPrimaryLabel}>Sign in</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
              onPress={() => router.replace('/auth/sign-up' as Href)}>
              <Text style={styles.btnSecondaryLabel}>Create account</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
              onPress={() => router.replace('/onboarding' as Href)}>
              <Text style={styles.btnGhostLabel}>Continue as guest</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>
            <Text style={styles.footerMuted}>Free to use. </Text>
            <Text style={styles.footerAccent}>No credit card needed.</Text>
          </Text>
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
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  inner: {
    flex: 1,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  logoSquircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Palette.iris,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  eyebrow: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 2.2,
    color: Palette.lavender,
    marginBottom: 14,
  },
  headline: {
    fontFamily: Fonts.semiBold,
    fontSize: 30,
    lineHeight: 38,
    textAlign: 'center',
    color: Palette.obsidian,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  subhead: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: Palette.dusk,
    marginBottom: 36,
    paddingHorizontal: 8,
  },
  featureList: {
    width: '100%',
    gap: 18,
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Palette.obsidian,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 28,
  },
  btnGhost: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  btnGhostLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Palette.dusk,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(139, 126, 170, 0.5)',
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: Palette.iris,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  btnPrimaryLabel: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  btnSecondary: {
    width: '100%',
    backgroundColor: Palette.haze,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Palette.lavender,
  },
  btnSecondaryLabel: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: Palette.iris,
  },
  pressed: {
    opacity: 0.88,
  },
  footer: {
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  footerMuted: {
    color: Palette.dusk,
    opacity: 0.85,
  },
  footerAccent: {
    color: Palette.lavender,
  },
});
