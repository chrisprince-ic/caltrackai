import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

/**
 * Polish-spec TextField:
 * - White background, gray-200 border (1.5pt) at rest
 * - Brand-green border (2pt) + green glow on focus
 * - Red border + red helper on error
 * - Filled (non-empty, non-focused) → gray-300 border
 * - Label above (14pt semibold) with 8pt gap
 * - Helper text below (12pt) — never used as placeholder
 * - Optional password visibility toggle (eye icon)
 *
 * Use this on every new/refactored screen. Keep the legacy InputField in
 * place for screens (e.g. onboarding) that we are not redesigning.
 */
export type TextFieldProps = Omit<TextInputProps, 'placeholderTextColor'> & {
  label?: string;
  helperText?: string;
  error?: string;
  /** Show the show/hide password eye toggle. Forces secureTextEntry initially. */
  showPasswordToggle?: boolean;
  /** Override the wrapper style (margin, etc.). */
  containerStyle?: ViewStyle;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    helperText,
    error,
    showPasswordToggle = false,
    containerStyle,
    style,
    onFocus,
    onBlur,
    secureTextEntry,
    value,
    ...rest
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const isFilled = typeof value === 'string' && value.length > 0;
  const effectiveSecure = secureTextEntry || showPasswordToggle ? !revealed : false;

  const borderColor = error
    ? COLORS.errorBorder
    : focused
    ? Palette.iris
    : isFilled
    ? COLORS.borderFilled
    : COLORS.borderDefault;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.fieldRow,
          {
            borderColor,
            borderWidth: focused ? 2 : 1.5,
            shadowOpacity: focused && !error ? 0.18 : 0,
          },
        ]}>
        <TextInput
          ref={ref}
          {...rest}
          value={value}
          secureTextEntry={effectiveSecure}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={COLORS.placeholder}
          style={[styles.input, style]}
        />

        {showPasswordToggle ? (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            hitSlop={10}
            style={styles.eyeBtn}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}>
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={COLORS.eye}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
});

const COLORS = {
  borderDefault: '#E5E7EB',
  borderFilled: '#D1D5DB',
  errorBorder: '#EF4444',
  errorText: '#DC2626',
  placeholder: '#9CA3AF',
  helper: '#6B7280',
  label: '#111827',
  eye: '#6B7280',
} as const;

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: COLORS.label,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    minHeight: 52,
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0,
    elevation: 0,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 16,
    paddingVertical: 14,
    color: COLORS.label,
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 6,
  },
  helperText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: COLORS.helper,
    marginLeft: 4,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: COLORS.errorText,
    marginLeft: 4,
  },
});
