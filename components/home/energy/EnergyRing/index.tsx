import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { Palette } from '@/constants/palette';

export const ENERGY_RING_SIZE = 172;
const CX = ENERGY_RING_SIZE / 2;
const CY = ENERGY_RING_SIZE / 2;
const R = 54;
const SW = 11;
/** Unfilled track — light neutral. */
const TRACK = '#E5E7EB';
/** Brand green (matches buttons / app chrome). */
const PROGRESS = Palette.iris;
const OVER = '#F97316';

type Props = {
  eaten: number;
  adjustedTarget: number;
  burnedCalories: number;
  reducedMotion: boolean;
};

/** Single circular progress: gray track, green eaten progress, orange overflow. */
export function EnergyRing({
  eaten,
  adjustedTarget,
  burnedCalories: _burnedCalories,
  reducedMotion: _reducedMotion,
}: Props) {
  const target = Math.max(0, adjustedTarget);
  const ratio = target > 0 ? eaten / target : 0;
  const greenSweep = Math.min(Math.max(ratio, 0), 1);
  const orangeSweep = ratio > 1 ? Math.min(ratio - 1, 0.45) : 0;

  const circularClip = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(CX, CY, ENERGY_RING_SIZE / 2);
    return p;
  }, []);

  const arcGreenPath = useMemo(() => {
    const p = Skia.Path.Make();
    const sweep = greenSweep * 360 - 0.01;
    if (sweep <= 0) return p;
    p.addArc(Skia.XYWHRect(CX - R, CY - R, R * 2, R * 2), -90, sweep);
    return p;
  }, [greenSweep]);

  const arcOrangePath = useMemo(() => {
    const p = Skia.Path.Make();
    if (orangeSweep <= 0) return p;
    const sweep = orangeSweep * 360;
    const start = -90 + greenSweep * 360;
    p.addArc(Skia.XYWHRect(CX - R, CY - R, R * 2, R * 2), start, sweep);
    return p;
  }, [orangeSweep, greenSweep]);

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Group clip={circularClip}>
        <Circle cx={CX} cy={CY} r={R} style="stroke" strokeWidth={SW} color={TRACK} />
        {greenSweep > 0 ? (
          <Path path={arcGreenPath} style="stroke" strokeWidth={SW} strokeCap="round" color={PROGRESS} />
        ) : null}
        {orangeSweep > 0 ? (
          <Path path={arcOrangePath} style="stroke" strokeWidth={SW} strokeCap="round" color={OVER} />
        ) : null}
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: { width: ENERGY_RING_SIZE, height: ENERGY_RING_SIZE },
});
