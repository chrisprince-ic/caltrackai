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
  type Purchase,
  type PurchaseError,
  ErrorCode,
} from 'react-native-iap';

import { MACROVIA_PRODUCT_ID } from '@/constants/iap';

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
      const subs = await getActiveSubscriptions();
      const active = subs.some((s) => s.productId === MACROVIA_PRODUCT_ID && s.isActive);
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

        // Handle completed transactions (including ones queued from previous sessions)
        purchaseSub = purchaseUpdatedListener(async (purchase: Purchase) => {
          if (purchase.productId !== MACROVIA_PRODUCT_ID) return;

          try {
            await finishTransaction({ purchase, isConsumable: false });
            await applyProStatus(true);
          } catch {}

          // Resolve the in-flight purchaseMonthly() promise, if any
          const resolve = pendingPurchaseRef.current;
          pendingPurchaseRef.current = null;
          resolve?.('success');
        });

        // Handle purchase errors and user cancellations
        errorSub = purchaseErrorListener((error: PurchaseError) => {
          const outcome: IAPOutcome =
            error.code === ErrorCode.UserCancelled ? 'cancelled' : 'error';
          if (outcome === 'error') {
            setLastError(error.message ?? 'Purchase error');
          }
          const resolve = pendingPurchaseRef.current;
          pendingPurchaseRef.current = null;
          resolve?.(outcome);
        });

        // Fetch live price from the store
        try {
          const products = await fetchProducts({ skus: [MACROVIA_PRODUCT_ID], type: 'subs' });
          const product = products?.[0];
          if (product) {
            const price = (product as { localizedPrice?: string | null }).localizedPrice;
            if (price) setPriceLabel(price);
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
          ? 'Open this screen in the iOS or Android app to subscribe.'
          : 'Store not ready. Build with EAS (eas build -p ios) to enable purchases.',
      );
      return 'error';
    }
    clearError();

    // The promise resolves only when purchaseUpdatedListener (success) or
    // purchaseErrorListener / requestPurchase error (cancel/error) fires,
    // so isPro is guaranteed true before the caller's .then() runs on success.
    return new Promise<IAPOutcome>((resolve) => {
      pendingPurchaseRef.current = resolve;

      requestPurchase({
        request: {
          apple: {
            sku: MACROVIA_PRODUCT_ID,
            andDangerouslyFinishTransactionAutomatically: false,
          },
        },
        type: 'subs',
      }).catch((e: unknown) => {
        // Guard: purchaseErrorListener may also fire for the same event —
        // only resolve once by checking the ref is still set.
        if (!pendingPurchaseRef.current) return;
        pendingPurchaseRef.current = null;

        const err = e as { code?: string; message?: string };
        if (err?.code === ErrorCode.UserCancelled) {
          resolve('cancelled');
        } else {
          setLastError(err?.message ?? 'Purchase failed');
          resolve('error');
        }
      });
    });
  }, [ready, clearError]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!NATIVE_STORE || !ready) return false;
    clearError();
    try {
      await syncSubscriptionStatus();
      return isPro;
    } catch (e: unknown) {
      setLastError((e as Error)?.message ?? 'Restore failed');
      return false;
    }
  }, [ready, clearError, syncSubscriptionStatus, isPro]);

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
