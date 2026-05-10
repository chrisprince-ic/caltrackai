import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, Pattern, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

export type ChartBar = {
  /** Stable id (we use the dateKey or week index). */
  id: string;
  /** Short axis label (single character or W3 / 12). */
  label: string;
  /** Actual logged value for the period unit (kcal, grams). */
  value: number;
  /** Whether this slot has any logged data. */
  logged: boolean;
};

type Props = {
  /** Bars in chronological order (left → right). */
  data: ChartBar[];
  /** Goal value used to compute % adherence. */
  goal: number;
  /** Base brand colour for "on track" bars. */
  accent: string;
  /** Suffix shown in the tooltip after the value (e.g. "kcal", "g"). */
  unit: string;
};

const HEIGHT = 156;
const LABEL_BAND = 22;
const BAR_BAND = HEIGHT - LABEL_BAND;
/** Bars are scaled relative to 120% of goal so over-target days are visible
 *  but a single 200% day doesn't squash the rest of the chart. */
const BAR_CEILING = 1.2;

function barColour(pct: number, hasGoal: boolean): string {
  if (!hasGoal) return '#22C55E'; // no goal yet — neutral brand-green
  if (pct >= 0.9 && pct <= 1.1) return '#22C55E'; // on-track
  if (pct >= 0.7 && pct <= 1.3) return '#F59E0B'; // amber (close)
  return '#EF4444'; // off-target — covers pct === 0 (logged but no value of this metric)
}

/**
 * Compact bar chart that summarises one nutrition metric across the selected
 * period. Designed to be informative at a glance: dashed goal line at 100%,
 * bars colour-coded by adherence band, hatched bars for "no log" days so an
 * un-logged day reads visually different from a low-log day, and tap-to-pin
 * to read the exact value of any bar.
 *
 * The chart is drawn with `react-native-svg` directly — no chart library
 * dependency. Width is measured at runtime via `onLayout`; bars therefore fit
 * any container width.
 */
