import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOnboardingPlan } from '@/contexts/OnboardingPlanContext';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';

const TOTAL_STEPS = 11;

export type GenderId = 'male' | 'female' | 'other';
export type GoalId = 'lose' | 'gain' | 'maintain';
export type BudgetId = 'low' | 'moderate' | 'flexible';
export type ActivityId = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type DietaryId = 'none' | 'halal' | 'vegan' | 'vegetarian';

export type OnboardingAnswers = {
  gender: GenderId | null;
  age: string;
  heightUnit: 'metric' | 'imperial';
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weightUnit: 'metric' | 'imperial';
  weight: string;
  goal: GoalId | null;
  targetWeight: string;
  timelineId: string | null;
  mealsId: string | null;
  budget: BudgetId | null;
  activity: ActivityId | null;
  dietary: DietaryId[];
};

const TIMELINE_OPTIONS = [
  { id: '4w', label: '4 weeks', sub: 'Short sprint' },
  { id: '8w', label: '8 weeks', sub: 'Two months' },
  { id: '12w', label: '12 weeks', sub: 'Quarter' },
  { id: '3m', label: '3 months', sub: 'Steady pace' },
  { id: '6m', label: '6 months', sub: 'Sustainable' },
  { id: '12m', label: '12 months', sub: 'Long-term' },
] as const;

const MEAL_OPTIONS = [
  { id: '2', label: '2 meals', icon: 'cafe-outline' as const },
  { id: '3', label: '3 meals', icon: 'restaurant-outline' as const },
  { id: '4', label: '4 meals', icon: 'fast-food-outline' as const },
  { id: '5+', label: '5+ / snacks', icon: 'nutrition-outline' as const },
] as const;

const BUDGET_OPTIONS: {
  id: BudgetId;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  tint: string;
}[] = [
  {
    id: 'low',
    label: 'Budget-friendly',
    sub: 'Cook at home, simple staples',
    icon: 'wallet-outline',
    accent: Palette.citrus,
    tint: '#FFF8EB',
  },
  {
    id: 'moderate',
    label: 'Balanced',
    sub: 'Mix of home & dining out',
    icon: 'card-outline',
    accent: Palette.cyan,
    tint: '#E8FAFC',
  },
  {
    id: 'flexible',
    label: 'Flexible',
    sub: 'Quality & convenience first',
    icon: 'diamond-outline',
    accent: Palette.lavender,
    tint: Palette.haze,
  },
];

const ACTIVITY_OPTIONS: {
  id: ActivityId;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'sedentary', label: 'Mostly seated', sub: 'Desk job, little walking', icon: 'desktop-outline' },
  { id: 'light', label: 'Light', sub: '1–2 light sessions / week', icon: 'walk-outline' },
  { id: 'moderate', label: 'Moderate', sub: '3–4 workouts / week', icon: 'barbell-outline' },
  { id: 'active', label: 'Active', sub: '5+ sessions or physical job', icon: 'flash-outline' },
  { id: 'very_active', label: 'Very active', sub: 'Athlete-level training', icon: 'trophy-outline' },
];

const DIETARY_OPTIONS: {
  id: DietaryId;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}[] = [
  { id: 'none', label: 'No preference', sub: 'All foods welcome', icon: 'sparkles-outline', color: Palette.iris, bg: Palette.haze },
  { id: 'halal', label: 'Halal', sub: 'Islamic dietary guidelines', icon: 'shield-checkmark-outline', color: Palette.lavender, bg: '#EDE8FF' },
  { id: 'vegan', label: 'Vegan', sub: 'Plant-based only', icon: 'leaf-outline', color: '#2D8B57', bg: '#E8F5EC' },
  { id: 'vegetarian', label: 'Vegetarian', sub: 'No meat, dairy OK', icon: 'nutrition-outline', color: Palette.flamingo, bg: '#FFE8F0' },
];

function hapticLight() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

