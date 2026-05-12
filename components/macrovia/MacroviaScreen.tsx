import { type ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuroraBackground } from '@/components/macrovia/AuroraBackground';
import { useAppTheme } from '@/contexts/AppThemeContext';

const TAB_BOTTOM_EXTRA = 108;

type Props = {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** inset for floating tab bar (default true when used under tabs). */
  tabRoot?: boolean;
  scrollEnabled?: boolean;
  contentPaddingBottom?: number;
} & Omit<Partial<ScrollViewProps>, 'children' | 'refreshControl'>;

/**
 * Aurora shell + safe area — replaces curved hero on Macrovia-themed tab roots.
 */
export function MacroviaScreen({
  children,
  refreshing,
  onRefresh,
  tabRoot = true,
  scrollEnabled = true,
  contentPaddingBottom,
  ...scrollRest
}: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottom =
    contentPaddingBottom ??
    Math.max(insets.bottom, 12) + (tabRoot ? TAB_BOTTOM_EXTRA : 24);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <AuroraBackground />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={[styles.pad, { paddingBottom: bottom }]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          ) : undefined
        }
        {...scrollRest}>
        <View style={styles.stack}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { paddingHorizontal: 16, paddingTop: 6 },
  stack: { gap: 14 },
});
