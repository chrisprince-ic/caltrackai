import { LinearGradient } from 'expo-linear-gradient';
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
    fill: Palette.white,
    track: 'rgba(255,255,255,0.25)',
    trackDark: 'rgba(255,255,255,0.15)',
    label: 'On track',
  },
  watch: {
    fill: '#FED7AA',
    track: 'rgba(254,215,170,0.35)',
    trackDark: 'rgba(254,215,170,0.2)',
    label: 'Nearing goal',
  },
  over: {
    fill: '#FECDD3',
    track: 'rgba(254,205,211,0.35)',
    trackDark: 'rgba(254,205,211,0.2)',
    label: 'Over goal',
  },
};

const GRADIENTS: Record<CalState, [string, string, string]> = {
  onTrack: ['#16A34A', '#22C55E', '#4ADE80'],
  watch: ['#EA580C', '#F97316', '#FB923C'],
  over: ['#BE123C', '#E11D48', '#F43F5E'],
};

export function CalorieCard({ consumed, goal, syncing, isDark = false }: Props) {
  const { colors } = useAppTheme();
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const remaining = Math.max(0, goal - consumed);

  const calState: CalState = pct < 0.85 ? 'onTrack' : pct < 1 ? 'watch' : 'over';
  const sc = STATE_COLORS[calState];
  const grad = GRADIENTS[calState];

  const fillWidth = useSharedValue(0);
  useEffect(() => {
    fillWidth.value = withSpring(pct, { damping: 20, stiffness: 80 });
  }, [pct, fillWidth]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%` as `${number}%`,
  }));

  return (
    <LinearGradient
      colors={grad}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}>
      {/* Decorative blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <View style={styles.dot} />
          <Text style={styles.badgeText}>Today</Text>
          {syncing ? <ActivityIndicator size="small" color={Palette.white} style={styles.spinner} /> : null}
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{sc.label}</Text>
        </View>
      </View>

      {/* Calorie hero numbers */}
      <View style={styles.heroRow}>
        <View style={styles.heroBlock}>
          <Text style={styles.bigNum}>{consumed.toLocaleString()}</Text>
          <Text style={styles.heroLabel}>eaten</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.heroBlock}>
          <Text style={styles.goalNum}>{goal.toLocaleString()}</Text>
          <Text style={styles.heroLabel}>goal</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.heroBlock}>
          <Text style={styles.goalNum}>{remaining.toLocaleString()}</Text>
          <Text style={styles.heroLabel}>left</Text>
        </View>
      </View>

      {/* Animated progress bar */}
      <View style={[styles.track, { backgroundColor: isDark ? sc.trackDark : sc.track }]}>
        <Animated.View style={[styles.fill, { backgroundColor: sc.fill }, fillStyle]} />
      </View>

      <Text style={styles.foot}>
        {Math.round(pct * 100)}% of daily goal
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 22,
    overflow: 'hidden',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  blob1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -60,
    right: -50,
  },
  blob2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.07)',
    bottom: -40,
    left: -30,
  },
  blob3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: 20,
    left: '40%',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Palette.white },
  badgeText: { fontFamily: Fonts.semiBold, fontSize: 13, color: Palette.white, letterSpacing: 0.3 },
  spinner: { marginLeft: 2, transform: [{ scale: 0.75 }] },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chipText: { fontFamily: Fonts.semiBold, fontSize: 12, color: Palette.white },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroBlock: { flex: 1, alignItems: 'center' },
  bigNum: {
    fontFamily: Fonts.bold,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1,
    color: Palette.white,
  },
  goalNum: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: Palette.white,
  },
  heroLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.75)',
  },
  divider: { width: 1, height: 52, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 4 },
  track: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Palette.white,
  },
  foot: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
});
