import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { Palette } from '@/constants/palette';

export const ENERGY_RING_DEFAULT_SIZE = 172;

const BASE = ENERGY_RING_DEFAULT_SIZE;
const BASE_R = 54;
const BASE_SW = 11;
const BASE_INNER_R = 42;
const BASE_INNER_SW = 6;

const DEFAULT_TRACK = '#E5E7EB';
const DEFAULT_PROGRESS = Palette.iris;
const DEFAULT_OVERFLOW = '#F97316';

export type EnergyRingPalette = {
  track: string;
  progress: string;
  overflow: string;
};

export type EnergyRingActivityRing = {
  /** When false, inner ring is not drawn. */
  enabled: boolean;
  /** 0–1 share of inner ring to fill (e.g. active / adjusted target). */
  fraction: number;
  /** Inner track + stroke colors when activity ring is shown. */
  trackColor: string;
  progressColor: string;
};

type Props = {
  eaten: number;
  adjustedTarget: number;
  burnedCalories: number;
  reducedMotion: boolean;
  /** Outer calorie ring palette (defaults brand green). */
  palette?: Partial<EnergyRingPalette>;
  /** Optional inner ring — activity vs budget (shows when `enabled`). */
  activityRing?: EnergyRingActivityRing | null;
  /** Total canvas dimension; geometry scales proportionally. */
  size?: number;
};

/** Calorie budget ring (+ optional inner activity ring) — Skia on native. */
export function EnergyRing({
  eaten,
  adjustedTarget,
  burnedCalories: _burnedCalories,
  reducedMotion: _reducedMotion,
  palette,
  activityRing,
  size = BASE,
}: Props) {
  const k = size / BASE;
  const cx = size / 2;
  const cy = size / 2;
  const R = BASE_R * k;
  const sw = BASE_SW * k;
  const innerR = BASE_INNER_R * k;
  const innerSw = BASE_INNER_SW * k;

  const trackColor = palette?.track ?? DEFAULT_TRACK;
  const progressColor = palette?.progress ?? DEFAULT_PROGRESS;
  const overflowColor = palette?.overflow ?? DEFAULT_OVERFLOW;

  const target = Math.max(0, adjustedTarget);
  const ratio = target > 0 ? eaten / target : 0;
  const greenSweep = Math.min(Math.max(ratio, 0), 1);
  const orangeSweep = ratio > 1 ? Math.min(ratio - 1, 0.45) : 0;

  const innerFracRaw = activityRing?.enabled ? Math.min(Math.max(activityRing.fraction, 0), 1) : 0;

  const circularClip = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, size / 2);
    return p;
  }, [cx, cy, size]);

  const arcGreenPath = useMemo(() => {
    const p = Skia.Path.Make();
    const sweep = greenSweep * 360 - 0.01;
    if (sweep <= 0) return p;
    p.addArc(Skia.XYWHRect(cx - R, cy - R, R * 2, R * 2), -90, sweep);
    return p;
  }, [greenSweep, cx, cy, R]);

  const arcOrangePath = useMemo(() => {
    const p = Skia.Path.Make();
    if (orangeSweep <= 0) return p;
    const sweep = orangeSweep * 360;
    const start = -90 + greenSweep * 360;
    p.addArc(Skia.XYWHRect(cx - R, cy - R, R * 2, R * 2), start, sweep);
    return p;
  }, [orangeSweep, greenSweep, cx, cy, R]);

  const innerSweep = useMemo(() => {
    if (!activityRing?.enabled) return 0;
    const f = innerFracRaw;
    if (f <= 0) return 0;
    return f * 360 - 0.01;
  }, [activityRing?.enabled, innerFracRaw]);

  const innerArcPath = useMemo(() => {
    const p = Skia.Path.Make();
    if (innerSweep <= 0) return p;
    p.addArc(Skia.XYWHRect(cx - innerR, cy - innerR, innerR * 2, innerR * 2), -90, innerSweep);
    return p;
  }, [innerSweep, cx, cy, innerR]);

  const showInner = Boolean(activityRing?.enabled);

  return (
    <Canvas style={[styles.canvas, { width: size, height: size }]} pointerEvents="none">
      <Group clip={circularClip}>
        <Circle cx={cx} cy={cy} r={R} style="stroke" strokeWidth={sw} color={trackColor} />
        {greenSweep > 0 ? (
          <Path
            path={arcGreenPath}
            style="stroke"
            strokeWidth={sw}
            strokeCap="round"
            color={progressColor}
          />
        ) : null}
        {orangeSweep > 0 ? (
          <Path
            path={arcOrangePath}
            style="stroke"
            strokeWidth={sw}
            strokeCap="round"
            color={overflowColor}
          />
        ) : null}
        {showInner ? (
          <Circle
            cx={cx}
            cy={cy}
            r={innerR}
            style="stroke"
            strokeWidth={innerSw}
            color={activityRing!.trackColor}
          />
        ) : null}
        {showInner && innerSweep > 0 ? (
          <Path
            path={innerArcPath}
            style="stroke"
            strokeWidth={innerSw}
            strokeCap="round"
            color={activityRing!.progressColor}
          />
        ) : null}
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: { alignSelf: 'center' },
});
