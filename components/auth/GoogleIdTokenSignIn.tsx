import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@/lib/google-oauth-env';
import { getGoogleNativeRedirectUri } from '@/lib/google-oauth-redirect';

type Props = {
  buttonLabel: string;
  onIdToken: (idToken: string) => Promise<void>;
  disabled?: boolean;
  onPressClearError?: () => void;
  onError: (message: string) => void;
};

/**
 * Expo Google auth requires `webClientId` on web and additionally `iosClientId` / `androidClientId` on native.
 * This component only mounts `useIdTokenAuthRequest` when those values exist so the hook never throws.
 */
export function GoogleIdTokenSignIn({
  buttonLabel,
  onIdToken,
  disabled,
  onPressClearError,
  onError,
}: Props) {
  if (!GOOGLE_WEB_CLIENT_ID) {
    return (
      <View style={styles.hintBox}>
        <Text style={styles.hintText}>
          Optional: set <Text style={styles.mono}>EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID</Text> in{' '}
          <Text style={styles.mono}>.env</Text>. On devices, you also need the native OAuth client IDs below.
        </Text>
      </View>
    );
  }

  if (Platform.OS === 'ios' && !GOOGLE_IOS_CLIENT_ID) {
    return (
      <View style={styles.hintBox}>
        <Text style={styles.hintText}>
          On iOS, set <Text style={styles.mono}>EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID</Text> to the iOS OAuth client ID
          (Firebase Console → Project settings → Your apps → iOS → GoogleService-Info.plist{' '}
          <Text style={styles.mono}>CLIENT_ID</Text>, or Google Cloud → Credentials → iOS client).
        </Text>
      </View>
    );
  }

  if (Platform.OS === 'android' && !GOOGLE_ANDROID_CLIENT_ID) {
    return (
      <View style={styles.hintBox}>
        <Text style={styles.hintText}>
          On Android, set <Text style={styles.mono}>EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID</Text> to the Android OAuth
          client ID from Firebase / Google Cloud Credentials.
        </Text>
      </View>
    );
  }

  return (
    <GoogleIdTokenInner
      buttonLabel={buttonLabel}
      onIdToken={onIdToken}
      disabled={disabled}
      onPressClearError={onPressClearError}
      onError={onError}
    />
  );
}

function GoogleIdTokenInner({
  buttonLabel,
  onIdToken,
  disabled,
  onPressClearError,
  onError,
}: Props) {
  const config = useMemo(() => {
    const redirectUri = getGoogleNativeRedirectUri();
    return {
      webClientId: GOOGLE_WEB_CLIENT_ID!,
      ...(Platform.OS === 'ios' && GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
      ...(Platform.OS === 'android' && GOOGLE_ANDROID_CLIENT_ID
        ? { androidClientId: GOOGLE_ANDROID_CLIENT_ID }
        : {}),
      ...(redirectUri ? { redirectUri } : {}),
    };
  }, []);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(config);
  const [exchanging, setExchanging] = useState(false);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (response?.type !== 'success') return;
      const idToken = response.params.id_token;
      if (typeof idToken !== 'string' || !idToken) {
        onError('Google did not return an ID token.');
        return;
      }
      setExchanging(true);
      try {
        await onIdToken(idToken);
      } catch (e) {
        if (alive) {
          onError(e instanceof Error ? e.message : 'Google sign-in failed');
        }
      } finally {
        if (alive) setExchanging(false);
      }
    }
    void run();
    return () => {
      alive = false;
    };
  }, [response, onIdToken, onError]);

  const busy = Boolean(disabled) || exchanging;

  if (!request) {
    return (
      <View style={[styles.hintBox, styles.loadingHint]}>
        <ActivityIndicator color={Palette.iris} />
        <Text style={styles.hintText}>Preparing Google sign-in…</Text>
      </View>
    );
  }

  return (
    <Pressable
      disabled={busy}
      onPress={() => {
        onPressClearError?.();
        void promptAsync();
      }}
      style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed, busy && { opacity: 0.6 }]}>
      <Ionicons name="logo-google" size={20} color={Palette.obsidian} />
      <Text style={styles.googleLabel}>{buttonLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hintBox: {
    backgroundColor: Palette.haze,
    padding: 14,
    borderRadius: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.08)',
  },
  loadingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hintText: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 20, color: Palette.dusk },
  mono: { fontFamily: Fonts.semiBold, color: Palette.iris },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(75, 35, 200, 0.15)',
    marginBottom: 22,
  },
  googleLabel: { fontFamily: Fonts.semiBold, fontSize: 16, color: Palette.obsidian },
  pressed: { opacity: 0.88 },
});
