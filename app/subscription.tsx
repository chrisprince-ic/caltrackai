import { Ionicons } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CurvedHeroScreen } from '@/components/CurvedHeroScreen';
import { HERO } from '@/constants/hero';
import { MACROVIA_PREMIUM_MONTHLY_PRODUCT_ID, REVENUECAT_ENTITLEMENT_PRO } from '@/constants/revenuecat';
import {
  SUBSCRIPTION_MONTHLY_PRICE_FALLBACK,
  SUBSCRIPTION_TRIAL_DAYS,
} from '@/constants/subscription-marketing';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { openLegalUrl } from '@/lib/legal-browser';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'camera-outline',
    title: 'AI meal scans',
    body: 'Point your camera at food for quick calorie and macro estimates.',
  },
  {
    icon: 'stats-chart-outline',
    title: 'Insights',
    body: 'See trends and stay aligned with your daily targets.',
  },
  {
    icon: 'restaurant-outline',
    title: 'Plans & macros',
    body: 'Meal ideas and grocery lists tailored to your goals.',
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { welcome } = useLocalSearchParams<{ welcome?: string }>();
  const isWelcome = welcome === '1';
  const { colors, isDark } = useAppTheme();
  const {
    ready,
    loading,
    isPro,
    customerInfo,
    lastError,
    clearError,
    purchaseMacroviaMonthly,
    restorePurchases,
    presentCustomerCenter,
    getCurrentOffering,
  } = useRevenueCat();

  const [busy, setBusy] = useState(false);
  const [monthlyPriceLabel, setMonthlyPriceLabel] = useState<string | null>(null);

  const goToApp = useCallback(() => {
    router.replace('/(tabs)' as Href);
  }, [router]);

  const onBack = useCallback(() => {
    if (isWelcome) {
      goToApp();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as Href);
  }, [router, isWelcome, goToApp]);

  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    let cancelled = false;
    void (async () => {
      const offering = await getCurrentOffering();
      if (cancelled || !offering) return;
      const pkg = offering.availablePackages.find(
        (p) => p.product.identifier === MACROVIA_PREMIUM_MONTHLY_PRODUCT_ID
      );
      if (pkg?.product.priceString) {
        setMonthlyPriceLabel(pkg.product.priceString);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, getCurrentOffering]);

  const billingLine = useMemo(() => {
    const price = monthlyPriceLabel ?? SUBSCRIPTION_MONTHLY_PRICE_FALLBACK;
    return `${SUBSCRIPTION_TRIAL_DAYS}-day free trial, then ${price} billed monthly. Cancel anytime in Settings.`;
  }, [monthlyPriceLabel]);

  const proEntitlement = customerInfo?.entitlements.all[REVENUECAT_ENTITLEMENT_PRO];

  const onSubscribe = useCallback(async () => {
    if (!ready) {
      Alert.alert(
        'Setup required',
        'Add your RevenueCat public SDK key in .env, link Macrovia monthly in the RevenueCat dashboard, and rebuild the app to purchase on device.'
      );
      return;
    }
    setBusy(true);
    clearError();
    try {
      const outcome = await purchaseMacroviaMonthly();
      if (outcome === 'success') {
        Alert.alert('CalTrack Pro', 'Your trial or subscription is active.', [
          { text: isWelcome ? 'Continue' : 'OK', onPress: isWelcome ? goToApp : undefined },
        ]);
        return;
      }
      if (outcome === 'cancelled') {
        return;
      }
    } finally {
      setBusy(false);
    }
  }, [ready, clearError, purchaseMacroviaMonthly, isWelcome, goToApp]);

  const onRestore = useCallback(async () => {
    if (!ready) return;
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
        active ? 'CalTrack Pro is active on this account.' : 'No active subscription found for this Apple ID.'
      );
    } finally {
      setBusy(false);
    }
  }, [ready, clearError, restorePurchases, isWelcome, goToApp]);

  const onManage = useCallback(async () => {
    if (!ready) return;
    if (Platform.OS === 'web') {
      Alert.alert('Manage subscription', 'Use the iOS or Android app to open subscription management.');
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

  const surface = colors.surface;
  const border = colors.border;
  const muted = colors.textMuted;
  const ink = colors.text;

  if (isWelcome && isPro && !loading) {
    return (
      <CurvedHeroScreen
        title={"You're all set"}
        subtitle="CalTrack Pro is active"
        showBackButton
        onBackPress={goToApp}
        heroExpanded={HERO.EXPANDED}
        contentInset={72}
        scrollEnabled={false}>
        <View style={[styles.proCard, { backgroundColor: surface, borderColor: border }]}>
          <Ionicons name="checkmark-circle" size={48} color={Palette.iris} style={styles.proIcon} />
          <Text style={[styles.proBody, { color: muted }]}>
            Continue to your dashboard and start logging meals.
          </Text>
          <Pressable
            onPress={goToApp}
            style={({ pressed }) => [styles.primaryCta, { opacity: pressed ? 0.92 : 1 }]}>
            <Text style={styles.primaryCtaText}>Continue to app</Text>
            <Ionicons name="arrow-forward" size={20} color={Palette.white} />
          </Pressable>
        </View>
      </CurvedHeroScreen>
    );
  }

  return (
    <CurvedHeroScreen
      title="CalTrack Pro"
      subtitle={isWelcome ? 'Macrovia · start your trial' : 'Macrovia premium monthly'}
      showBackButton
      onBackPress={onBack}
      heroExpanded={HERO.EXPANDED}
      contentInset={72}
      titleSizeExpanded={22}
      resetScrollOnFocus={false}>
      <View style={[styles.heroCard, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.heroBadgeRow}>
          <Ionicons name="sparkles" size={18} color={Palette.iris} />
          <Text style={[styles.heroBadge, { color: Palette.lavender }]}>Macrovia</Text>
        </View>
        <Text style={[styles.heroTitle, { color: ink }]}>
          {SUBSCRIPTION_TRIAL_DAYS} days free, then monthly
        </Text>
        <Text style={[styles.heroBody, { color: muted }]}>{billingLine}</Text>
        <Text style={[styles.productId, { color: muted }]} numberOfLines={1} ellipsizeMode="middle">
          {MACROVIA_PREMIUM_MONTHLY_PRODUCT_ID}
        </Text>
      </View>

      {FEATURES.map((f) => (
        <View key={f.title} style={[styles.featureCard, { backgroundColor: surface, borderColor: border }]}>
          <View style={[styles.featureIcon, { backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : Palette.haze }]}>
            <Ionicons name={f.icon} size={22} color={Palette.iris} />
          </View>
          <View style={styles.featureText}>
            <Text style={[styles.featureTitle, { color: ink }]}>{f.title}</Text>
            <Text style={[styles.featureBody, { color: muted }]}>{f.body}</Text>
          </View>
        </View>
      ))}

      {!isWelcome ? (
        <View style={[styles.statusRow, { borderColor: border, backgroundColor: isDark ? colors.bg : Palette.haze }]}>
          <View style={[styles.statusDot, isPro ? styles.statusDotOn : styles.statusDotOff]} />
          <Text style={[styles.statusText, { color: ink }]} numberOfLines={1}>
            {loading ? 'Checking subscription…' : isPro ? 'Pro active' : 'Free plan'}
          </Text>
          {proEntitlement?.expirationDate && !loading ? (
            <Text style={[styles.statusMeta, { color: muted }]} numberOfLines={1}>
              {' · '}
              {proEntitlement.expirationDate}
            </Text>
          ) : null}
        </View>
      ) : null}

      {lastError ? (
        <View style={[styles.errorBanner, { borderColor: 'rgba(220,38,38,0.35)', backgroundColor: 'rgba(220,38,38,0.08)' }]}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.errorText} numberOfLines={3}>
            {lastError}
          </Text>
          <Pressable onPress={clearError} hitSlop={10}>
            <Text style={styles.errorDismiss}>×</Text>
          </Pressable>
        </View>
      ) : null}

      {Platform.OS === 'web' ? (
        <Text style={[styles.webNote, { color: muted }]}>
          In-app purchases run on the iOS and Android builds. Open this screen in the installed app to subscribe.
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Start ${SUBSCRIPTION_TRIAL_DAYS} day free trial`}
        onPress={() => void onSubscribe()}
        disabled={!ready || busy || Platform.OS === 'web'}
        style={({ pressed }) => [
          styles.primaryCta,
          (!ready || busy || Platform.OS === 'web') && styles.ctaDisabled,
          { opacity: pressed ? 0.92 : 1 },
        ]}>
        {busy ? (
          <ActivityIndicator color={Palette.white} />
        ) : (
          <>
            <Text style={styles.primaryCtaText}>Start {SUBSCRIPTION_TRIAL_DAYS}-day free trial</Text>
            <Ionicons name="arrow-forward" size={20} color={Palette.white} />
          </>
        )}
      </Pressable>

      <Text style={[styles.legal, { color: muted }]}>
        Payment is charged to your Apple ID. After the free trial, your subscription renews monthly unless you cancel
        at least 24 hours before the period ends. Manage or cancel in Apple Subscriptions.
      </Text>

      <View style={styles.legalLinksRow}>
        <Pressable onPress={() => void openLegalUrl('terms')} hitSlop={8} accessibilityRole="link">
          <Text style={[styles.link, { color: Palette.iris }]}>Terms of Use (EULA)</Text>
        </Pressable>
        <Text style={[styles.linkSep, { color: muted }]}> · </Text>
        <Pressable onPress={() => void openLegalUrl('privacy')} hitSlop={8} accessibilityRole="link">
          <Text style={[styles.link, { color: Palette.iris }]}>Privacy Policy</Text>
        </Pressable>
      </View>

      <View style={styles.linkRow}>
        <Pressable onPress={() => void onRestore()} disabled={!ready || busy} hitSlop={8}>
          <Text style={[styles.link, { color: Palette.iris }]}>Restore purchases</Text>
        </Pressable>
        {isPro ? (
          <>
            <Text style={[styles.linkSep, { color: muted }]}> · </Text>
            <Pressable onPress={() => void onManage()} disabled={!ready || busy} hitSlop={8}>
              <Text style={[styles.link, { color: Palette.iris }]}>Manage</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      {isWelcome ? (
        <Pressable onPress={goToApp} style={styles.notNow}>
          <Text style={[styles.notNowText, { color: muted }]}>Not now</Text>
        </Pressable>
      ) : null}
    </CurvedHeroScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 12,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  heroBadge: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  heroBody: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  productId: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    marginTop: 10,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, minWidth: 0 },
  featureTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    marginBottom: 4,
  },
  featureBody: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusDotOn: { backgroundColor: Palette.iris },
  statusDotOff: { backgroundColor: Palette.dusk },
  statusText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  statusMeta: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    flexShrink: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  errorDismiss: {
    fontSize: 20,
    color: '#991B1B',
    paddingHorizontal: 4,
  },
  webNote: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Palette.iris,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  primaryCtaText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Palette.white,
  },
  legal: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  legalLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  link: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  linkSep: { fontSize: 14 },
  notNow: {
    alignSelf: 'center',
    paddingVertical: 10,
  },
  notNowText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  proCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
  },
  proIcon: { marginBottom: 12 },
  proBody: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
});
