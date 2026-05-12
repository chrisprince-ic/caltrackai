import { LinearGradient, type LinearGradientProps } from 'expo-linear-gradient';
import { useMemo } from 'react';

type SafeGradientColors = LinearGradientProps['colors'];

/** Filters bad stops — native LinearGradient misbehaves if `colors` loses entries or picks up undefined theme tokens. */
function sanitizeGradientColors(colors: SafeGradientColors): SafeGradientColors {
  const filtered = [...colors].filter(
    (c): c is string => typeof c === 'string' && c.trim().length > 0
  );
  if (filtered.length >= 2) {
    return filtered as SafeGradientColors;
  }
  const a = filtered[0] ?? '#475569';
  const b = filtered[1] ?? '#94a3b8';
  return filtered.length === 1 ? ([a, a] as SafeGradientColors) : ([a, b] as SafeGradientColors);
}

/**
 * Prefer this over importing `LinearGradient` directly anywhere theme-driven colors touch `colors=[...]` props.
 */
export function AppLinearGradient({ colors, ...rest }: LinearGradientProps) {
  const safeColors = useMemo(() => sanitizeGradientColors(colors), [colors]);
  return <LinearGradient {...rest} colors={safeColors} />;
}
