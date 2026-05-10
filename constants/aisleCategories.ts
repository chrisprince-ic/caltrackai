import type { Ionicons } from '@expo/vector-icons';

/**
 * Grocery aisle visual system (Plans-style differentiation).
 * Used by Groceries section headers, quantity pills, and filter chips.
 */

export type GroceryAisleId =
  | 'produce'
  | 'meat'
  | 'dairy'
  | 'bakery'
  | 'pantry'
  | 'frozen'
  | 'beverages'
  | 'other';

export const AISLE_ORDER: GroceryAisleId[] = [
  'produce',
  'meat',
  'dairy',
  'bakery',
  'pantry',
  'frozen',
  'beverages',
  'other',
];

type AisleVisual = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  hex: string;
  stroke: string;
};

export const AISLE_VISUAL: Record<GroceryAisleId, AisleVisual> = {
  produce: { label: 'Produce', icon: 'leaf-outline', hex: '#22C55E', stroke: '#15803D' },
  meat: { label: 'Meat & seafood', icon: 'fish-outline', hex: '#E24B4A', stroke: '#791F1F' },
  dairy: { label: 'Dairy & eggs', icon: 'egg-outline', hex: '#7F77DD', stroke: '#3C3489' },
  bakery: { label: 'Bakery', icon: 'restaurant-outline', hex: '#D85A30', stroke: '#993C1D' },
  pantry: { label: 'Pantry', icon: 'file-tray-stacked-outline', hex: '#EF9F27', stroke: '#854F0B' },
  frozen: { label: 'Frozen', icon: 'snow-outline', hex: '#378ADD', stroke: '#0C447C' },
  beverages: { label: 'Beverages', icon: 'cafe-outline', hex: '#378ADD', stroke: '#0C447C' },
  other: { label: 'Other', icon: 'basket-outline', hex: '#7A8268', stroke: '#4B5545' },
};

const TINT = 0.14;

export function aisleTint(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${TINT})`;
}

export function aisleOrderIndex(aisle: GroceryAisleId): number {
  return AISLE_ORDER.indexOf(aisle);
}
