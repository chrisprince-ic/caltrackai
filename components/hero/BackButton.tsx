import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

type Props = {
  onPress: () => void;
  /** `true` for modal presentation — show X instead of chevron. */
  useCloseIcon?: boolean;
  iconColor?: string;
};

export function BackButton({ onPress, useCloseIcon, iconColor = '#0F1F08' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={useCloseIcon ? 'Close' : 'Go back'}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
      <Ionicons name={useCloseIcon ? 'close' : 'chevron-back'} size={20} color={iconColor} />
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
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
});
