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

  // Neutrals
  obsidian: '#111827',    // Primary text
  void: '#1F2937',        // Dark surface
  ghost: '#F9FAFB',       // App background
  dusk: '#6B7280',        // Muted text / subtext
  white: '#FFFFFF',

  // Semantic status
  onTrackBg: '#DCFCE7',
  onTrackText: '#16A34A',
  watchBg: '#FFF7ED',
  watchText: '#9A3412',
  overBg: '#FFF1F2',
  overText: '#BE123C',
} as const;
