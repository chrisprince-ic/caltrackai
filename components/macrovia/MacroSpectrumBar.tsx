import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';

type Props = {
  protein: number;
  carbs: number;
  fat: number;
  targetP: number;
  targetC: number;
  targetF: number;
};

/**
 * Stacked calorie-share bar + three numeric columns — matches prototype “Macro spectrum”.
 */
export function MacroSpectrumBar({ protein, carbs, fat, targetP, targetC, targetF }: Props) {
  const { colors } = useAppTheme();
  const pCal = Math.max(0, protein * 4);
  const cCal = Math.max(0, carbs * 4);
  const fCal = Math.max(0, fat * 9);
  const total = pCal + cCal + fCal || 1;
  const wP = (pCal / total) * 100;
  const wC = (cCal / total) * 100;
  const wF = (fCal / total) * 100;

  const col = (label: string, val: number, target: number, dot: string) => {
    const pct = target > 0 ? Math.min(999, Math.round((val / target) * 100)) : 0;
    return (
      <View style={styles.col}>
        <View style={styles.labRow}>
          <View style={[styles.dot, { backgroundColor: dot }]} />
          <Text style={[styles.lab, { color: colors.textMuted }]}>{label}</Text>
        </View>
        <Text style={[styles.big, { color: colors.text }]}>
          {Math.round(val)}
          <Text style={[styles.gUnit, { color: colors.textMuted }]}>g</Text>
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          of {Math.round(target)}g · {pct}%
        </Text>
      </View>
    );
  };

  return (
    <View>
      <View style={[styles.track, { backgroundColor: colors.hairline }]}>
        <View
          style={[
            styles.seg,
            {
              width: `${wP}%`,
              backgroundColor: colors.accent,
            },
          ]}
        />
        <View
          style={[
            styles.seg,
            {
              width: `${wC}%`,
              backgroundColor: colors.warm,
            },
          ]}
        />
        <View
          style={[
            styles.seg,
            {
              width: `${wF}%`,
              backgroundColor: colors.violet,
            },
          ]}
        />
      </View>
      <View style={styles.row3}>
        {col('Protein', protein, targetP, colors.accent)}
        {col('Carbs', carbs, targetC, colors.warm)}
        {col('Fat', fat, targetF, colors.violet)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 18,
  },
  seg: { height: '100%' },
  row3: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  labRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  lab: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  big: {
    fontFamily: Fonts.semiBold,
    fontSize: 22,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  gUnit: { fontSize: 13, fontFamily: Fonts.medium },
  sub: { fontFamily: Fonts.medium, fontSize: 11, marginTop: 2 },
});
