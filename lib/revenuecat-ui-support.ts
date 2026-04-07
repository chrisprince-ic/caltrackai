import Constants, { ExecutionEnvironment } from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const PAYWALL_NATIVE_HELP =
  'The paywall requires native RevenueCat UI. Use an EAS development build or `npx expo run:ios` / `run:android` after installing `react-native-purchases-ui`—Expo Go cannot load it. Rebuild if you added the package recently.';

/**
 * True when native RevenueCat UI modules are linked (dev client / release).
 * If either is missing, the JS preview path may run and fail (e.g. "document is not available").
 */
export function hasRevenueCatUiNativeModules(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }
  return Boolean(NativeModules.RNPaywalls && NativeModules.RNCustomerCenter);
}

/** User-facing explanation when paywall cannot run in this binary. */
export function revenueCatPaywallUnsupportedMessage(): string {
  if (Platform.OS === 'web') {
    return 'Subscriptions and the paywall are not available on web in this app. Use the iOS or Android build.';
  }
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return `${PAYWALL_NATIVE_HELP} You are currently in Expo Go.`;
  }
  return PAYWALL_NATIVE_HELP;
}
