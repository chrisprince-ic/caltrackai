import AsyncStorage from '@react-native-async-storage/async-storage';
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
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getActiveSubscriptions,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases as restorePurchasesFromStore,
  type Purchase,
  type PurchaseError,
  ErrorCode,
} from 'react-native-iap';

import Constants from 'expo-constants';

import {
  IAP_SUBSCRIPTION_SKU_ANDROID,
  IAP_SUBSCRIPTION_SKU_IOS,
  IAP_SUBSCRIPTION_SKUS_ACTIVE,
} from '@/constants/iap';

const OUR_SUB_SKU_SET = new Set(IAP_SUBSCRIPTION_SKUS_ACTIVE);

function subscriptionIsOurPro(s: { productId: string; currentPlanId?: string | null; isActive: boolean }) {
  if (!s.isActive) return false;
  if (OUR_SUB_SKU_SET.has(s.productId)) return true;
  if (s.currentPlanId && OUR_SUB_SKU_SET.has(s.currentPlanId)) return true;
  return false;
}

/** Play Billing 5+ needs a base-plan offer token; token lives on the product from `fetchProducts`. */
function extractAndroidSubscriptionOfferToken(product: unknown): string | null {
  if (!product || typeof product !== 'object') return null;
  const p = product as {
    platform?: string;
    productStatusAndroid?: string | null;
    subscriptionOffers?: { offerTokenAndroid?: string | null }[] | null;
    subscriptionOfferDetailsAndroid?: { offerToken?: string }[] | null;
  };
  if (p.platform !== 'android') return null;
  if (p.productStatusAndroid === 'not-found') return null;
  const fromStandard = p.subscriptionOffers?.find((o) => o.offerTokenAndroid)?.offerTokenAndroid;
  if (fromStandard) return fromStandard;
  const legacy = p.subscriptionOfferDetailsAndroid?.[0]?.offerToken;
  return legacy ?? null;
}

const IS_PRO_KEY = '@macrovia/isPro';
const NATIVE_STORE = Platform.OS === 'ios' || Platform.OS === 'android';

export type IAPOutcome = 'success' | 'cancelled' | 'error';

type IAPCtx = {
  ready: boolean;
  loading: boolean;
  isPro: boolean;
  lastError: string | null;
  clearError: () => void;
  priceLabel: string | null;
  purchaseMonthly: () => Promise<IAPOutcome>;
  restorePurchases: () => Promise<boolean>;
};

const IAPContext = createContext<IAPCtx | null>(null);

