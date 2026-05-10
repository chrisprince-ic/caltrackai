import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

type Segment<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Optional accent color for the selected knob. Defaults to brand green. */
  accent?: string;
  style?: ViewStyle;
};

/**
 * iOS-style single-pill segmented control. One rounded outer container with
 * segments inside; the selected segment is a white "knob" with a soft shadow.
 *
 * Used in Insights for both period (Week/Month/Year) and chart metric
 * (Calories/Protein/Carbs/Fat) so the screen has one consistent pattern.
 */
export function SegmentedPill<T extends string>({
  segments,
  value,
  onChange,
  accent = Palette.iris,
  style,
}: Props<T>) {
  const { colors, isDark } = useAppTheme();
  return (
    <View
      style={[
        styles.outer,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
        },
        style,
      ]}>
      {segments.map((seg) => {
        const active = seg.id === value;
        return (
          <Pressable
            key={seg.id}
            onPress={() => onChange(seg.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.knob,
              active && [styles.knobOn, { backgroundColor: isDark ? colors.surface : '#FFFFFF' }],
            ]}>
            <Text
              style={[
                styles.label,
                { color: colors.textMuted },
                active && { color: accent },
              ]}
              numberOfLines={1}>
              {seg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
  },
  knob: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  knobOn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
