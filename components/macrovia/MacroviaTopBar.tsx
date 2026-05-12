import { Ionicons } from '@expo/vector-icons';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';

import { AppLinearGradient } from '@/components/ui/AppLinearGradient';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';

const TITLE_FADE_PX = 140;

type Props = {
  title?: string;
  /** When provided, white↔dark title cross-fade is driven by scroll offset (native driver). */
  scrollY?: Animated.Value;
  onPressBell?: () => void;
  onPressProfile?: () => void;
  userInitial?: string;
};

export function MacroviaTopBar({
  title = 'Macrovia',
  scrollY,
  onPressBell,
  onPressProfile = () => {},
  userInitial = 'U',
}: Props) {
  const { colors, isDark } = useAppTheme();
  const initial = userInitial.trim().slice(0, 1).toUpperCase() || 'U';

  const whiteOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, TITLE_FADE_PX],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      })
    : undefined;

  const darkOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, TITLE_FADE_PX],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
    : undefined;

  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <View style={styles.markWrap}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.markImg}
            resizeMode="cover"
          />
        </View>

        {/* Cross-fade title: white at top, colors.text when scrolled */}
        <View style={styles.titleWrap}>
          {/* Dark title — always in layout to size the container */}
          <Animated.Text
            style={[styles.wordmark, { color: colors.text, opacity: darkOpacity ?? 1 }]}>
            {title}
          </Animated.Text>
          {/* White title — absolute on top, fades out on scroll */}
          {whiteOpacity != null && (
            <Animated.Text
              style={[styles.wordmark, styles.titleAbsolute, { color: '#fff', opacity: whiteOpacity }]}>
              {title}
            </Animated.Text>
          )}
        </View>
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
            <Animated.Text style={styles.avatarLetter}>{initial}</Animated.Text>
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
    overflow: 'hidden',
  },
  markImg: {
    width: 32,
    height: 32,
  },
  titleWrap: {
    position: 'relative',
  },
  wordmark: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    letterSpacing: -0.4,
  },
  titleAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
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
