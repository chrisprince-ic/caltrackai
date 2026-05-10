import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';

const RED = {
  bg: '#FFFFFF',
  border: '#FECACA', // red-200 — soft, not pink
  pressBg: '#FEF2F2', // red-50
  iconWellBg: 'rgba(239, 68, 68, 0.08)', // very light red tint
  icon: '#DC2626', // red-600
  text: '#DC2626', // red-600
  sub: '#F87171', // red-400 — for the secondary line
  chevron: '#FCA5A5', // red-300
} as const;

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  onPress: () => void;
  accessibilityHint?: string;
};

/**
 * Destructive action card (Log out, Delete account…).
 *
 * Style spec (Phase 1.1):
 * - 16pt vertical padding (slimmer than a settings row).
 * - 36pt rounded icon well, 20pt outline icon in red-600.
 * - Title 17pt semibold red-600. Subtitle (optional) 13pt red-400, single line.
 * - 1pt red-200 border, white background. Red-300 chevron.
 */
export function DestructiveCard({ icon, label, sub, onPress, accessibilityHint }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? RED.pressBg : RED.bg },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}>
      <View style={styles.iconWell}>
        <Ionicons name={icon} size={20} color={RED.icon} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={RED.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RED.border,
    marginBottom: 8,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: RED.iconWellBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, gap: 1 },
  label: { fontFamily: Fonts.semiBold, fontSize: 17, color: RED.text },
  sub: { fontFamily: Fonts.regular, fontSize: 13, color: RED.sub },
});
