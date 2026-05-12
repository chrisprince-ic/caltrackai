import { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

export type SemiTripleGaugeColors = {
  track: string;
  outer: string;
  outerOverflow: string;
  middle: string;
  inner: string;
};

type Props = {
  width: number;
  outerProgress01: number;
  outerOverflow01: number;
  middleProgress01: number;
  innerProgress01: number;
  colors: SemiTripleGaugeColors;
};

/**
 * Three concentric arcs opening downward (∩) — calories (outer dark green),
 * protein (middle mint), carbs (inner warm orange), on shared faint tracks.
 */
export function SemiTripleEnergyGauge({
  width,
  outerProgress01,
  outerOverflow01,
  middleProgress01,
  innerProgress01,
  colors,
}: Props) {
  const cx = width / 2;
  /** Slightly lower baseline widens the “bowl” so center labels fit like the Macrovia mock. */
  const baseLineY = Math.round(width * 0.362);
  const R_OUT = Math.round(width * 0.258);
  const R_MID = Math.round(width * 0.198);
  const R_INN = Math.round(width * 0.139);

  const swOut = Math.max(10, Math.round(width * 0.034));
  const swMid = Math.max(8, Math.round(width * 0.028));
  const swIn = Math.max(7, Math.round(width * 0.024));

  const arcs = useMemo(() => {
    const trackOuter = arcTopSemi(cx, baseLineY, R_OUT);
    const trackMid = arcTopSemi(cx, baseLineY, R_MID);
    const trackInn = arcTopSemi(cx, baseLineY, R_INN);
    const pOut = clamp01(outerProgress01);
    const pOver = Math.max(0, Math.min(outerOverflow01, 0.6));
    const pMid = clamp01(middleProgress01);
    const pInn = clamp01(innerProgress01);
    const progressOuterGreen = arcTopSemiProgress(cx, baseLineY, R_OUT, pOut);
    const progressOuterOrange =
      pOver > 0 && pOut >= 1e-6
        ? arcTopSemiOverflow(cx, baseLineY, R_OUT, pOut, Math.min(pOver, Math.max(0.015, 1 - pOut)))
        : null;
    return {
      trackOuter,
      trackMid,
      trackInn,
      progressOuterGreen,
      progressOuterOrange,
      progressMid: arcTopSemiProgress(cx, baseLineY, R_MID, pMid),
      progressInn: arcTopSemiProgress(cx, baseLineY, R_INN, pInn),
    };
  }, [
    cx,
    baseLineY,
    R_OUT,
    R_MID,
    R_INN,
    outerProgress01,
    outerOverflow01,
    middleProgress01,
    innerProgress01,
  ]);

  const height = Math.ceil(baseLineY + width * 0.084);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={arcs.trackOuter} stroke={colors.track} strokeWidth={swOut} fill="none" strokeLinecap="round" />
      <Path d={arcs.trackMid} stroke={colors.track} strokeWidth={swMid} fill="none" strokeLinecap="round" />
      <Path d={arcs.trackInn} stroke={colors.track} strokeWidth={swIn} fill="none" strokeLinecap="round" />
      {arcs.progressOuterGreen ? (
        <Path
          d={arcs.progressOuterGreen}
          stroke={colors.outer}
          strokeWidth={swOut}
          fill="none"
          strokeLinecap="round"
        />
      ) : null}
      {arcs.progressOuterOrange ? (
        <Path
          d={arcs.progressOuterOrange}
          stroke={colors.outerOverflow}
          strokeWidth={swOut}
          fill="none"
          strokeLinecap="round"
        />
      ) : null}
      {arcs.progressMid ? (
        <Path
          d={arcs.progressMid}
          stroke={colors.middle}
          strokeWidth={swMid}
          fill="none"
          strokeLinecap="round"
        />
      ) : null}
      {arcs.progressInn ? (
        <Path
          d={arcs.progressInn}
          stroke={colors.inner}
          strokeWidth={swIn}
          fill="none"
          strokeLinecap="round"
        />
      ) : null}
    </Svg>
  );
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function arcTopSemi(cx: number, cy: number, R: number) {
  return arcTopSemiProgress(cx, cy, R, 1);
}

function arcTopSemiProgress(cx: number, cy: number, R: number, progress01: number) {
  if (progress01 <= 0.001) return '';
  const p = clamp01(progress01);
  const x0 = cx - R;
  const y0 = cy;
  const theta = Math.PI * (1 - p);
  const x1 = cx + R * Math.cos(theta);
  const y1 = cy - R * Math.sin(theta);
  const largeArc = p > 0.5 ? 1 : 0;
  return `M ${x0} ${y0} A ${R} ${R} 0 ${largeArc} 1 ${x1} ${y1}`;
}

function arcTopSemiOverflow(cx: number, cy: number, R: number, greenEnd01: number, extra01: number) {
  const g = clamp01(greenEnd01);
  const seg = clamp01(extra01);
  if (seg <= 0.001 || g <= 0.001) return '';
  const startTheta = Math.PI * (1 - g);
  const endTheta = Math.PI * (1 - clamp01(g + seg));
  const x0 = cx + R * Math.cos(startTheta);
  const y0 = cy - R * Math.sin(startTheta);
  const x1 = cx + R * Math.cos(endTheta);
  const y1 = cy - R * Math.sin(endTheta);
  const span = Math.abs(endTheta - startTheta);
  const largeArc = span > Math.PI / 2 ? 1 : 0;
  return `M ${x0} ${y0} A ${R} ${R} 0 ${largeArc} 1 ${x1} ${y1}`;
}
