import { Platform } from 'react-native';

/**
 * RevenueCat public SDK keys are safe to ship in the client, but keep them in env vars
 * so test vs production keys are easy to swap per build profile.
 *
 * Use the **public** SDK keys from RevenueCat → Project settings → API keys — not the secret key.
 * - iOS / Apple: key usually starts with `appl_` (or `test_` for Test Store).
 * - Android / Google Play: key usually starts with `goog_` (or `test_` for Test Store).
 * Using an Apple key on Android (or the reverse) triggers INVALID_CREDENTIALS / "credentials" errors.
 */
export function getRevenueCatApiKey(): string | undefined {
  const shared = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();
  const ios = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
  const android = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();

  if (Platform.OS === 'ios') {
    return ios || shared;
  }
  if (Platform.OS === 'android') {
    return android || shared;
  }
  return undefined;
}

/** True if this key is almost certainly for the wrong store (common credentials error). */
export function revenueCatKeyPlatformMismatch(key: string): boolean {
  const k = key.trim();
  if (k.startsWith('test_')) {
    return false;
  }
  if (Platform.OS === 'ios' && k.startsWith('goog_')) {
    return true;
  }
  if (Platform.OS === 'android' && k.startsWith('appl_')) {
    return true;
  }
  return false;
}

/** Secret keys must never be used in the app — they will fail or expose the project. */
export function revenueCatKeyLooksLikeSecret(key: string): boolean {
  const k = key.trim().toLowerCase();
  return k.startsWith('sk_') || k.includes('secret');
}

export function credentialsIssueHelpMessage(): string {
  const p = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'this platform';
  return [
    `RevenueCat rejected the API key on ${p}.`,
    'Use the public SDK key from app.revenuecat.com → your project → API keys.',
    Platform.OS === 'ios'
      ? 'On iOS, use the Apple App Store key (often starts with appl_).'
      : Platform.OS === 'android'
        ? 'On Android, use the Google Play key (often starts with goog_).'
        : '',
    'Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY separately if you use one .env for both builds.',
    'Ensure bundle ID (iOS) and package name (Android) in RevenueCat match app.json, and that each store app is linked in the RevenueCat dashboard.',
  ]
    .filter(Boolean)
    .join(' ');
}