export function IAPProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(NATIVE_STORE);
  const [isPro, setIsPro] = useState(false);
  const [priceLabel, setPriceLabel] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const clearError = useCallback(() => setLastError(null), []);

  // Resolve function for the currently in-flight purchase (one at a time)
  const pendingPurchaseRef = useRef<((outcome: IAPOutcome) => void) | null>(null);
  // Guard against double-init from React 18 Strict Mode
  const initializedRef = useRef(false);
  /** Filled after `fetchProducts` on Android — required for `requestPurchase` (Play Billing 5+). */
  const androidOfferTokenRef = useRef<string | null>(null);

  const applyProStatus = useCallback(async (val: boolean) => {
    setIsPro(val);
    try {
      await AsyncStorage.setItem(IS_PRO_KEY, val ? 'true' : 'false');
    } catch {}
  }, []);

  // Show cached status immediately so UI isn't blank while the store loads
  useEffect(() => {
    AsyncStorage.getItem(IS_PRO_KEY)
      .then((val) => { if (val === 'true') setIsPro(true); })
      .catch(() => {});
  }, []);

  // Check active subscriptions from the store
  const syncSubscriptionStatus = useCallback(async () => {
    try {
      const subs = await getActiveSubscriptions([...IAP_SUBSCRIPTION_SKUS_ACTIVE]);
      const active = subs.some(subscriptionIsOurPro);
      await applyProStatus(active);
    } catch {}
  }, [applyProStatus]);

  // Initialize IAP connection, listeners, price, and verify existing subscription
  useEffect(() => {
    if (!NATIVE_STORE) {
      setLoading(false);
      return;
    }

    // Prevent double-init in React 18 Strict Mode
    if (initializedRef.current) return;
    initializedRef.current = true;

    let purchaseSub: ReturnType<typeof purchaseUpdatedListener> | null = null;
    let errorSub: ReturnType<typeof purchaseErrorListener> | null = null;

    const init = async () => {
      try {
        await initConnection();

        const storeSku =
          Platform.OS === 'android' ? IAP_SUBSCRIPTION_SKU_ANDROID : IAP_SUBSCRIPTION_SKU_IOS;

        if (__DEV__) {
          console.log('[IAP] initConnection succeeded. storeSku:', storeSku);
        }

        // Handle completed transactions (including ones queued from previous sessions)
        purchaseSub = purchaseUpdatedListener(async (purchase: Purchase) => {
          if (!OUR_SUB_SKU_SET.has(purchase.productId)) return;

          try {
            await finishTransaction({ purchase, isConsumable: false });
            await applyProStatus(true);
          } catch {}

          // Call the pending settle function (clears timeout + resolves promise)
          pendingPurchaseRef.current?.('success');
          pendingPurchaseRef.current = null;
        });

        // Handle purchase errors and user cancellations
        errorSub = purchaseErrorListener((error: PurchaseError) => {
          const outcome: IAPOutcome =
            error.code === ErrorCode.UserCancelled ? 'cancelled' : 'error';
          if (outcome === 'error') {
            setLastError(error.message ?? 'Purchase error');
          }
          pendingPurchaseRef.current?.(outcome);
          pendingPurchaseRef.current = null;
        });

        // Fetch live price from the store + Android offer token for billing
        try {
          const products = await fetchProducts({ skus: [storeSku], type: 'subs' });
          const product = products?.[0];
          if (product) {
            const p = product as { localizedPrice?: string | null; displayPrice?: string | null };
            const price = p.localizedPrice ?? p.displayPrice;
            if (price) setPriceLabel(price);
            if (Platform.OS === 'android') {
              androidOfferTokenRef.current = extractAndroidSubscriptionOfferToken(product);
            }
          } else if (Platform.OS === 'android') {
            androidOfferTokenRef.current = null;
          }
        } catch {}

        // Verify subscription status on startup
        await syncSubscriptionStatus();

        setReady(true);
      } catch (e: unknown) {
        // Native module unavailable (Expo Go, simulator without StoreKit config) — degrade silently
        if (__DEV__) {
          console.warn('[IAP] init failed:', (e as Error)?.message);
        }
        initializedRef.current = false; // Allow retry after rebuild
      } finally {
        setLoading(false);
      }
    };

    void init();

    return () => {
      purchaseSub?.remove();
      errorSub?.remove();
      initializedRef.current = false;
      endConnection().catch(() => {});
    };
  }, [applyProStatus, syncSubscriptionStatus]);

  // Re-verify subscription whenever app returns to foreground
  useEffect(() => {
    if (!NATIVE_STORE || !ready) return;
    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      if (next === 'active') {
        await syncSubscriptionStatus();
      }
    });
    return () => sub.remove();
  }, [ready, syncSubscriptionStatus]);

  const purchaseMonthly = useCallback(async (): Promise<IAPOutcome> => {
    if (!NATIVE_STORE || !ready) {
      setLastError(
        Platform.OS === 'web'
          ? 'Open this screen in the iOS app to subscribe.'
          : 'Store not ready. Build with EAS (eas build -p ios) to enable purchases.',
      );
      return 'error';
    }
    clearError();

    return new Promise<IAPOutcome>((resolve) => {
      const storeSku =
        Platform.OS === 'android' ? IAP_SUBSCRIPTION_SKU_ANDROID : IAP_SUBSCRIPTION_SKU_IOS;
      const androidPackage =
        Constants.expoConfig?.android?.package ?? 'your Android applicationId';

      void (async () => {
        // Safety net: if neither purchaseUpdatedListener nor purchaseErrorListener
        // fires (StoreKit silent failure, network drop, sku-not-found at native layer),
        // unblock the UI after 30 seconds instead of hanging forever.
        const timeoutId = setTimeout(() => {
          if (!pendingPurchaseRef.current) return;
          pendingPurchaseRef.current = null;
          setLastError('Purchase timed out. Check your App Store Connect setup and try again.');
          resolve('error');
        }, 30_000);

        const settle = (outcome: IAPOutcome, errMsg?: string) => {
          clearTimeout(timeoutId);
          if (!pendingPurchaseRef.current) return;
          pendingPurchaseRef.current = null;
          if (errMsg) setLastError(errMsg);
          resolve(outcome);
        };

        pendingPurchaseRef.current = (outcome: IAPOutcome) => settle(outcome);

        let offerToken: string | null = null;
        if (Platform.OS === 'android') {
          offerToken = androidOfferTokenRef.current;
          if (!offerToken) {
            try {
              const products = await fetchProducts({ skus: [storeSku], type: 'subs' });
              const first = products?.[0];
              offerToken = extractAndroidSubscriptionOfferToken(first);
              androidOfferTokenRef.current = offerToken;
            } catch (e: unknown) {
              settle('error', (e as Error)?.message ?? 'Could not load subscription from Google Play');
              return;
            }
          }
          if (!offerToken) {
            settle(
              'error',
              `Google Play returned no subscription offer for "${storeSku}". ` +
                `In Play Console, open this subscription and ensure a base plan is Active, linked to app id ${androidPackage}. ` +
                'Optional: set EXPO_PUBLIC_IAP_PRODUCT_ID_ANDROID if the Play product id differs from iOS.',
            );
            return;
          }
        }

        try {
          await requestPurchase({
            request:
              Platform.OS === 'ios'
                ? {
                    apple: {
                      sku: IAP_SUBSCRIPTION_SKU_IOS,
                      andDangerouslyFinishTransactionAutomatically: false,
                    },
                  }
                : {
                    google: {
                      skus: [storeSku],
                      // offerToken is guaranteed non-null here — null is caught and returned above
                      subscriptionOffers: [{ sku: storeSku, offerToken: offerToken! }],
                    },
                  },
            type: 'subs',
          });
        } catch (e: unknown) {
          const err = e as { code?: string; message?: string };
          if (err?.code === ErrorCode.UserCancelled) {
            settle('cancelled');
          } else {
            settle('error', err?.message ?? 'Purchase failed');
          }
        }
      })();
    });
  }, [ready, clearError]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!NATIVE_STORE || !ready) return false;
    clearError();
    try {
      // iOS: syncIOS + refresh receipts; Android: syncs Play purchases — required before getActiveSubscriptions sees entitlements.
      await restorePurchasesFromStore();
      const subs = await getActiveSubscriptions([...IAP_SUBSCRIPTION_SKUS_ACTIVE]);
      const active = subs.some(subscriptionIsOurPro);
      await applyProStatus(active);
      return active;
    } catch (e: unknown) {
      setLastError((e as Error)?.message ?? 'Restore failed');
      return false;
    }
  }, [ready, clearError, applyProStatus]);

  const value = useMemo(
    () => ({
      ready,
      loading,
      isPro,
      lastError,
      clearError,
      priceLabel,
      purchaseMonthly,
      restorePurchases,
    }),
    [ready, loading, isPro, lastError, clearError, priceLabel, purchaseMonthly, restorePurchases],
  );

  return <IAPContext.Provider value={value}>{children}</IAPContext.Provider>;
}

export function useIAP() {
  const ctx = useContext(IAPContext);
  if (!ctx) throw new Error('useIAP must be used within IAPProvider');
  return ctx;
}
