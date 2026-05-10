/**
 * Shared layout numbers used across multiple screens.
 * Keep this small; only add a constant when 2+ screens need it.
 */

/**
 * Bottom padding required on every scrollable list under (tabs) so the
 * floating Scan FAB never clips the last row.
 */
export const SCAN_FAB_BOTTOM_PAD = 88;

/** Standard icon sizes (Ionicons outline) per polish spec. */
export const IconSize = {
  /** Inline icons inside cards / list rows */
  inline: 24,
  /** Bottom tab icons */
  tab: 20,
  /** Hero icons in feature cards / large states */
  hero: 28,
} as const;
