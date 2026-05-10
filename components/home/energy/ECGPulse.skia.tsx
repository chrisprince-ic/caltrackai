import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const W = 56;
const H = 4;

/** Mini scrolling ECG trace behind the Health tile icon area. */
export function ECGPulseSkia({ reducedMotion }: { reducedMotion: boolean }) {
  const shift = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion || Platform.OS === 'web') return;
    shift.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
  }, [reducedMotion, shift]);

  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const baseline = H * 0.62;
    const pts: [number, number][] = [
      [0, baseline],
      [8, baseline - 0.2],
      [12, baseline - 0.2],
      [16, baseline - 0.85],
      [22, baseline + 0.55],
      [28, baseline - 0.28],
      [36, baseline],
      [44, baseline - 0.18],
      [52, baseline],
      [60, baseline],
      [68, baseline],
    ];
    for (let rep = 0; rep < 4; rep++) {
      const ox = rep * 68;
      p.moveTo(ox + pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        p.lineTo(ox + pts[i][0], pts[i][1]);
      }
    }
    return p;
  }, []);

  const scroll = useDerivedValue(() => [{ translateX: -shift.value * 40 }]);

  if (Platform.OS === 'web') {
    return <View style={styles.bar} />;
  }

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Group transform={scroll}>
        <Path path={path} style="stroke" strokeWidth={1} color="#B36A00" opacity={0.38} />
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: { width: W, height: H },
  bar: { width: W, height: H, backgroundColor: 'rgba(179,106,0,0.12)', borderRadius: 2 },
});
