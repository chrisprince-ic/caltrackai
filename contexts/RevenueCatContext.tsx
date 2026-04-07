import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import type { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { REVENUECAT_ENTITLEMENT_PRO, REVENUECAT_OFFERING_ID } from '@/constants/revenuecat';
import {
  credentialsIssueHelpMessage,
  getRevenueCatApiKey,
  revenueCatKeyLooksLikeSecret,
  revenueCatKeyPlatformMismatch,
} from '@/lib/revenuecat-keys';
import { hasRevenueCatUiNativeModules, revenueCatPaywallUnsupportedMessage } from '@/lib/revenuecat-ui-support';
import { isPurchasesError, purchasesErrorMessage, PURCHASES_ERROR_CODE } from '@/lib/purchases-errors';
import { useAuth } from '@/contexts/AuthContext';

const NATIVE_STORE = Platform.OS === 'ios' || Platform.OS === 'android';

type RevenueCatCtx = {
  /** SDK configured and ready for calls on this device */
  ready: boolean;
  /** Loading initial customer info or identity switch */
  loading: boolean;
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  lastError: string | null;
  clearError: () => void;
  refreshCustomerInfo: () => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo | null>;
  /** Current offering from cache (for custom UIs); paywall uses dashboard default if omitted */
  getCurrentOffering: () => Promise<PurchasesOffering | null>;
  presentPaywall: () => Promise<PAYWALL_RESULT | null>;
  /** Presents paywall only when `ChrisGroup Pro` is not active */
  presentPaywallIfNeeded: () => Promise<PAYWALL_RESULT | null>;
  /** Customer Center (RevenueCat Pro plan). No-op on web. */
  presentCustomerCenter: () => Promise<void>;
};

const RevenueCatContext = createContext<RevenueCatCtx | null>(null);

function entitlementActive(info: CustomerInfo | null, id: string): boolean {
  return Boolean(info?.entitlements.active[id]?.isActive);
}

async function resolveOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  if (REVENUECAT_OFFERING_ID) {
    return offerings.all[REVENUECAT_OFFERING_ID] ?? null;
  }
  return offerings.current ?? null;
}

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const { user, initializing: authInitializing } = useAuth();
  const configuredRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(NATIVE_STORE);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const clearError = useCallback(() => setLastError(null), []);

  /** Configure once on native */
  useEffect(() => {
    if (!NATIVE_STORE) {
      setLoading(false);
      setReady(false);
      return;
    }

    const apiKey = getRevenueCatApiKey();
    if (!apiKey) {
      console.warn(
        '[RevenueCat] Missing API key. Set EXPO_PUBLIC_REVENUECAT_API_KEY (or platform-specific keys) in .env'
      );
      setLoading(false);
      setReady(false);
      return;
    }

    if (revenueCatKeyLooksLikeSecret(apiKey)) {
      setLastError(
        'Do not use RevenueCat secret keys in the app. Use the public SDK key (iOS: appl_…, Android: goog_…, or test_…).'
      );
      setLoading(false);
      setReady(false);
      return;
    }

    if (revenueCatKeyPlatformMismatch(apiKey)) {
      const msg = credentialsIssueHelpMessage();
      console.warn('[RevenueCat]', msg);
      setLastError(msg);
      setLoading(false);
      setReady(false);
      return;
    }

    if (configuredRef.current) {
      return;
    }
    configuredRef.current = true;

    try {
      if (__DEV__) {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        const prefix = apiKey.slice(0, Math.min(12, apiKey.length));
        console.log(`[RevenueCat] Configuring with public key prefix: ${prefix}…`);
      }
      Purchases.configure({ apiKey });
      setReady(true);
    } catch (e) {
      configuredRef.current = false;
      setLastError(purchasesErrorMessage(e));
      setReady(false);
      setLoading(false);
    }
  }, []);

  const refreshCustomerInfo = useCallback(async (): Promise<CustomerInfo | null> => {
    if (!NATIVE_STORE || !configuredRef.current) {
      return null;
    }
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      return info;
    } catch (e) {
      setLastError(purchasesErrorMessage(e));
      return null;
    }
  }, []);

  /** Firebase user ↔ RevenueCat app user ID */
  useEffect(() => {
    if (!NATIVE_STORE || !ready || authInitializing) {
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        if (user?.uid) {
          const { customerInfo: info } = await Purchases.logIn(user.uid);
          if (!cancelled) {
            setCustomerInfo(info);
          }
        } else {
          const anonymous = await Purchases.isAnonymous();
          if (!anonymous) {
            const info = await Purchases.logOut();
            if (!cancelled) {
              setCustomerInfo(info);
            }
          } else {
            const info = await Purchases.getCustomerInfo();
            if (!cancelled) {
              setCustomerInfo(info);
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          if (isPurchasesError(e) && e.code === PURCHASES_ERROR_CODE.LOG_OUT_ANONYMOUS_USER_ERROR) {
            /* ignore */
          } else {
            setLastError(purchasesErrorMessage(e));
          }
          await refreshCustomerInfo();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, ready, authInitializing, refreshCustomerInfo]);

  /** Live entitlement updates (renewal, refund, etc.) */
  useEffect(() => {
    if (!NATIVE_STORE || !ready) {
      return;
    }
    const listener = (info: CustomerInfo) => {
      setCustomerInfo(info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [ready]);

  /** Refresh when returning from App Store / system dialogs */
  useEffect(() => {
    if (!NATIVE_STORE || !ready) {
      return;
    }
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        void refreshCustomerInfo();
      }
    });
    return () => sub.remove();
  }, [ready, refreshCustomerInfo]);

  const restorePurchases = useCallback(async (): Promise<CustomerInfo | null> => {
    if (!NATIVE_STORE || !configuredRef.current) {
      return null;
    }
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return info;
    } catch (e) {
      setLastError(purchasesErrorMessage(e));
      return null;
    }
  }, []);

  const getCurrentOffering = useCallback(async (): Promise<PurchasesOffering | null> => {
    if (!NATIVE_STORE || !configuredRef.current) {
      return null;
    }
    try {
      return await resolveOffering();
    } catch (e) {
      setLastError(purchasesErrorMessage(e));
      return null;
    }
  }, []);

  const presentPaywall = useCallback(async (): Promise<PAYWALL_RESULT | null> => {
    if (!NATIVE_STORE || !configuredRef.current) {
      return null;
    }
    if (!hasRevenueCatUiNativeModules()) {
      setLastError(revenueCatPaywallUnsupportedMessage());
      return PAYWALL_RESULT.ERROR;
    }
    try {
      // Omit `offering` so the SDK uses the current offering from cache; avoids invalid native context when
      // packages or paywall document are not ready yet.
      const result = await RevenueCatUI.presentPaywall({});
      await refreshCustomerInfo();
      return result;
    } catch (e) {
      setLastError(purchasesErrorMessage(e));
      return PAYWALL_RESULT.ERROR;
    }
  }, [refreshCustomerInfo]);

  const presentPaywallIfNeeded = useCallback(async (): Promise<PAYWALL_RESULT | null> => {
    if (!NATIVE_STORE || !configuredRef.current) {
      return null;
    }
    if (!hasRevenueCatUiNativeModules()) {
      setLastError(revenueCatPaywallUnsupportedMessage());
      return PAYWALL_RESULT.ERROR;
    }
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT_PRO,
      });
      await refreshCustomerInfo();
      return result;
    } catch (e) {
      setLastError(purchasesErrorMessage(e));
      return PAYWALL_RESULT.ERROR;
    }
  }, [refreshCustomerInfo]);

  const presentCustomerCenter = useCallback(async () => {
    if (!NATIVE_STORE || !configuredRef.current) {
      return;
    }
    if (!hasRevenueCatUiNativeModules()) {
      setLastError(revenueCatPaywallUnsupportedMessage());
      return;
    }
    try {
      await RevenueCatUI.presentCustomerCenter({
        callbacks: {
          onManagementOptionSelected: (event) => {
            if (__DEV__) {
              console.log('[CustomerCenter] option', event.option);
            }
          },
          onRestoreCompleted: ({ customerInfo: info }) => {
            setCustomerInfo(info);
          },
        },
      });
      await refreshCustomerInfo();
    } catch (e) {
      setLastError(purchasesErrorMessage(e));
    }
  }, [refreshCustomerInfo]);

  const isPro = entitlementActive(customerInfo, REVENUECAT_ENTITLEMENT_PRO);

  const value = useMemo(
    () => ({
      ready: ready && NATIVE_STORE,
      loading,
      customerInfo,
      isPro,
      lastError,
      clearError,
      refreshCustomerInfo,
      restorePurchases,
      getCurrentOffering,
      presentPaywall,
      presentPaywallIfNeeded,
      presentCustomerCenter,
    }),
    [
      ready,
      loading,
      customerInfo,
      isPro,
      lastError,
      clearError,
      refreshCustomerInfo,
      restorePurchases,
      getCurrentOffering,
      presentPaywall,
      presentPaywallIfNeeded,
      presentCustomerCenter,
    ]
  );

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
}

export function useRevenueCat() {
  const ctx = useContext(RevenueCatContext);
  if (!ctx) {
    throw new Error('useRevenueCat must be used within RevenueCatProvider');
  }
  return ctx;
}
