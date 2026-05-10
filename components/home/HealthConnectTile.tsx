import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ECGPulseSkia } from '@/components/home/energy/ECGPulse.skia';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

const TILE_BG = '#FEF6E7';
const TITLE = '#1A2B26';
const SUBTITLE = '#7A6A4A';
const ICON = '#B36A00';
const BTN = Palette.iris;

export type HealthConnectTileVariant = 'connect' | 'unavailable';

export type HealthConnectTileProps = {
  variant: HealthConnectTileVariant;
  onConnect?: () => Promise<boolean> | void;
  reducedMotion: boolean;
};

/** Amber CTA when Apple Health can connect; mini ECG + glass bevel; spring tap + success haptic when authorized. */
export function HealthConnectTile({ variant, onConnect, reducedMotion }: HealthConnectTileProps) {
  const connectMode = variant === 'connect';
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(async () => {
    if (!connectMode || !onConnect) return;
    scale.value = withSpring(0.97, { damping: 15, stiffness: 420 }, () => {
      scale.value = withSpring(1);
    });
    const granted = await onConnect();
    if (granted === true) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [connectMode, onConnect, scale]);

  return (
    <Animated.View style={[styles.outer, anim]}>
      <Pressable
        onPress={() => void handlePress()}
        disabled={!connectMode || !onConnect}
        style={({ pressed }) => [
          styles.tile,
          !connectMode && { opacity: pressed ? 1 : 1 },
          connectMode && pressed && Platform.OS === 'ios' && { opacity: 0.96 },
        ]}
        accessibilityRole="summary"
        accessibilityState={{ disabled: !connectMode || !onConnect }}>
        <View style={styles.iconColumn}>
          <View style={styles.ecgSlot}>
            <ECGPulseSkia reducedMotion={reducedMotion} />
          </View>
          <View style={styles.iconOverlay}>
            <Ionicons name="heart" size={22} color={ICON} />
          </View>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>
            {connectMode ? 'Connect Apple Health' : 'Apple Health isn’t available here'}
          </Text>
          <Text style={styles.sub}>
            {connectMode
              ? 'Auto-adjust your target with today’s activity.'
              : 'Activity-adjusted targets sync on iPhone with Apple Health. Your base goal still applies.'}
          </Text>
        </View>
        {connectMode && onConnect ? (
          <View style={styles.btn}>
            <Text style={styles.btnText}>Connect</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { marginBottom: 14 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: TILE_BG,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(179,106,0,0.18)',
    borderTopColor: 'rgba(255,255,255,0.55)',
    borderBottomColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconColumn: {
    width: 44,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ecgSlot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: TITLE,
    marginBottom: 2,
  },
  sub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: SUBTITLE,
  },
  btn: {
    backgroundColor: BTN,
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  btnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
});
