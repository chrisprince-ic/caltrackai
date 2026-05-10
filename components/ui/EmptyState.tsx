import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  title: string;
  body?: string;
  /** Optional CTA button at the bottom of the empty state. */
  cta?: {
    label: string;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
  };
  /** Compact variant — smaller paddings & icon, for in-card empty states. */
  compact?: boolean;
  style?: ViewStyle;
};

/**
 * Reusable empty state. Replaces ActivityIndicator-as-empty-state.
 */
export function EmptyState({
  icon = 'leaf-outline',
  iconColor,
  iconBg,
  title,
  body,
  cta,
  compact = false,
  style,
}: Props) {
  const { colors } = useAppTheme();
  const accent = iconColor ?? Palette.iris;
  const bg = iconBg ?? colors.haze;

  return (
    <View style={[compact ? styles.wrapCompact : styles.wrap, style]}>
      <View style={[compact ? styles.iconCircleCompact : styles.iconCircle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={compact ? 24 : 32} color={accent} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {body ? <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text> : null}
      {cta ? (
        <Pressable
          onPress={cta.onPress}
          accessibilityRole="button"
          accessibilityLabel={cta.label}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}>
          {cta.icon ? <Ionicons name={cta.icon} size={18} color={Palette.white} /> : null}
          <Text style={styles.ctaText}>{cta.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 10,
  },
  wrapCompact: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconCircleCompact: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    textAlign: 'center',
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  cta: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Palette.iris,
  },
  ctaText: { fontFamily: Fonts.semiBold, fontSize: 15, color: Palette.white },
});
