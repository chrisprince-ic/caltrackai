import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import { useOnboardingPlan } from '@/contexts/OnboardingPlanContext';
import { getGeminiConfig } from '@/lib/gemini-food-analysis';
import { refinePlanWithGemini } from '@/lib/gemini-coach';
import { saveUserNutritionPlan } from '@/lib/nutrition-plan-sync';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import {
  computeNutritionPlan,
  formatWeightFromKg,
  macroPercentsFromGrams,
  type NutritionPlanSummary,
} from '@/lib/nutrition-calculations';

function MacroBar({
  label,
  grams,
  pct,
  color,
  trackBg,
  delay,
}: {
  label: string;
  grams: number;
  pct: number;
  color: string;
  trackBg: string;
  delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380).springify()} style={styles.macroRow}>
      <View style={styles.macroTop}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroGrams}>
          {grams}g · {pct}%
        </Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: trackBg }]}>
        <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </Animated.View>
  );
}

function WeightStep({ week, weightLabel, isLast }: { week: number; weightLabel: string; isLast: boolean }) {
  return (
    <View style={styles.wStep}>
      <View style={styles.wStepRail}>
        <View style={styles.wStepDot} />
        {!isLast && <View style={styles.wStepLine} />}
      </View>
      <View style={styles.wStepBody}>
        <Text style={styles.wStepWeek}>{week === 0 ? 'Start' : `Week ${week}`}</Text>
        <Text style={styles.wStepWt}>{weightLabel}</Text>
      </View>
    </View>
  );
}

function goalLabel(g: NutritionPlanSummary['effectiveGoal']) {
  if (g === 'lose') return 'Calorie deficit for steady fat loss';
  if (g === 'gain') return 'Calorie surplus for lean gain';
  return 'Maintenance aligned with your activity';
}

