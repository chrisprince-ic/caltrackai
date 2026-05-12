import { StyleSheet, Text, View } from 'react-native';

import { AppLinearGradient } from '@/components/ui/AppLinearGradient';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';

export type WeekDayBar = { label: string; value: number };

type Props = {
  data: WeekDayBar[];
  height?: number;
  avgLabel?: string;
};

/** Minimal 7-column bar strip — Macrovia “7-day calories” chart. */
export function WeekCalorieBars({ data, height = 100, avgLabel }: Props) {
  const { colors } = useAppTheme();
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View>
      {avgLabel ? (
        <View style={styles.caption}>
          <Text style={[styles.captionText, { color: colors.textMuted }]}>{avgLabel}</Text>
        </View>
      ) : null}
      <View style={[styles.track, { height }]}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.value / max) * (height - 22));
          const isLast = i === data.length - 1;
          return (
            <View key={`${d.label}-${i}`} style={styles.col}>
              <View style={[styles.barHost, { height: height - 18 }]}>
                {isLast ? (
                  <AppLinearGradient
                    colors={[colors.accent, colors.accentDeep]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={[styles.barFill, { height: h }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.barFill,
                      { height: h, backgroundColor: colors.hairline, opacity: 0.85 },
                    ]}
                  />
                )}
              </View>
              <Text style={[styles.day, { color: colors.textSecondary }]}>{d.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { marginBottom: 8 },
  captionText: { fontFamily: Fonts.regular, fontSize: 12 },
  track: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 2 },
  col: { flex: 1, alignItems: 'center' },
  barHost: { width: '100%', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6 },
  day: {
    marginTop: 6,
    fontFamily: Fonts.medium,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
