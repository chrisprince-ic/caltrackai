import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

import { GoogleIdTokenSignIn } from '@/components/auth/GoogleIdTokenSignIn';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyFirebaseAuthMessage } from '@/lib/firebase-auth-errors';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

export default function LoginScreen() {
  const router = useRouter();
  const {
    user,
    initializing,
    firebaseReady,
    signInWithEmailPassword,
    signInWithGoogleIdToken,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !initializing) {
      router.replace('/(tabs)' as Href);
    }
  }, [user, initializing, router]);

  const onGoogleError = useCallback((message: string) => {
    setError(message);
  }, []);

  const onGoogleIdToken = useCallback(
    async (idToken: string) => {
      setError(null);
      setSubmitting(true);
      try {
        await signInWithGoogleIdToken(idToken);
      } finally {
        setSubmitting(false);
      }
    },
    [signInWithGoogleIdToken]
  );

  async function onEmailLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter email and password.');
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

  if (!firebaseReady) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.missingWrap}>
          <Ionicons name="cloud-offline-outline" size={40} color={Palette.lavender} />
          <Text style={styles.missingTitle}>Firebase not configured</Text>
          <Text style={styles.missingBody}>
            Add EXPO_PUBLIC_API_KEY, EXPO_PUBLIC_AUTH_DOMAIN, EXPO_PUBLIC_DATABASE_URL, EXPO_PUBLIC_PROJECT_ID, and
            EXPO_PUBLIC_APP_ID to <Text style={styles.mono}>.env</Text> (one <Text style={styles.mono}>KEY=value</Text>{' '}
            per line), then restart Expo.
          </Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Back</Text>
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

          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Sync your diary across devices with Firebase.</Text>

          <GoogleIdTokenSignIn
            buttonLabel="Continue with Google"
            disabled={submitting}
            onPressClearError={() => setError(null)}
            onError={onGoogleError}
            onIdToken={onGoogleIdToken}
          />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or email</Text>
            <View style={styles.divider} />
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor={Palette.dusk}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={Palette.dusk}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            autoComplete="password"
            style={styles.input}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#9B1F52" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in with email"
            disabled={submitting}
            onPress={() => void onEmailLogin()}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed, submitting && { opacity: 0.75 }]}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryLabel}>Sign in</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.push('/auth/sign-up' as Href)} style={styles.switchRow}>
            <Text style={styles.switchMuted}>New here? </Text>
            <Text style={styles.switchAccent}>Create an account</Text>
          </Pressable>
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
    paddingBottom: 32,
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
  missingTitle: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Palette.obsidian,
  },
  missingBody: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Palette.dusk,
  },
  mono: { fontFamily: Fonts.semiBold, color: Palette.iris },
  backBtn: {
    marginTop: 8,
    backgroundColor: Palette.haze,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.12)',
  },
  backBtnText: { fontFamily: Fonts.semiBold, fontSize: 16, color: Palette.iris },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backLink: { fontFamily: Fonts.semiBold, fontSize: 16, color: Palette.iris },
  eyebrow: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 2,
    color: Palette.lavender,
    marginBottom: 10,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 32,
    color: Palette.obsidian,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Palette.dusk,
    marginBottom: 28,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(139, 126, 170, 0.25)' },
  dividerText: { fontFamily: Fonts.medium, fontSize: 12, color: Palette.dusk },
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.12)',
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
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryLabel: { fontFamily: Fonts.bold, fontSize: 16, color: '#FFFFFF' },
  switchRow: { alignSelf: 'center', paddingVertical: 8 },
  switchMuted: { fontFamily: Fonts.regular, fontSize: 15, color: Palette.dusk },
  switchAccent: { fontFamily: Fonts.semiBold, fontSize: 15, color: Palette.iris },
  pressed: { opacity: 0.88 },
});
