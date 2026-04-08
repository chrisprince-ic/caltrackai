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

export default function SignUpScreen() {
  const router = useRouter();
  const { user, initializing, firebaseReady, signUpWithProfile } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !initializing) {
      router.replace('/onboarding' as Href);
    }
  }, [user, initializing, router]);

  async function onEmailSignUp() {
    setError(null);
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }
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
            <Text style={styles.eyebrow}>GET STARTED</Text>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>
              Track calories, understand your macros, and reach your goals.
            </Text>
          </View>

          {/* Full name */}
          <Text style={styles.label}>Full name</Text>
          <TextInput
            value={name}
            onChangeText={(t) => { setName(t); setError(null); }}
            placeholder="Alex Morgan"
            placeholderTextColor={Palette.dusk}
            autoCapitalize="words"
            returnKeyType="next"
            style={styles.input}
          />

          {/* Email */}
          <Text style={styles.label}>Email address</Text>
          <TextInput
            value={email}
            onChangeText={(t) => { setEmail(t); setError(null); }}
            placeholder="you@email.com"
            placeholderTextColor={Palette.dusk}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            style={styles.input}
          />

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              placeholder="At least 8 characters"
              placeholderTextColor={Palette.dusk}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              autoComplete="password-new"
              returnKeyType="next"
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

          {/* Confirm password */}
          <Text style={styles.label}>Confirm password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
              placeholder="Repeat your password"
              placeholderTextColor={Palette.dusk}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              autoComplete="password-new"
              returnKeyType="done"
              onSubmitEditing={() => void onEmailSignUp()}
              style={styles.inputInner}
            />
            <Pressable
              onPress={() => setShowConfirmPassword((p) => !p)}
              hitSlop={10}
              style={styles.eyeBtn}
              accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}>
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={Palette.dusk}
              />
            </Pressable>
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#9B1F52" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Create account button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create account"
            disabled={submitting}
            onPress={() => void onEmailSignUp()}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed, submitting && { opacity: 0.75 }]}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryLabel}>Create account</Text>
            )}
          </Pressable>

          {/* Legal agreement */}
          <Text style={styles.legalAgreement}>
            By creating an account, you agree to our{' '}
            <Text
              style={styles.legalAgreementLink}
              onPress={() => router.push('/legal/terms' as Href)}>
              Terms of Service
            </Text>
            {' '}and acknowledge our{' '}
            <Text
              style={styles.legalAgreementLink}
              onPress={() => router.push('/legal/privacy-policy' as Href)}>
              Privacy Policy
            </Text>
            .
          </Text>

          {/* Switch to sign in */}
          <View style={styles.switchRow}>
            <Text style={styles.switchMuted}>Already have an account? </Text>
            <Pressable onPress={() => router.push('/auth/login' as Href)}>
              <Text style={styles.switchAccent}>Sign in</Text>
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
    marginBottom: 32,
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
    marginBottom: 16,
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
  legalAgreement: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Palette.dusk,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  legalAgreementLink: {
    fontFamily: Fonts.semiBold,
    color: Palette.iris,
    textDecorationLine: 'underline',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchMuted: { fontFamily: Fonts.regular, fontSize: 15, color: Palette.dusk },
  switchAccent: { fontFamily: Fonts.semiBold, fontSize: 15, color: Palette.iris },
  pressed: { opacity: 0.88 },
});
