import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/contexts/AppThemeContext';

/**
 * Soft drifting gradient orbs matching the Macrovia prototype background.
 */
export function AuroraBackground() {
  const { colors } = useAppTheme();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={[
          styles.blob,
          {
            top: '-18%',
            left: '-12%',
            width: '72%',
            height: '52%',
            backgroundColor: colors.aurora1,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            top: '6%',
            right: '-22%',
            width: '68%',
            height: '54%',
            backgroundColor: colors.aurora2,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            bottom: '-14%',
            left: '14%',
            width: '74%',
            height: '46%',
            backgroundColor: colors.aurora3,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.72,
    transform: [{ scale: 1.05 }],
  },
});
