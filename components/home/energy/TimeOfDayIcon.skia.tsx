import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTimeOfDay } from '@/hooks/useTimeOfDay';

type Props = { reducedMotion?: boolean };

/** 12px time-of-day flair beside the greeting (uses Ionicons for clarity at small size). */
export function TimeOfDayIcon({ reducedMotion }: Props) {
  const segment = useTimeOfDay();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    if (segment === 'midday') {
      pulse.value = withRepeat(withTiming(1.08, { duration: 2200 }), -1, true);
    }
  }, [segment, reducedMotion, pulse]);

  const middayStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.95,
  }));

  const icon =
    segment === 'morning' ? (
      <Ionicons name="sunny-outline" size={14} color="#FB923C" />
    ) : segment === 'midday' ? (
      <Animated.View style={middayStyle}>
        <Ionicons name="sunny" size={14} color="#FBBF24" />
      </Animated.View>
    ) : segment === 'evening' ? (
      <Ionicons name="partly-sunny-outline" size={14} color="#F97316" />
    ) : (
      <Ionicons name="moon-outline" size={14} color="#7DD3FC" />
    );

  return <View style={styles.wrap}>{icon}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
    width: 14,
    height: 14,
  },
});
