import { Palette } from '@/constants/palette';

/** Brand emerald gradient — Macrovia three-stop emerald. */
const BRAND = Palette.iris;
export const HERO_GRADIENT_STOPS = ['#38B273', BRAND, '#0D5C3A'] as const;
export const HERO_GRADIENT_STOPS_DARK = ['#1A5C38', '#0F3D26', '#081F13'] as const;

/**
 * Two-stop fill (e.g. pills) — endpoints of `HERO_GRADIENT_STOPS`.
 */
export const BRAND_GREEN_GRADIENT_2: readonly [string, string] = [
  HERO_GRADIENT_STOPS[0],
  HERO_GRADIENT_STOPS[2],
];

/** Soft light surfaces (stat tiles, strips). */
export const BRAND_GREEN_SOFT_GRADIENT_2: readonly [string, string] = [Palette.haze, Palette.mist];

/** Empty / idle states — light emerald. */
export const BRAND_GREEN_SOFT_GRADIENT_3: readonly [string, string, string] = [
  '#F2FBF6',
  Palette.haze,
  Palette.mist,
];

/** Light app shell / auth — emerald corner then warm off-white. */
export const APP_SCREEN_GRADIENT_LIGHT: readonly [string, string, string] = [
  Palette.haze,
  Palette.ghost,
  '#F5F4F0',
];

/** Flat brand emerald (home header). */
export const HERO_FLAT_GREEN = Palette.iris;

/** Scroll-collapse hero dimensions. */
export const HERO = {
  EXPANDED: 232,
  COLLAPSED: 88,
  TRIGGER: 60,
  CORNER_RADIUS: 36,
} as const;

export type HeroBackgroundVariant = 'green' | 'sage' | 'dark';

type HeroTheme = {
  gradient: readonly [string, string, string];
  headerSolid?: string;
  statusBarStyle: 'dark' | 'light';
  titleColor: string;
  subtitleColor: string;
  pageBg: string;
};

export const HERO_BACKGROUNDS: Record<HeroBackgroundVariant, HeroTheme> = {
  green: {
    gradient: [HERO_FLAT_GREEN, HERO_FLAT_GREEN, HERO_FLAT_GREEN],
    headerSolid: HERO_FLAT_GREEN,
    statusBarStyle: 'light',
    titleColor: '#FFFFFF',
    subtitleColor: 'rgba(255,255,255,0.75)',
    pageBg: Palette.ghost,
  },
  sage: {
    gradient: ['#EBF7F0', '#E0EEE6', '#D4EDE3'],
    statusBarStyle: 'dark',
    titleColor: Palette.obsidian,
    subtitleColor: 'rgba(26,40,32,0.55)',
    pageBg: '#EBF7F0',
  },
  dark: {
    gradient: ['#1A3320', '#0F2018', '#070D0A'],
    statusBarStyle: 'light',
    titleColor: '#FFFFFF',
    subtitleColor: 'rgba(255,255,255,0.65)',
    pageBg: Palette.darkBg,
  },
};

/** Emerald hero on dark app theme — flat darker forest green. */
export const HERO_GREEN_SOLID_DARK = '#0A2E18';

/** Emerald hero on dark app theme — gradient stops. */
export const HERO_GREEN_GRADIENT_DARK_MODE = HERO_GRADIENT_STOPS_DARK;
