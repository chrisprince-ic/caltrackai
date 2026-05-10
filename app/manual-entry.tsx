import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextField } from '@/components/ui/TextField';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useNutritionLog } from '@/contexts/NutritionLogContext';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

/**
 * Manual meal entry. Users tap "Log meal" / "Tap to log your first meal"
 * on Home and land here. We keep the UI minimal: name + 4 numeric fields
 * + save. Anything more advanced (search, recents, foods database) lives
 * in the camera-scan flow.
 */

function parseNumber(input: string): number {
  if (!input.trim()) return 0;
  const n = Number(input.replace(/,/g, '.'));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export default function ManualEntryScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { addEntry } = useNutritionLog();

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => ({
    calories: parseNumber(calories),
    protein: parseNumber(protein),
    carbs: parseNumber(carbs),
    fat: parseNumber(fat),
  }), [calories, protein, carbs, fat]);

  const canSubmit =
    name.trim().length > 0 &&
    Number.isFinite(parsed.calories) &&
    Number.isFinite(parsed.protein) &&
    Number.isFinite(parsed.carbs) &&
    Number.isFinite(parsed.fat) &&
    !submitting;

  async function onSave() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await addEntry({
        foodName: name.trim(),
        calories: Math.round(parsed.calories),
        proteinGrams: Math.round(parsed.protein),
        carbsGrams: Math.round(parsed.carbs),
        fatGrams: Math.round(parsed.fat),
      });
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the entry. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(360)} style={styles.headerBlock}>
            <Text style={[styles.eyebrow, { color: Palette.lavender }]}>QUICK LOG</Text>
            <Text style={[styles.title, { color: colors.text }]}>Add a meal</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Add what you ate and we’ll roll it into today’s totals.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(380).springify()} style={styles.form}>
            <TextField
              label="Meal name"
              value={name}
              onChangeText={setName}
              placeholder="Chicken & rice bowl"
              autoCapitalize="sentences"
              containerStyle={styles.field}
            />

            <TextField
              label="Calories"
              helperText="kcal"
              value={calories}
              onChangeText={setCalories}
              placeholder="e.g. 480"
              keyboardType="numeric"
              containerStyle={styles.field}
            />

            <View style={styles.macroGrid}>
              <View style={styles.macroCol}>
                <TextField
                  label="Protein"
                  helperText="grams"
                  value={protein}
                  onChangeText={setProtein}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.macroCol}>
                <TextField
                  label="Carbs"
                  helperText="grams"
                  value={carbs}
                  onChangeText={setCarbs}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.macroCol}>
                <TextField
                  label="Fat"
                  helperText="grams"
                  value={fat}
                  onChangeText={setFat}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#9B1F52" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save meal"
              accessibilityState={{ disabled: !canSubmit }}
              disabled={!canSubmit}
              onPress={() => void onSave()}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && canSubmit && styles.pressed,
                !canSubmit && styles.primaryBtnDisabled,
              ]}>
              {submitting ? (
                <ActivityIndicator color={Palette.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={Palette.white} />
                  <Text style={styles.primaryLabel}>Save meal</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
              <Text style={[styles.secondaryLabel, { color: colors.textMuted }]}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 22, paddingBottom: 36 },
  headerBlock: { marginBottom: 18 },
  eyebrow: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 2.4,
    marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    maxWidth: 360,
  },
  form: {},
  field: { marginBottom: 14 },
  macroGrid: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  macroCol: { flex: 1, minWidth: 0 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { flex: 1, fontFamily: Fonts.medium, fontSize: 14, color: '#9B1F52', lineHeight: 20 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.iris,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryLabel: { fontFamily: Fonts.bold, fontSize: 16, color: Palette.white },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  secondaryLabel: { fontFamily: Fonts.semiBold, fontSize: 15 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
