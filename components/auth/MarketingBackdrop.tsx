import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { APP_SCREEN_GRADIENT_LIGHT } from '@/constants/hero';

/** Gradient background + decorative blobs for auth / marketing screens. */
export function MarketingBackdrop() {
  return (
    <>
      <LinearGradient
        colors={[...APP_SCREEN_GRADIENT_LIGHT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.wrap} pointerEvents="none">
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />
        <View style={styles.blob4} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(31, 138, 91, 0.1)',
    top: -120,
    right: -100,
  },
  blob2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(99, 102, 241, 0.07)',
    top: '35%',
    left: -90,
  },
  blob3: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
    bottom: -120,
    right: -80,
  },
  blob4: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(236, 72, 153, 0.07)',
    top: '58%',
    right: '20%',
  },
});
