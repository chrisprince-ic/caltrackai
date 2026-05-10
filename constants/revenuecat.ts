/**
 * RevenueCat dashboard identifiers — keep these aligned with app.revenuecat.com.
 *
 * **Macrovia (App Store):** subscription `com.aevontech.macrovia.premium.monthly` with a **7-day free trial**,
 * then monthly billing — configure the intro offer in App Store Connect and attach this product to your
 * default offering in RevenueCat (same package the app purchases via `purchaseMacroviaMonthly`).
 */
export const REVENUECAT_ENTITLEMENT_PRO = 'ChrisGroup Pro';

/** App Store subscription product (Macrovia premium monthly). Must match App Store Connect + RevenueCat. */
export const MACROVIA_PREMIUM_MONTHLY_PRODUCT_ID = 'com.aevontech.macrovia.premium.monthly';

/** Optional: set if you use a non-default offering identifier */
export const REVENUECAT_OFFERING_ID: string | undefined = undefined;

/**
 * Store product identifiers (must match App Store Connect / Play Console + RevenueCat products).
 */
export const REVENUECAT_PRODUCT_IDS = {
  monthly: MACROVIA_PREMIUM_MONTHLY_PRODUCT_ID,
  yearly: 'yearly',
  lifetime: 'lifetime',
} as const;
