import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { HealthConnectTile } from '@/components/home/HealthConnectTile';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNutritionLog } from '@/contexts/NutritionLogContext';
import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import { useCalories } from '@/hooks/useCalories';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { computeAdjustedDailyTarget } from '@/lib/daily-energy';

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function bendMacroTowardHit(g: number, t: number) {
  if (t <= 0) return 1;
  const r = g / t;
  return clamp01(r > 1 ? Math.max(0, 2 - r) : r);
}

function healthAdjustsDailyTarget(hk: ReturnType<typeof useCalories>): boolean {
  if (!hk.platformSupported || hk.needsAuthCTA) return false;
  const s = hk.healthKitStatus;
  return s !== 'unavailable' && s !== 'denied';
}

function resolveAdjustedTarget(
  base: number,
  active: number,
  weightGoal: ReturnType<typeof useNutritionTargets>['weightGoal'],
  hk: ReturnType<typeof useCalories>
): { target: number; add: number } {
  const baseR = Math.round(Math.max(0, base));
  if (!healthAdjustsDailyTarget(hk)) return { target: baseR, add: 0 };
  const target = computeAdjustedDailyTarget(baseR, active, weightGoal);
  return { target, add: Math.max(0, target - baseR) };
}

// ─── Simple single-arc gauge ──────────────────────────────────────────────────

