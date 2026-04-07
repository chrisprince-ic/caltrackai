/**
 * RevenueCat dashboard identifiers — keep these aligned with app.revenuecat.com.
 *
 * Entitlement: create "ChrisGroup Pro" and attach every paid product to it.
 * Products (store identifiers): register `monthly`, `yearly`, `lifetime` in App Store Connect /
 * Play Console, then add the same identifiers as products in RevenueCat and attach them to the entitlement.
 * Offering: set a default offering whose packages reference those products (e.g. monthly → $rc_monthly,
 * yearly → $rc_annual, lifetime → $rc_lifetime, or custom package identifiers).
 * Paywall: attach a Paywall to that offering in the dashboard (required for RevenueCatUI).
 */
export const REVENUECAT_ENTITLEMENT_PRO = 'ChrisGroup Pro';

/** Optional: set if you use a non-default offering identifier */
export const REVENUECAT_OFFERING_ID: string | undefined = undefined;

/**
 * Expected product identifiers for documentation and validation hints (must match dashboard + stores).
 */
export const REVENUECAT_PRODUCT_IDS = {
  monthly: 'monthly',
  yearly: 'yearly',
  lifetime: 'lifetime',
} as const;
