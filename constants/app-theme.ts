import { Palette } from '@/constants/palette';

/** Semantic UI colors derived from design.md — light (Ghost) vs dark (Obsidian/Void). */
export type AppThemeColors = {
  bg: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  textSecondary: string;
  border: string;
  borderStrong: string;
  haze: string;
  chipOnLight: string;
  streakBg: string;
  streakText: string;
  streakHint: string;
  calDivider: string;
  shadow: string;
  /** Pro / icon button wells */
  iconWell: string;
  iconWellBorder: string;
};

const LIGHT: AppThemeColors = {
  bg: Palette.ghost,
  surface: Palette.white,
  surfaceMuted: Palette.haze,
  text: Palette.obsidian,
  textMuted: Palette.dusk,
  textSecondary: Palette.dusk,
  border: 'rgba(75, 35, 200, 0.1)',
  borderStrong: 'rgba(75, 35, 200, 0.12)',
  haze: Palette.haze,
  chipOnLight: Palette.haze,
  streakBg: Palette.watchBg,
  streakText: Palette.watchText,
  streakHint: Palette.dusk,
  calDivider: 'rgba(75, 35, 200, 0.12)',
  shadow: Palette.obsidian,
  iconWell: Palette.haze,
  iconWellBorder: 'rgba(75, 35, 200, 0.12)',
};

const DARK: AppThemeColors = {
  bg: Palette.obsidian,
  surface: Palette.void,
  surfaceMuted: '#252140',
  text: Palette.ghost,
  textMuted: '#A89CC4',
  textSecondary: '#C4B2FA',
  border: 'rgba(196, 178, 250, 0.14)',
  borderStrong: 'rgba(196, 178, 250, 0.22)',
  haze: 'rgba(75, 35, 200, 0.28)',
  chipOnLight: 'rgba(75, 35, 200, 0.35)',
  streakBg: 'rgba(245, 166, 35, 0.18)',
  streakText: '#FFD699',
  streakHint: '#A89CC4',
  calDivider: 'rgba(196, 178, 250, 0.2)',
  shadow: '#000000',
  iconWell: 'rgba(75, 35, 200, 0.35)',
  iconWellBorder: 'rgba(196, 178, 250, 0.2)',
};

export function getAppThemeColors(isDark: boolean): AppThemeColors {
  return isDark ? DARK : LIGHT;
}

export const ACCENT = {
  iris: Palette.iris,
  lavender: Palette.lavender,
  mist: Palette.mist,
  flamingo: Palette.flamingo,
  citrus: Palette.citrus,
  cyan: Palette.cyan,
} as const;
