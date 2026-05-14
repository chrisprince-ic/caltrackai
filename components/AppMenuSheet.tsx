import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import type { User } from 'firebase/auth';

import { GoogleIdTokenSignIn } from '@/components/auth/GoogleIdTokenSignIn';
import { DestructiveCard } from '@/components/ui/DestructiveCard';
import { TextField } from '@/components/ui/TextField';
import { ACCENT } from '@/constants/app-theme';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { openLegalUrl } from '@/lib/legal-browser';
import {
  loadNotifPrefs,
  setDailyReminderEnabled,
  setWeeklyRecapEnabled,
} from '@/lib/notifications';
import { shareUserDataExport } from '@/lib/user-data-export';

const SHARE_MESSAGE = "I’m using Macrovia to log meals and hit my macros — give it a try!";
const INVITE_MESSAGE =
  "Join me on Macrovia — scan meals, see smart meal plans, and stay on track with your goals.";

type Props = {
  visible: boolean;
  onClose: () => void;
};

function MenuRow({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.88 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <View style={[styles.rowIcon, { backgroundColor: colors.haze }]}>
        <Ionicons name={icon} size={22} color={ACCENT.iris} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: colors.textMuted }]}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ opacity: 0.5 }} />
    </Pressable>
  );
}

function ToggleRow({
  icon,
  label,
  sub,
  value,
  onValueChange,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.haze }]}>
        <Ionicons name={icon} size={22} color={ACCENT.iris} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: colors.textMuted }]}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.borderStrong, true: ACCENT.lavender }}
        thumbColor={Palette.white}
        ios_backgroundColor={colors.borderStrong}
        accessibilityLabel={label}
      />
    </View>
  );
}

function deleteReauthKind(user: User): 'password' | 'google' | 'none' {
  const ids = new Set(user.providerData.map((p) => p.providerId));
  if (ids.has('password') && user.email) return 'password';
  if (ids.has('google.com')) return 'google';
  return 'none';
}

function deleteErrorMessage(e: unknown): string {
  const code =
    typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'That password did not match. Try again.';
  }
  if (code === 'auth/requires-recent-login') {
    return 'For your security, sign out, sign in again, then delete your account.';
  }
  if (code === 'auth/password-required' || code === 'auth/google-reauth-required') {
    return e instanceof Error ? e.message : 'Please confirm your identity to delete your account.';
  }
  return e instanceof Error ? e.message : 'Could not delete your account. Try again.';
}

function DarkModeToggleRow() {
  const { colors, isDark, setPreference } = useAppTheme();
  return (
    <ToggleRow
      icon="moon-outline"
      label="Dark mode"
      sub="Use dark backgrounds across the app"
      value={isDark}
      onValueChange={(v) => setPreference(v ? 'dark' : 'light')}
    />
  );
}

