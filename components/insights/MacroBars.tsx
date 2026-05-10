import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';

export type MacroRow = {
  id: 'protein' | 'carbs' | 'fat';
  label: string;
  /** Macro accent colour (matches the dot used elsewhere in the app). */
  color: string;
  /** Average grams logged this period. */
  actual: number;
  /** Daily target in grams. */
  target: number;
  /** Optional caption shown under the bar — usually a "vs prior period" delta. */
  caption?: string | null;
};

type Props = { rows: MacroRow[] };

/**
 * Horizontal progress-bar list. Replaces the legacy "Protein vs target — 18%"
 * row layout that gave users no visual sense of distance from goal.
 *
 * Visual logic:
 *   - Bar fills to min(actual / target, 100%) so over-target days don't look
 *     identical to perfect days.
 *   - Over-target days get a small "over-fill" tail past 100% drawn in a
 *     darker tint of the macro colour, capped at +20% so the row stays
 *     proportional even on extreme days.
 *   - Numbers shown as "{actual}g of {target}g" (absolute amounts), not raw
 *     percentages — that's what users actually plan around.
 */
export function MacroBars({ rows }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.list}>
      {rows.map((row) => {
        const ratio = row.target > 0 ? row.actual / row.target : 0;
        const baseFill = Math.min(1, ratio);
        const overFill = Math.max(0, Math.min(0.2, ratio - 1));
        return (
          <View key={row.id} style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.rowLabel}>
                <View style={[styles.dot, { backgroundColor: row.color }]} />
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {row.label}
                </Text>
              </View>
              <Text style={[styles.amount, { color: colors.text }]} numberOfLines={1}>
                <Text style={{ color: colors.text }}>{Math.round(row.actual)}g</Text>
                <Text style={{ color: colors.textMuted }}> of {Math.round(row.target)}g</Text>
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.haze }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.round(baseFill * 100)}%`, backgroundColor: row.color },
                ]}
              />
              {overFill > 0 ? (
                <View
                  style={[
                    styles.overFill,
                    {
                      width: `${Math.round(overFill * 100)}%`,
                      backgroundColor: row.color,
                    },
                  ]}
                />
              ) : null}
            </View>
            {row.caption ? (
              <Text style={[styles.caption, { color: colors.textMuted }]} numberOfLines={1}>
                {row.caption}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 16 },
  row: { gap: 8 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontFamily: Fonts.semiBold, fontSize: 14, flexShrink: 1 },
  amount: { fontFamily: Fonts.semiBold, fontSize: 13 },

  track: {
    position: 'relative',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  overFill: {
    height: '100%',
    opacity: 0.55,
  },

  caption: { fontFamily: Fonts.medium, fontSize: 11 },
});