function SimpleArcGauge({
  width,
  progress01,
  trackColor,
  fillColor,
  calories,
  target,
  ink,
  muted,
}: {
  width: number;
  progress01: number;
  trackColor: string;
  fillColor: string;
  calories: number;
  target: number;
  ink: string;
  muted: string;
}) {
  const sw = Math.max(11, Math.round(width * 0.038));
  const R = Math.round(width / 2 - sw / 2);
  const cx = width / 2;
  const cy = R + sw / 2;
  const svgH = cy + sw / 2 + 2;

  const lx = sw / 2;
  const rx = width - sw / 2;

  const arcPath = `M ${lx} ${cy} A ${R} ${R} 0 0 1 ${rx} ${cy}`;
  const circ = Math.PI * R;
  const fillLen = Math.max(0, Math.min(circ, progress01 * circ));
  const gapLen = circ + 2;

  // Position labels at ~45% up from baseline of the arc bowl
  const centerTop = cy - R * 0.52;

  return (
    <View style={{ width, height: svgH + 30, alignSelf: 'center' }}>
      <Svg width={width} height={svgH}>
        {/* Track arc */}
        <Path
          d={arcPath}
          stroke={trackColor}
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
        />
        {/* Progress fill */}
        {fillLen > 1 && (
          <Path
            d={arcPath}
            stroke={fillColor}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${fillLen} ${gapLen}`}
          />
        )}
      </Svg>

      {/* Center calorie labels */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { top: centerTop, alignItems: 'center', justifyContent: 'flex-start' },
        ]}
        pointerEvents="none">
        <Text
          style={[arcStyles.digits, { color: ink }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}>
          {calories.toLocaleString()}
        </Text>
        <Text style={[arcStyles.against, { color: muted }]}>
          of {target > 0 ? target.toLocaleString() : '—'} kcal
        </Text>
      </View>

      {/* Arc endpoint labels */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { justifyContent: 'flex-end', paddingBottom: 2, paddingHorizontal: sw / 2 - 2, flexDirection: 'row', alignItems: 'flex-end', top: svgH - 2 },
        ]}
        pointerEvents="none">
        <Text style={[arcStyles.endLabel, { color: muted, flex: 1, textAlign: 'left' }]}>0</Text>
        <Text style={[arcStyles.endLabel, { color: muted, flex: 1, textAlign: 'right' }]}>
          {target > 0 ? target.toLocaleString() : '—'}
        </Text>
      </View>
    </View>
  );
}

const arcStyles = StyleSheet.create({
  digits: {
    fontFamily: Fonts.bold,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  against: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  endLabel: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    letterSpacing: 0.2,
  },
});

// ─── Stat box ─────────────────────────────────────────────────────────────────

function StatBox({
  icon,
  iconColor,
  value,
  valueColor,
  label,
  labelColor,
  borderColor,
  bg,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  value: string;
  valueColor: string;
  label: string;
  labelColor: string;
  borderColor: string;
  bg: string;
}) {
  return (
    <View style={[statStyles.box, { borderColor, backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text
        style={[statStyles.value, { color: valueColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}>
        {value}
      </Text>
      <Text style={[statStyles.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  value: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

// ─── Main card ────────────────────────────────────────────────────────────────

export function DailyEnergyCard() {
  const reducedMotion = useReducedMotion();
  const { } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { totals } = useNutritionLog();
  const { dailyCalories: baseGoal, weightGoal, proteinG, carbsG, fatG } = useNutritionTargets();
  const hk = useCalories({ initialWeightGoal: weightGoal });

  const eaten = Math.round(Math.max(0, totals.calories));
  const base = Math.round(Math.max(0, baseGoal));
  const active = Math.round(Math.max(0, hk.activeKcal));
  const resting = Math.round(Math.max(0, hk.basalKcal));

  const { target: adjustedTarget } = resolveAdjustedTarget(base, active, weightGoal, hk);

  const burnLoading =
    hk.platformSupported &&
    !hk.needsAuthCTA &&
    (hk.refreshing || (hk.loading && !hk.fetchedOnce));

  const remaining = adjustedTarget - eaten;
  const overPortion = eaten > adjustedTarget && adjustedTarget > 0;
  const progress01 = adjustedTarget > 0 ? Math.min(1, eaten / adjustedTarget) : 0;

  const hkConnected =
    hk.healthKitStatus === 'connected' && hk.platformSupported && !hk.needsAuthCTA;

  // Wellness score
  const calorieBalanceHarmony =
    adjustedTarget <= 0
      ? 0.4
      : clamp01(
          1 - Math.min(1.1, Math.abs(eaten - adjustedTarget) / Math.max(adjustedTarget, 1))
        );
  const harmony =
    (bendMacroTowardHit(totals.proteinGrams, proteinG) +
      bendMacroTowardHit(totals.carbsGrams, carbsG) +
      bendMacroTowardHit(totals.fatGrams, fatG)) /
    3;
  let wellnessScore = Math.round(
    calorieBalanceHarmony * 56 + harmony * 38 + (hkConnected ? 5 : 0)
  );
  if (eaten <= 0) wellnessScore -= 14;
  wellnessScore = Math.min(96, Math.max(52, wellnessScore));

  const showHealthTile =
    hk.healthKitStatus === 'denied' || hk.healthKitStatus === 'unavailable';

  const burnedValue = burnLoading
    ? '…'
    : hkConnected
      ? Math.round(active + resting).toLocaleString()
      : '—';

  const deficitValue =
    adjustedTarget <= 0
      ? '—'
      : overPortion
        ? `+${Math.abs(remaining)}`
        : `${Math.max(0, remaining)}`;

  const muted = colors.textMuted;
  const ink = colors.text;
  const divider = isDark ? 'rgba(255,255,255,0.08)' : '#F0F0EE';
  const cardBg = isDark ? colors.surface : '#FFFFFF';
  const cardBorder = isDark ? colors.border : colors.glassStroke;
  const statBg = isDark ? colors.surfaceMuted : '#F7FAF8';

  const screenW = Dimensions.get('window').width;
  const gaugeW = Math.min(320, Math.max(260, screenW - 72));
  const trackColor = isDark ? 'rgba(255,255,255,0.12)' : colors.accentSoft;
  const fillColor = overPortion ? colors.warm : colors.accentDeep;

  const handleHealthConnect = useCallback(async () => {
    return hk.requestAccess();
  }, [hk]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.cardOuter, { shadowColor: isDark ? '#000' : colors.shadow }]}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.cardPad}>

            {/* Arc gauge */}
            <View style={styles.gaugeSection}>
              <SimpleArcGauge
                width={gaugeW}
                progress01={progress01}
                trackColor={trackColor}
                fillColor={fillColor}
                calories={eaten}
                target={adjustedTarget}
                ink={ink}
                muted={muted}
              />
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: divider }]} />

            {/* Three stat boxes */}
            <View style={styles.statRow}>
              <StatBox
                icon="flame-outline"
                iconColor={colors.warm}
                value={burnedValue}
                valueColor={ink}
                label="Burned"
                labelColor={muted}
                borderColor={cardBorder}
                bg={statBg}
              />
              <StatBox
                icon="trending-down-outline"
                iconColor={overPortion ? colors.warm : colors.accentDeep}
                value={deficitValue}
                valueColor={overPortion ? colors.warm : colors.accentDeep}
                label="Deficit"
                labelColor={muted}
                borderColor={cardBorder}
                bg={statBg}
              />
              <StatBox
                icon="ellipse-outline"
                iconColor={colors.violet}
                value={`${wellnessScore}`}
                valueColor={colors.violet}
                label="Wellness"
                labelColor={muted}
                borderColor={cardBorder}
                bg={statBg}
              />
            </View>

            {/* Apple Health tile */}
            {showHealthTile ? (
              <View style={styles.healthTileWrap}>
                <HealthConnectTile
                  variant={hk.healthKitStatus === 'denied' ? 'connect' : 'unavailable'}
                  onConnect={hk.healthKitStatus === 'denied' ? handleHealthConnect : undefined}
                  reducedMotion={reducedMotion}
                />
              </View>
            ) : null}

          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
  cardOuter: {
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 22,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardPad: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 18,
  },
  gaugeSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
    marginHorizontal: -2,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  healthTileWrap: {
    marginTop: 14,
  },
});
