import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

type PrimaryAction = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  title: string;
  /** Plain inline text action on the right (e.g. "Edit targets"). */
  actionLabel?: string;
  onAction?: () => void;
  /** Pill button on the right (e.g. "Log meal"). Renders alongside `actionLabel`. */
  primaryAction?: PrimaryAction;
  /** When true, shows a small spinner beside the title (e.g. while today's log is syncing). */
  syncing?: boolean;
  /** Text color for `actionLabel` (default: brand iris). */
  actionColor?: string;
  /** Pill style for `primaryAction` (default: brand). */
  primaryActionTone?: 'brand' | 'dark';
};

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  primaryAction,
  syncing,
  actionColor = Palette.iris,
  primaryActionTone = 'brand',
}: Props) {
  const { colors } = useAppTheme();
  const chipBg = primaryActionTone === 'dark' ? COLORS.ink : Palette.iris;
  const chipShadow = primaryActionTone === 'dark' ? 'transparent' : Palette.iris;
  return (
    <View style={styles.row}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {syncing ? (
          <ActivityIndicator size="small" color={Palette.iris} style={styles.syncSpinner} />
        ) : null}
      </View>
      <View style={styles.actions}>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={6}>
            <Text style={[styles.action, { color: actionColor }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
        {primaryAction ? (
          <Pressable
            onPress={primaryAction.onPress}
            accessibilityRole="button"
            accessibilityLabel={primaryAction.label}
            style={({ pressed }) => [
              styles.chip,
              primaryActionTone === 'dark' && styles.chipDarkInk,
              { backgroundColor: chipBg, shadowColor: chipShadow },
              pressed && styles.chipPressed,
            ]}>
            {primaryAction.icon ? (
              <Ionicons name={primaryAction.icon} size={16} color={Palette.white} />
            ) : null}
            <Text
              style={[
                primaryActionTone === 'dark' ? styles.chipTextInk : styles.chipText,
              ]}>
              {primaryAction.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 20,
  },
  syncSpinner: { transform: [{ scale: 0.9 }] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  action: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  chipDarkInk: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowOpacity: 0,
    elevation: 0,
  },
  chipPressed: { opacity: 0.92, transform: [{ scale: 0.97 }] },
  chipText: { fontFamily: Fonts.semiBold, fontSize: 13, color: Palette.white, letterSpacing: 0.2 },
  chipTextInk: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Palette.white,
    letterSpacing: 0.15,
  },
});
