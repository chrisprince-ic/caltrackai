import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarketingBackdrop } from '@/components/auth/MarketingBackdrop';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyFirebaseAuthMessage } from '@/lib/firebase-auth-errors';
import { openLegalUrl } from '@/lib/legal-browser';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

function triggerLightHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function SignUpScreen() {
  const router = useRouter();
  const { user, initializing, firebaseReady, signUpWithProfile } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !initializing) {
      router.replace('/onboarding' as Href);
    }
  }, [user, initializing, router]);

  const canSubmit =
    agreed && !submitting && name.trim().length > 0 && email.trim().length > 0 && password.length >= 8;

  async function onEmailSignUp() {
    setError(null);
    if (!agreed) {
      setError('Please agree to the Terms and Privacy Policy to continue.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim() || !password || password.length < 8) {
      setError('Enter a valid email and a password of at least 8 characters.');
      return;
    }
    triggerLightHaptic();
    setSubmitting(true);
    try {
      await signUpWithProfile({
        email: email.trim(),
        password,
        name: name.trim(),
        phone: '',
      });
    } catch (e) {
      setError(friendlyFirebaseAuthMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!firebaseReady) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <MarketingBackdrop />
        <View style={styles.missingWrap}>
          <View style={styles.missingCard}>
            <Ionicons name="cloud-offline-outline" size={40} color={Palette.lavender} />
            <Text style={styles.missingTitle}>Service unavailable</Text>
            <Text style={styles.missingBody}>
              We could not reach the server right now. Check your internet connection and try again.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.missingBack, pressed && styles.pressed]}
              onPress={() => router.replace('/welcome' as Href)}>
              <Text style={styles.missingBackText}>Back to welcome</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (initializing && !user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <MarketingBackdrop />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Palette.iris} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <MarketingBackdrop />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          {/* Back button */}
          <Pressable
            onPress={() => router.replace('/welcome' as Href)}
            hitSlop={12}
            style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back to welcome">
            <View style={styles.backPill}>
              <Ionicons name="chevron-back" size={20} color={Palette.iris} />
            </View>
            <Text style={styles.backLink}>Back</Text>
          </Pressable>

          <View style={styles.topSpacer} />

          <Animated.View entering={FadeInDown.duration(420).springify()} style={styles.headerBlock}>
            <Text style={styles.eyebrow}>JOIN CALTRACK</Text>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>A few details and you’re set.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(440).springify()} style={styles.form}>
            <TextField
              label="Full name"
              value={name}
              onChangeText={setName}
              placeholder="Alex Morgan"
              autoCapitalize="words"
              textContentType="name"
              autoComplete="name"
              containerStyle={styles.field}
            />

            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
              containerStyle={styles.field}
            />

            <TextField
              label="Password"
              helperText="At least 8 characters."
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
              showPasswordToggle
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              autoComplete="password-new"
              containerStyle={styles.field}
            />

            <Pressable
              onPress={() => setAgreed((a) => !a)}
              style={styles.legalRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              accessibilityLabel="Agree to Terms of Use and Privacy Policy">
              <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                {agreed ? <Ionicons name="checkmark" size={14} color={Palette.white} /> : null}
              </View>
              <Text style={styles.legalText}>
                I agree to the{' '}
                <Text style={styles.legalRowLink} onPress={() => void openLegalUrl('terms')}>
                  Terms of Use
                </Text>{' '}
                and{' '}
                <Text style={styles.legalRowLink} onPress={() => void openLegalUrl('privacy')}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </Pressable>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#9B1F52" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create account"
              accessibilityState={{ disabled: !canSubmit }}
              disabled={!canSubmit}
              onPress={() => void onEmailSignUp()}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && canSubmit && styles.pressed,
                !canSubmit && styles.primaryBtnDisabled,
              ]}>
              {submitting ? (
                <ActivityIndicator color={Palette.white} />
              ) : (
                <>
                  <Text style={styles.primaryLabel}>Create account</Text>
                  <Ionicons name="arrow-forward" size={20} color={Palette.white} />
                </>
              )}
            </Pressable>

            <View style={styles.switchInline}>
              <Text style={styles.switchMuted}>Already have an account? </Text>
              <Pressable
                onPress={() => router.push('/auth/login' as Href)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Sign in">
                <Text style={styles.switchAccent}>Sign in</Text>
              </Pressable>
            </View>
          </Animated.View>

          <View style={styles.bottomSpacer} />

          <Text style={styles.legalFooter}>
            By continuing you agree to our{' '}
            <Text style={styles.legalLink} onPress={() => void openLegalUrl('terms')}>
              Terms
            </Text>{' '}
            and{' '}
            <Text style={styles.legalLink} onPress={() => void openLegalUrl('privacy')}>
              Privacy Policy
            </Text>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.ghost },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 16,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingWrap: { flex: 1, padding: 24, justifyContent: 'center' },
  missingCard: {
    backgroundColor: Palette.white,
    borderRadius: 24,
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  missingTitle: { fontFamily: Fonts.bold, fontSize: 22, color: Palette.obsidian },
  missingBody: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: Palette.dusk },
  missingBack: {
    marginTop: 4,
    backgroundColor: Palette.haze,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.15)',
  },
  missingBackText: { fontFamily: Fonts.semiBold, fontSize: 16, color: Palette.iris },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  backPill: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  backLink: { fontFamily: Fonts.semiBold, fontSize: 16, color: Palette.iris },

  topSpacer: { flex: 1, minHeight: 24 },
  bottomSpacer: { flex: 0.7, minHeight: 24 },

  headerBlock: { marginBottom: 24, paddingRight: 8 },
  eyebrow: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 2.8,
    color: Palette.lavender,
    marginBottom: 10,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 34,
    letterSpacing: -0.6,
    color: Palette.obsidian,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: Palette.dusk,
    maxWidth: 360,
  },

  form: {},
  field: { marginBottom: 14 },

  legalRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: Palette.iris, borderColor: Palette.iris },
  legalText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Palette.dusk,
  },
  legalRowLink: { fontFamily: Fonts.semiBold, color: Palette.iris, textDecorationLine: 'underline' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { flex: 1, fontFamily: Fonts.medium, fontSize: 14, color: '#9B1F52', lineHeight: 20 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.iris,
    height: 56,
    borderRadius: 16,
    marginTop: 4,
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryBtnDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0, elevation: 0 },
  primaryLabel: { fontFamily: Fonts.bold, fontSize: 16, color: Palette.white },

  switchInline: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchMuted: { fontFamily: Fonts.regular, fontSize: 15, color: Palette.dusk },
  switchAccent: { fontFamily: Fonts.semiBold, fontSize: 15, color: Palette.iris },

  legalFooter: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  legalLink: {
    fontFamily: Fonts.semiBold,
    color: Palette.iris,
    textDecorationLine: 'underline',
  },

  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
