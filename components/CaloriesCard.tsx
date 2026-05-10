import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { useCalories, type WeightGoalMode } from '@/hooks/useCalories';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;
const RING_MAX_KCAL = 3200;

function RingProgress({ pct, color, trackColor }: { pct: number; color: string; trackColor: string }) {
  const offset = RING_C * (1 - Math.min(1, Math.max(0, pct)));
  return (
    <Svg width={108} height={108} viewBox="0 0 108 108">
      <G transform="rotate(-90 54 54)">
        <Circle cx={54} cy={54} r={RING_R} stroke={trackColor} strokeWidth={9} fill="none" />
        <Circle
          cx={54}
          cy={54}
          r={RING_R}
          stroke={color}
          strokeWidth={9}
          fill="none"
          strokeDasharray={`${RING_C} ${RING_C}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

function AnimatedNumber({ value, color }: { value: number; color: string }) {
  const op = useSharedValue(1);
  useEffect(() => {
    op.value = 0.65;
    op.value = withSpring(1, { damping: 14, stiffness: 200 });
  }, [value, op]);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.Text style={[styles.heroNum, { color }, style]}>{value.toLocaleString()}</Animated.Text>
  );
}

function WeekSparkline({ values, maxVal, muted }: { values: number[]; maxVal: number; muted: string }) {
  const m = Math.max(maxVal, 1);
  return (
    <View style={styles.sparkRow}>
      {values.map((v, i) => {
        const h = 4 + (v / m) * 28;
        return <View key={i} style={[styles.sparkBar, { height: h, backgroundColor: muted }]} />;
      })}
    </View>
  );
}

function GoalChips({
  value,
  onChange,
  activeColor,
  border,
  muted,
}: {
  value: WeightGoalMode;
  onChange: (g: WeightGoalMode) => void;
  activeColor: string;
  border: string;
  muted: string;
}) {
  const items: { id: WeightGoalMode; label: string }[] = [
    { id: 'lose', label: 'Lose' },
    { id: 'maintain', label: 'Maintain' },
    { id: 'gain', label: 'Gain' },
  ];
  return (
    <View style={styles.chipRow}>
      {items.map(({ id, label }) => {
        const on = value === id;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            style={[
              styles.chip,
              { borderColor: on ? activeColor : border },
              on && { backgroundColor: activeColor + '22' },
            ]}>
            <Text
              style={[styles.chipText, { color: on ? activeColor : muted }, on && { fontFamily: Fonts.semiBold }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SkeletonCard({ surface, border }: { surface: string; border: string }) {
  return (
    <View style={[styles.card, styles.skeleton, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.skLine1} />
      <View style={styles.skLine2} />
      <View style={styles.skRing} />
    </View>
  );
}

/**
 * Apple Fitness–inspired “Calories Burned” card (Active + Basal from HealthKit on iOS).
 */
export function CaloriesCard() {
  const { colors, isDark } = useAppTheme();
  const c = useCalories();

  const ringPct = useMemo(() => {
    if (c.totalKcal <= 0) return 0;
    return Math.min(1, c.totalKcal / RING_MAX_KCAL);
  }, [c.totalKcal]);

  const weekMax = useMemo(() => Math.max(...c.weekTotals, 1), [c.weekTotals]);

  if (!c.platformSupported) {
    return (
      <Animated.View entering={FadeInUp.duration(420).springify()}>
        <View style={[styles.card, styles.platformNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="phone-portrait-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.platformText, { color: colors.textMuted }]}>
            Calories burned syncs with Apple Health on iPhone. Open the app on iOS to connect.
          </Text>
        </View>
      </Animated.View>
    );
  }

  if (c.loading && !c.refreshing) {
    return <SkeletonCard surface={colors.surface} border={colors.border} />;
  }

  return (
    <Animated.View entering={FadeInUp.duration(480).springify()}>
      <Animated.View entering={FadeIn.duration(360)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Calories Burned</Text>
            <Text style={[styles.subLabel, { color: colors.textMuted }]}>Active + Resting</Text>
          </View>
          <Pressable
            onPress={() => void c.refresh()}
            style={[styles.iconBtn, { backgroundColor: colors.chipOnLight, borderColor: colors.border }]}
            accessibilityLabel="Refresh calories burned">
            {c.refreshing ? (
              <ActivityIndicator size="small" color={Palette.citrus} />
            ) : (
              <Ionicons name="refresh" size={20} color={Palette.citrus} />
            )}
          </Pressable>
        </View>

        {c.error ? <Text style={[styles.err, { color: Palette.flamingo }]}>{c.error}</Text> : null}

        {c.needsAuthCTA ? (
          <View style={styles.ctaBlock}>
            <Text style={[styles.ctaCopy, { color: colors.text }]}>
              Connect to Apple Health to see how many calories you’ve burned today.
            </Text>
            <Pressable
              onPress={() => void c.requestAccess()}
              style={[styles.ctaBtn, { backgroundColor: isDark ? '#2D2D2D' : '#F3F4F6' }]}
              accessibilityRole="button"
              accessibilityLabel="Enable Health access">
              <Ionicons name="heart" size={18} color={Palette.citrus} />
              <Text style={styles.ctaBtnText}>Enable Health Access</Text>
            </Pressable>
            <Pressable onPress={c.openHealthSettings} accessibilityRole="button">
              <Text style={[styles.link, { color: Palette.iris }]}>Open Settings</Text>
            </Pressable>
          </View>
        ) : c.showEmptyBurn ? (
          <View style={styles.emptyBlock}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No data available yet</Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              Add activity in the Health app or wear your Apple Watch — then pull to refresh.
            </Text>
            <Pressable onPress={c.openHealthSettings} accessibilityRole="button">
              <Text style={[styles.link, { color: Palette.iris }]}>Open Health settings</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.ringRow}>
              <View style={styles.ringWrap}>
                <RingProgress
                  pct={ringPct}
                  color={Palette.citrus}
                  trackColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                />
                <View style={styles.ringCenter} pointerEvents="none">
                  <AnimatedNumber value={c.totalKcal} color={colors.text} />
                  <Text style={[styles.kcal, { color: colors.textMuted }]}>kcal</Text>
                </View>
              </View>
              <View style={styles.metaCol}>
                <Text style={[styles.todayPill, { color: colors.text, backgroundColor: colors.chipOnLight }]}>
                  Today
                </Text>
                <Text style={[styles.splitLine, { color: colors.text }]}>
                  Active{' '}
                  <Text style={{ fontFamily: Fonts.semiBold }}>{c.activeKcal.toLocaleString()}</Text>
                  <Text style={{ color: colors.textMuted }}> kcal</Text>
                </Text>
                <Text style={[styles.splitLine, { color: colors.text }]}>
                  Resting{' '}
                  <Text style={{ fontFamily: Fonts.semiBold }}>{c.basalKcal.toLocaleString()}</Text>
                  <Text style={{ color: colors.textMuted }}> kcal</Text>
                </Text>
              </View>
            </View>

            <Text style={[styles.sparkTitle, { color: colors.textMuted }]}>Last 7 days</Text>
            <WeekSparkline values={c.weekTotals} maxVal={weekMax} muted={isDark ? '#3F3F46' : '#E5E7EB'} />

            {c.suggestedIntakeKcal != null ? (
              <View style={[styles.suggestBlock, { borderTopColor: colors.border }]}>
                <Text style={[styles.suggestLabel, { color: colors.textMuted }]}>Goal for intake model</Text>
                <GoalChips
                  value={c.weightGoal}
                  onChange={c.setWeightGoal}
                  activeColor={Palette.iris}
                  border={colors.border}
                  muted={colors.textMuted}
                />
                <Text style={[styles.suggestValue, { color: colors.text }]}>
                  Suggested intake:{' '}
                  <Text style={{ fontFamily: Fonts.bold, color: Palette.iris }}>
                    {c.suggestedIntakeKcal.toLocaleString()} kcal
                  </Text>
                </Text>
                <Text style={[styles.suggestFoot, { color: colors.textMuted }]}>
                  Based on today’s burn {c.weightGoal === 'maintain' ? '— match your expenditure' : c.weightGoal === 'lose' ? '— deficit target' : '— surplus target'}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontFamily: Fonts.bold, fontSize: 19, letterSpacing: -0.3 },
  subLabel: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 2 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  err: { fontFamily: Fonts.regular, fontSize: 13, marginBottom: 6 },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  ringWrap: { width: 108, height: 108, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  heroNum: { fontFamily: Fonts.bold, fontSize: 26, color: Palette.obsidian, letterSpacing: -0.5 },
  kcal: { fontFamily: Fonts.medium, fontSize: 11, marginTop: -2 },
  metaCol: { flex: 1, minWidth: 0, paddingLeft: 4, gap: 4 },
  todayPill: {
    alignSelf: 'flex-start',
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  splitLine: { fontFamily: Fonts.regular, fontSize: 14 },
  sparkTitle: { fontFamily: Fonts.medium, fontSize: 12, marginTop: 16, marginBottom: 8 },
  sparkRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, height: 36 },
  sparkBar: { flex: 1, borderRadius: 4, minWidth: 6, maxWidth: 32 },
  suggestBlock: { marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  suggestLabel: { fontFamily: Fonts.medium, fontSize: 12, marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontFamily: Fonts.regular, fontSize: 13, color: Palette.dusk },
  suggestValue: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22 },
  suggestFoot: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 6, lineHeight: 16 },
  ctaBlock: { marginTop: 8, gap: 12 },
  ctaCopy: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  ctaBtnText: { fontFamily: Fonts.semiBold, fontSize: 15, color: Palette.citrus },
  link: { fontFamily: Fonts.semiBold, fontSize: 14, textAlign: 'center' },
  emptyBlock: { marginTop: 4, gap: 8, paddingVertical: 8 },
  emptyText: { fontFamily: Fonts.semiBold, fontSize: 16 },
  emptyHint: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18 },
  platformNote: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  platformText: { flex: 1, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18 },
  skeleton: { minHeight: 180, justifyContent: 'center', gap: 12 },
  skLine1: { height: 14, width: '45%', borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.08)' },
  skLine2: { height: 10, width: '30%', borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.06)' },
  skRing: { alignSelf: 'center', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.05)' },
});
