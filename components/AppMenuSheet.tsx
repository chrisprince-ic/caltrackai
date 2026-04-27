import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACCENT } from '@/constants/app-theme';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Palette } from '@/constants/palette';

const SHARE_MESSAGE =
  'I’m using CalTrack AI to log meals and hit my macros — give it a try!';
const INVITE_MESSAGE =
  'Join me on CalTrack AI — scan meals, get AI meal plans, and stay on track with your goals.';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function MenuRow({
  icon,
  label,
  sub,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        pressed && { opacity: 0.88 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <View style={[styles.rowIcon, { backgroundColor: colors.haze }]}>
        <Ionicons name={icon} size={22} color={danger ? Palette.overText : ACCENT.iris} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: danger ? Palette.overText : colors.text }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: colors.textMuted }]}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ opacity: 0.5 }} />
    </Pressable>
  );
}

function DarkModeToggleRow() {
  const { colors, isDark, setPreference } = useAppTheme();
  return (
    <View
      style={[styles.toggleRow, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.haze }]}>
        <Ionicons name="moon-outline" size={22} color={ACCENT.iris} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>Dark mode</Text>
        <Text style={[styles.rowSub, { color: colors.textMuted }]}>Use dark backgrounds across the app</Text>
      </View>
      <Switch
        value={isDark}
        onValueChange={(v) => setPreference(v ? 'dark' : 'light')}
        trackColor={{ false: colors.borderStrong, true: ACCENT.lavender }}
        thumbColor={Palette.white}
        ios_backgroundColor={colors.borderStrong}
        accessibilityLabel="Dark mode"
      />
    </View>
  );
}

export function AppMenuSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user, signOutUser } = useAuth();

  const shareApp = useCallback(async () => {
    try {
      await Share.share({
        message: Platform.OS === 'ios' ? SHARE_MESSAGE : `${SHARE_MESSAGE}`,
        title: 'CalTrack AI',
      });
    } catch {
      /* dismissed */
    }
  }, []);

  const inviteFriends = useCallback(async () => {
    try {
      await Share.share({
        message: INVITE_MESSAGE,
        title: 'Invite to CalTrack AI',
      });
    } catch {
      /* dismissed */
    }
  }, []);

  const openHelp = useCallback(() => {
    Alert.alert(
      'Help',
      'For meal logging, use Scan or pick from your gallery. Meal plans and groceries use DeepSeek; scanning uses Google Vision + Gemini. Add keys in .env for AI features.'
    );
  }, []);

  const onSignOut = useCallback(async () => {
    onClose();
    try {
      await signOutUser();
    } catch {
      /* ignore */
    }
    router.replace('/welcome' as Href);
  }, [onClose, signOutUser, router]);

  const go = useCallback(
    (href: Href) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalRoot, { minHeight: height }]}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 20),
              borderColor: colors.border,
            },
          ]}
          accessibilityViewIsModal>
        <View style={styles.grabberWrap}>
          <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
        </View>
        <Text style={[styles.sheetTitle, { color: colors.text }]}>Menu</Text>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.profileCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.haze }]}>
              <Ionicons name="person" size={28} color={ACCENT.iris} />
            </View>
            <View style={styles.profileText}>
              <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
                {user?.displayName || user?.email?.split('@')[0] || 'Guest'}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textMuted }]} numberOfLines={1}>
                {user?.email ?? 'Not signed in — data stays on this device'}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Appearance</Text>
          <DarkModeToggleRow />

          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 20 }]}>Account & plan</Text>
          <MenuRow
            icon="nutrition-outline"
            label="Nutrition targets"
            sub="Calories, macros, AI note — update via onboarding"
            onPress={() => go('/nutrition-targets' as Href)}
          />
          <MenuRow
            icon="calendar-outline"
            label="Meal plans"
            sub="AI week & recipes"
            onPress={() => go('/meal-plan/weekly' as Href)}
          />
          <MenuRow
            icon="stats-chart-outline"
            label="Insights"
            sub="Trends & coaching"
            onPress={() => go('/(tabs)/insights' as Href)}
          />
          <MenuRow
            icon="sparkles"
            label="CalTrack Pro"
            sub="Subscription & trial"
            onPress={() => go('/subscription' as Href)}
          />

          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 20 }]}>Share</Text>
          <MenuRow icon="share-outline" label="Share app" sub="Tell a friend" onPress={() => void shareApp()} />
          <MenuRow icon="mail-outline" label="Invite someone" sub="Send an invite message" onPress={() => void inviteFriends()} />

          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 20 }]}>Support</Text>
          <MenuRow icon="help-circle-outline" label="Help & FAQ" onPress={openHelp} />

          {!user ? (
            <MenuRow
              icon="log-in-outline"
              label="Sign in"
              sub="Sync across devices"
              onPress={() => {
                onClose();
                router.push('/auth/login' as Href);
              }}
            />
          ) : (
            <MenuRow icon="log-out-outline" label="Log out" onPress={() => void onSignOut()} danger />
          )}
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 10, 30, 0.45)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  grabberWrap: { alignItems: 'center', marginBottom: 8 },
  grabber: { width: 40, height: 4, borderRadius: 2 },
  sheetTitle: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    marginBottom: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { fontFamily: Fonts.bold, fontSize: 17 },
  profileEmail: { fontFamily: Fonts.regular, fontSize: 13, marginTop: 2 },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingRight: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowLabel: { fontFamily: Fonts.semiBold, fontSize: 16 },
  rowSub: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 2 },
});
