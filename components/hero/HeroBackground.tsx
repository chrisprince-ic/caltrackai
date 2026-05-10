import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

type Props = {
  /** Output of `useAnimatedStyle` for hero height + corner radius. */
  heroAnimatedStyle: Record<string, unknown>;
  gradientColors: readonly [string, string, string];
  /** Solid flat header (no gradient) — matches Scan FAB (`Palette.iris`). */
  solidColor?: string;
};

export function HeroBackground({ heroAnimatedStyle, gradientColors, solidColor }: Props) {
  return (
    <Animated.View pointerEvents="none" style={[styles.hero, heroAnimatedStyle]}>
      {solidColor ? (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: solidColor }]} />
      ) : (
        <LinearGradient
          colors={[...gradientColors]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
});
