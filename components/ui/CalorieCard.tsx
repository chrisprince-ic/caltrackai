import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { BRAND_GREEN_SOFT_GRADIENT_3, HERO_GRADIENT_STOPS } from '@/constants/hero';
import { COLORS, Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

type CalState = 'empty' | 'onTrack' | 'watch' | 'over';

type Props = {
  consumed: number;
  goal: number;
  syncing?: boolean;
  isDark?: boolean;
  /**
   * Reserved for future use. Currently unused — the empty state shows a
   * 0% progress bar instead of an in-card CTA, since the Macros section
   * already exposes a "Log meal" chip.
   */
  onLogPress?: () => void;
  /** `home` = white card on lime hero (Home screen). Default: gradient card. */
  variant?: 'gradient' | 'home';
};

type Theme = {
  /** Three-stop gradient for the card surface. */
  gradient: [string, string, string];
  /** Primary text + numbers. */
  fg: string;
  /** Secondary / label text. */
  fgMuted: string;
  /** Subtle vertical separators between columns. */
  divider: string;
  /** Status pill background. */
  pillBg: string;
  /** Today badge background. */
  badgeBg: string;
  /** Progress bar track. */
  trackBg: string;
  /** Progress bar fill. */
  fillBg: string;
  /** Status pill label. */
  statusLabel: string;
};

const THEMES: Record<CalState, Theme> = {
  empty: {
    // Light mint — FAB / `HERO_GRADIENT_STOPS` family.
    gradient: [...BRAND_GREEN_SOFT_GRADIENT_3],
    fg: Palette.obsidian,
    fgMuted: '#15803D',
    divider: 'rgba(22,101,52,0.18)',
    pillBg: 'rgba(22,101,52,0.10)',
    badgeBg: 'rgba(22,101,52,0.08)',
    trackBg: 'rgba(22,101,52,0.12)',
    fillBg: '#22C55E',
    statusLabel: 'Get started',
  },
  onTrack: {
    // Same 3-stop as brand gradient (Scan FAB hue family).
    gradient: [...HERO_GRADIENT_STOPS],
    fg: Palette.white,
    fgMuted: 'rgba(255,255,255,0.78)',
    divider: 'rgba(255,255,255,0.25)',
    pillBg: 'rgba(255,255,255,0.20)',
    badgeBg: 'rgba(255,255,255,0.20)',
    trackBg: 'rgba(255,255,255,0.20)',
    fillBg: 'rgba(255,255,255,0.80)',
    statusLabel: 'On track',
  },
  watch: {
    // Amber for 90–100% — "almost there".
    gradient: ['#D97706', '#F59E0B', '#FBBF24'],
    fg: Palette.white,
    fgMuted: 'rgba(255,255,255,0.78)',
    divider: 'rgba(255,255,255,0.25)',
    pillBg: 'rgba(255,255,255,0.20)',
    badgeBg: 'rgba(255,255,255,0.20)',
    trackBg: 'rgba(255,255,255,0.20)',
    fillBg: 'rgba(255,255,255,0.80)',
    statusLabel: 'Almost there',
  },
  over: {
    // Red for >100% — clearly over goal.
    gradient: ['#DC2626', '#EF4444', '#F87171'],
    fg: Palette.white,
    fgMuted: 'rgba(255,255,255,0.78)',
    divider: 'rgba(255,255,255,0.25)',
    pillBg: 'rgba(255,255,255,0.20)',
    badgeBg: 'rgba(255,255,255,0.20)',
    trackBg: 'rgba(255,255,255,0.20)',
    fillBg: 'rgba(255,255,255,0.80)',
    statusLabel: 'Over goal',
  },
};

function pickState(consumed: number, goal: number): CalState {
  if (consumed <= 0) return 'empty';
  if (goal <= 0) return 'onTrack';
  const pct = consumed / goal;
  if (pct > 1) return 'over';
  if (pct >= 0.9) return 'watch';
  return 'onTrack';
}

type HomeStatusTint = 'neutral' | 'green' | 'red' | 'amber';

function pickHomeStatus(
  eaten: number,
  goal: number
): { label: string; tint: HomeStatusTint } {
  if (eaten === 0) return { label: 'Get started', tint: 'neutral' };
  if (goal <= 0) return { label: 'On track', tint: 'green' };
  const percent = (eaten / goal) * 100;
  if (percent >= 100 && percent <= 110) return { label: 'On target', tint: 'green' };
  if (percent > 110) return { label: 'Over goal', tint: 'red' };
  if (percent >= 80) return { label: 'Almost there', tint: 'amber' };
  return { label: 'On track', tint: 'green' };
}

function homeStatusPillColors(tint: HomeStatusTint): { bg: string; fg: string } {
  switch (tint) {
    case 'neutral':
      return { bg: 'rgba(15,31,8,0.06)', fg: COLORS.ink };
    case 'green':
      return { bg: 'rgba(34,197,94,0.14)', fg: COLORS.brandGreenDark };
    case 'red':
      return { bg: 'rgba(239,68,68,0.14)', fg: '#DC2626' };
    case 'amber':
      return { bg: 'rgba(245,158,11,0.18)', fg: '#B45309' };
  }
}

/** Sizes the EATEN number based on digit count so it never wraps. */
function bigNumSize(value: number): number {
  const digits = Math.max(1, Math.abs(Math.round(value))).toString().length;
  if (digits <= 4) return 56;
  if (digits === 5) return 44;
  return 36;
}

/** Sizes the GOAL / LEFT numbers consistently with the EATEN scale. */
function smallNumSize(value: number): number {
  const digits = Math.max(1, Math.abs(Math.round(value))).toString().length;
  if (digits <= 4) return 30;
  if (digits === 5) return 26;
  return 22;
}

export function CalorieCard({
  consumed,
  goal,
  syncing,
  isDark = false,
  onLogPress,
  variant = 'gradient',
}: Props) {
  void isDark;
  void onLogPress;
  const safeConsumed = Math.max(0, Math.round(consumed));
  const safeGoal = Math.max(0, Math.round(goal));
  const remaining = Math.max(0, safeGoal - safeConsumed);
  const calState = pickState(safeConsumed, safeGoal);
  const t = THEMES[calState];

  const pctRaw = safeGoal > 0 ? safeConsumed / safeGoal : 0;
  const pctClamped = Math.min(1, pctRaw);
  const pctLabel = Math.round(pctRaw * 100);

  const fillWidth = useSharedValue(0);
  useEffect(() => {
    fillWidth.value = withSpring(pctClamped, { damping: 20, stiffness: 80 });
  }, [pctClamped, fillWidth]);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%` as `${number}%`,
  }));

  const homeStatus = pickHomeStatus(safeConsumed, safeGoal);
  const statusColors = homeStatusPillColors(homeStatus.tint);
  const { colors: themeColors } = useAppTheme();

  if (variant === 'home') {
    const cardBg = isDark ? themeColors.surface : COLORS.white;
    const borderC = isDark ? themeColors.border : 'rgba(0,0,0,0.04)';
    const ink = isDark ? themeColors.text : COLORS.ink;
    const inkMuted = isDark ? themeColors.textMuted : COLORS.inkMuted;
    return (
      <View
        style={[
          styles.homeCard,
          {
            backgroundColor: cardBg,
            borderColor: borderC,
            shadowColor: '#000',
          },
        ]}>
        <View style={styles.homeHeaderRow}>
          <View style={[styles.homeTodayBadge, { backgroundColor: COLORS.brandGreenTint }]}>
            <View style={[styles.homeDot, { backgroundColor: COLORS.brandGreenDark }]} />
            <Text style={[styles.homeBadgeText, { color: ink }]}>Today</Text>
            {syncing ? (
              <ActivityIndicator size="small" color={ink} style={styles.spinner} />
            ) : null}
          </View>
          <View style={[styles.homePill, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.homePillText, { color: statusColors.fg }]}>{homeStatus.label}</Text>
          </View>
        </View>

        <View style={styles.homeHeroRow}>
          <View style={styles.homeHeroBlock}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              style={[styles.homeColNum, { color: ink }]}>
              {safeConsumed.toLocaleString()}
            </Text>
            <Text style={[styles.homeColLabel, { color: inkMuted }]}>eaten</Text>
          </View>
          <View
            style={[
              styles.homeDivider,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,31,8,0.08)' },
            ]}
          />
          <View style={styles.homeHeroBlock}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              style={[styles.homeColNum, { color: ink }]}>
              {safeGoal.toLocaleString()}
            </Text>
            <Text style={[styles.homeColLabel, { color: inkMuted }]}>goal</Text>
          </View>
          <View
            style={[
              styles.homeDivider,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,31,8,0.08)' },
            ]}
          />
          <View style={styles.homeHeroBlock}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              style={[styles.homeColNum, { color: ink }]}>
              {remaining.toLocaleString()}
            </Text>
            <Text style={[styles.homeColLabel, { color: inkMuted }]}>left</Text>
          </View>
        </View>

        <View style={[styles.homeTrack, { backgroundColor: COLORS.brandGreenTint }]}>
          <Animated.View
            style={[styles.homeFill, { backgroundColor: COLORS.brandGreen }, fillStyle]}
          />
        </View>
        <Text style={[styles.homeFoot, { color: inkMuted }]}>
          {pctLabel}% of daily goal · {remaining.toLocaleString()} kcal remaining
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={t.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      {/* Header row: Today (left) + status (right) */}
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: t.badgeBg }]}>
          <View style={[styles.dot, { backgroundColor: t.fg }]} />
          <Text style={[styles.badgeText, { color: t.fg }]}>Today</Text>
          {syncing ? (
            <ActivityIndicator size="small" color={t.fg} style={styles.spinner} />
          ) : null}
        </View>
        <View style={[styles.pill, { backgroundColor: t.pillBg }]}>
          <Text style={[styles.pillText, { color: t.fg }]}>{t.statusLabel}</Text>
        </View>
      </View>

      {/* Three equal columns: EATEN | GOAL | LEFT */}
      <View style={styles.heroRow}>
        <View style={styles.heroBlock}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={[styles.bigNum, { color: t.fg, fontSize: bigNumSize(safeConsumed) }]}>
            {safeConsumed.toLocaleString()}
          </Text>
          <Text style={[styles.heroLabel, { color: t.fgMuted }]}>eaten</Text>
        </View>

        <View style={[styles.colDivider, { backgroundColor: t.divider }]} />

        <View style={styles.heroBlock}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={[styles.smallNum, { color: t.fg, fontSize: smallNumSize(safeGoal) }]}>
            {safeGoal.toLocaleString()}
          </Text>
          <Text style={[styles.heroLabel, { color: t.fgMuted }]}>goal</Text>
        </View>

        <View style={[styles.colDivider, { backgroundColor: t.divider }]} />

        <View style={styles.heroBlock}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={[styles.smallNum, { color: t.fg, fontSize: smallNumSize(remaining) }]}>
            {remaining.toLocaleString()}
          </Text>
          <Text style={[styles.heroLabel, { color: t.fgMuted }]}>left</Text>
        </View>
      </View>

      {/* Footer: progress bar + caption (always rendered, even at 0%). */}
      <View style={[styles.track, { backgroundColor: t.trackBg }]}>
        <Animated.View style={[styles.fill, { backgroundColor: t.fillBg }, fillStyle]} />
      </View>
      <Text style={[styles.foot, { color: t.fgMuted }]}>{pctLabel}% of daily goal</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  blob1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.10)',
    top: -60,
    right: -50,
  },
  blob2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -40,
    left: -30,
  },
  blob3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 20,
    left: '40%',
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
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
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: { fontFamily: Fonts.semiBold, fontSize: 12 },

  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    minHeight: 80,
  },
  heroBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  colDivider: {
    width: StyleSheet.hairlineWidth * 2,
    height: 56,
    marginHorizontal: 2,
    borderRadius: 1,
  },
  bigNum: {
    fontFamily: Fonts.bold,
    letterSpacing: -1,
    textAlign: 'center',
    includeFontPadding: false,
  },
  smallNum: {
    fontFamily: Fonts.bold,
    letterSpacing: -0.4,
    textAlign: 'center',
    includeFontPadding: false,
  },
  heroLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Progress bar
  track: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  foot: { fontFamily: Fonts.regular, fontSize: 13 },

  homeCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  homeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  homeTodayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  homeDot: { width: 7, height: 7, borderRadius: 4 },
  homeBadgeText: { fontFamily: Fonts.semiBold, fontSize: 12, letterSpacing: 0.3 },
  homePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  homePillText: { fontFamily: Fonts.semiBold, fontSize: 12 },
  homeHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    minHeight: 64,
  },
  homeHeroBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  homeDivider: {
    width: StyleSheet.hairlineWidth * 2,
    height: 48,
    marginHorizontal: 2,
    borderRadius: 1,
  },
  homeColNum: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  homeColLabel: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  homeTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  homeFill: {
    height: '100%',
    borderRadius: 999,
  },
  homeFoot: { fontFamily: Fonts.regular, fontSize: 11, lineHeight: 15 },
});