export function CalorieChart({ data, goal, accent, unit }: Props) {
  const { colors } = useAppTheme();
  const [width, setWidth] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const hasGoal = goal > 0;
  const enriched = useMemo(
    () =>
      data.map((bar) => {
        const pct = hasGoal && bar.value > 0 ? bar.value / goal : 0;
        return {
          ...bar,
          pct,
          fill: bar.logged ? barColour(pct, hasGoal) : 'url(#nolog-hatch)',
        };
      }),
    [data, goal, hasGoal],
  );

  if (width === 0) {
    // First render: measure container then render the chart on the next pass.
    return <View style={[styles.frame, { height: HEIGHT }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} />;
  }

  const padX = 4;
  const innerW = Math.max(0, width - padX * 2);
  const slot = enriched.length > 0 ? innerW / enriched.length : 0;
  const barGap = 4;
  const barW = Math.max(4, slot - barGap);
  const goalY = BAR_BAND - (1 / BAR_CEILING) * (BAR_BAND - 8);

  const selected = selectedIdx != null ? enriched[selectedIdx] : null;
  const tooltipX = selectedIdx != null ? padX + slot * (selectedIdx + 0.5) : 0;

  return (
    <View style={styles.frame} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Svg width={width} height={HEIGHT}>
        <Defs>
          {/* Diagonal hatch used as the fill for un-logged days. Subtle,
              same-tone-as-track so it reads "skipped" not "logged but small". */}
          <Pattern
            id="nolog-hatch"
            patternUnits="userSpaceOnUse"
            width={6}
            height={6}>
            <Rect width={6} height={6} fill={colors.haze} />
            <Path d="M0,6 L6,0" stroke={colors.borderStrong} strokeWidth={0.8} />
          </Pattern>
        </Defs>

        {/* Dashed goal line at 100% of target. */}
        {goal > 0 ? (
          <>
            <Line
              x1={padX}
              y1={goalY}
              x2={width - padX}
              y2={goalY}
              stroke={colors.borderStrong}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <SvgText
              x={width - padX}
              y={goalY - 4}
              fontSize={10}
              fontFamily={Fonts.semiBold}
              fill={colors.textMuted}
              textAnchor="end">
              Goal
            </SvgText>
          </>
        ) : null}

        {/* Bars */}
        {enriched.map((bar, i) => {
          const barHeight = bar.logged
            ? Math.max(2, Math.min(bar.pct, BAR_CEILING) / BAR_CEILING * (BAR_BAND - 8))
            : BAR_BAND - 8;
          const x = padX + slot * i + (slot - barW) / 2;
          const y = BAR_BAND - barHeight;
          const isSelected = selectedIdx === i;
          return (
            <Rect
              key={bar.id}
              x={x}
              y={y}
              width={barW}
              height={barHeight}
              rx={3}
              ry={3}
              fill={bar.fill}
              opacity={isSelected || selectedIdx == null ? 1 : 0.55}
            />
          );
        })}

        {/* X-axis labels */}
        {enriched.map((bar, i) => {
          if (!bar.label) return null;
          const x = padX + slot * (i + 0.5);
          return (
            <SvgText
              key={`lbl-${bar.id}`}
              x={x}
              y={HEIGHT - 6}
              fontSize={10}
              fontFamily={Fonts.medium}
              fill={colors.textMuted}
              textAnchor="middle">
              {bar.label}
            </SvgText>
          );
        })}
      </Svg>

      {/* Pressable hit-targets above each bar — placed in a separate layer so
          tap targets are full-height columns even when the bar itself is tiny. */}
      <View style={[styles.touchRow, { width }]}>
        {enriched.map((bar, i) => (
          <Pressable
            key={`tap-${bar.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${bar.label || bar.id}, ${
              bar.logged ? `${Math.round(bar.value)} ${unit}` : 'no log'
            }`}
            style={({ pressed }) => [
              styles.touchSlot,
              { width: slot },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setSelectedIdx((cur) => (cur === i ? null : i))}
          />
        ))}
      </View>

      {/* Tooltip above the selected bar */}
      {selected ? (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            {
              left: Math.max(4, Math.min(width - 132, tooltipX - 64)),
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <View style={[styles.tooltipDot, { backgroundColor: selected.logged ? accent : colors.borderStrong }]} />
          <View style={{ minWidth: 0 }}>
            <Text style={[styles.tooltipLabel, { color: colors.textMuted }]} numberOfLines={1}>
              {selected.label}
            </Text>
            <Text style={[styles.tooltipValue, { color: colors.text }]} numberOfLines={1}>
              {selected.logged ? `${Math.round(selected.value).toLocaleString()} ${unit}` : 'No log'}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ---- Legend (used outside the SVG so it's themeable plain JSX) -----------

export function ChartLegend() {
  const { colors } = useAppTheme();
  const items = [
    { color: '#22C55E', label: 'On track' },
    { color: '#F59E0B', label: 'Close' },
    { color: '#EF4444', label: 'Off' },
    { color: colors.borderStrong, label: 'No log', hatched: true },
  ];
  return (
    <View style={styles.legendRow}>
      {items.map((it) => (
        <View key={it.label} style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              {
                backgroundColor: it.hatched ? colors.haze : it.color,
                borderColor: it.hatched ? it.color : 'transparent',
                borderWidth: it.hatched ? 1 : 0,
              },
            ]}
          />
          <Text style={[styles.legendText, { color: colors.textMuted }]} numberOfLines={1}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    height: HEIGHT,
    position: 'relative',
  },
  touchRow: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: HEIGHT - LABEL_BAND,
    flexDirection: 'row',
  },
  touchSlot: { height: '100%' },

  tooltip: {
    position: 'absolute',
    top: -2,
    minWidth: 110,
    maxWidth: 160,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tooltipDot: { width: 6, height: 6, borderRadius: 3 },
  tooltipLabel: { fontFamily: Fonts.regular, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },
  tooltipValue: { fontFamily: Fonts.semiBold, fontSize: 13, marginTop: 1 },

  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: { fontFamily: Fonts.medium, fontSize: 11 },
});

// Re-export so consumers don't import Palette themselves.
export const CHART_BAR_COLOURS = {
  ok: '#22C55E',
  close: '#F59E0B',
  off: '#EF4444',
  fallback: Palette.iris,
} as const;
