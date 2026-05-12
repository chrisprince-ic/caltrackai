import { MacroviaDark, MacroviaLight } from '@/constants/macrovia';

/** Semantic UI colors — Macrovia (light aurora shell / dark obsidian-emerald). */
export type AppThemeColors = {
  bg: string;
  bgSoft: string;
  surface: string;
  surfaceMuted: string;
  surface2: string;
  text: string;
  textMuted: string;
  textSecondary: string;
  border: string;
  borderStrong: string;
  hairline: string;
  haze: string;
  chipOnLight: string;
  streakBg: string;
  streakText: string;
  streakHint: string;
  calDivider: string;
  shadow: string;
  iconWell: string;
  iconWellBorder: string;
  accent: string;
  accentDeep: string;
  accentSoft: string;
  warm: string;
  warmSoft: string;
  rose: string;
  violet: string;
  glass: string;
  glassStroke: string;
  aurora1: string;
  aurora2: string;
  aurora3: string;
  visionMint: string;
  proteinMacro: string;
  carbsMacro: string;
  fatMacro: string;
};

const LIGHT: AppThemeColors = {
  bg: MacroviaLight.bg,
  bgSoft: MacroviaLight.bgSoft,
  surface: MacroviaLight.surface,
  surfaceMuted: MacroviaLight.surface2,
  surface2: MacroviaLight.surface2,
  text: MacroviaLight.ink,
  textMuted: MacroviaLight.ink3,
  textSecondary: MacroviaLight.ink2,
  border: MacroviaLight.glassStroke,
  borderStrong: 'rgba(20,22,18,0.1)',
  hairline: MacroviaLight.hairline,
  haze: MacroviaLight.accentSoft,
  chipOnLight: MacroviaLight.accentSoft,
  streakBg: MacroviaLight.warmSoft,
  streakText: MacroviaLight.warm,
  streakHint: MacroviaLight.ink3,
  calDivider: MacroviaLight.hairline,
  shadow: MacroviaLight.shadowCard,
  iconWell: MacroviaLight.surface2,
  iconWellBorder: MacroviaLight.glassStroke,
  accent: MacroviaLight.accent,
  accentDeep: MacroviaLight.accentDeep,
  accentSoft: MacroviaLight.accentSoft,
  warm: MacroviaLight.warm,
  warmSoft: MacroviaLight.warmSoft,
  rose: MacroviaLight.rose,
  violet: MacroviaLight.violet,
  glass: MacroviaLight.glass,
  glassStroke: MacroviaLight.glassStroke,
  aurora1: MacroviaLight.aurora1,
  aurora2: MacroviaLight.aurora2,
  aurora3: MacroviaLight.aurora3,
  visionMint: MacroviaLight.visionMint,
  proteinMacro: MacroviaLight.accentDeep,
  carbsMacro: MacroviaLight.warm,
  fatMacro: MacroviaLight.violet,
};

const DARK: AppThemeColors = {
  bg: MacroviaDark.bg,
  bgSoft: MacroviaDark.bgSoft,
  surface: MacroviaDark.surface,
  surfaceMuted: MacroviaDark.surface2,
  surface2: MacroviaDark.surface2,
  text: MacroviaDark.ink,
  textMuted: MacroviaDark.ink3,
  textSecondary: MacroviaDark.ink2,
  border: MacroviaDark.glassStroke,
  borderStrong: 'rgba(255,255,255,0.14)',
  hairline: MacroviaDark.hairline,
  haze: MacroviaDark.accentSoft,
  chipOnLight: MacroviaDark.accentSoft,
  streakBg: MacroviaDark.warmSoft,
  streakText: MacroviaDark.warm,
  streakHint: MacroviaDark.ink3,
  calDivider: MacroviaDark.hairline,
  shadow: MacroviaDark.shadowPop,
  iconWell: MacroviaDark.surface2,
  iconWellBorder: MacroviaDark.glassStroke,
  accent: MacroviaDark.accent,
  accentDeep: MacroviaDark.accentDeep,
  accentSoft: MacroviaDark.accentSoft,
  warm: MacroviaDark.warm,
  warmSoft: MacroviaDark.warmSoft,
  rose: MacroviaDark.rose,
  violet: MacroviaDark.violet,
  glass: MacroviaDark.glass,
  glassStroke: MacroviaDark.glassStroke,
  aurora1: MacroviaDark.aurora1,
  aurora2: MacroviaDark.aurora2,
  aurora3: MacroviaDark.aurora3,
  visionMint: MacroviaDark.visionMint,
  proteinMacro: MacroviaDark.accent,
  carbsMacro: MacroviaDark.warm,
  fatMacro: MacroviaDark.violet,
};

export function getAppThemeColors(isDark: boolean): AppThemeColors {
  return isDark ? DARK : LIGHT;
}

/** Legacy named accents — mapped to Macrovia hues for older imports. */
export const ACCENT = {
  iris: LIGHT.accent,
  lavender: LIGHT.accentDeep,
  mist: MacroviaLight.accentSoft,
  flamingo: MacroviaLight.accentDeep,
  citrus: MacroviaLight.warm,
  cyan: MacroviaLight.violet,
} as const;
