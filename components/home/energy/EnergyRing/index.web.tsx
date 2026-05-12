import { useMemo } from 'react';
import Svg, { Circle, ClipPath, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

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

function makeArc(cx: number, cy: number, r: number, progress: number, startDeg = -90): string {
  const sweep = Math.max(0, progress * 360 - 0.01);
  if (sweep <= 0) return '';
  const flag = sweep > 180 ? 1 : 0;
  const sr = (startDeg * Math.PI) / 180;
  const er = ((startDeg + sweep) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(sr);
  const y1 = cy + r * Math.sin(sr);
  const x2 = cx + r * Math.cos(er);
  const y2 = cy + r * Math.sin(er);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${flag} 1 ${x2} ${y2}`;
}

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

  const arcOuter = useMemo(() => makeArc(CX, CY, R_OUTER, outerProgress), [outerProgress]);
  const arcOverflow = useMemo(
    () =>
      outerOverflow > 0
        ? makeArc(CX, CY, R_OUTER, outerOverflow, -90 + outerProgress * 360)
        : '',
    [outerOverflow, outerProgress]
  );
  const arcInner = useMemo(() => makeArc(CX, CY, R_INNER, innerProgress), [innerProgress]);

  return (
    <Svg
      width={ENERGY_RING_SIZE}
      height={ENERGY_RING_SIZE}
      viewBox={`0 0 ${ENERGY_RING_SIZE} ${ENERGY_RING_SIZE}`}>
      <Defs>
        <LinearGradient id="outerGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#38B273" />
          <Stop offset="1" stopColor={Palette.iris} />
        </LinearGradient>
        <LinearGradient id="innerGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E5B840" />
          <Stop offset="1" stopColor={AMBER} />
        </LinearGradient>
        <ClipPath id="energyRingClip">
          <Circle cx={CX} cy={CY} r={ENERGY_RING_SIZE / 2} />
        </ClipPath>
      </Defs>

      {/* Tracks */}
      <Circle cx={CX} cy={CY} r={R_OUTER} stroke={trackColor} strokeWidth={SW_OUTER} fill="none" />
      <Circle cx={CX} cy={CY} r={R_INNER} stroke={trackColor} strokeWidth={SW_INNER} fill="none" />

      {/* Outer arc glow (wider, semi-transparent) */}
      {arcOuter ? (
        <Path
          d={arcOuter}
          stroke={isOver ? 'rgba(196,74,53,0.22)' : 'rgba(31,138,91,0.22)'}
          strokeWidth={SW_OUTER + 10}
          strokeLinecap="round"
          fill="none"
        />
      ) : null}
      {/* Outer arc solid */}
      {arcOuter ? (
        <Path
          d={arcOuter}
          stroke={isOver ? OVER_COLOR : 'url(#outerGrad)'}
          strokeWidth={SW_OUTER}
          strokeLinecap="round"
          fill="none"
        />
      ) : null}

      {/* Overflow arc */}
      {arcOverflow ? (
        <>
          <Path
            d={arcOverflow}
            stroke="rgba(196,74,53,0.22)"
            strokeWidth={SW_OUTER + 10}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={arcOverflow}
            stroke={OVER_COLOR}
            strokeWidth={SW_OUTER}
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : null}

      {/* Inner arc glow + solid (burned) */}
      {arcInner ? (
        <>
          <Path
            d={arcInner}
            stroke="rgba(200,151,10,0.22)"
            strokeWidth={SW_INNER + 8}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={arcInner}
            stroke="url(#innerGrad)"
            strokeWidth={SW_INNER}
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : null}
    </Svg>
  );
}
