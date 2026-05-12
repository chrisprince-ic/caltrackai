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
  bg: Palette.ghost,                              // #FAFAF8 warm off-white
  surface: Palette.white,
  surfaceMuted: Palette.haze,                     // #EBF7F0 light emerald
  text: Palette.obsidian,                         // #1A2820 green-tinted dark
  textMuted: Palette.dusk,                        // #838E88
  textSecondary: Palette.dusk,
  border: 'rgba(31,138,91,0.10)',                 // emerald hairline
  borderStrong: 'rgba(31,138,91,0.18)',
  haze: Palette.haze,
  chipOnLight: Palette.haze,
  streakBg: Palette.watchBg,                      // #FBF3D8 amber soft
  streakText: Palette.watchText,                  // #7A5A0A dark amber
  streakHint: Palette.dusk,
  calDivider: 'rgba(31,138,91,0.12)',
  shadow: Palette.obsidian,
  iconWell: Palette.haze,
  iconWellBorder: 'rgba(31,138,91,0.18)',
};

const DARK: AppThemeColors = {
  bg: Palette.darkBg,                             // #131E16 deep forest
  surface: Palette.darkSurface,                   // #1A2B1E
  surfaceMuted: Palette.darkSurfaceMuted,         // #1E3023
  text: '#F2F8F3',                                // near-white green tint
  textMuted: '#8FA293',                           // muted green-grey
  textSecondary: Palette.mist,                    // #D4EDE3
  border: Palette.darkBorder,
  borderStrong: Palette.darkBorderStrong,
  haze: 'rgba(31,138,91,0.18)',
  chipOnLight: 'rgba(31,138,91,0.22)',
  streakBg: 'rgba(200,151,10,0.16)',              // amber soft dark
  streakText: '#E5B840',                          // amber light
  streakHint: '#8FA293',
  calDivider: 'rgba(212,237,227,0.12)',
  shadow: '#000000',
  iconWell: 'rgba(31,138,91,0.24)',
  iconWellBorder: 'rgba(212,237,227,0.18)',
};

export function getAppThemeColors(isDark: boolean): AppThemeColors {
  return isDark ? DARK : LIGHT;
}

export const ACCENT = {
  iris: Palette.iris,
  lavender: Palette.lavender,
  mist: Palette.mist,
  amber: Palette.amber,
  violet: Palette.violet,
  rose: Palette.rose,
  flamingo: Palette.flamingo,
  citrus: Palette.citrus,
  cyan: Palette.cyan,
} as const;
