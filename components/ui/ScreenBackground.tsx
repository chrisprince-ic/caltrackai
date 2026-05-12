import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { APP_SCREEN_GRADIENT_LIGHT } from '@/constants/hero';
import { useAppTheme } from '@/contexts/AppThemeContext';

type Props = {
  children: React.ReactNode;
};

/**
 * Full-screen aurora background — three drifting blobs (emerald / amber / violet)
 * matching the Macrovia aurora aesthetic. Wrap screen content inside:
 * SafeAreaView → ScreenBackground → ScrollView.
 */
export function ScreenBackground({ children }: Props) {
  const { isDark } = useAppTheme();

  const gradColors: [string, string, string] = isDark
    ? ['#0E1810', '#131E16', '#111A14']
    : [...APP_SCREEN_GRADIENT_LIGHT];

  // Aurora blobs — large, blurred radial glows
  const aurora1 = isDark ? 'rgba(43,134,82,0.38)'    : 'rgba(150,228,186,0.52)';  // emerald
  const aurora2 = isDark ? 'rgba(130,96,16,0.28)'    : 'rgba(237,208,128,0.45)';  // amber
  const aurora3 = isDark ? 'rgba(82,64,130,0.28)'    : 'rgba(218,204,246,0.40)';  // violet

  return (
    <LinearGradient colors={gradColors} style={styles.root} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      {/* Aurora blob 1 — emerald top-left */}
      <View style={[styles.aurora, styles.a1, { backgroundColor: aurora1 }]} />
      {/* Aurora blob 2 — amber top-right */}
      <View style={[styles.aurora, styles.a2, { backgroundColor: aurora2 }]} />
      {/* Aurora blob 3 — violet bottom-center */}
      <View style={[styles.aurora, styles.a3, { backgroundColor: aurora3 }]} />
      {/* Subtle ring decorations */}
      <View style={[styles.ring, styles.ring1, { borderColor: isDark ? 'rgba(31,138,91,0.06)' : 'rgba(31,138,91,0.09)' }]} />
      <View style={[styles.ring, styles.ring2, { borderColor: isDark ? 'rgba(107,74,150,0.05)' : 'rgba(107,74,150,0.08)' }]} />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  aurora: {
    position: 'absolute',
    borderRadius: 9999,
    // React Native doesn't support CSS blur — large soft circles simulate it
  },
  a1: { width: 420, height: 420, top: -180, left: -140 },
  a2: { width: 340, height: 340, top: -60, right: -140 },
  a3: { width: 380, height: 380, bottom: -150, left: '10%' },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  ring1: { width: 210, height: 210, top: '38%', right: -50 },
  ring2: { width: 150, height: 150, bottom: '22%', left: 16 },
});
