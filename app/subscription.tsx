import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { REVENUECAT_ENTITLEMENT_PRO } from '@/constants/revenuecat';
import {
  SUBSCRIPTION_TRIAL_DAYS,
  SUBSCRIPTION_WEEKLY_PRICE_LABEL,
} from '@/constants/subscription-marketing';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string; tint: string; iconColor: string }[] = [
  { icon: 'camera', label: 'AI meal scans', tint: 'rgba(0, 194, 209, 0.18)', iconColor: Palette.cyan },
  { icon: 'stats-chart', label: 'Weekly insights', tint: 'rgba(245, 166, 35, 0.2)', iconColor: Palette.citrus },
  { icon: 'restaurant', label: 'Plans & groceries', tint: 'rgba(255, 107, 157, 0.18)', iconColor: Palette.flamingo },
];

function paywallResultLabel(r: PAYWALL_RESULT): string {
  switch (r) {
    case PAYWALL_RESULT.PURCHASED:
      return 'Welcome to Pro — your trial or subscription is active.';
    case PAYWALL_RESULT.RESTORED:
      return 'Purchases restored.';
    case PAYWALL_RESULT.CANCELLED:
      return 'You can subscribe anytime from Home.';
    case PAYWALL_RESULT.NOT_PRESENTED:
      return 'You already have access.';
    case PAYWALL_RESULT.ERROR:
    default:
      return 'Something went wrong. Try again or restore purchases.';
  }
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const { welcome } = useLocalSearchParams<{ welcome?: string }>();
  const isWelcome = welcome === '1';
  const compact = height < 720;

  const {
    ready,
    loading,
    isPro,
    customerInfo,
    lastError,
    clearError,
    presentPaywall,
    presentPaywallIfNeeded,
    restorePurchases,
    presentCustomerCenter,
  } = useRevenueCat();

  const [busy, setBusy] = useState(false);

  const headerBg = useMemo(() => (isWelcome ? Palette.ghost : '#0D0718'), [isWelcome]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: !isWelcome,
      title: '',
      headerStyle: {
        backgroundColor: headerBg,
      },
      headerShadowVisible: false,
      headerTintColor: isWelcome ? Palette.iris : Palette.white,
      headerTitleStyle: { fontFamily: Fonts.semiBold, color: Palette.white },
    });
  }, [navigation, isWelcome, headerBg]);

  const goToApp = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  const onStartTrial = useCallback(async () => {
    if (!ready) {
      Alert.alert(
        'Subscriptions',
        'Add your RevenueCat SDK key to .env and rebuild a development client to subscribe on device.'
      );
      return;
    }
    setBusy(true);
    clearError();
    try {
      const result = await presentPaywall();
      if (result == null || result === PAYWALL_RESULT.ERROR) {
        return;
      }
      if (isWelcome && (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED)) {
        Alert.alert('CalTrack Pro', paywallResultLabel(result), [{ text: 'Continue', onPress: goToApp }]);
        return;
      }
      if (result !== PAYWALL_RESULT.CANCELLED) {
        Alert.alert('CalTrack Pro', paywallResultLabel(result));
      }
    } finally {
      setBusy(false);
    }
  }, [ready, clearError, presentPaywall, isWelcome, goToApp]);

  const onUnlockIfNeeded = useCallback(async () => {
    if (!ready) {
      return;
    }
    setBusy(true);
    clearError();
    try {
      const result = await presentPaywallIfNeeded();
      if (result != null && result !== PAYWALL_RESULT.ERROR && result !== PAYWALL_RESULT.CANCELLED) {
        Alert.alert('CalTrack Pro', paywallResultLabel(result));
      }
    } finally {
      setBusy(false);
    }
  }, [ready, clearError, presentPaywallIfNeeded]);

  const onRestore = useCallback(async () => {
    if (!ready) {
      return;
    }
    setBusy(true);
    clearError();
    try {
      const info = await restorePurchases();
      const active = info?.entitlements.active[REVENUECAT_ENTITLEMENT_PRO]?.isActive;
      if (active && isWelcome) {
        Alert.alert('Restored', 'Your subscription is active.', [{ text: 'Continue', onPress: goToApp }]);
        return;
      }
      Alert.alert(
        'Restore',
        active ? 'CalTrack Pro is active on this account.' : 'No active subscription found for this store account.'
      );
    } finally {
      setBusy(false);
    }
  }, [ready, clearError, restorePurchases, isWelcome, goToApp]);

  const onCustomerCenter = useCallback(async () => {
    if (!ready) {
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert('Customer Center', 'Available on iOS and Android builds.');
      return;
    }
    setBusy(true);
    clearError();
    try {
      await presentCustomerCenter();
    } finally {
      setBusy(false);
    }
  }, [ready, clearError, presentCustomerCenter]);

  const proEntitlement = customerInfo?.entitlements.all[REVENUECAT_ENTITLEMENT_PRO];

  if (isWelcome && isPro && !loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.welcomeProWrap}>
          <View style={styles.welcomeProIcon}>
            <Ionicons name="checkmark-circle" size={48} color={Palette.lavender} />
          </View>
          <Text style={styles.welcomeProTitle}>You&apos;re all set</Text>
          <Text style={styles.welcomeProBody}>CalTrack Pro is already active on this account.</Text>
          <Pressable style={styles.primaryBtn} onPress={goToApp}>
            <Text style={styles.primaryBtnText}>Continue to app</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const titleSize = compact ? 26 : 30;
  const subSize = compact ? 13 : 14;
  const featureIconBox = compact ? 40 : 46;

  return (
    <SafeAreaView style={styles.safeDark} edges={isWelcome ? ['top', 'bottom'] : ['bottom']}>
      <StatusBar style="light" />
      <View style={[styles.shell, compact && styles.shellCompact]}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={[styles.upper, compact && styles.upperCompact]}>
          <Text style={styles.eyebrow}>{isWelcome ? 'Welcome' : 'Upgrade'}</Text>
          <Text style={[styles.headline, { fontSize: titleSize, lineHeight: titleSize + 6 }]}>
            {isWelcome ? (
              <>
                <Text style={styles.headlineAccent}>{SUBSCRIPTION_TRIAL_DAYS} days</Text>
                {'\n'}on the house
              </>
            ) : (
              <>
                Level up your{'\n'}
                <Text style={styles.headlineAccent}>nutrition</Text>
              </>
            )}
          </Text>
          <Text style={[styles.subline, { fontSize: subSize, lineHeight: subSize + 6 }]}>
            {isWelcome
              ? `Then ${SUBSCRIPTION_WEEKLY_PRICE_LABEL} — cancel before trial ends, pay nothing.`
              : `Try Pro free for ${SUBSCRIPTION_TRIAL_DAYS} days, then ${SUBSCRIPTION_WEEKLY_PRICE_LABEL}.`}
          </Text>

          <View style={[styles.featureStrip, compact && styles.featureStripCompact]}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureCell}>
                <View style={[styles.featureIconBlob, { backgroundColor: f.tint, width: featureIconBox, height: featureIconBox }]}>
                  <Ionicons name={f.icon} size={compact ? 22 : 24} color={f.iconColor} />
                </View>
                <Text style={[styles.featureLabel, compact && styles.featureLabelCompact]} numberOfLines={2}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.lower, compact && styles.lowerCompact]}>
          {!isWelcome ? (
            <View style={[styles.statusPill, isPro ? styles.statusPillPro : styles.statusPillFree]}>
              <View style={[styles.statusDot, isPro ? styles.statusDotPro : styles.statusDotFree]} />
              <Text style={styles.statusPillText} numberOfLines={1}>
                {loading ? 'Checking…' : isPro ? 'Pro active' : 'Free plan'}
              </Text>
              {proEntitlement?.expirationDate && !loading ? (
                <Text style={styles.statusPillMeta} numberOfLines={1}>
                  {' · '}
                  {proEntitlement.expirationDate}
                </Text>
              ) : null}
            </View>
          ) : null}

          {lastError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color="#FFB4C8" />
              <Text style={styles.errorText} numberOfLines={2}>
                {lastError}
              </Text>
              <Pressable onPress={clearError} hitSlop={10}>
                <Text style={styles.errorDismiss}>×</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Start ${SUBSCRIPTION_TRIAL_DAYS} day free trial`}
            style={[styles.ctaPrimary, (!ready || busy) && styles.btnDisabled]}
            onPress={() => void onStartTrial()}
            disabled={!ready || busy}>
            {busy ? (
              <ActivityIndicator color={Palette.obsidian} />
            ) : (
              <>
                <Text style={styles.ctaPrimaryText}>Start {SUBSCRIPTION_TRIAL_DAYS}-day free trial</Text>
                <Ionicons name="arrow-forward" size={20} color={Palette.obsidian} />
              </>
            )}
          </Pressable>

          <Text style={styles.legalMicro} numberOfLines={3}>
            Billed after trial unless canceled 24h prior. Manage in App Store / Google Play settings.
          </Text>

          {!isWelcome ? (
            <View style={styles.linkCluster}>
              <Pressable onPress={() => void onUnlockIfNeeded()} disabled={!ready || busy} hitSlop={6}>
                <Text style={styles.linkText}>Check access</Text>
              </Pressable>
              <Text style={styles.linkSep}>·</Text>
              <Pressable onPress={() => void onRestore()} disabled={!ready || busy} hitSlop={6}>
                <Text style={styles.linkText}>Restore</Text>
              </Pressable>
              <Text style={styles.linkSep}>·</Text>
              <Pressable onPress={() => void onCustomerCenter()} disabled={!ready || busy} hitSlop={6}>
                <Text style={styles.linkText}>Manage</Text>
              </Pressable>
              <Text style={styles.linkSep}>·</Text>
              <Pressable onPress={() => router.back()} hitSlop={6}>
                <Text style={styles.linkText}>Close</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.welcomeFooter}>
              <Pressable style={styles.ghostBtn} onPress={goToApp} disabled={busy}>
                <Text style={styles.ghostBtnText}>Not now</Text>
              </Pressable>
              <Pressable onPress={() => void onRestore()} disabled={!ready || busy}>
                <Text style={styles.inlineLinkText}>Restore purchases</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Palette.ghost,
  },
  safeDark: {
    flex: 1,
    backgroundColor: '#0D0718',
  },
  shell: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: 'space-between',
  },
  shellCompact: {
    paddingHorizontal: 18,
  },
  glowTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Palette.iris,
    opacity: 0.14,
    top: -120,
    right: -80,
  },
  glowBottom: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Palette.cyan,
    opacity: 0.1,
    top: '38%',
    left: -100,
  },
  upper: {
    paddingTop: 8,
    flexShrink: 1,
  },
  upperCompact: {
    paddingTop: 0,
  },
  eyebrow: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 3,
    color: Palette.mist,
    opacity: 0.85,
    marginBottom: 10,
  },
  headline: {
    fontFamily: Fonts.bold,
    color: Palette.white,
    marginBottom: 10,
  },
  headlineAccent: {
    color: Palette.cyan,
  },
  subline: {
    fontFamily: Fonts.regular,
    color: 'rgba(247, 245, 255, 0.72)',
    marginBottom: 20,
  },
  featureStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  featureStripCompact: {
    marginTop: 0,
    marginBottom: 4,
  },
  featureCell: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  featureIconBlob: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 16,
  },
  featureLabelCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  lower: {
    paddingBottom: 6,
    gap: 10,
  },
  lowerCompact: {
    gap: 8,
    paddingBottom: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: '100%',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillPro: {
    backgroundColor: 'rgba(75, 35, 200, 0.35)',
    borderColor: 'rgba(196, 178, 250, 0.35)',
  },
  statusPillFree: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  statusDotPro: {
    backgroundColor: '#7CFFB3',
  },
  statusDotFree: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  statusPillText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Palette.white,
  },
  statusPillMeta: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    flexShrink: 1,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(232, 93, 142, 0.15)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 93, 142, 0.25)',
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: '#FFC8D8',
    lineHeight: 15,
  },
  errorDismiss: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 4,
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Palette.white,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: Palette.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaPrimaryText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Palette.obsidian,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  legalMicro: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.42)',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  linkCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
    paddingBottom: 4,
  },
  linkText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Palette.mist,
  },
  linkSep: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 2,
  },
  welcomeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 4,
    paddingBottom: 2,
  },
  ghostBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ghostBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
  },
  inlineLinkText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Palette.mist,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.iris,
    borderRadius: 999,
    paddingVertical: 17,
    paddingHorizontal: 32,
    minWidth: 220,
  },
  primaryBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Palette.white,
  },
  welcomeProWrap: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeProIcon: {
    marginBottom: 20,
  },
  welcomeProTitle: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    color: Palette.obsidian,
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeProBody: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: Palette.dusk,
    textAlign: 'center',
    marginBottom: 28,
  },
});
