import { useMemo } from 'react';
import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';

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
  enabled: boolean;
  fraction: number;
  trackColor: string;
  progressColor: string;
};

type Props = {
  eaten: number;
  adjustedTarget: number;
  burnedCalories: number;
  reducedMotion: boolean;
  palette?: Partial<EnergyRingPalette>;
  activityRing?: EnergyRingActivityRing | null;
  size?: number;
};

export function EnergyRing({
  eaten,
  adjustedTarget,
  burnedCalories: _burnedCalories,
  reducedMotion: _rm,
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
  const greenFrac = Math.min(Math.max(ratio, 0), 1);
  const orangeFrac = ratio > 1 ? Math.min(ratio - 1, 0.45) : 0;

  const innerFracRaw =
    activityRing?.enabled ?? false ? Math.min(Math.max(activityRing!.fraction, 0), 1) : 0;
  const innerSweepDeg = innerFracRaw > 0 ? innerFracRaw * 360 - 0.01 : 0;
  const showInner = Boolean(activityRing?.enabled);

  const arcGreenOuter = useMemo(() => arcPath(cx, cy, R, -90, Math.max(0, greenFrac * 360 - 0.01)), [cx, cy, R, greenFrac]);

  const arcOrange = useMemo(() => {
    if (orangeFrac <= 0) return '';
    const sweep = orangeFrac * 360;
    const start = -90 + greenFrac * 360;
    return arcPath(cx, cy, R, start, sweep);
  }, [orangeFrac, greenFrac, cx, cy, R]);

  const innerArc = useMemo(() => {
    if (!showInner || innerSweepDeg <= 0) return '';
    return arcPath(cx, cy, innerR, -90, innerSweepDeg);
  }, [showInner, innerSweepDeg, cx, cy, innerR]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <ClipPath id="energyRingClip">
          <Circle cx={cx} cy={cy} r={size / 2} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#energyRingClip)">
        <Circle cx={cx} cy={cy} r={R} stroke={trackColor} strokeWidth={sw} fill="none" />
        {greenFrac > 0 && arcGreenOuter ? (
          <Path
            d={arcGreenOuter}
            stroke={progressColor}
            strokeWidth={sw}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
        {orangeFrac > 0 && arcOrange ? (
          <Path
            d={arcOrange}
            stroke={overflowColor}
            strokeWidth={sw}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
        {showInner ? (
          <Circle cx={cx} cy={cy} r={innerR} stroke={activityRing!.trackColor} strokeWidth={innerSw} fill="none" />
        ) : null}
        {showInner && innerArc ? (
          <Path
            d={innerArc}
            stroke={activityRing!.progressColor}
            strokeWidth={innerSw}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
      </G>
    </Svg>
  );
}

function arcPath(cx: number, cy: number, R: number, startDeg: number, sweepDeg: number): string {
  if (sweepDeg <= 0) return '';
  const sr = (startDeg * Math.PI) / 180;
  const er = ((startDeg + sweepDeg) * Math.PI) / 180;
  const flag = sweepDeg > 180 ? 1 : 0;
  const x1 = cx + R * Math.cos(sr);
  const y1 = cy + R * Math.sin(sr);
  const x2 = cx + R * Math.cos(er);
  const y2 = cy + R * Math.sin(er);
  return `M ${x1} ${y1} A ${R} ${R} 0 ${flag} 1 ${x2} ${y2}`;
}