function hapticSuccess() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function heightValid(a: OnboardingAnswers): boolean {
  if (a.heightUnit === 'metric') {
    const cm = parseNum(a.heightCm);
    return cm !== null && cm >= 100 && cm <= 250;
  }
  const ft = parseNum(a.heightFt);
  const inch = parseNum(a.heightIn);
  if (ft === null || inch === null) return false;
  if (ft < 3 || ft > 8) return false;
  if (inch < 0 || inch >= 12) return false;
  return true;
}

function weightValid(a: OnboardingAnswers): boolean {
  const w = parseNum(a.weight);
  if (w === null || w <= 0) return false;
  if (a.weightUnit === 'metric') return w >= 30 && w <= 300;
  return w >= 66 && w <= 660;
}

function targetWeightValid(a: OnboardingAnswers): boolean {
  const w = parseNum(a.targetWeight);
  if (w === null || w <= 0) return false;
  if (a.weightUnit === 'metric') return w >= 30 && w <= 300;
  return w >= 66 && w <= 660;
}

function ageValid(a: OnboardingAnswers): boolean {
  const n = parseInt(a.age, 10);
  return Number.isFinite(n) && n >= 13 && n <= 120;
}

function canProceed(step: number, a: OnboardingAnswers): boolean {
  switch (step) {
    case 0:
      return a.gender !== null;
    case 1:
      return ageValid(a);
    case 2:
      return heightValid(a);
    case 3:
      return weightValid(a);
    case 4:
      return a.goal !== null;
    case 5:
      return targetWeightValid(a);
    case 6:
      return a.timelineId !== null;
    case 7:
      return a.mealsId !== null;
    case 8:
      return a.budget !== null;
    case 9:
      return a.activity !== null;
    case 10:
      return a.dietary.length > 0;
    default:
      return false;
  }
}

