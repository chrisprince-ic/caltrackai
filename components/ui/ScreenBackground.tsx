import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/contexts/AppThemeContext';

type Props = {
  children: React.ReactNode;
};

/**
 * Full-screen gradient + floating decorative blobs.
 * Wrap screen content inside SafeAreaView → ScreenBackground → ScrollView.
 */
export function ScreenBackground({ children }: Props) {
  const { isDark } = useAppTheme();

  const gradColors: [string, string, string] = isDark
    ? ['#081510', '#111827', '#0E1628']
    : ['#F0FDF4', '#FAFAFA', '#EFF6FF'];

  const blob1Bg = isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.13)';
  const blob2Bg = isDark ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.09)';
  const blob3Bg = isDark ? 'rgba(249,115,22,0.06)' : 'rgba(249,115,22,0.08)';
  const blob4Bg = isDark ? 'rgba(236,72,153,0.05)' : 'rgba(236,72,153,0.07)';
  const blob5Bg = isDark ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.06)';

  return (
    <LinearGradient colors={gradColors} style={styles.root} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      {/* Large ambient blobs */}
      <View style={[styles.blob, styles.b1, { backgroundColor: blob1Bg }]} />
      <View style={[styles.blob, styles.b2, { backgroundColor: blob2Bg }]} />
      <View style={[styles.blob, styles.b3, { backgroundColor: blob3Bg }]} />
      <View style={[styles.blob, styles.b4, { backgroundColor: blob4Bg }]} />
      <View style={[styles.blob, styles.b5, { backgroundColor: blob5Bg }]} />
      {/* Subtle ring decorations */}
      <View style={[styles.ring, styles.ring1, { borderColor: isDark ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.1)' }]} />
      <View style={[styles.ring, styles.ring2, { borderColor: isDark ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.08)' }]} />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blob: { position: 'absolute', borderRadius: 9999 },
  b1: { width: 360, height: 360, top: -140, right: -120 },
  b2: { width: 260, height: 260, top: '28%', left: -110 },
  b3: { width: 300, height: 300, bottom: -110, right: -90 },
  b4: { width: 160, height: 160, top: '52%', right: '12%' },
  b5: { width: 120, height: 120, top: '18%', left: '55%' },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  ring1: { width: 200, height: 200, top: '40%', right: -60 },
  ring2: { width: 140, height: 140, bottom: '25%', left: 20 },
});
