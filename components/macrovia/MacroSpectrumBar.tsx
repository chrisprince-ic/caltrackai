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

export function MacroSpectrumBar({ protein, carbs, fat, targetP, targetC, targetF }: Props) {
  const { colors } = useAppTheme();

  const col = (label: string, val: number, target: number, barColor: string) => {
    const pct = target > 0 ? Math.min(1, val / target) : 0;
    const valRound = Math.round(val);
    const targetRound = Math.round(target);
    return (
      <View style={styles.col}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
        <View style={[styles.track, { backgroundColor: colors.hairline }]}>
          <View
            style={[
              styles.fill,
              {
                width: pct === 0 ? 0 : `${Math.max(4, pct * 100)}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.value, { color: colors.text }]}>
          {valRound}
          <Text style={[styles.unit, { color: colors.textMuted }]}>g</Text>
        </Text>
        <Text style={[styles.target, { color: colors.textMuted }]}>/ {targetRound}g</Text>
      </View>
    );
  };

  return (
    <View style={styles.row}>
      {col('PROTEIN', protein, targetP, colors.accent)}
      {col('CARBS', carbs, targetC, colors.warm)}
      {col('FAT', fat, targetF, colors.violet)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  col: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 9,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  track: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  value: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  unit: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  target: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    marginTop: 1,
  },
});
