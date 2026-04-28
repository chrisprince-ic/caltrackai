import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useEffect } from 'react';

import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';

type Props = {
  label: string;
  current: number;
  goal: number;
  color: string;
  tint: string;
  icon: keyof typeof Ionicons.glyphMap;
  delay?: number;
};

export function MacroBar({ label, current, goal, color, tint, icon, delay = 0 }: Props) {
  const { colors } = useAppTheme();
  const rawPct = goal > 0 ? Math.min(1, current / goal) : 0;
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withSpring(rawPct, { damping: 18, stiffness: 90 });
  }, [rawPct, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as `${number}%`,
  }));

  const remain = Math.max(0, goal - current);

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(380).springify()}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.iconBlob, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={[styles.name, { color: colors.text }]}>{label}</Text>
          <Text style={styles.nums}>
            <Text style={{ color: colors.text }}>{current}</Text>
            <Text style={{ color: colors.textMuted }}>/{goal}g</Text>
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: tint }]}>
          <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
        </View>
        <Text style={[styles.remain, { color: colors.textMuted }]}>{remain}g left today</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 14,
    alignItems: 'center',
  },
  iconBlob: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  name: { fontFamily: Fonts.semiBold, fontSize: 16 },
  nums: { fontFamily: Fonts.semiBold, fontSize: 15 },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  remain: { fontFamily: Fonts.regular, fontSize: 12 },
});
