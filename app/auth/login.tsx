import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { type Href, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { getFirebaseAuth, getMissingFirebasePublicKeys } from '@/lib/firebase';
import { friendlyFirebaseAuthMessage } from '@/lib/firebase-auth-errors';
import { openLegalUrl } from '@/lib/legal-browser';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

function triggerLightHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function LoginScreen() {
  const router = useRouter();
  const { user, initializing, firebaseReady, signInWithEmailPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (user && !initializing) {
      router.replace('/(tabs)' as Href);
    }
  }, [user, initializing, router]);

  async function onEmailLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    triggerLightHaptic();
    setSubmitting(true);
    try {
      await signInWithEmailPassword(email, password);
    } catch (e) {
      setError(friendlyFirebaseAuthMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSendReset() {
    if (!resetEmail.trim()) {
      Alert.alert('Enter email', 'Please enter your email address to reset your password.');
      return;
    }
    setResetSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSuccess(true);
    } catch {
      Alert.alert('Reset failed', 'Could not send a reset email. Check the address and try again.');
    } finally {
      setResetSubmitting(false);
    }
  }

  const missingFirebaseKeys = firebaseReady ? [] : getMissingFirebasePublicKeys();

  if (!firebaseReady) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <MarketingBackdrop />
        <View style={styles.missingWrap}>
          <View style={styles.missingCard}>
            <Ionicons name="cloud-offline-outline" size={40} color={Palette.lavender} />
            <Text style={styles.missingTitle}>Firebase not configured</Text>
            <Text style={styles.missingBody}>
              This build does not include the required Firebase keys, so email sign-in cannot start.
              {missingFirebaseKeys.length > 0 ? (
                <>
                  {'\n\n'}
                  Missing: {missingFirebaseKeys.join(', ')}.
                  {'\n\n'}
                  Add them to a <Text style={styles.missingBold}>.env</Text> file in the project root (from Firebase
                  Console → Project settings → Your apps). Use one{' '}
                  <Text style={styles.missingBold}>KEY=value</Text> per line with no quotes, then restart Expo with{' '}
                  <Text style={styles.missingBold}>npx expo start --clear</Text>.
                </>
              ) : null}
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

          {/* Top spacer pushes the form down so it sits ~40% from the top */}
          <View style={styles.topSpacer} />

          <Animated.View entering={FadeInDown.duration(420).springify()} style={styles.headerBlock}>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Pick up right where you left off.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(440).springify()} style={styles.form}>
            {!showReset ? (
              <>
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

                <View style={styles.passwordHeader}>
                  <Text style={styles.fieldLabelInline}>Password</Text>
                  <Pressable
                    onPress={() => {
                      setResetEmail(email);
                      setShowReset(true);
                      setResetSuccess(false);
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Forgot password">
                    <Text style={styles.forgotLink}>Forgot?</Text>
                  </Pressable>
                </View>
                <TextField
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  showPasswordToggle
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  autoComplete="password"
                  containerStyle={styles.field}
                />

                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color="#9B1F52" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sign in"
                  disabled={submitting}
                  onPress={() => void onEmailLogin()}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.pressed,
                    submitting && { opacity: 0.75 },
                  ]}>
                  {submitting ? (
                    <ActivityIndicator color={Palette.white} />
                  ) : (
                    <>
                      <Text style={styles.primaryLabel}>Sign in</Text>
                      <Ionicons name="arrow-forward" size={20} color={Palette.white} />
                    </>
                  )}
                </Pressable>

                <View style={styles.switchInline}>
                  <Text style={styles.switchMuted}>New here? </Text>
                  <Pressable
                    onPress={() => router.push('/auth/sign-up' as Href)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Create an account">
                    <Text style={styles.switchAccent}>Create an account</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    setShowReset(false);
                    setResetSuccess(false);
                  }}
                  style={styles.resetBackRow}
                  hitSlop={8}>
                  <Ionicons name="chevron-back" size={18} color={Palette.iris} />
                  <Text style={styles.resetBackText}>Back to sign in</Text>
                </Pressable>

                {resetSuccess ? (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle" size={18} color="#1A7A4A" />
                    <Text style={styles.successText}>
                      Check your inbox — we sent a password reset link to {resetEmail.trim()}.
                    </Text>
                  </View>
                ) : (
                  <>
                    <TextField
                      label="Reset password"
                      helperText="We'll email you a link to set a new password."
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      placeholder="your@email.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="emailAddress"
                      autoComplete="email"
                      containerStyle={styles.field}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Send password reset email"
                      disabled={resetSubmitting}
                      onPress={() => void onSendReset()}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        pressed && styles.pressed,
                        resetSubmitting && { opacity: 0.75 },
                      ]}>
                      {resetSubmitting ? (
                        <ActivityIndicator color={Palette.white} />
                      ) : (
                        <Text style={styles.primaryLabel}>Send reset email</Text>
                      )}
                    </Pressable>
                  </>
                )}
              </>
            )}
          </Animated.View>

          {/* Bottom spacer is smaller than the top so the form sits at ~40% from the top */}
          <View style={styles.bottomSpacer} />

          {/* Legal footer */}
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
    borderColor: '#E5E7EB',
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
  missingBold: { fontFamily: Fonts.semiBold, color: Palette.obsidian },
  missingBack: {
    marginTop: 4,
    backgroundColor: Palette.haze,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(31, 138, 91, 0.15)',
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
  // roughly 40% from the top, not dead center.
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
  fieldLabelInline: { fontFamily: Fonts.semiBold, fontSize: 14, color: Palette.obsidian },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotLink: { fontFamily: Fonts.semiBold, fontSize: 13, color: Palette.iris },

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

  resetBackRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  resetBackText: { fontFamily: Fonts.semiBold, fontSize: 14, color: Palette.iris },

  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E8F5EC',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(26, 122, 74, 0.15)',
    marginBottom: 4,
  },
  successText: { flex: 1, fontFamily: Fonts.medium, fontSize: 14, color: '#1A7A4A', lineHeight: 20 },

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
