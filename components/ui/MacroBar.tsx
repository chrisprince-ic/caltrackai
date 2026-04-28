import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';

type Props = {
  label: string;
  current: number;
  goal: number;
  color: string;
  colorEnd?: string;
  tint: string;
  icon: keyof typeof Ionicons.glyphMap;
  delay?: number;
};

export function MacroBar({ label, current, goal, color, colorEnd, tint, icon, delay = 0 }: Props) {
  const { colors } = useAppTheme();
  const rawPct = goal > 0 ? Math.min(1, current / goal) : 0;
  const widthVal = useSharedValue(0);

  useEffect(() => {
    widthVal.value = withSpring(rawPct, { damping: 18, stiffness: 90 });
  }, [rawPct, widthVal]);

  const trackAnimStyle = useAnimatedStyle(() => ({
    width: `${widthVal.value * 100}%` as `${number}%`,
  }));

  const remain = Math.max(0, goal - current);
  const gradColors: [string, string] = [color, colorEnd ?? color];

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
            <Text style={{ color: colors.text, fontFamily: Fonts.semiBold }}>{current}</Text>
            <Text style={{ color: colors.textMuted, fontFamily: Fonts.regular }}>/{goal}g</Text>
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: tint }]}>
          <Animated.View style={[styles.fillWrap, trackAnimStyle]}>
            <LinearGradient
              colors={gradColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fill}
            />
          </Animated.View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
  nums: { fontSize: 15 },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fillWrap: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    borderRadius: 999,
  },
  remain: { fontFamily: Fonts.regular, fontSize: 12 },
});