export function PlanSummaryScreen() {
  const router = useRouter();
  const { user, firebaseReady } = useAuth();
  const { answers, clear } = useOnboardingPlan();
  const { refresh: refreshTargets } = useNutritionTargets();
  const [saving, setSaving] = useState(false);
  const [aiTargets, setAiTargets] = useState<{
    dailyCalories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    coachNote: string;
  } | null>(null);
  /** With Gemini key: starts loading until AI returns; without key: ready immediately. */
  const [aiPhase, setAiPhase] = useState<'loading' | 'ready'>(() =>
    getGeminiConfig() ? 'loading' : 'ready'
  );
  const [geminiRetryKey, setGeminiRetryKey] = useState(0);

  useEffect(() => {
    if (!answers) {
      router.replace('/onboarding' as Href);
    }
  }, [answers, router]);

  const plan = useMemo(() => (answers ? computeNutritionPlan(answers) : null), [answers]);

  useEffect(() => {
    if (!answers || !plan) return;
    let cancelled = false;
    if (!getGeminiConfig()) {
      setAiTargets(null);
      setAiPhase('ready');
      return;
    }
    setAiPhase('loading');
    setAiTargets(null);
    (async () => {
      try {
        const refined = await refinePlanWithGemini(answers, plan);
        if (!cancelled) {
          setAiTargets(refined);
        }
      } catch {
        if (!cancelled) {
          setAiTargets(null);
        }
      } finally {
        if (!cancelled) {
          setAiPhase('ready');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [answers, plan, geminiRetryKey]);

  const unit = answers?.weightUnit ?? 'metric';

  const displayCalories = aiTargets?.dailyCalories ?? plan?.dailyCalories ?? 0;
  const displayMacros = useMemo(() => {
    if (!plan) {
      return {
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        proteinPct: 0,
        carbsPct: 0,
        fatPct: 0,
      };
    }
    const proteinG = aiTargets?.proteinG ?? plan.macros.proteinG;
    const carbsG = aiTargets?.carbsG ?? plan.macros.carbsG;
    const fatG = aiTargets?.fatG ?? plan.macros.fatG;
    const pct = macroPercentsFromGrams(proteinG, carbsG, fatG);
    return { proteinG, carbsG, fatG, ...pct };
  }, [plan, aiTargets]);

  const aiPersonalized = Boolean(aiTargets);
  const canContinue = plan != null && aiPhase === 'ready';
  const geminiConfigured = getGeminiConfig();

  const onContinue = async () => {
    if (!answers || !plan || !canContinue) return;
    if (!user || !firebaseReady) {
      router.replace('/auth/login' as Href);
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setSaving(true);
    const dailyCalories = aiTargets?.dailyCalories ?? plan.dailyCalories;
    const proteinG = aiTargets?.proteinG ?? plan.macros.proteinG;
    const carbsG = aiTargets?.carbsG ?? plan.macros.carbsG;
    const fatG = aiTargets?.fatG ?? plan.macros.fatG;
    const coachNote = aiTargets?.coachNote;
    const dietarySummary =
      answers.dietary.length > 0 ? answers.dietary.join(', ') : 'No strict dietary filters';
    try {
      await saveUserNutritionPlan(user.uid, {
        dailyCalories,
        proteinG,
        carbsG,
        fatG,
        coachNote,
        dietarySummary,
      });
      await refreshTargets();
    } catch {
      /* still continue to subscription; targets can be re-saved later */
    } finally {
      setSaving(false);
    }
    clear();
    router.replace('/subscription?welcome=1' as Href);
  };

  if (!answers || !plan) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading your plan…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.headerRow}>
            <View style={styles.badge}>
              {aiPhase === 'loading' ? (
                <ActivityIndicator size="small" color={Palette.iris} />
              ) : (
                <Ionicons name="sparkles" size={16} color={Palette.iris} />
              )}
              <Text style={styles.badgeText}>
                {aiPhase === 'loading' ? 'Personalizing…' : 'Plan ready'}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>Your personalized plan</Text>
          <Text style={styles.subtitle}>
            We combined every onboarding answer (body stats, goal, timeline, meals, budget, activity, diet) with a
            calorie baseline, then sent it to AI so your daily calories and macros match you — those become your Home
            targets after you continue.
          </Text>
        </Animated.View>

        {aiPhase === 'ready' && !geminiConfigured ? (
          <Text style={[styles.aiHint, styles.aiHintSpacing]}>
            Add EXPO_PUBLIC_GEMINI_API_KEY to your project .env to enable AI-tuned targets. Showing calculated values for
            now.
          </Text>
        ) : null}

        {aiPhase === 'ready' && geminiConfigured && !aiPersonalized ? (
          <View style={styles.aiRetryWrap}>
            <Text style={styles.aiHint}>
              We could not reach the AI service. Your daily targets use our calculated plan. Tap Retry to try again, or
              continue — both are fine.
            </Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => setGeminiRetryKey((k) => k + 1)}
              accessibilityRole="button"
              accessibilityLabel="Retry AI personalization">
              <Ionicons name="refresh" size={18} color={Palette.iris} />
              <Text style={styles.retryBtnText}>Retry AI personalization</Text>
            </Pressable>
          </View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(80).duration(420).springify()} style={styles.calCard}>
          <View style={styles.calGlow} />
          <Text style={styles.calEyebrow}>
            {aiPersonalized ? 'AI daily calorie target' : 'Daily calorie target'}
          </Text>
          <Text style={styles.calValue}>{displayCalories.toLocaleString()}</Text>
          <Text style={styles.calUnit}>kcal / day</Text>
          <View style={styles.calMeta}>
            <View style={styles.calMetaItem}>
              <Text style={styles.calMetaLabel}>Est. TDEE</Text>
              <Text style={styles.calMetaVal}>{plan.tdee.toLocaleString()}</Text>
            </View>
            <View style={styles.calMetaDivider} />
            <View style={styles.calMetaItem}>
              <Text style={styles.calMetaLabel}>BMR</Text>
              <Text style={styles.calMetaVal}>{plan.bmr.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.goalPill}>
            <Ionicons name="pulse" size={16} color={Palette.iris} />
            <Text style={styles.goalPillText}>{goalLabel(plan.effectiveGoal)}</Text>
          </View>
        </Animated.View>

        {aiTargets?.coachNote ? (
          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.coachCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={Palette.iris} />
            <Text style={styles.coachNoteText}>{aiTargets.coachNote}</Text>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(140).duration(420).springify()} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{aiPersonalized ? 'AI macro targets' : 'Macro split'}</Text>
          <Text style={styles.sectionSub}>
            {aiPersonalized
              ? 'Grams you’ll track daily on Home (from your profile + AI).'
              : 'Approximate grams to hit your target calories.'}
          </Text>
          <MacroBar
            label="Protein"
            grams={displayMacros.proteinG}
            pct={displayMacros.proteinPct}
            color={Palette.flamingo}
            trackBg="#FFE8F0"
            delay={180}
          />
          <MacroBar
            label="Carbs"
            grams={displayMacros.carbsG}
            pct={displayMacros.carbsPct}
            color={Palette.citrus}
            trackBg="#FFF8EB"
            delay={220}
          />
          <MacroBar
            label="Fats"
            grams={displayMacros.fatG}
            pct={displayMacros.fatPct}
            color={Palette.cyan}
            trackBg="#E0F8FA"
            delay={260}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(420).springify()} style={styles.sectionCard}>
          <View style={styles.sectionHeadRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleFlex]}>Weight progression</Text>
            <View style={styles.weeksChip}>
              <Text style={styles.weeksChipText}>{plan.weeksTotal} wk</Text>
            </View>
          </View>
          <Text style={styles.sectionSub}>
            {plan.effectiveGoal === 'maintain'
              ? 'Maintaining your current weight across the plan window.'
              : `Projected path from ${formatWeightFromKg(plan.currentWeightKg, unit)} to ${formatWeightFromKg(plan.targetWeightKg, unit)}.`}
          </Text>
          <View style={styles.weightList}>
            {plan.weightPlan.map((m, i) => (
              <WeightStep
                key={`${m.week}-${i}`}
                week={m.week}
                weightLabel={formatWeightFromKg(m.weightKg, unit)}
                isLast={i === plan.weightPlan.length - 1}
              />
            ))}
          </View>
        </Animated.View>

        <Text style={styles.disclaimer}>
          Estimates only — not medical advice. Consult a professional for health conditions.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => void onContinue()}
          disabled={saving || !canContinue}
          style={({ pressed }) => [
            styles.cta,
            pressed && styles.ctaPressed,
            (saving || !canContinue) && { opacity: 0.65 },
          ]}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : aiPhase === 'loading' ? (
            <>
              <ActivityIndicator color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.ctaText}>Getting your targets…</Text>
            </>
          ) : (
            <>
              <Text style={styles.ctaText}>Start tracking</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Palette.ghost,
  },
  loading: {
    flex: 1,
    backgroundColor: Palette.ghost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: Fonts.regular,
    color: Palette.dusk,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  headerRow: {
    marginTop: 8,
    marginBottom: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.haze,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.12)',
  },
  badgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Palette.iris,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 36,
    color: Palette.obsidian,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Palette.dusk,
    marginBottom: 16,
  },
  aiHint: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    color: Palette.lavender,
    backgroundColor: Palette.haze,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.12)',
  },
  aiHintSpacing: {
    marginBottom: 16,
  },
  aiRetryWrap: {
    marginBottom: 16,
    gap: 12,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.2)',
  },
  retryBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Palette.iris,
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.1)',
  },
  coachNoteText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Palette.obsidian,
  },
  calCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.1)',
    overflow: 'hidden',
  },
  calGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Palette.mist,
    opacity: 0.35,
  },
  calEyebrow: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: Palette.lavender,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  calValue: {
    fontFamily: Fonts.bold,
    fontSize: 52,
    lineHeight: 58,
    color: Palette.iris,
  },
  calUnit: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: Palette.dusk,
    marginBottom: 20,
  },
  calMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  calMetaItem: {
    flex: 1,
  },
  calMetaLabel: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Palette.dusk,
    marginBottom: 4,
  },
  calMetaVal: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    color: Palette.obsidian,
  },
  calMetaDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(75, 35, 200, 0.12)',
    marginHorizontal: 16,
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.haze,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  goalPillText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Palette.obsidian,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.08)',
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: Palette.obsidian,
    marginBottom: 4,
  },
  sectionTitleFlex: {
    flex: 1,
    marginBottom: 0,
  },
  sectionSub: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Palette.dusk,
    marginBottom: 18,
  },
  weeksChip: {
    backgroundColor: Palette.haze,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  weeksChipText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Palette.iris,
  },
  macroRow: {
    marginBottom: 16,
  },
  macroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  macroLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Palette.obsidian,
  },
  macroGrams: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Palette.dusk,
  },
  macroTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 999,
  },
  weightList: {
    marginTop: 8,
  },
  wStep: {
    flexDirection: 'row',
    minHeight: 56,
  },
  wStepRail: {
    width: 24,
    alignItems: 'center',
  },
  wStepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Palette.iris,
    borderWidth: 2,
    borderColor: Palette.mist,
  },
  wStepLine: {
    flex: 1,
    width: 2,
    marginVertical: 2,
    backgroundColor: Palette.haze,
    minHeight: 28,
  },
  wStepBody: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 8,
  },
  wStepWeek: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Palette.obsidian,
  },
  wStepWt: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Palette.dusk,
    marginTop: 2,
  },
  disclaimer: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Palette.dusk,
    opacity: 0.85,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 35, 200, 0.08)',
    backgroundColor: Palette.ghost,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Palette.iris,
    paddingVertical: 16,
    borderRadius: 999,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
