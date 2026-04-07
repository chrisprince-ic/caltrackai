import type { PurchasesError } from 'react-native-purchases';
import { PURCHASES_ERROR_CODE } from 'react-native-purchases';

import { credentialsIssueHelpMessage } from '@/lib/revenuecat-keys';
import { revenueCatPaywallUnsupportedMessage } from '@/lib/revenuecat-ui-support';

function messageLooksLikeDocumentUnavailable(msg: string): boolean {
  return /document\s+is\s+not\s+available/i.test(msg);
}

export function isPurchasesError(e: unknown): e is PurchasesError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof (e as PurchasesError).message === 'string'
  );
}

/** Maps SDK errors to short user-facing copy; log full `e` in dev. */
export function purchasesErrorMessage(e: unknown): string {
  if (e instanceof Error && messageLooksLikeDocumentUnavailable(e.message)) {
    return revenueCatPaywallUnsupportedMessage();
  }
  if (isPurchasesError(e)) {
    if (e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return 'Purchase was cancelled.';
    }
    if (e.code === PURCHASES_ERROR_CODE.NETWORK_ERROR || e.code === PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR) {
      return 'Network issue. Check your connection and try again.';
    }
    if (e.code === PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR) {
      return 'The store could not complete the request. Try again later.';
    }
    if (e.code === PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR) {
      return 'That product is not available right now.';
    }
    if (e.code === PURCHASES_ERROR_CODE.INVALID_CREDENTIALS_ERROR) {
      return credentialsIssueHelpMessage();
    }
    if (e.code === PURCHASES_ERROR_CODE.CONFIGURATION_ERROR) {
      return `${credentialsIssueHelpMessage()} If the key is correct, check that products and offerings exist in RevenueCat and match App Store Connect / Play Console.`;
    }
    if (e.code === PURCHASES_ERROR_CODE.INVALID_APPLE_SUBSCRIPTION_KEY_ERROR) {
      return 'Apple In-App Purchase is not fully configured. In App Store Connect, set up the In-App Purchase key and link the app; in RevenueCat, connect the Apple app and verify the bundle ID matches.';
    }
    if (e.message && messageLooksLikeDocumentUnavailable(e.message)) {
      return revenueCatPaywallUnsupportedMessage();
    }
    return e.message || 'Something went wrong with purchases.';
  }
  if (e instanceof Error) {
    if (messageLooksLikeDocumentUnavailable(e.message)) {
      return revenueCatPaywallUnsupportedMessage();
    }
    return e.message;
  }
  return 'Something went wrong.';
}

export { PURCHASES_ERROR_CODE };
