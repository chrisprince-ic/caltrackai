import { Ionicons } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLinearGradient } from '@/components/ui/AppLinearGradient';
import { Palette } from '@/constants/palette';
import {
  SUBSCRIPTION_MONTHLY_PRICE_FALLBACK,
  SUBSCRIPTION_TRIAL_DAYS,
} from '@/constants/subscription-marketing';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useIAP } from '@/contexts/IAPContext';
import { openLegalUrl } from '@/lib/legal-browser';

// ─── Feature list ────────────────────────────────────────────────────────────

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'camera-outline',      label: 'AI meal scanning — point & log instantly'  },
  { icon: 'stats-chart-outline', label: 'Weekly insights & calorie trend analysis'  },
  { icon: 'restaurant-outline',  label: 'Personalised meal plans & recipes'          },
  { icon: 'basket-outline',      label: 'Smart grocery lists from your targets'      },
  { icon: 'sparkles-outline',    label: 'AI nutrition coach — ask anything'          },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { welcome } = useLocalSearchParams<{ welcome?: string }>();
  const isWelcome = welcome === '1';
  const { colors } = useAppTheme();

  const {
    ready,
    loading,
    isPro,
    lastError,
    clearError,
    priceLabel,
    purchaseMonthly,
    restorePurchases,
  } = useIAP();

  const [busy, setBusy] = useState(false);

  const price = priceLabel ?? SUBSCRIPTION_MONTHLY_PRICE_FALLBACK;

  const billingLine = useMemo(
    () => `${SUBSCRIPTION_TRIAL_DAYS}-day free trial, then ${price}/month. Cancel anytime.`,
    [price],
  );

  const goToApp = useCallback(() => router.replace('/(tabs)' as Href), [router]);

  const onBack = useCallback(() => {
    if (isWelcome) { goToApp(); return; }
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as Href);
  }, [router, isWelcome, goToApp]);

  const onSubscribe = useCallback(async () => {
    if (!ready) {
      Alert.alert(
        'Not available',
        Platform.OS === 'web'
          ? 'Open this screen in the iOS or Android app to subscribe.'
          : 'Build with EAS (eas build -p ios) to enable in-app purchases.',
      );
      return;
    }
    setBusy(true);
    clearError();
    try {
      const outcome = await purchaseMonthly();
      if (outcome === 'success') {
        Alert.alert(
          'Welcome to Macrovia Pro 🎉',
          `Your ${SUBSCRIPTION_TRIAL_DAYS}-day free trial has started.`,
          [{ text: isWelcome ? 'Get started' : 'OK', onPress: isWelcome ? goToApp : undefined }],
        );
      }
    } finally {
      setBusy(false);
    }
  }, [ready, clearError, purchaseMonthly, isWelcome, goToApp]);

  const onRestore = useCallback(async () => {
    setBusy(true);
    clearError();
    try {
      const active = await restorePurchases();
      if (active && isWelcome) {
        Alert.alert('Restored', 'Macrovia Pro is active.', [{ text: 'Continue', onPress: goToApp }]);
        return;
      }
      Alert.alert(
        'Restore purchases',
        active
          ? 'Macrovia Pro is active on this account.'
          : 'No active subscription found for this Apple ID.',
      );
    } finally {
      setBusy(false);
    }
  }, [clearError, restorePurchases, isWelcome, goToApp]);

  const onManage = useCallback(async () => {
    try {
      await Linking.openURL('itms-apps://apps.apple.com/account/subscriptions');
    } catch {
      await Linking.openURL('https://apps.apple.com/account/subscriptions');
    }
  }, []);

  const ctaDisabled = busy || Platform.OS === 'web';

  // ── Already pro ────────────────────────────────────────────────────────────
  if (isWelcome && isPro && !loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <View style={[styles.proCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle" size={56} color={Palette.iris} />
          <Text style={[styles.proTitle, { color: colors.text }]}>You're all set!</Text>
          <Text style={[styles.proSub, { color: colors.textMuted }]}>
            Macrovia Pro is active. All features unlocked.
          </Text>
          <Pressable
            onPress={goToApp}
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.88 }]}
            accessibilityRole="button">
            <Text style={styles.ctaBtnText}>Continue to app</Text>
            <Ionicons name="arrow-forward" size={19} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Main paywall ───────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ── Hero ── */}
      <AppLinearGradient
        colors={['#0D5C3A', '#1B8A5B', '#24A06A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}>

        {/* Close / back */}
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.heroClose, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={isWelcome ? 'Skip' : 'Close'}>
          {isWelcome
            ? <Text style={styles.heroCloseSkip}>Skip</Text>
            : <Ionicons name="close" size={22} color="rgba(255,255,255,0.9)" />}
        </Pressable>

        {/* App icon + name */}
        <View style={styles.heroCenter}>
          <View style={styles.heroIconWrap}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.heroIcon}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.heroAppName}>Macrovia Pro</Text>
          <Text style={styles.heroTagline}>Your smart nutrition coach</Text>
        </View>

        {/* Trial badge */}
        <View style={styles.trialBadge}>
          <Ionicons name="gift-outline" size={15} color="#fff" />
          <Text style={styles.trialBadgeText}>
            {SUBSCRIPTION_TRIAL_DAYS}-Day Free Trial
          </Text>
        </View>
      </AppLinearGradient>

      {/* ── Scrollable content ── */}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}>

        {/* Pricing row */}
        <View style={[styles.pricingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.pricingLeft}>
            <Text style={[styles.pricingMain, { color: colors.text }]}>
              {price}
              <Text style={[styles.pricingPer, { color: colors.textMuted }]}> / month</Text>
            </Text>
            <Text style={[styles.pricingTrial, { color: Palette.iris }]}>
              First {SUBSCRIPTION_TRIAL_DAYS} days free
            </Text>
          </View>
          <View style={[styles.pricingBadge, { backgroundColor: `${Palette.iris}18` }]}>
            <Text style={[styles.pricingBadgeText, { color: Palette.iris }]}>Most popular</Text>
          </View>
        </View>

        {/* Feature list */}
        <View style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.featureHeading, { color: colors.text }]}>Everything included</Text>
          {FEATURES.map((f) => (
            <View key={f.icon} style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: `${Palette.iris}18` }]}>
                <Ionicons name={f.icon} size={18} color={Palette.iris} />
              </View>
              <Text style={[styles.featureLabel, { color: colors.text }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Error banner */}
        {lastError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
            <Text style={styles.errorText} numberOfLines={3}>{lastError}</Text>
            <Pressable onPress={clearError} hitSlop={10}>
              <Text style={styles.errorDismiss}>×</Text>
            </Pressable>
          </View>
        ) : null}

        {Platform.OS === 'web' && (
          <Text style={[styles.webNote, { color: colors.textMuted }]}>
            Purchases are only available in the iOS or Android app.
          </Text>
        )}

        {/* ── Primary CTA ── */}
        <Pressable
          onPress={() => void onSubscribe()}
          disabled={ctaDisabled}
          style={({ pressed }) => [
            styles.ctaBtn,
            ctaDisabled && styles.ctaDisabled,
            pressed && !ctaDisabled && { opacity: 0.88 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Start ${SUBSCRIPTION_TRIAL_DAYS}-day free trial`}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.ctaBtnText}>
                Start {SUBSCRIPTION_TRIAL_DAYS}-day free trial
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </Pressable>

        {/* Billing line — Apple requirement */}
        <Text style={[styles.billingLine, { color: colors.textMuted }]}>
          {billingLine}
        </Text>

        {/* ── Apple-required legal copy ── */}
        <Text style={[styles.legalBody, { color: colors.textMuted }]}>
          Payment will be charged to your Apple ID account at confirmation of purchase. The subscription
          automatically renews unless it is cancelled at least 24 hours before the end of the current period.
          Your account will be charged for renewal within 24 hours prior to the end of the current period.
          You can manage and cancel your subscriptions by going to your App Store account settings after purchase.
          Any unused portion of a free trial period will be forfeited when you purchase a subscription.
        </Text>

        {/* Legal links row — Apple requirement */}
        <View style={styles.legalLinksRow}>
          <Pressable onPress={() => void openLegalUrl('terms')} hitSlop={8} accessibilityRole="link">
            <Text style={[styles.legalLink, { color: Palette.iris }]}>Terms of Use</Text>
          </Pressable>
          <Text style={[styles.legalDot, { color: colors.textMuted }]}>·</Text>
          <Pressable onPress={() => void openLegalUrl('privacy')} hitSlop={8} accessibilityRole="link">
            <Text style={[styles.legalLink, { color: Palette.iris }]}>Privacy Policy</Text>
          </Pressable>
        </View>

        {/* Restore + Manage row */}
        <View style={styles.utilRow}>
          <Pressable
            onPress={() => void onRestore()}
            disabled={busy}
            hitSlop={8}
            accessibilityRole="button">
            <Text style={[styles.utilLink, { color: colors.textMuted }]}>Restore purchases</Text>
          </Pressable>
          {isPro && (
            <>
              <Text style={[styles.legalDot, { color: colors.textMuted }]}>·</Text>
              <Pressable
                onPress={() => void onManage()}
                disabled={busy}
                hitSlop={8}
                accessibilityRole="button">
                <Text style={[styles.utilLink, { color: colors.textMuted }]}>Manage subscription</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  heroClose: {
    alignSelf: 'flex-end',
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCloseSkip: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
  heroCenter: {
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroIcon: { width: 72, height: 72 },
  heroAppName: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    color: '#fff',
    letterSpacing: -0.4,
  },
  heroTagline: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  trialBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.2,
  },

  // Body
  body: {
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 12,
  },

  // Pricing card
  pricingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pricingLeft: { gap: 2 },
  pricingMain: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    letterSpacing: -0.4,
  },
  pricingPer: {
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  pricingTrial: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  pricingBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  pricingBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // Feature list
  featureCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  featureHeading: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureLabel: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
    backgroundColor: 'rgba(220,38,38,0.07)',
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },
  errorDismiss: {
    fontSize: 18,
    color: '#DC2626',
    paddingHorizontal: 4,
  },

  webNote: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  // CTA
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.iris,
    borderRadius: 16,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: Palette.iris,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      default: { elevation: 6 },
    }),
  },
  ctaDisabled: { opacity: 0.45 },
  ctaBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#fff',
  },

  // Billing / legal
  billingLine: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: -2,
  },
  legalBody: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLink: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  legalDot: { fontSize: 13 },
  utilRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  utilLink: {
    fontFamily: Fonts.medium,
    fontSize: 13,
  },

  // Already-pro screen
  proCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    margin: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  proTitle: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    letterSpacing: -0.4,
  },
  proSub: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
