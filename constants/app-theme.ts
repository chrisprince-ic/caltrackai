import { Palette } from '@/constants/palette';

/** Semantic UI colors — light (Ghost) vs dark (Void/Obsidian). */
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
  border: 'rgba(31, 138, 91, 0.12)',
  borderStrong: 'rgba(31, 138, 91, 0.18)',
  haze: Palette.haze,
  chipOnLight: Palette.haze,
  streakBg: Palette.watchBg,
  streakText: Palette.watchText,
  streakHint: Palette.dusk,
  calDivider: 'rgba(31, 138, 91, 0.14)',
  shadow: Palette.obsidian,
  iconWell: Palette.haze,
  iconWellBorder: 'rgba(31, 138, 91, 0.18)',
};

const DARK: AppThemeColors = {
  bg: Palette.obsidian,
  surface: Palette.void,
  surfaceMuted: '#253040',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  textSecondary: Palette.mist,
  border: 'rgba(167, 243, 208, 0.14)',
  borderStrong: 'rgba(167, 243, 208, 0.22)',
  haze: 'rgba(31, 138, 91, 0.22)',
  chipOnLight: 'rgba(31, 138, 91, 0.28)',
  streakBg: 'rgba(249, 115, 22, 0.15)',
  streakText: '#FED7AA',
  streakHint: '#9CA3AF',
  calDivider: 'rgba(167, 243, 208, 0.18)',
  shadow: '#000000',
  iconWell: 'rgba(31, 138, 91, 0.28)',
  iconWellBorder: 'rgba(167, 243, 208, 0.2)',
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
