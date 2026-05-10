import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { BRAND_GREEN_GRADIENT_2 } from '@/constants/hero';
import { Palette } from '@/constants/palette';
import { Fonts } from '@/constants/theme';

export function QuickLogPill({ reducedMotion }: { reducedMotion: boolean }) {
  const router = useRouter();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={anim}>
      <Pressable
        onPress={() => {
          if (!reducedMotion) {
            scale.value = withSpring(0.94, { damping: 15, stiffness: 400 }, () => {
              scale.value = withSpring(1);
            });
          }
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/manual-entry' as Href);
        }}
        accessibilityRole="button"
        accessibilityLabel="Log meal">
        <LinearGradient
          colors={[...BRAND_GREEN_GRADIENT_2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.grad}>
          <Text style={styles.txt}>+ Log meal</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grad: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  txt: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
