/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Palette } from '@/constants/palette';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

/**
 * Poppins (SIL Open Font License) — loaded in `app/_layout.tsx` via `@expo-google-fonts/poppins`.
 * Use these `fontFamily` values; avoid mixing `fontWeight` with a different face on native.
 */
export const Fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

/**
 * Primary brand green — must match the floating Scan FAB (`Palette.iris` in `CustomTabBar`).
 * Single source for hero, links, and tints on Home.
 */
export const BRAND_GREEN = Palette.iris;

/** @deprecated Import from `@/constants/hero` — re-exported for existing imports. */
export { HERO, HERO_GRADIENT_STOPS, HERO_GRADIENT_STOPS_DARK } from '@/constants/hero';

export const COLORS = {
  brandGreen: BRAND_GREEN,
  brandGreenDark: Palette.lavender,
  brandGreenTint: 'rgba(34, 197, 94, 0.18)',
  sage: '#F1F5EE',
  ink: '#0F1F08',
  inkMuted: '#7A8268',
  white: '#FFFFFF',
} as const;
