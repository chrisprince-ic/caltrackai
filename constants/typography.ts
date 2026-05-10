import type { TextStyle } from 'react-native';

import { Fonts } from '@/constants/theme';

/**
 * Centralized type scale. Reuses the existing Poppins font families so
 * we never hard-code font names in screens. Apply via spread:
 *   <Text style={[Typography.h1, { color: colors.text }]}>...</Text>
 */
export const Typography = {
  display: {
    fontFamily: Fonts.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1.5,
  },
  h1: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -1,
  },
  h2: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  bodyL: {
    fontFamily: Fonts.regular,
    fontSize: 17,
    lineHeight: 24,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  eyebrow: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof Typography;
