import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

type Action = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
};

type Props = {
  /** Short headline (≤12 words). */
  headline: string;
  /** Body copy (≤2 sentences, ≤30 words). */
  body: string;
  loading: boolean;
  /** Show retry CTA when the coach service errored. */
  showRetry: boolean;
  onRetry: () => void;
  /** Footer time-since label, e.g. "Updated 2 hours ago". */
  updatedLabel?: string | null;
};

const ACTIONS: Action[] = [
  { id: 'log', label: 'Log a meal', icon: 'add-circle-outline', href: '/manual-entry' as Href },
  { id: 'plan', label: 'Meal plan', icon: 'restaurant-outline', href: '/(tabs)/meal-plans' as Href },
  { id: 'targets', label: 'Targets', icon: 'options-outline', href: '/nutrition-targets' as Href },
];

/**
 * Restructured AI coaching card. The legacy version rendered a 70-word
 * paragraph in a mint card identical to every other AI card in the app —
 * users skimmed past it.
 *
 * The new layout:
 *   - Distinct warm-cream tint so the card visually announces "this is
 *     coaching, not data".
 *   - Pinned headline (single sentence, semibold) above a tight body.
 *   - Action chips that route to the screens the tip is asking the user to
 *     visit. An "insight" you can act on in one tap is the difference
 *     between a feature people use and one they ignore.
 */
export function InsightsCoachCard({
  headline,
  body,
  loading,
  showRetry,
  onRetry,
  updatedLabel,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();

  const cardBg = isDark ? 'rgba(251,146,60,0.07)' : '#FFFBF4';
  const cardBorder = isDark ? 'rgba(251,146,60,0.20)' : '#FDDAA0';
  const iconWell = isDark ? 'rgba(251,146,60,0.16)' : '#FEF3C7';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.header}>
        <View style={[styles.iconWell, { backgroundColor: iconWell }]}>
          <Ionicons name="sparkles" size={18} color={Palette.iris} />
        </View>
        <Text style={[styles.kicker, { color: colors.textMuted }]}>AI Coach</Text>
      </View>

      {loading && !headline ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={Palette.iris} size="small" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Reading your week…
          </Text>
        </View>
      ) : (
        <View style={styles.copy}>
          {headline ? (
            <Text style={[styles.headline, { color: colors.text }]}>{headline}</Text>
          ) : null}
          {body ? (
            <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>
          ) : null}
          {!headline && !body ? (
            <Text style={[styles.body, { color: colors.textMuted }]}>
              Sign in and log meals for a few days to unlock personalised coaching.
            </Text>
          ) : null}
        </View>
      )}

      {showRetry && !loading ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry insights"
          style={({ pressed }) => [
            styles.retryBtn,
            { borderColor: cardBorder, backgroundColor: colors.surface },
            pressed && styles.pressed,
          ]}>
          <Ionicons name="refresh" size={16} color={Palette.iris} />
          <Text style={[styles.retryText, { color: Palette.iris }]}>Retry</Text>
        </Pressable>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled">
        {ACTIONS.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => router.push(a.href)}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: colors.surface, borderColor: cardBorder },
              pressed && styles.pressed,
            ]}>
            <Ionicons name={a.icon} size={14} color={Palette.iris} />
            <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {updatedLabel ? (
        <Text style={[styles.footer, { color: colors.textMuted }]} numberOfLines={1}>
          {updatedLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },

  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWell: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  copy: { gap: 6 },
  headline: { fontFamily: Fonts.semiBold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },

  loadingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  loadingText: { fontFamily: Fonts.regular, fontSize: 13 },

  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  retryText: { fontFamily: Fonts.semiBold, fontSize: 13 },

  chipRow: { gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontFamily: Fonts.semiBold, fontSize: 13 },

  footer: {
    fontFamily: Fonts.regular,
    fontSize: 11,
  },

  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
