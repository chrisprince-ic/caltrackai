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
  bg: '#F4FBF7',
  surface: Palette.white,
  surfaceMuted: Palette.haze,
  text: Palette.obsidian,
  textMuted: Palette.dusk,
  textSecondary: Palette.dusk,
  border: 'rgba(34, 197, 94, 0.12)',
  borderStrong: 'rgba(34, 197, 94, 0.18)',
  haze: Palette.haze,
  chipOnLight: Palette.haze,
  streakBg: Palette.watchBg,
  streakText: Palette.watchText,
  streakHint: Palette.dusk,
  calDivider: 'rgba(34, 197, 94, 0.14)',
  shadow: Palette.obsidian,
  iconWell: Palette.haze,
  iconWellBorder: 'rgba(34, 197, 94, 0.18)',
};

const DARK: AppThemeColors = {
  bg: Palette.darkBg,
  surface: Palette.darkSurface,
  surfaceMuted: Palette.darkSurfaceMuted,
  text: '#E8F5EE',
  textMuted: '#7EA88E',
  textSecondary: Palette.mist,
  border: Palette.darkBorder,
  borderStrong: Palette.darkBorderStrong,
  haze: 'rgba(34, 197, 94, 0.18)',
  chipOnLight: 'rgba(34, 197, 94, 0.22)',
  streakBg: 'rgba(249, 115, 22, 0.14)',
  streakText: '#FED7AA',
  streakHint: '#7EA88E',
  calDivider: 'rgba(167, 243, 208, 0.14)',
  shadow: '#000000',
  iconWell: 'rgba(34, 197, 94, 0.24)',
  iconWellBorder: 'rgba(167, 243, 208, 0.18)',
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
