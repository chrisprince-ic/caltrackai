import { BlurMask, Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { Palette } from '@/constants/palette';

export const ENERGY_RING_SIZE = 220;
const CX = ENERGY_RING_SIZE / 2;
const CY = ENERGY_RING_SIZE / 2;

const R_OUTER = 84;
const SW_OUTER = 13;
const R_INNER = 62;
const SW_INNER = 9;

const AMBER = Palette.amber;
const OVER_COLOR = Palette.rose;

type Props = {
  eaten: number;
  adjustedTarget: number;
  burnedCalories: number;
  reducedMotion: boolean;
  isDark?: boolean;
};

/** Dual-ring energy visualization: outer = eaten vs. goal, inner = active burn. */
export function EnergyRing({ eaten, adjustedTarget, burnedCalories, isDark = false }: Props) {
  const target = Math.max(1, adjustedTarget);
  const eatenRatio = eaten / target;
  const burnedRatio = Math.min(burnedCalories / target, 1);

  const outerProgress = Math.min(Math.max(eatenRatio, 0), 1);
  const isOver = eatenRatio > 1;
  const outerOverflow = isOver ? Math.min(eatenRatio - 1, 0.5) : 0;
  const innerProgress = Math.min(Math.max(burnedRatio, 0), 1);

  const trackColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(31,138,91,0.10)';
  const outerColor = isOver ? OVER_COLOR : Palette.iris;
  const outerGlow = isOver ? 'rgba(196,74,53,0.30)' : 'rgba(31,138,91,0.28)';

  const outerArcPath = useMemo(() => {
    const p = Skia.Path.Make();
    const sweep = outerProgress * 360 - 0.01;
    if (sweep <= 0) return p;
    p.addArc(Skia.XYWHRect(CX - R_OUTER, CY - R_OUTER, R_OUTER * 2, R_OUTER * 2), -90, sweep);
    return p;
  }, [outerProgress]);

  const outerOverflowPath = useMemo(() => {
    const p = Skia.Path.Make();
    if (outerOverflow <= 0) return p;
    const sweep = outerOverflow * 360;
    const start = -90 + outerProgress * 360;
    p.addArc(Skia.XYWHRect(CX - R_OUTER, CY - R_OUTER, R_OUTER * 2, R_OUTER * 2), start, sweep);
    return p;
  }, [outerOverflow, outerProgress]);

  const innerArcPath = useMemo(() => {
    const p = Skia.Path.Make();
    const sweep = innerProgress * 360 - 0.01;
    if (sweep <= 0) return p;
    p.addArc(Skia.XYWHRect(CX - R_INNER, CY - R_INNER, R_INNER * 2, R_INNER * 2), -90, sweep);
    return p;
  }, [innerProgress]);

  const circularClip = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(CX, CY, ENERGY_RING_SIZE / 2);
    return p;
  }, []);

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Group clip={circularClip}>
        {/* Tracks */}
        <Circle cx={CX} cy={CY} r={R_OUTER} style="stroke" strokeWidth={SW_OUTER} color={trackColor} />
        <Circle cx={CX} cy={CY} r={R_INNER} style="stroke" strokeWidth={SW_INNER} color={trackColor} />

        {/* Outer arc: glow then solid */}
        {outerProgress > 0 ? (
          <>
            <Path path={outerArcPath} style="stroke" strokeWidth={SW_OUTER + 10} strokeCap="round" color={outerGlow}>
              <BlurMask blur={8} style="normal" />
            </Path>
            <Path path={outerArcPath} style="stroke" strokeWidth={SW_OUTER} strokeCap="round" color={outerColor} />
          </>
        ) : null}

        {/* Outer overflow (over target) */}
        {outerOverflow > 0 ? (
          <>
            <Path path={outerOverflowPath} style="stroke" strokeWidth={SW_OUTER + 10} strokeCap="round" color="rgba(196,74,53,0.30)">
              <BlurMask blur={8} style="normal" />
            </Path>
            <Path path={outerOverflowPath} style="stroke" strokeWidth={SW_OUTER} strokeCap="round" color={OVER_COLOR} />
          </>
        ) : null}

        {/* Inner arc: burned (amber) */}
        {innerProgress > 0 ? (
          <>
            <Path path={innerArcPath} style="stroke" strokeWidth={SW_INNER + 8} strokeCap="round" color="rgba(200,151,10,0.28)">
              <BlurMask blur={6} style="normal" />
            </Path>
            <Path path={innerArcPath} style="stroke" strokeWidth={SW_INNER} strokeCap="round" color={AMBER} />
          </>
        ) : null}
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: { width: ENERGY_RING_SIZE, height: ENERGY_RING_SIZE },
});
