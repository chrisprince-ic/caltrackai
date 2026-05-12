import { BlurView } from 'expo-blur';
import {
  Platform,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '@/contexts/AppThemeContext';

type Props = {
  children: React.ReactNode;
  glass?: boolean;
  padding?: number;
  style?: StyleProp<ViewStyle>;
};

export function MacroviaCard({ children, glass, padding = 18, style }: Props) {
  const { isDark, colors } = useAppTheme();
  const radius = 24;
  const border = colors.glassStroke;

  const shadow = Platform.select({
    ios: {
      shadowColor: isDark ? '#000' : '#182018',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.45 : 0.09,
      shadowRadius: isDark ? 20 : 18,
    },
    default: {
      elevation: isDark ? 5 : 2,
      shadowColor: '#000',
    },
  });

  const innerPad = (
    <View style={{ padding }}>{children}</View>
  );

  if (glass && Platform.OS === 'ios') {
    return (
      <View style={[styles.shadowWrap, shadow, style]}>
        <BlurView
          intensity={40}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.card,
            {
              borderRadius: radius,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: border,
              overflow: 'hidden',
              backgroundColor: isDark ? 'rgba(30,38,34,0.42)' : 'rgba(255,255,255,0.55)',
            },
          ]}>
          {innerPad}
        </BlurView>
      </View>
    );
  }

  const fill = glass ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)') : colors.surface;

  return (
    <View
      style={[
        styles.shadowWrap,
        shadow,
        styles.card,
        {
          borderRadius: radius,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: border,
          backgroundColor: fill,
          overflow: 'hidden',
        },
        style,
      ]}>
      {innerPad}
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: { alignSelf: 'stretch' },
  card: { alignSelf: 'stretch' },
});
