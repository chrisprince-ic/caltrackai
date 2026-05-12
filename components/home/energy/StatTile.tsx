import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { BRAND_GREEN_SOFT_GRADIENT_2 } from '@/constants/hero';
import { Palette } from '@/constants/palette';
import { Fonts } from '@/constants/theme';

type Props = {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  variant: 'brand' | 'side';
  accentColor: string;
  /** Start count-up after this delay (ms). */
  countDelay: number;
  reducedMotion: boolean;
  onPress: () => void;
  valueColorOverride?: string;
  /** When set, replaces animated numeric display (e.g. not synced). */
  valueText?: string;
};

/** Iconographic stat cell with staggered count-up and spring press. */
export function StatTile({
  label,
  value,
  icon,
  variant,
  accentColor,
  countDelay,
  reducedMotion,
  onPress,
  valueColorOverride,
  valueText,
}: Props) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const target = Math.round(Math.max(0, value));
  const [display, setDisplay] = useState(() => (reducedMotion ? target : 0));
  const displayRef = useRef(display);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (valueText != null) return;
    if (reducedMotion) {
      setDisplay(target);
      return;
    }
    let cancelled = false;
    let iv: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      const from = displayRef.current;
      const start = Date.now();
      const dur = 520;
      iv = setInterval(() => {
        if (cancelled) return;
        const p = Math.min(1, (Date.now() - start) / dur);
        const eased = 1 - (1 - p) ** 3;
        setDisplay(Math.round(from + (target - from) * eased));
        if (p >= 1 && iv) clearInterval(iv);
      }, 16);
    }, countDelay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (iv) clearInterval(iv);
    };
  }, [target, countDelay, reducedMotion, valueText]);

  const ink = valueColorOverride ?? (variant === 'brand' ? Palette.iris : '#1A2B26');

  const inner = (
    <>
      <Ionicons name={icon} size={14} color={accentColor} style={styles.icon} />
      <Text style={[styles.label, { color: variant === 'brand' ? 'rgba(22, 163, 74, 0.72)' : '#888888' }]}>{label}</Text>
      <Text
        style={[
          styles.num,
          variant === 'brand' && styles.numBrand,
          { color: ink },
          valueText != null && styles.numMuted,
        ]}>
        {valueText ?? display.toLocaleString()}
      </Text>
    </>
  );

  const tileInner =
    variant === 'brand' ? (
      <LinearGradient
        colors={[...BRAND_GREEN_SOFT_GRADIENT_2]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.tile, styles.tileBrandExtras]}>
        {inner}
      </LinearGradient>
    ) : (
      <View style={[styles.tile, styles.tileSide]}>{inner}</View>
    );

  return (
    <Animated.View style={[styles.tileWrap, anim]}>
      <Pressable
        onPress={() => {
          scale.value = withSpring(0.96, { damping: 16, stiffness: 380 }, () => {
            scale.value = withSpring(1);
          });
          void Haptics.selectionAsync();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${valueText ?? display}`}>
        {tileInner}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tileWrap: { flex: 1, minWidth: 0 },
  tile: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    minHeight: 96,
    justifyContent: 'flex-start',
  },
  tileSide: {
    backgroundColor: '#FAFDFB',
  },
  tileBrandExtras: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(31,138,91,0.14)',
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.85)',
  },
  icon: { marginBottom: 2 },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  num: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  numBrand: {
    fontSize: 19,
  },
  numMuted: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
});
