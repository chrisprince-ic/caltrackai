import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { friendlyFirebaseAuthMessage } from '@/lib/firebase-auth-errors';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

export default function LoginScreen() {
  const router = useRouter();
  const { user, initializing, firebaseReady, signInWithEmailPassword, sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (user && !initializing) {
      router.replace('/(tabs)' as Href);
    }
  }, [user, initializing, router]);

  async function onEmailLogin() {
    setError(null);
    setResetSent(false);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await signInWithEmailPassword(email, password);
    } catch (e) {
      setError(friendlyFirebaseAuthMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onForgotPassword() {
    setError(null);
    setResetSent(false);
    if (!email.trim()) {
      setError('Enter your email address above first, then tap "Forgot password?" again.');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(email.trim());
      setResetSent(true);
    } catch (e) {
      setError(friendlyFirebaseAuthMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!firebaseReady) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.missingWrap}>
          <Ionicons name="cloud-offline-outline" size={40} color={Palette.lavender} />
          <Text style={styles.missingTitle}>Service unavailable</Text>
          <Text style={styles.missingBody}>
            The app is not fully configured. Please contact support if this persists.
          </Text>
          <Pressable style={styles.outlineBtn} onPress={() => router.back()}>
            <Text style={styles.outlineBtnText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (initializing && !user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Palette.iris} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>

          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.7 }]}>
            <Ionicons name="chevron-back" size={22} color={Palette.iris} />
            <Text style={styles.backLink}>Back</Text>
          </Pressable>

          {/* Branding */}
          <View style={styles.brandWrap}>
            <View style={styles.logoSquircle}>
              <Ionicons name="flame" size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>
              Sign in to sync your diary and hit your goals every day.
            </Text>
          </View>

          {/* Email */}
          <Text style={styles.label}>Email address</Text>
          <TextInput
            value={email}
            onChangeText={(t) => { setEmail(t); setError(null); setResetSent(false); }}
            placeholder="you@email.com"
            placeholderTextColor={Palette.dusk}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            style={styles.input}
          />

          {/* Password row with label + forgot link */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <Pressable
              onPress={() => void onForgotPassword()}
              hitSlop={8}
              disabled={submitting}>
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </Pressable>
          </View>

          {/* Password input with show/hide */}
          <View style={styles.inputWrap}>
            <TextInput
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              placeholder="••••••••"
              placeholderTextColor={Palette.dusk}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={() => void onEmailLogin()}
              style={styles.inputInner}
            />
            <Pressable
              onPress={() => setShowPassword((p) => !p)}
              hitSlop={10}
              style={styles.eyeBtn}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={Palette.dusk}
              />
            </Pressable>
          </View>

          {/* Reset password success banner */}
          {resetSent ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={18} color="#2D7D3A" />
              <Text style={styles.successText}>
                Password reset email sent to {email}. Check your inbox.
              </Text>
            </View>
          ) : null}

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#9B1F52" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Sign in button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            disabled={submitting}
            onPress={() => void onEmailLogin()}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed, submitting && { opacity: 0.75 }]}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryLabel}>Sign in</Text>
            )}
          </Pressable>

          {/* Switch to sign up */}
          <View style={styles.switchRow}>
            <Text style={styles.switchMuted}>New here? </Text>
            <Pressable onPress={() => router.push('/auth/sign-up' as Href)}>
              <Text style={styles.switchAccent}>Create an account</Text>
            </Pressable>
          </View>

          {/* Legal footer */}
          <View style={styles.legalFooter}>
            <Pressable onPress={() => router.push('/legal/privacy-policy' as Href)} hitSlop={8}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.legalSep}>·</Text>
            <Pressable onPress={() => router.push('/legal/terms' as Href)} hitSlop={8}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.ghost },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingWrap: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    gap: 16,
    maxWidth: 420,
    alignSelf: 'center',
  },
  missingTitle: { fontFamily: Fonts.bold, fontSize: 22, color: Palette.obsidian },
  missingBody: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Palette.dusk,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 24,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  backLink: { fontFamily: Fonts.semiBold, fontSize: 16, color: Palette.iris },
  brandWrap: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoSquircle: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Palette.iris,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  eyebrow: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 2.2,
    color: Palette.lavender,
    marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 30,
    color: Palette.obsidian,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Palette.dusk,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Palette.obsidian,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotLink: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Palette.iris,
  },
  input: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Palette.obsidian,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.12)',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.12)',
    marginBottom: 20,
  },
  inputInner: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Palette.obsidian,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E6F9EC',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(45, 125, 58, 0.2)',
  },
  successText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: '#1A5C27',
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFE8F2',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(155, 31, 82, 0.15)',
  },
  errorText: { flex: 1, fontFamily: Fonts.medium, fontSize: 14, color: '#9B1F52', lineHeight: 20 },
  primaryBtn: {
    backgroundColor: Palette.iris,
    paddingVertical: 17,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryLabel: { fontFamily: Fonts.bold, fontSize: 16, color: '#FFFFFF' },
  outlineBtn: {
    marginTop: 8,
    backgroundColor: Palette.haze,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.12)',
  },
  outlineBtnText: { fontFamily: Fonts.semiBold, fontSize: 16, color: Palette.iris },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 32,
  },
  switchMuted: { fontFamily: Fonts.regular, fontSize: 15, color: Palette.dusk },
  switchAccent: { fontFamily: Fonts.semiBold, fontSize: 15, color: Palette.iris },
  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  legalLink: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Palette.dusk,
    textDecorationLine: 'underline',
  },
  legalSep: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Palette.dusk,
    opacity: 0.5,
  },
  pressed: { opacity: 0.88 },
});
