import { StyleSheet, View } from 'react-native';

import { Palette } from '@/constants/palette';

/** Soft gradient-like orbs for marketing / auth screens. */
export function MarketingBackdrop() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      <View style={[styles.orb, styles.orb3]} />
      <View style={styles.gridLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.38,
  },
  orb1: {
    width: 280,
    height: 280,
    backgroundColor: Palette.mist,
    top: -90,
    right: -100,
  },
  orb2: {
    width: 200,
    height: 200,
    backgroundColor: Palette.haze,
    top: '32%',
    left: -80,
    opacity: 0.9,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.06)',
  },
  orb3: {
    width: 320,
    height: 320,
    backgroundColor: Palette.lavender,
    bottom: -140,
    right: -80,
    opacity: 0.12,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '46%',
    height: 1,
    backgroundColor: 'rgba(75, 35, 200, 0.04)',
  },
});
