import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

const BRAND_DARK = Palette.lavender;
const PILL_BG = Palette.haze;
const ON_TARGET_BG = Palette.mist;
const GRAY_PILL_BG = '#F3F4F6';
const GRAY_TEXT = '#6B7280';
const AMBER_BG = '#FEF3EC';
const AMBER_TEXT = '#C2410C';

export type SmartStatusPillProps = {
  eatenToday: number;
  adjustedTarget: number;
  reducedMotion?: boolean;
};

type PillMeta = {
  label: string;
  bg: string;
  fg: string;
  dot: string;
};

function computePill(eaten: number, target: number): PillMeta {
  if (target <= 0)
    return { label: "Day's just starting", bg: GRAY_PILL_BG, fg: GRAY_TEXT, dot: '#CBD5E1' };
  if (eaten === 0)
    return { label: "Day's just starting", bg: GRAY_PILL_BG, fg: GRAY_TEXT, dot: '#CBD5E1' };
  const pct = (eaten / target) * 100;
  if (pct > 105) {
    const overBy = Math.round(Math.max(0, eaten - target));
    return {
      label: `Over by ${overBy.toLocaleString()} kcal`,
      bg: AMBER_BG,
      fg: AMBER_TEXT,
      dot: '#FB923C',
    };
  }
  if (pct >= 90 && pct <= 105)
    return { label: 'On target', bg: ON_TARGET_BG, fg: BRAND_DARK, dot: Palette.iris };
  return { label: 'On track', bg: PILL_BG, fg: BRAND_DARK, dot: Palette.iris };
}

/** Header pill with layout morph + dot indicator + subtle bounce on change. */
export function SmartStatusPill({
  eatenToday,
  adjustedTarget,
  reducedMotion,
}: SmartStatusPillProps) {
  const eaten = Math.round(Math.max(0, eatenToday));
  const target = Math.round(Math.max(0, adjustedTarget));
  const meta = useMemo(() => computePill(eaten, target), [eaten, target]);

  const bounce = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) return;
    bounce.value = withSequence(
      withTiming(1.04, { duration: 180 }),
      withTiming(1, { duration: 220 })
    );
  }, [meta.label, reducedMotion, bounce]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounce.value }],
  }));

  const layout = reducedMotion ? undefined : LinearTransition.springify().damping(18);

  return (
    <Animated.View layout={layout} style={[styles.pill, { backgroundColor: meta.bg }]}>
      <Animated.View style={bounceStyle}>
        <View style={styles.row}>
          <Animated.View
            layout={layout}
            style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: meta.dot }}
          />
          <Text style={[styles.text, { color: meta.fg }]} numberOfLines={1} ellipsizeMode="tail">
            {meta.label}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexShrink: 0,
    alignSelf: 'flex-end',
    maxWidth: 148,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0.2,
    flexShrink: 1,
    flex: 1,
  },
});
