/**
 * In-app marketing copy. Align **7-day free trial** and **monthly billing after trial** with App Store Connect
 * / Play Console (see `constants/iap.ts`: `EXPO_PUBLIC_IAP_PRODUCT_ID`, or
 * `EXPO_PUBLIC_IAP_PRODUCT_ID_IOS` / `EXPO_PUBLIC_IAP_PRODUCT_ID_ANDROID` when ids differ).
 */
export const SUBSCRIPTION_TRIAL_DAYS = 7;

/** Fallback price string shown before the store product loads */
export const SUBSCRIPTION_MONTHLY_PRICE_FALLBACK = '$7.99';

/** Canonical monthly price — keep in sync with App Store Connect */
export const SUBSCRIPTION_MONTHLY_PRICE_USD = '$7.99';
