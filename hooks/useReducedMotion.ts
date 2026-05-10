import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * True when the user prefers reduced motion (Settings → Accessibility).
 * Use for decorative Skia / ambient animation only — keep spring transitions for meaning changes.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()?.then((v) => {
      if (alive) setReduced(Boolean(v));
    });
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) =>
      setReduced(Boolean(v))
    );
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
