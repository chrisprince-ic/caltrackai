import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Fonts } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  fillColor: string;
  inkColor: string;
};

export function GroceryProgressRing({
  progress,
  size = 50,
  strokeWidth = 4,
  trackColor,
  fillColor,
  inkColor,
}: Props) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const p = useSharedValue(Math.min(1, Math.max(0, progress)));

  useEffect(() => {
    p.value = withSpring(Math.min(1, Math.max(0, progress)), { damping: 18, stiffness: 160 });
  }, [progress, p]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - p.value),
  }));

  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          transform: [{ rotate: '-90deg' }],
        }}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={cx}
            cy={cy}
            r={r}
            stroke={fillColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeLinecap="round"
            animatedProps={animatedProps}
          />
        </Svg>
      </View>
      <View style={[StyleSheet.absoluteFillObject, styles.pctWrap]} pointerEvents="none">
        <Text style={[styles.pct, { color: inkColor }]}>{pct}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pctWrap: { alignItems: 'center', justifyContent: 'center' },
  pct: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: -0.3,
  },
});