function ProgressBar({ step }: { step: number }) {
  const fill = useSharedValue((step + 1) / TOTAL_STEPS);

  useEffect(() => {
    fill.value = withSpring((step + 1) / TOTAL_STEPS, { damping: 18, stiffness: 120 });
  }, [step, fill]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.min(1, Math.max(0, fill.value)) * 100}%`,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, barStyle]} />
    </View>
  );
}

function SelectCard({
  selected,
  onPress,
  children,
  accent = Palette.iris,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.selectCard,
        { borderColor: selected ? accent : 'rgba(75, 35, 200, 0.12)', backgroundColor: selected ? Palette.haze : '#FFFFFF' },
        pressed && styles.pressedCard,
      ]}>
      {children}
    </Pressable>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const { updateTargets: updateTargetsRaw } = useLocalSearchParams<{ updateTargets?: string | string[] }>();
  const updateTargetsParam = Array.isArray(updateTargetsRaw) ? updateTargetsRaw[0] : updateTargetsRaw;
  const isUpdatingTargets = updateTargetsParam === '1';
  const { setAnswers: commitAnswers } = useOnboardingPlan();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    gender: null,
    age: '',
    heightUnit: 'metric',
    heightCm: '',
    heightFt: '',
    heightIn: '',
    weightUnit: 'metric',
    weight: '',
    goal: null,
    targetWeight: '',
    timelineId: null,
    mealsId: null,
    budget: null,
    activity: null,
    dietary: [],
  });

  useEffect(() => {
    if (step === 10 && answers.dietary.length === 0) {
      setAnswers((p) => ({ ...p, dietary: ['none'] }));
    }
  }, [step, answers.dietary.length]);

  const next = useCallback(() => {
    if (!canProceed(step, answers)) return;
    hapticLight();
    if (step >= TOTAL_STEPS - 1) {
      hapticSuccess();
      commitAnswers(answers);
      router.replace('/onboarding/summary');
      return;
    }
    setStep((s) => s + 1);
  }, [step, answers, router, commitAnswers]);

  const back = useCallback(() => {
    hapticLight();
    if (step <= 0) {
      if (isUpdatingTargets) {
        router.replace('/nutrition-targets' as Href);
        return;
      }
      router.replace('/welcome' as Href);
      return;
    }
    setStep((s) => s - 1);
  }, [step, router, isUpdatingTargets]);

  const setDietary = useCallback((id: DietaryId) => {
    setAnswers((prev) => {
      if (id === 'none') {
        return { ...prev, dietary: ['none'] };
      }
      const withoutNone = prev.dietary.filter((x) => x !== 'none');
      if (withoutNone.includes(id)) {
        const nextD = withoutNone.filter((x) => x !== id);
        return { ...prev, dietary: nextD.length ? nextD : ['none'] };
      }
      return { ...prev, dietary: [...withoutNone, id] };
    });
  }, []);

  const stepMeta = useMemo(
    () => [
      { title: "What's your gender?", subtitle: 'Helps us personalize your nutrition estimates.' },
      { title: 'How old are you?', subtitle: 'Metabolic needs change with age.' },
      { title: "What's your height?", subtitle: 'We use this for BMI and calorie targets.' },
      { title: "What's your current weight?", subtitle: 'Starting point for your journey.' },
      { title: "What's your main goal?", subtitle: 'We will tune your daily targets.' },
      { title: 'Target weight', subtitle: 'Where you want to land.' },
      { title: 'Your timeline', subtitle: 'How quickly you want to reach your goal.' },
      { title: 'Daily eating rhythm', subtitle: 'Meals and snacks per day.' },
      { title: 'Food budget', subtitle: 'So recommendations fit your lifestyle.' },
      { title: 'Activity level', subtitle: 'Movement outside of workouts counts too.' },
      { title: 'Dietary preferences', subtitle: 'Select all that apply — or none.' },
    ],
    []
  );

  const meta = stepMeta[step]!;

  const content = useMemo(() => {
    switch (step) {
      case 0:
        return (
          <View style={styles.optionsCol}>
            {(
              [
                { id: 'male' as const, label: 'Male', icon: 'male' as const },
                { id: 'female' as const, label: 'Female', icon: 'female' as const },
                { id: 'other' as const, label: 'Prefer not to say', icon: 'person-outline' as const },
              ] as const
            ).map((opt, i) => (
              <Animated.View
                key={opt.id}
                entering={FadeInDown.delay(80 * i).duration(420).springify()}
                layout={LinearTransition.springify()}>
                <SelectCard
                  selected={answers.gender === opt.id}
                  onPress={() => setAnswers((p) => ({ ...p, gender: opt.id }))}>
                  <View style={styles.genderRow}>
                    <View
                      style={[
                        styles.genderIconWrap,
                        answers.gender === opt.id && { backgroundColor: Palette.mist + '66' },
                      ]}>
                      <Ionicons
                        name={opt.icon}
                        size={28}
                        color={answers.gender === opt.id ? Palette.iris : Palette.dusk}
                      />
                    </View>
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                    {answers.gender === opt.id ? (
                      <Ionicons name="checkmark-circle" size={24} color={Palette.iris} />
                    ) : (
                      <View style={styles.radioOuter}>
                        <View style={styles.radioInner} />
                      </View>
                    )}
                  </View>
                </SelectCard>
              </Animated.View>
            ))}
          </View>
        );
      case 1:
        return (
          <Animated.View entering={FadeInDown.duration(380)} style={styles.inputBlock}>
            <TextInput
              style={styles.bigInput}
              placeholder="e.g. 28"
              placeholderTextColor={Palette.dusk + '99'}
              keyboardType="number-pad"
              maxLength={3}
              value={answers.age}
              onChangeText={(t) => setAnswers((p) => ({ ...p, age: t.replace(/\D/g, '') }))}
            />
            <Text style={styles.hint}>Years · must be between 13 and 120</Text>
          </Animated.View>
        );
      case 2:
        return (
          <Animated.View entering={FadeInDown.duration(380)} style={styles.inputBlock}>
            <View style={styles.unitToggle}>
              {(['metric', 'imperial'] as const).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => {
                    hapticLight();
                    setAnswers((p) => ({ ...p, heightUnit: u }));
                  }}
                  style={[
                    styles.unitChip,
                    answers.heightUnit === u && styles.unitChipOn,
                  ]}>
                  <Text style={[styles.unitChipText, answers.heightUnit === u && styles.unitChipTextOn]}>
                    {u === 'metric' ? 'cm' : 'ft / in'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {answers.heightUnit === 'metric' ? (
              <TextInput
                style={styles.bigInput}
                placeholder="Height in cm"
                placeholderTextColor={Palette.dusk + '99'}
                keyboardType="decimal-pad"
                value={answers.heightCm}
                onChangeText={(t) => setAnswers((p) => ({ ...p, heightCm: t }))}
              />
            ) : (
              <View style={styles.imperialRow}>
                <TextInput
                  style={[styles.bigInput, styles.imperialInput]}
                  placeholder="ft"
                  placeholderTextColor={Palette.dusk + '99'}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={answers.heightFt}
                  onChangeText={(t) => setAnswers((p) => ({ ...p, heightFt: t.replace(/\D/g, '') }))}
                />
                <TextInput
                  style={[styles.bigInput, styles.imperialInput]}
                  placeholder="in"
                  placeholderTextColor={Palette.dusk + '99'}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={answers.heightIn}
                  onChangeText={(t) => setAnswers((p) => ({ ...p, heightIn: t.replace(/\D/g, '') }))}
                />
              </View>
            )}
          </Animated.View>
        );
      case 3:
        return (
          <Animated.View entering={FadeInDown.duration(380)} style={styles.inputBlock}>
            <View style={styles.unitToggle}>
              {(['metric', 'imperial'] as const).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => {
                    hapticLight();
                    setAnswers((p) => ({ ...p, weightUnit: u }));
                  }}
                  style={[styles.unitChip, answers.weightUnit === u && styles.unitChipOn]}>
                  <Text style={[styles.unitChipText, answers.weightUnit === u && styles.unitChipTextOn]}>
                    {u === 'metric' ? 'kg' : 'lb'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.bigInput}
              placeholder={answers.weightUnit === 'metric' ? 'Weight in kg' : 'Weight in lb'}
              placeholderTextColor={Palette.dusk + '99'}
              keyboardType="decimal-pad"
              value={answers.weight}
              onChangeText={(t) => setAnswers((p) => ({ ...p, weight: t }))}
            />
          </Animated.View>
        );
      case 4:
        return (
          <View style={styles.optionsCol}>
            {(
              [
                { id: 'lose' as const, label: 'Lose weight', icon: 'trending-down' as const, tint: '#E8FAFC', c: Palette.cyan },
                { id: 'gain' as const, label: 'Gain weight', icon: 'trending-up' as const, tint: '#FFF8EB', c: Palette.citrus },
                { id: 'maintain' as const, label: 'Maintain', icon: 'analytics' as const, tint: Palette.haze, c: Palette.iris },
              ] as const
            ).map((opt, i) => (
              <Animated.View
                key={opt.id}
                entering={FadeInDown.delay(70 * i).duration(400).springify()}
                layout={LinearTransition.springify()}>
                <SelectCard
                  selected={answers.goal === opt.id}
                  onPress={() => setAnswers((p) => ({ ...p, goal: opt.id }))}
                  accent={opt.c}>
                  <View style={styles.goalRow}>
                    <View style={[styles.goalIcon, { backgroundColor: opt.tint }]}>
                      <Ionicons name={opt.icon} size={26} color={opt.c} />
                    </View>
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                    {answers.goal === opt.id ? (
                      <Ionicons name="checkmark-circle" size={24} color={opt.c} />
                    ) : (
                      <View style={styles.radioOuter}>
                        <View style={styles.radioInner} />
                      </View>
                    )}
                  </View>
                </SelectCard>
              </Animated.View>
            ))}
          </View>
        );
      case 5:
        return (
          <Animated.View entering={FadeInDown.duration(380)} style={styles.inputBlock}>
            <TextInput
              style={styles.bigInput}
              placeholder={answers.weightUnit === 'metric' ? 'Target kg' : 'Target lb'}
              placeholderTextColor={Palette.dusk + '99'}
              keyboardType="decimal-pad"
              value={answers.targetWeight}
              onChangeText={(t) => setAnswers((p) => ({ ...p, targetWeight: t }))}
            />
            <Text style={styles.hint}>Your goal weight in the same units as above.</Text>
          </Animated.View>
        );
      case 6:
        return (
          <View style={styles.grid2}>
            {TIMELINE_OPTIONS.map((opt, i) => (
              <Animated.View
                key={opt.id}
                entering={FadeInDown.delay(50 * i).duration(380).springify()}
                style={styles.gridItem}>
                <SelectCard
                  selected={answers.timelineId === opt.id}
                  onPress={() => setAnswers((p) => ({ ...p, timelineId: opt.id }))}>
                  <View style={styles.timelineInner}>
                    <Text style={styles.timelineLabel}>{opt.label}</Text>
                    <Text style={styles.timelineSub}>{opt.sub}</Text>
                  </View>
                </SelectCard>
              </Animated.View>
            ))}
          </View>
        );
      case 7:
        return (
          <View style={styles.grid2}>
            {MEAL_OPTIONS.map((opt, i) => (
              <Animated.View key={opt.id} entering={FadeInDown.delay(60 * i).duration(380).springify()} style={styles.gridItem}>
                <SelectCard
                  selected={answers.mealsId === opt.id}
                  onPress={() => setAnswers((p) => ({ ...p, mealsId: opt.id }))}>
                  <View style={styles.mealInner}>
                    <View style={styles.mealIconWrap}>
                      <Ionicons name={opt.icon} size={22} color={answers.mealsId === opt.id ? Palette.iris : Palette.dusk} />
                    </View>
                    <Text style={styles.mealLabel}>{opt.label}</Text>
                  </View>
                </SelectCard>
              </Animated.View>
            ))}
          </View>
        );
      case 8:
        return (
          <View style={styles.optionsCol}>
            {BUDGET_OPTIONS.map((opt, i) => (
              <Animated.View key={opt.id} entering={FadeInDown.delay(70 * i).duration(400).springify()}>
                <SelectCard
                  selected={answers.budget === opt.id}
                  onPress={() => setAnswers((p) => ({ ...p, budget: opt.id }))}
                  accent={opt.accent}>
                  <View style={styles.budgetRow}>
                    <View style={[styles.budgetIcon, { backgroundColor: opt.tint }]}>
                      <Ionicons name={opt.icon} size={24} color={opt.accent} />
                    </View>
                    <View style={styles.budgetTextCol}>
                      <Text style={styles.optionLabel}>{opt.label}</Text>
                      <Text style={styles.budgetSub}>{opt.sub}</Text>
                    </View>
                    {answers.budget === opt.id ? (
                      <Ionicons name="checkmark-circle" size={22} color={opt.accent} />
                    ) : null}
                  </View>
                </SelectCard>
              </Animated.View>
            ))}
          </View>
        );
      case 9:
        return (
          <View style={styles.optionsCol}>
            {ACTIVITY_OPTIONS.map((opt, i) => (
              <Animated.View key={opt.id} entering={FadeInDown.delay(45 * i).duration(380).springify()}>
                <SelectCard
                  selected={answers.activity === opt.id}
                  onPress={() => setAnswers((p) => ({ ...p, activity: opt.id }))}>
                  <View style={styles.activityRow}>
                    <Ionicons
                      name={opt.icon}
                      size={22}
                      color={answers.activity === opt.id ? Palette.iris : Palette.dusk}
                      style={styles.activityIcon}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionLabel}>{opt.label}</Text>
                      <Text style={styles.activitySub}>{opt.sub}</Text>
                    </View>
                    {answers.activity === opt.id ? (
                      <Ionicons name="checkmark-circle" size={22} color={Palette.iris} />
                    ) : (
                      <View style={styles.radioOuter}>
                        <View style={styles.radioInner} />
                      </View>
                    )}
                  </View>
                </SelectCard>
              </Animated.View>
            ))}
          </View>
        );
      case 10:
        return (
          <View style={styles.optionsCol}>
            {DIETARY_OPTIONS.map((opt, i) => (
              <Animated.View key={opt.id} entering={FadeInDown.delay(55 * i).duration(400).springify()}>
                <SelectCard
                  selected={answers.dietary.includes(opt.id)}
                  onPress={() => setDietary(opt.id)}
                  accent={opt.color}>
                  <View style={styles.dietRow}>
                    <View style={[styles.dietIcon, { backgroundColor: opt.bg }]}>
                      <Ionicons name={opt.icon} size={24} color={opt.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionLabel}>{opt.label}</Text>
                      <Text style={styles.dietSub}>{opt.sub}</Text>
                    </View>
                    {answers.dietary.includes(opt.id) ? (
                      <Ionicons name="checkmark-circle" size={22} color={opt.color} />
                    ) : (
                      <View style={styles.checkboxOuter}>
                        <View style={styles.checkboxInner} />
                      </View>
                    )}
                  </View>
                </SelectCard>
              </Animated.View>
            ))}
          </View>
        );
      default:
        return null;
    }
  }, [step, answers, setDietary]);

  const proceed = canProceed(step, answers);
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}>
        <View style={styles.topBar}>
          <Pressable onPress={back} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={Palette.obsidian} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.stepCount}>
            {step + 1}/{TOTAL_STEPS}
          </Text>
        </View>

        <ProgressBar step={step} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View key={step} entering={FadeInDown.duration(340).springify()} exiting={FadeOut.duration(180)}>
            <Text style={styles.title}>{meta.title}</Text>
            <Text style={styles.subtitle}>{meta.subtitle}</Text>
            <View style={styles.stepBody}>{content}</View>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={next}
            disabled={!proceed}
            style={({ pressed }) => [
              styles.cta,
              !proceed && styles.ctaDisabled,
              pressed && proceed && styles.ctaPressed,
            ]}>
            <Text style={styles.ctaText}>{isLast ? 'Finish & go to app' : 'Continue'}</Text>
            <Ionicons name={isLast ? 'sparkles' : 'arrow-forward'} size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: {
    flex: 1,
    backgroundColor: Palette.ghost,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: Palette.obsidian,
  },
  stepCount: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Palette.dusk,
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 6,
    marginHorizontal: 20,
    borderRadius: 999,
    backgroundColor: Palette.haze,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Palette.iris,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    lineHeight: 34,
    color: Palette.obsidian,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Palette.dusk,
    marginBottom: 24,
  },
  stepBody: {
    minHeight: 200,
  },
  optionsCol: {
    gap: 12,
  },
  selectCard: {
    borderRadius: 18,
    borderWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  pressedCard: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  genderIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Palette.haze,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    color: Palette.obsidian,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Palette.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBlock: {
    gap: 12,
  },
  bigInput: {
    fontFamily: Fonts.semiBold,
    fontSize: 22,
    color: Palette.obsidian,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(75, 35, 200, 0.12)',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Palette.dusk,
    marginTop: 4,
  },
  unitToggle: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  unitChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: Palette.haze,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  unitChipOn: {
    backgroundColor: '#E8E0FF',
    borderColor: Palette.iris,
  },
  unitChipText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Palette.dusk,
  },
  unitChipTextOn: {
    color: Palette.iris,
  },
  imperialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imperialInput: {
    flex: 1,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '47.5%',
  },
  timelineInner: {
    minHeight: 72,
    justifyContent: 'center',
  },
  timelineLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Palette.obsidian,
  },
  timelineSub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Palette.dusk,
    marginTop: 4,
  },
  mealInner: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  mealIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.haze,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Palette.obsidian,
    textAlign: 'center',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  budgetIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetTextCol: {
    flex: 1,
  },
  budgetSub: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Palette.dusk,
    marginTop: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIcon: {
    width: 28,
  },
  activitySub: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Palette.dusk,
    marginTop: 2,
  },
  dietRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dietIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietSub: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Palette.dusk,
    marginTop: 2,
  },
  checkboxOuter: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Palette.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 4,
    backgroundColor: 'transparent',
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
  ctaDisabled: {
    opacity: 0.38,
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
