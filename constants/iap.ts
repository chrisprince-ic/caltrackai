/**
 * iOS App Store auto-renewable subscription product ID — must match App Store Connect exactly.
 * Override with EXPO_PUBLIC_IAP_PRODUCT_ID_IOS or shared EXPO_PUBLIC_IAP_PRODUCT_ID.
 * process.env.EXPO_PUBLIC_* must use dot notation so Metro/Babel can inline at build time.
 */
export const IAP_SUBSCRIPTION_SKU_IOS: string =
  process.env.EXPO_PUBLIC_IAP_PRODUCT_ID_IOS ||
  process.env.EXPO_PUBLIC_IAP_PRODUCT_ID ||
  'com.aevontech.macrovia.premium.monthly';

/**
 * Google Play subscription product ID — must match Monetize → Subscriptions exactly.
 * Often differs from iOS; set EXPO_PUBLIC_IAP_PRODUCT_ID_ANDROID or the shared key.
 */
export const IAP_SUBSCRIPTION_SKU_ANDROID: string =
  process.env.EXPO_PUBLIC_IAP_PRODUCT_ID_ANDROID ||
  process.env.EXPO_PUBLIC_IAP_PRODUCT_ID ||
  'com.aevontech.macrovia.premium.monthly';

/** All known SKUs — used for restore and active-subscription checks across builds. */
export const IAP_SUBSCRIPTION_SKUS_ACTIVE: string[] = Array.from(
  new Set([IAP_SUBSCRIPTION_SKU_IOS, IAP_SUBSCRIPTION_SKU_ANDROID]),
);

/** @deprecated Use IAP_SUBSCRIPTION_SKU_IOS */
export const MACROVIA_PRODUCT_ID = IAP_SUBSCRIPTION_SKU_IOS;
