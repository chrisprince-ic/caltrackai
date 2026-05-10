import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, type ViewStyle } from 'react-native';

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  iconColor?: string;
  style?: ViewStyle;
  disabled?: boolean;
};

/**
 * Circular header action — white well + soft shadow (flat green hero).
 */
export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  iconColor = '#1A2B26',
  style,
  disabled,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [styles.btn, style, disabled && { opacity: 0.45 }, pressed && !disabled && styles.pressed]}>
      <Ionicons name={name} size={16} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
});
