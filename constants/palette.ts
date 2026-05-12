/** Design tokens — Macrovia emerald system */
export const Palette = {
  // Brand emerald (Macrovia accent, oklch 0.62 0.16 155)
  iris: '#1F8A5B',         // Primary brand emerald
  lavender: '#0D5C3A',     // Deeper emerald — active / pressed
  mist: '#D4EDE3',         // Light emerald tint
  haze: '#EBF7F0',         // Very light emerald — chips, wells

  // Extended accent palette
  amber: '#C8970A',        // Warm amber — energy / carbs
  amberSoft: '#FBF3D8',    // Light amber tint
  violet: '#6B4A96',       // Violet — fats
  violetSoft: '#F0EAFB',   // Light violet tint
  rose: '#C44A35',         // Rose — over target / error
  roseSoft: '#FEF0EE',     // Light rose tint

  // Macro accents (token names preserved for backward compat)
  flamingo: '#1F8A5B',     // Protein → emerald
  citrus: '#C8970A',       // Calories / energy → amber
  cyan: '#6B4A96',         // Fats → violet

  // Neutrals (light mode) — green-tinted inks
  obsidian: '#1A2820',     // Primary text
  void: '#283330',         // Generic dark surface
  ghost: '#FAFAF8',        // App background — warm off-white
  dusk: '#838E88',         // Muted text / subtext
  white: '#FFFFFF',

  // Dark mode surfaces — emerald-tinted deep darks
  darkBg: '#131E16',           // Dark app background
  darkSurface: '#1A2B1E',      // Dark card surface
  darkSurfaceMuted: '#1E3023', // Slightly lighter dark surface
  darkBorder: 'rgba(212,237,227,0.10)',   // Mist-tinted border in dark
  darkBorderStrong: 'rgba(212,237,227,0.18)',

  // Semantic status
  onTrackBg: '#EBF7F0',
  onTrackText: '#0D5C3A',
  watchBg: '#FBF3D8',
  watchText: '#7A5A0A',
  overBg: '#FEF0EE',
  overText: '#A03020',
} as const;
