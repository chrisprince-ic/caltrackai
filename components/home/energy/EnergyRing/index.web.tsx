import { useMemo } from 'react';
import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';

import { Palette } from '@/constants/palette';

export const ENERGY_RING_SIZE = 172;
const CX = ENERGY_RING_SIZE / 2;
const CY = ENERGY_RING_SIZE / 2;
const R = 54;
const SW = 11;
const TRACK = '#E5E7EB';
const PROGRESS = Palette.iris;
const OVER = '#F97316';

type Props = {
  eaten: number;
  adjustedTarget: number;
  burnedCalories: number;
  reducedMotion: boolean;
};

export function EnergyRing({
  eaten,
  adjustedTarget,
  burnedCalories: _burnedCalories,
  reducedMotion: _rm,
}: Props) {
  const target = Math.max(0, adjustedTarget);
  const ratio = target > 0 ? eaten / target : 0;
  const greenFrac = Math.min(Math.max(ratio, 0), 1);
  const orangeFrac = ratio > 1 ? Math.min(ratio - 1, 0.45) : 0;

  const arcGreen = useMemo(() => {
    const sweep = Math.max(0, greenFrac * 360 - 0.01);
    if (sweep <= 0) return '';
    const flag = sweep > 180 ? 1 : 0;
    const rad = (-90 * Math.PI) / 180;
    const x1 = CX + R * Math.cos(rad);
    const y1 = CY + R * Math.sin(rad);
    const end = ((-90 + sweep) * Math.PI) / 180;
    const x2 = CX + R * Math.cos(end);
    const y2 = CY + R * Math.sin(end);
    return `M ${x1} ${y1} A ${R} ${R} 0 ${flag} 1 ${x2} ${y2}`;
  }, [greenFrac]);

  const arcOrange = useMemo(() => {
    if (orangeFrac <= 0) return '';
    const sweep = orangeFrac * 360;
    const start = -90 + greenFrac * 360;
    const sr = (start * Math.PI) / 180;
    const er = ((start + sweep) * Math.PI) / 180;
    const flag = sweep > 180 ? 1 : 0;
    const x1 = CX + R * Math.cos(sr);
    const y1 = CY + R * Math.sin(sr);
    const x2 = CX + R * Math.cos(er);
    const y2 = CY + R * Math.sin(er);
    return `M ${x1} ${y1} A ${R} ${R} 0 ${flag} 1 ${x2} ${y2}`;
  }, [orangeFrac, greenFrac]);

  return (
    <Svg width={ENERGY_RING_SIZE} height={ENERGY_RING_SIZE} viewBox={`0 0 ${ENERGY_RING_SIZE} ${ENERGY_RING_SIZE}`}>
      <Defs>
        <ClipPath id="energyRingClip">
          <Circle cx={CX} cy={CY} r={ENERGY_RING_SIZE / 2} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#energyRingClip)">
        <Circle cx={CX} cy={CY} r={R} stroke={TRACK} strokeWidth={SW} fill="none" />
        {greenFrac > 0 && arcGreen ? (
          <Path d={arcGreen} stroke={PROGRESS} strokeWidth={SW} strokeLinecap="round" fill="none" />
        ) : null}
        {orangeFrac > 0 && arcOrange ? (
          <Path d={arcOrange} stroke={OVER} strokeWidth={SW} strokeLinecap="round" fill="none" />
        ) : null}
      </G>
    </Svg>
  );
}
