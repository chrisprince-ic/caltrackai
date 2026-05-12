import * as WebBrowser from 'expo-web-browser';

import { LEGAL, legalUrlFor, type LegalKind } from '@/constants/legal';

/**
 * Open Terms / Privacy in an in-app browser sheet. iOS-standard pattern for
 * legal docs — keeps the user inside the app instead of bouncing to Safari.
 */
export async function openLegalUrl(kind: LegalKind): Promise<void> {
  const url = legalUrlFor(kind);
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: '#1F8A5B',
    });
  } catch {
    /* user dismissed or unsupported */
  }
}

export { LEGAL };
