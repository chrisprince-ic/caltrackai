import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '@/lib/google-oauth-env';

const GOOGLE_OAUTH_CLIENT_RE = /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/i;

/** `123-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.123-abc` */
export function reversedGoogleClientIdScheme(oauthClientId: string): string {
  const trimmed = oauthClientId.trim();
  const suffix = trimmed.replace(/\.apps\.googleusercontent\.com$/i, '');
  return `com.googleusercontent.apps.${suffix}`;
}

export function isWellFormedGoogleOAuthClientId(id: string | undefined): id is string {
  return Boolean(id && GOOGLE_OAUTH_CLIENT_RE.test(id.trim()));
}

/**
 * Google’s token endpoint rejects the default Expo redirect (`<bundleId>:/oauthredirect`).
 * Native clients must use `com.googleusercontent.apps.<clientSuffix>:/oauthredirect`.
 *
 * In **Expo Go**, keep the default `Linking` / proxy URL — do not override.
 */
export function getGoogleNativeRedirectUri(): string | undefined {
  if (Platform.OS === 'web') return undefined;
  if (
    Constants.executionEnvironment !== ExecutionEnvironment.Standalone &&
    Constants.executionEnvironment !== ExecutionEnvironment.Bare
  ) {
    return undefined;
  }
  if (Platform.OS === 'ios' && isWellFormedGoogleOAuthClientId(GOOGLE_IOS_CLIENT_ID)) {
    return `${reversedGoogleClientIdScheme(GOOGLE_IOS_CLIENT_ID)}:/oauthredirect`;
  }
  if (Platform.OS === 'android' && isWellFormedGoogleOAuthClientId(GOOGLE_ANDROID_CLIENT_ID)) {
    return `${reversedGoogleClientIdScheme(GOOGLE_ANDROID_CLIENT_ID)}:/oauthredirect`;
  }
  return undefined;
}
