import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { COLORS, Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useCalories } from '@/hooks/useCalories';

const DISMISS_KEY = '@caltrackai/healthkit_banner_dismissed_v1';

/**
 * Dismissible compact banner prompting the user to connect Apple Health.
 *
 * Visibility rules:
 * - Only renders on iOS native builds (`useCalories` returns `platformSupported`).
 * - Only renders if the user hasn't yet authorized Energy reads (`needsAuthCTA`).
 * - Hides forever once dismissed (persisted in AsyncStorage).
 */
export function HealthKitConnectBanner() {
  const { colors } = useAppTheme();
  const { needsAuthCTA, platformSupported, requestAccess } = useCalories();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(DISMISS_KEY)
      .then((raw) => {
        if (!cancelled) setDismissed(raw === '1');
      })
      .catch(() => {
        if (!cancelled) setDismissed(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onDismiss = useCallback(() => {
    setDismissed(true);
    void AsyncStorage.setItem(DISMISS_KEY, '1').catch(() => {});
  }, []);

  const onConnect = useCallback(async () => {
    setConnecting(true);
    try {
      await requestAccess();
    } finally {
      setConnecting(false);
    }
  }, [requestAccess]);

  if (!platformSupported) return null;
  if (dismissed === null) return null;
  if (dismissed) return null;
  if (!needsAuthCTA) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(360).springify()}
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.dot, { backgroundColor: COLORS.brandGreen }]} />
      <Text style={[styles.copy, { color: colors.text }]} numberOfLines={2}>
        Connect Apple Health to sync calories burned automatically
      </Text>
      <Pressable
        onPress={() => void onConnect()}
        disabled={connecting}
        accessibilityRole="button"
        accessibilityLabel="Connect Apple Health"
        style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.85 }]}>
        {connecting ? (
          <ActivityIndicator size="small" color={COLORS.brandGreenDark} />
        ) : (
          <Text style={[styles.linkText, { color: COLORS.brandGreenDark }]}>Connect</Text>
        )}
      </Pressable>
      <Pressable
        onPress={onDismiss}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={styles.dismiss}>
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 19,
  },
  linkBtn: {
    flexShrink: 0,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  linkText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  dismiss: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