export function AppMenuSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user, signOutUser, deleteAccount } = useAuth();

  const [deletePasswordOpen, setDeletePasswordOpen] = useState(false);
  const [deleteGoogleOpen, setDeleteGoogleOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [dailyReminder, setDailyReminderState] = useState(true);
  const [weeklyRecap, setWeeklyRecapState] = useState(true);

  useEffect(() => {
    if (!visible) return;
    loadNotifPrefs()
      .then(({ daily, weekly }) => {
        setDailyReminderState(daily);
        setWeeklyRecapState(weekly);
      })
      .catch(() => {});
  }, [visible]);

  const onDailyReminderChange = useCallback((v: boolean) => {
    setDailyReminderState(v);
    void setDailyReminderEnabled(v);
  }, []);

  const onWeeklyRecapChange = useCallback((v: boolean) => {
    setWeeklyRecapState(v);
    void setWeeklyRecapEnabled(v);
  }, []);

  const appVersion = Constants.expoConfig?.version ?? '0.0.0';
  const iosBuild = Constants.expoConfig?.ios?.buildNumber ?? '';
  const versionLabel = `Macrovia · v${appVersion}${iosBuild ? ` (${iosBuild})` : ''}`;

  const shareApp = useCallback(async () => {
    try {
      await Share.share({ message: SHARE_MESSAGE, title: 'Macrovia' });
    } catch {
      /* dismissed */
    }
  }, []);

  const inviteFriends = useCallback(async () => {
    try {
      await Share.share({ message: INVITE_MESSAGE, title: 'Invite to Macrovia' });
    } catch {
      /* dismissed */
    }
  }, []);

  const openHelp = useCallback(() => {
    Alert.alert(
      'Help & FAQ',
      'Log meals by scanning food with the camera or choosing a photo from your gallery. Meal plans, grocery ideas, and insights update automatically based on your nutrition targets. Set your goals in Nutrition targets to personalize your experience.'
    );
  }, []);

  const exportMyData = useCallback(() => {
    if (!user) {
      Alert.alert('Sign in', 'Export includes synced data from your account. Sign in to continue.');
      return;
    }
    void (async () => {
      try {
        await shareUserDataExport(user.uid);
      } catch {
        Alert.alert('Export failed', 'Check your connection and try again.');
      }
    })();
  }, [user]);

  const onSignOut = useCallback(() => {
    Alert.alert(
      'Log out?',
      'You can sign back in anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            onClose();
            try {
              await signOutUser();
            } catch {
              /* ignore */
            }
            router.replace('/welcome' as Href);
          },
        },
      ]
    );
  }, [onClose, signOutUser, router]);

  const finishDeleteSuccess = useCallback(() => {
    setDeletePasswordOpen(false);
    setDeleteGoogleOpen(false);
    setDeletePassword('');
    setDeleteBusy(false);
    onClose();
    router.replace('/welcome' as Href);
  }, [onClose, router]);

  const runDelete = useCallback(
    async (opts?: { password?: string; googleIdToken?: string }) => {
      setDeleteBusy(true);
      try {
        await deleteAccount(opts);
        finishDeleteSuccess();
      } catch (e) {
        Alert.alert('Error', deleteErrorMessage(e));
      } finally {
        setDeleteBusy(false);
      }
    },
    [deleteAccount, finishDeleteSuccess]
  );

  const onDeleteAccount = useCallback(() => {
    if (!user) return;
    const kind = deleteReauthKind(user);

    Alert.alert(
      'Delete account?',
      'This permanently removes your synced data and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (kind === 'password' && Platform.OS === 'ios') {
              Alert.prompt(
                'Confirm with password',
                'Enter your password to permanently delete your account.',
                (password) => {
                  if (password) void runDelete({ password });
                },
                'secure-text'
              );
              return;
            }
            if (kind === 'password') {
              setDeletePassword('');
              setDeletePasswordOpen(true);
              return;
            }
            if (kind === 'google') {
              setDeleteGoogleOpen(true);
              return;
            }
            void runDelete();
          },
        },
      ]
    );
  }, [user, runDelete]);

  const go = useCallback(
    (href: Href) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={[styles.modalRoot, { minHeight: height }]}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.bg,
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
              <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: colors.haze }]}>
                  <Ionicons name="person-outline" size={26} color={ACCENT.iris} />
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

              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 18 }]}>Notifications</Text>
              <ToggleRow
                icon="notifications-outline"
                label="Daily reminder"
                sub="Nudge to log your meals every day at 8am"
                value={dailyReminder}
                onValueChange={onDailyReminderChange}
              />
              <ToggleRow
                icon="bar-chart-outline"
                label="Weekly recap"
                sub="Check your progress every Sunday at 8am"
                value={weeklyRecap}
                onValueChange={onWeeklyRecapChange}
              />

              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 18 }]}>Account & plan</Text>
              <MenuRow
                icon="nutrition-outline"
                label="Nutrition targets"
                sub="Calories, macros, and notes"
                onPress={() => go('/nutrition-targets' as Href)}
              />
              <MenuRow
                icon="calendar-outline"
                label="Meal plans"
                sub="Your week & recipes"
                onPress={() => go('/meal-plan/weekly' as Href)}
              />
              <MenuRow
                icon="stats-chart-outline"
                label="Insights"
                sub="Trends & coaching tips"
                onPress={() => go('/(tabs)/insights' as Href)}
              />
              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 18 }]}>Share</Text>
              <MenuRow
                icon="share-outline"
                label="Share app"
                sub="Tell a friend"
                onPress={() => void shareApp()}
              />
              <MenuRow
                icon="mail-outline"
                label="Invite someone"
                sub="Send an invite message"
                onPress={() => void inviteFriends()}
              />

              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 18 }]}>Support & legal</Text>
              <MenuRow icon="help-circle-outline" label="Help & FAQ" onPress={openHelp} />
              <MenuRow
                icon="document-text-outline"
                label="Terms of Use"
                onPress={() => void openLegalUrl('terms')}
              />
              <MenuRow
                icon="lock-closed-outline"
                label="Privacy Policy"
                onPress={() => void openLegalUrl('privacy')}
              />
              <MenuRow
                icon="cloud-download-outline"
                label="Export my data"
                sub="Share a JSON copy of synced data"
                onPress={exportMyData}
              />

              {!user ? (
                <>
                  <View style={{ height: 18 }} />
                  <MenuRow
                    icon="log-in-outline"
                    label="Sign in"
                    sub="Sync across devices"
                    onPress={() => {
                      onClose();
                      router.push('/auth/login' as Href);
                    }}
                  />
                </>
              ) : (
                <View style={styles.destructiveBlock}>
                  <DestructiveCard
                    icon="log-out-outline"
                    label="Log out"
                    onPress={onSignOut}
                  />
                  <DestructiveCard
                    icon="trash-outline"
                    label="Delete account"
                    sub="Remove all data"
                    onPress={onDeleteAccount}
                  />
                </View>
              )}

              <Text style={styles.versionLine}>{versionLabel}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deletePasswordOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!deleteBusy) setDeletePasswordOpen(false);
        }}>
        <KeyboardAvoidingView
          style={styles.deleteOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!deleteBusy) setDeletePasswordOpen(false);
            }}
            accessibilityLabel="Dismiss"
          />
          <View style={[styles.deleteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.deleteTitle, { color: colors.text }]}>Confirm password</Text>
            <Text style={[styles.deleteBody, { color: colors.textMuted }]}>
              Enter your password to permanently delete your account and synced data.
            </Text>
            <TextField
              label="Password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              showPasswordToggle
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleteBusy}
              containerStyle={{ marginTop: 8 }}
            />
            <View style={styles.deleteActions}>
              <Pressable
                onPress={() => {
                  if (!deleteBusy) {
                    setDeletePasswordOpen(false);
                    setDeletePassword('');
                  }
                }}
                style={({ pressed }) => [styles.deleteSecondaryBtn, pressed && { opacity: 0.85 }]}>
                <Text style={[styles.deleteSecondaryLabel, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!deletePassword.trim()) {
                    Alert.alert('Password required', 'Enter your account password to continue.');
                    return;
                  }
                  void runDelete({ password: deletePassword });
                }}
                disabled={deleteBusy}
                style={({ pressed }) => [
                  styles.deletePrimaryBtn,
                  (pressed || deleteBusy) && { opacity: 0.88 },
                  deleteBusy && { opacity: 0.5 },
                ]}>
                {deleteBusy ? (
                  <Text style={styles.deletePrimaryLabel}>Deleting…</Text>
                ) : (
                  <Text style={styles.deletePrimaryLabel}>Delete account</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={deleteGoogleOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!deleteBusy) setDeleteGoogleOpen(false);
        }}>
        <View style={styles.deleteOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!deleteBusy) setDeleteGoogleOpen(false);
            }}
            accessibilityLabel="Dismiss"
          />
          <View style={[styles.deleteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.deleteTitle, { color: colors.text }]}>Confirm with Google</Text>
            <Text style={[styles.deleteBody, { color: colors.textMuted }]}>
              Sign in with Google once more so we can verify it is you, then we remove your account.
            </Text>
            <GoogleIdTokenSignIn
              buttonLabel="Continue with Google"
              disabled={deleteBusy}
              onIdToken={async (idToken) => {
                await runDelete({ googleIdToken: idToken });
              }}
              onError={(message) => Alert.alert('Google sign-in', message)}
            />
            <Pressable
              onPress={() => {
                if (!deleteBusy) setDeleteGoogleOpen(false);
              }}
              style={({ pressed }) => [styles.deleteCancelWide, pressed && { opacity: 0.85 }]}>
              <Text style={[styles.deleteSecondaryLabel, { color: colors.text }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 10, 30, 0.45)' },
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
  sheetTitle: { fontFamily: Fonts.bold, fontSize: 22, marginBottom: 16 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 18,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { fontFamily: Fonts.bold, fontSize: 17 },
  profileEmail: { fontFamily: Fonts.regular, fontSize: 13, marginTop: 2 },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 1.4,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowLabel: { fontFamily: Fonts.semiBold, fontSize: 15 },
  rowSub: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 2 },
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  destructiveBlock: { marginTop: 18 },
  versionLine: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 30, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  deleteCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  deleteTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    marginBottom: 8,
  },
  deleteBody: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  deleteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
  },
  deleteSecondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  deleteSecondaryLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
  deletePrimaryBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  deletePrimaryLabel: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  deleteCancelWide: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
});
