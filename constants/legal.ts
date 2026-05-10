/**
 * Single source of truth for legal links + support contact.
 * Update these strings in one place; every screen imports from here.
 */
export const LEGAL = {
  brandDomain: 'macrovia.health',
  termsUrl: 'https://www.macrovia.health/terms',
  privacyUrl: 'https://www.macrovia.health/privacy',
  supportEmail: 'support@macrovia.health',
} as const;

export type LegalKind = 'terms' | 'privacy';

export function legalUrlFor(kind: LegalKind): string {
  return kind === 'terms' ? LEGAL.termsUrl : LEGAL.privacyUrl;
}
