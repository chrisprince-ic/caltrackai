import { Palette } from '@/constants/palette';

/** Brand green gradient — legacy stops for non-flat variants / dark hero fallback. */
const BRAND = Palette.iris;
export const HERO_GRADIENT_STOPS = ['#4FD17E', BRAND, '#1FB256'] as const;
export const HERO_GRADIENT_STOPS_DARK = ['#1A7340', Palette.lavender, '#0A2E18'] as const;

/**
 * Two-stop fill (e.g. pills) — endpoints of `HERO_GRADIENT_STOPS`, same family as Scan FAB.
 */
export const BRAND_GREEN_GRADIENT_2: readonly [string, string] = [
  HERO_GRADIENT_STOPS[0],
  HERO_GRADIENT_STOPS[2],
];

/** Soft light surfaces (stat tiles, strips) using FAB tint tokens. */
export const BRAND_GREEN_SOFT_GRADIENT_2: readonly [string, string] = [Palette.haze, Palette.mist];

/** Empty / idle states — light mint in the FAB green family. */
export const BRAND_GREEN_SOFT_GRADIENT_3: readonly [string, string, string] = [
  '#ECFDF5',
  Palette.haze,
  Palette.mist,
];

/** Light app shell / auth — green corner matches Scan FAB hues, then neutral. */
export const APP_SCREEN_GRADIENT_LIGHT: readonly [string, string, string] = [
  Palette.haze,
  Palette.ghost,
  '#EFF6FF',
];

/** Flat brand green (home header) — same as Scan FAB `Palette.iris`. */
export const HERO_FLAT_GREEN = Palette.iris;

/** Scroll-collapse hero dimensions — keep in sync across curved-hero screens. */
export const HERO = {
  /** Height band behind greeting + rounded bottom edge (~220–240px). */
  EXPANDED: 232,
  COLLAPSED: 88,
  TRIGGER: 60,
  /** Rounded bottom of the green header (original screenshots). */
  CORNER_RADIUS: 36,
} as const;

export type HeroBackgroundVariant = 'green' | 'sage' | 'dark';

type HeroTheme = {
  gradient: readonly [string, string, string];
  /** When set, hero uses solid fill instead of diagonal gradient (home flat green). */
  headerSolid?: string;
  /** RN StatusBar: `'dark'` → `dark-content` (dark icons). `'light'` → `light-content`. */
  statusBarStyle: 'dark' | 'light';
  titleColor: string;
  subtitleColor: string;
  pageBg: string;
};

export const HERO_BACKGROUNDS: Record<HeroBackgroundVariant, HeroTheme> = {
  green: {
    gradient: [HERO_FLAT_GREEN, HERO_FLAT_GREEN, HERO_FLAT_GREEN],
    headerSolid: HERO_FLAT_GREEN,
    statusBarStyle: 'dark',
    titleColor: '#1A2B26',
    subtitleColor: 'rgba(26, 43, 38, 0.7)',
    pageBg: '#F4FBF7',
  },
  sage: {
    gradient: ['#F1F5EE', '#E8EDD8', '#D8E0C2'],
    statusBarStyle: 'dark',
    titleColor: '#0F1F08',
    subtitleColor: 'rgba(15, 31, 8, 0.55)',
    pageBg: '#F1F5EE',
  },
  dark: {
    gradient: ['#1A2E10', '#0F1F08', '#070D04'],
    statusBarStyle: 'light',
    titleColor: '#FFFFFF',
    subtitleColor: 'rgba(255, 255, 255, 0.65)',
    pageBg: '#0F1F08',
  },
};

/** Green hero on dark app theme — flat darker green (no diagonal gradient). */
export const HERO_GREEN_SOLID_DARK = '#0F3D26';

/** Green hero on dark app theme — legacy gradient stops if needed elsewhere. */
export const HERO_GREEN_GRADIENT_DARK_MODE = HERO_GRADIENT_STOPS_DARK;
