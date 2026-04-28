import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

type CalState = 'onTrack' | 'watch' | 'over';

type Props = {
  consumed: number;
  goal: number;
  syncing?: boolean;
  isDark?: boolean;
};

const STATE_COLORS: Record<CalState, { fill: string; track: string; trackDark: string; label: string }> = {
  onTrack: {
    fill: Palette.iris,
    track: Palette.haze,
    trackDark: 'rgba(34, 197, 94, 0.25)',
    label: 'On track',
  },
  watch: {
    fill: Palette.citrus,
    track: '#FFF7ED',
    trackDark: 'rgba(249, 115, 22, 0.22)',
    label: 'Nearing goal',
  },
  over: {
    fill: Palette.overText,
    track: Palette.overBg,
    trackDark: 'rgba(190, 18, 60, 0.22)',
    label: 'Over goal',
  },
};

const CHIP_COLORS: Record<CalState, { bg: string; bgDark: string; text: string; textDark: string }> = {
  onTrack: { bg: Palette.haze, bgDark: 'rgba(34, 197, 94, 0.22)', text: Palette.lavender, textDark: Palette.mist },
  watch: { bg: '#FFF7ED', bgDark: 'rgba(249, 115, 22, 0.2)', text: '#9A3412', textDark: '#FED7AA' },
  over: { bg: Palette.overBg, bgDark: 'rgba(190, 18, 60, 0.2)', text: Palette.overText, textDark: '#FDA4AF' },
};

export function CalorieCard({ consumed, goal, syncing, isDark = false }: Props) {
  const { colors } = useAppTheme();
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const remaining = Math.max(0, goal - consumed);

  const calState: CalState = pct < 0.85 ? 'onTrack' : pct < 1 ? 'watch' : 'over';
  const sc = STATE_COLORS[calState];
  const cc = CHIP_COLORS[calState];

  const fillWidth = useSharedValue(0);
  useEffect(() => {
    fillWidth.value = withSpring(pct, { damping: 20, stiffness: 80 });
  }, [pct, fillWidth]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%` as `${number}%`,
  }));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Decorative glow blob */}
      <View style={[styles.glow, { backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : Palette.haze }]} />

      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: isDark ? colors.haze : Palette.haze }]}>
          <View style={[styles.dot, { backgroundColor: Palette.iris }]} />
          <Text style={[styles.badgeText, { color: Palette.iris }]}>Today</Text>
          {syncing ? <ActivityIndicator size="small" color={Palette.iris} style={styles.spinner} /> : null}
        </View>
        <View style={[styles.chip, { backgroundColor: isDark ? cc.bgDark : cc.bg }]}>
          <Text style={[styles.chipText, { color: isDark ? cc.textDark : cc.text }]}>{sc.label}</Text>
        </View>
      </View>

      {/* Calorie hero numbers */}
      <View style={styles.heroRow}>
        <View style={styles.heroBlock}>
          <Text style={[styles.bigNum, { color: Palette.iris }]}>{consumed.toLocaleString()}</Text>
          <Text style={[styles.heroLabel, { color: colors.textMuted }]}>eaten</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.calDivider }]} />
        <View style={styles.heroBlock}>
          <Text style={[styles.goalNum, { color: colors.text }]}>{goal.toLocaleString()}</Text>
          <Text style={[styles.heroLabel, { color: colors.textMuted }]}>goal</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.calDivider }]} />
        <View style={styles.heroBlock}>
          <Text style={[styles.goalNum, { color: colors.text }]}>{remaining.toLocaleString()}</Text>
          <Text style={[styles.heroLabel, { color: colors.textMuted }]}>left</Text>
        </View>
      </View>

      {/* Animated progress bar */}
      <View style={[styles.track, { backgroundColor: isDark ? sc.trackDark : sc.track }]}>
        <Animated.View style={[styles.fill, { backgroundColor: sc.fill }, fillStyle]} />
      </View>

      <Text style={[styles.foot, { color: colors.textMuted }]}>
        {Math.round(pct * 100)}% of daily goal
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontFamily: Fonts.semiBold, fontSize: 13, letterSpacing: 0.3 },
  spinner: { marginLeft: 2, transform: [{ scale: 0.75 }] },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chipText: { fontFamily: Fonts.semiBold, fontSize: 12 },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 0,
  },
  heroBlock: { flex: 1, alignItems: 'center' },
  bigNum: {
    fontFamily: Fonts.bold,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1,
  },
  goalNum: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  heroLabel: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: { width: 1, height: 52, marginHorizontal: 4 },
  track: {
    height: 14,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  foot: { fontFamily: Fonts.regular, fontSize: 13 },
});
