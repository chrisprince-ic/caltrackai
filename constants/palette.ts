import { MacroviaLight } from '@/constants/macrovia';

/** Brand + macro accents — Macrovia-aligned (emerald protein, amber carbs, violet fat). */
export const Palette = {
  iris: MacroviaLight.accent,
  lavender: MacroviaLight.accentDeep,
  mist: MacroviaLight.accentSoft,
  haze: MacroviaLight.accentSoft,

  flamingo: MacroviaLight.accentDeep,
  citrus: MacroviaLight.warm,
  cyan: MacroviaLight.violet,

  obsidian: MacroviaLight.ink,
  void: '#1E2321',
  ghost: MacroviaLight.bg,
  dusk: MacroviaLight.ink3,
  white: '#FFFFFF',

  onTrackBg: MacroviaLight.accentSoft,
  onTrackText: MacroviaLight.accentDeep,
  watchBg: MacroviaLight.warmSoft,
  watchText: '#8B5C1A',
  overBg: 'rgba(217,92,114,0.12)',
  overText: MacroviaLight.rose,

  visionMint: MacroviaLight.visionMint,
} as const;
