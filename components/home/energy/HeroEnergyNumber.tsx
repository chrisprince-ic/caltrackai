import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';

type Props = {
  targetKcal: number;
  reducedMotion: boolean;
  onTargetBump?: () => void;
};

/** Center of the energy ring: target number + unit only. */
export function HeroEnergyNumber({ targetKcal, reducedMotion: _rm, onTargetBump }: Props) {
  const formatted = Math.round(Math.max(0, targetKcal)).toLocaleString();
  const prev = useRef(Math.round(Math.max(0, targetKcal)));

  useEffect(() => {
    const next = Math.round(Math.max(0, targetKcal));
    if (next > prev.current) {
      onTargetBump?.();
    }
    prev.current = next;
  }, [targetKcal, onTargetBump]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.hero}>{formatted}</Text>
      <Text style={styles.kcal}>kcal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  hero: {
    fontFamily: Fonts.bold,
    fontSize: 44,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    color: '#1A2B26',
  },
  kcal: {
    marginTop: 2,
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: '#6B7280',
  },
});
