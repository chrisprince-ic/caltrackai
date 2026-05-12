/** Design tokens — green health system */
export const Palette = {
  // Brand greens
  iris: '#22C55E',        // Primary brand (used everywhere via Palette.iris)
  lavender: '#16A34A',    // Darker green — active / pressed
  mist: '#A7F3D0',        // Light green tint
  haze: '#DCFCE7',        // Very light green — chips, wells

  // Macro accents
  flamingo: '#EC4899',    // Protein — pink
  citrus: '#F97316',      // Calories / energy — orange
  cyan: '#6366F1',        // Fats — indigo

  // Neutrals (light mode)
  obsidian: '#111827',    // Primary text (light)
  void: '#1F2937',        // Generic dark surface (legacy)
  ghost: '#F4FBF7',       // App background — warm green-tinted white
  dusk: '#6B7280',        // Muted text / subtext
  white: '#FFFFFF',

  // Dark mode surfaces — green-tinted deep darks (matches design tokens)
  darkBg: '#0D1912',      // Dark app background — deep forest
  darkSurface: '#142218', // Dark card surface
  darkSurfaceMuted: '#1C2F22', // Slightly lighter dark surface
  darkBorder: 'rgba(167, 243, 208, 0.12)',  // Mist-tinted border in dark
  darkBorderStrong: 'rgba(167, 243, 208, 0.2)',

  // Semantic status
  onTrackBg: '#DCFCE7',
  onTrackText: '#16A34A',
  watchBg: '#FFF7ED',
  watchText: '#9A3412',
  overBg: '#FFF1F2',
  overText: '#BE123C',
} as const;
