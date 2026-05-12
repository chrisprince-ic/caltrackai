import { Pressable, StyleSheet, Text } from 'react-native';

import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
};

export function SecondaryButton({ label, onPress, disabled, fullWidth = true }: Props) {
  const { colors, isDark } = useAppTheme();
  const textColor = isDark ? '#38B273' : Palette.iris;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor: isDark ? 'rgba(56,178,115,0.32)' : 'rgba(31,138,91,0.28)',
          backgroundColor: isDark ? 'rgba(31,138,91,0.08)' : colors.surface,
        },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    letterSpacing: 0.1,
  },
});
