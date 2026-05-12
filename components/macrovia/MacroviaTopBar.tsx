import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppLinearGradient } from '@/components/ui/AppLinearGradient';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';

const MARK_PATH =
  'M4 18 L4 8 Q4 4 8 4 L8 14 Q8 18 12 18 L12 8 Q12 4 16 4 L16 14 Q16 18 20 18';

type Props = {
  title?: string;
  onPressBell?: () => void;
  onPressProfile?: () => void;
  userInitial?: string;
};

/** App chrome row: wordmark pill + trailing glass bell + avatar (prototype TopBar). */
export function MacroviaTopBar({
  title = 'CalTrack',
  onPressBell,
  onPressProfile = () => {},
  userInitial = 'U',
}: Props) {
  const { colors, isDark } = useAppTheme();
  const initial = userInitial.trim().slice(0, 1).toUpperCase() || 'U';

  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <AppLinearGradient
          colors={[colors.accent, colors.violet]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.markWrap}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path
              d={MARK_PATH}
              stroke="#fff"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </AppLinearGradient>
        <Text style={[styles.wordmark, { color: colors.text }]}>{title}</Text>
      </View>

      <View style={styles.trailing}>
        {onPressBell ? (
          <Pressable
            onPress={onPressBell}
            style={[
              styles.glassBtn,
              {
                borderColor: colors.glassStroke,
                backgroundColor: isDark ? colors.glass : 'rgba(255,255,255,0.72)',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Subscription and benefits">
            <Ionicons name="sparkles-outline" size={17} color={colors.textSecondary} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={onPressProfile}
          style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.92 }]}
          accessibilityRole="button"
          accessibilityLabel="Open menu">
          <AppLinearGradient
            colors={['#E8B4A0', '#C45C5C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarFill}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </AppLinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  markWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    letterSpacing: -0.4,
  },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  glassBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { borderRadius: 18, overflow: 'hidden' },
  avatarFill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: '#fff',
  },
});
