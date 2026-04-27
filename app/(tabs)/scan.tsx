import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { DASHBOARD_MACROS } from '@/constants/dashboard-mock';
import { SCAN_STATUS_MESSAGES } from '@/constants/scan-mock';
import { useNutritionLog } from '@/contexts/NutritionLogContext';
import { analyzeFoodFromScanUri, isFoodScanConfigured } from '@/lib/food-image-analysis';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import type { FoodAnalysisResult } from '@/types/food-analysis';

type Phase = 'camera' | 'processing' | 'result';

const CORNER = 32;
const STROKE = 3;

function clampPct(n: number) {
  return Math.min(100, Math.max(0, n));
}

const MAX_LOG_FOOD_NAME = 200;

/** Compact title + ingredients for diary (respects sanitize max length). */
function buildFoodNameForLog(r: FoodAnalysisResult): string {
  const title = r.foodName.trim() || 'Meal';
  if (!r.ingredients?.length) return title.slice(0, MAX_LOG_FOOD_NAME);
  const ingPart = r.ingredients.join(' · ');
  const combined = `${title} — ${ingPart}`;
  if (combined.length <= MAX_LOG_FOOD_NAME) return combined;
  const budget = Math.max(0, MAX_LOG_FOOD_NAME - title.length - 3);
  if (budget < 24) return title.slice(0, MAX_LOG_FOOD_NAME);
  return `${title} — ${ingPart.slice(0, budget)}…`;
}

function Viewfinder() {
  const c = Palette.mist;
  const common = { position: 'absolute' as const, borderColor: c };
  return (
    <View style={styles.viewfinder} pointerEvents="none">
      <View style={[common, styles.cornerTL]} />
      <View style={[common, styles.cornerTR]} />
      <View style={[common, styles.cornerBL]} />
      <View style={[common, styles.cornerBR]} />
      <View style={styles.scanLine} />
    </View>
  );
}

function ProcessingPulse() {
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [x]);
  const bar = useAnimatedStyle(() => ({
    width: `${30 + x.value * 70}%`,
    opacity: 0.5 + x.value * 0.5,
  }));
  return (
    <View style={styles.pulseTrack}>
      <Animated.View style={[styles.pulseFill, bar]} />
    </View>
  );
}

function PulseDot({ delayMs }: { delayMs: number }) {
  const op = useSharedValue(0.35);
  useEffect(() => {
    op.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(withTiming(1, { duration: 420 }), withTiming(0.35, { duration: 420 })),
        -1,
        false
      )
    );
  }, [op, delayMs]);
  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ scale: 0.85 + op.value * 0.15 }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

function DotsRow() {
  return (
    <View style={styles.dotsRow}>
      <PulseDot delayMs={0} />
      <PulseDot delayMs={160} />
      <PulseDot delayMs={320} />
    </View>
  );
}

function ResultMacroRow({
  label,
  grams,
  dailyGoal,
  color,
  tint,
  icon,
}: {
  label: string;
  grams: number;
  dailyGoal: number;
  color: string;
  tint: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const pct = clampPct((grams / dailyGoal) * 100);
  return (
    <View style={styles.rmCard}>
      <View style={[styles.rmIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.rmBody}>
        <View style={styles.rmTop}>
          <Text style={styles.rmLabel}>{label}</Text>
          <Text style={styles.rmGrams}>
            <Text style={styles.rmGramsBold}>{grams}g</Text>
            <Text style={styles.rmGramsHint}> · meal</Text>
          </Text>
        </View>
        <View style={[styles.rmTrack, { backgroundColor: tint }]}>
          <View style={[styles.rmFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.rmFoot}>{pct}% of daily {label.toLowerCase()} target</Text>
      </View>
    </View>
  );
}

function WebPlaceholder() {
  return (
    <SafeAreaView style={styles.webSafe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.webInner}>
        <View style={styles.webIconWrap}>
          <Ionicons name="camera-outline" size={44} color={Palette.iris} />
        </View>
        <Text style={styles.webTitle}>Camera on your phone</Text>
        <Text style={styles.webSub}>
          Meal scanning uses the camera, Google Vision, and Gemini. Open on iOS or Android with API keys in{' '}
          <Text style={{ fontFamily: Fonts.semiBold }}>.env</Text>.
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function ScanScreen() {
  if (Platform.OS === 'web') {
    return <WebPlaceholder />;
  }

  return <ScanCameraExperience />;
}

function ScanCameraExperience() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addEntry } = useNutritionLog();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [phase, setPhase] = useState<Phase>('camera');
  const [processIndex, setProcessIndex] = useState(0);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const processIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logSubmittingRef = useRef(false);

  const clearProcessInterval = useCallback(() => {
    if (processIntervalRef.current) {
      clearInterval(processIntervalRef.current);
      processIntervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearProcessInterval(), [clearProcessInterval]);

  const reset = useCallback(() => {
    clearProcessInterval();
    setPhase('camera');
    setPhotoUri(null);
    setResult(null);
    setProcessIndex(0);
    setErr(null);
    logSubmittingRef.current = false;
  }, [clearProcessInterval]);

  const processImageForAnalysis = useCallback(
    async (uri: string) => {
      if (!isFoodScanConfigured()) {
        setErr(
          'Add EXPO_PUBLIC_GOOGLE_VISION_API_KEY and EXPO_PUBLIC_GEMINI_API_KEY to .env (Vision + Gemini), then restart Expo.'
        );
        return;
      }
      setPhotoUri(uri);
      setPhase('processing');
      setProcessIndex(0);
      processIntervalRef.current = setInterval(() => {
        setProcessIndex((i) => (i + 1) % SCAN_STATUS_MESSAGES.length);
      }, 820);
      try {
        const analysis = await analyzeFoodFromScanUri(uri);
        clearProcessInterval();
        setResult(analysis);
        setPhase('result');
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      } catch (e) {
        clearProcessInterval();
        const msg = e instanceof Error ? e.message : 'Analysis failed';
        setErr(msg);
        setPhase('camera');
        setPhotoUri(null);
      }
    },
    [clearProcessInterval]
  );

  const pickFromGallery = useCallback(async () => {
    if (busy) return;
    if (!isFoodScanConfigured()) {
      setErr(
        'Add EXPO_PUBLIC_GOOGLE_VISION_API_KEY and EXPO_PUBLIC_GEMINI_API_KEY to .env (Vision + Gemini), then restart Expo.'
      );
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setErr('Photo library access is needed to choose a meal photo.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        base64: false,
      });
      if (picked.canceled || !picked.assets?.[0]) {
        return;
      }
      const asset = picked.assets[0];
      if (!asset.uri) {
        setErr("Couldn't read that image. Try another photo or take a new picture.");
        return;
      }
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      await processImageForAnalysis(asset.uri);
    } catch {
      setErr('Could not open your photo library. Try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, processImageForAnalysis]);

  const capture = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || busy) return;

    setErr(null);
    setBusy(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 1,
        skipProcessing: Platform.OS === 'android',
      });

      if (!photo?.uri) {
        setErr("Couldn't capture image — try again.");
        return;
      }

      await processImageForAnalysis(photo.uri);
    } catch {
      clearProcessInterval();
      setErr('Camera error. Please try again.');
      setPhase('camera');
      setPhotoUri(null);
    } finally {
      setBusy(false);
    }
  }, [cameraReady, busy, clearProcessInterval, processImageForAnalysis]);

  const onAddToLog = useCallback(async () => {
    if (!result || logSubmittingRef.current) return;
    logSubmittingRef.current = true;
    try {
      const logName = buildFoodNameForLog(result);
      await addEntry({
        foodName: logName,
        calories: result.calories,
        proteinGrams: result.proteinGrams,
        carbsGrams: result.carbsGrams,
        fatGrams: result.fatGrams,
        imageUri: photoUri ?? undefined,
      });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      reset();
      router.navigate('/(tabs)' as Href);
    } finally {
      logSubmittingRef.current = false;
    }
  }, [result, addEntry, photoUri, reset, router]);

  if (!permission) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Palette.iris} />
        <Text style={styles.bootText}>Preparing camera…</Text>
      </View>
    );
  }

  if (!permission.granted && phase === 'camera') {
    return (
      <SafeAreaView style={styles.permSafe} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.permCard}>
          <View style={styles.permIcon}>
            <Ionicons name="camera-outline" size={40} color={Palette.iris} />
          </View>
          <Text style={styles.permTitle}>Camera access</Text>
          <Text style={styles.permBody}>
            Allow the camera to frame meals live, or pick an existing photo from your gallery —             both are analyzed with Google Vision and Gemini.
          </Text>
          <Pressable onPress={() => requestPermission()} style={({ pressed }) => [styles.permBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.permBtnText}>Allow camera</Text>
          </Pressable>
          <Pressable
            onPress={() => void pickFromGallery()}
            disabled={busy}
            style={({ pressed }) => [styles.permBtnSecondary, pressed && { opacity: 0.88 }, busy && { opacity: 0.65 }]}>
            {busy ? (
              <ActivityIndicator size="small" color={Palette.iris} />
            ) : (
              <Ionicons name="images-outline" size={22} color={Palette.iris} />
            )}
            <Text style={styles.permBtnSecondaryText}>Choose from gallery</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const cameraGranted = permission.granted;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {cameraGranted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode="picture"
          onCameraReady={() => setCameraReady(true)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: Palette.void }]} />
      )}

      <View style={[styles.topFade, { height: insets.top + 56 }]} />
      <View style={[styles.bottomFade, { height: height * 0.42 }]} />

      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={styles.topBar}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{cameraGranted ? 'LIVE' : 'PHOTO'}</Text>
          </View>
          {cameraGranted ? (
            <Pressable
              onPress={() => {
                setFacing((f) => (f === 'back' ? 'front' : 'back'));
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }}
              style={styles.iconBtn}
              accessibilityLabel="Flip camera">
              <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
            </Pressable>
          ) : (
            <View style={[styles.iconBtn, { opacity: 0 }]} pointerEvents="none" />
          )}
        </View>

        {phase === 'camera' && cameraGranted && (
          <>
            <View style={styles.hintWrap}>
              <Text style={styles.hintTitle}>Frame your meal</Text>
              <Text style={styles.hintSub}>Capture or tap Gallery — Vision + Gemini estimates calories & macros</Text>
            </View>
            <Viewfinder />
          </>
        )}

      </SafeAreaView>

      {(phase === 'processing' || phase === 'result') && (
        <View style={styles.dim} pointerEvents="box-none">
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {phase === 'processing' && (
                <>
                  <View style={styles.sheetHeader}>
                    <View style={styles.sheetBadge}>
                      <ActivityIndicator size="small" color={Palette.iris} />
                      <Text style={styles.sheetBadgeText}>Scanning</Text>
                    </View>
                  </View>
                  <Text style={styles.statusMain}>{SCAN_STATUS_MESSAGES[processIndex]}</Text>
                  <DotsRow />
                  <ProcessingPulse />
                  <Text style={styles.statusFoot}>
                    AI analysis · values are estimates only
                  </Text>
                </>
              )}

              {phase === 'result' && result && (
                <Animated.View entering={FadeInDown.duration(380).springify()}>
                  <View style={styles.resultHeader}>
                    <View style={styles.resultBadge}>
                      <Ionicons name="sparkles" size={16} color={Palette.iris} />
                      <Text style={styles.resultBadgeText}>Scan result</Text>
                    </View>
                  </View>

                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="image-outline" size={36} color={Palette.dusk} />
                    </View>
                  )}

                  <Text style={styles.foodName} numberOfLines={4}>
                    {result.foodName}
                  </Text>

                  {result.sceneDescription ? (
                    <Text style={styles.sceneDescription}>{result.sceneDescription}</Text>
                  ) : null}

                  {result.ingredients && result.ingredients.length > 0 ? (
                    <View style={styles.ingredientsCard}>
                      <Text style={styles.ingredientsTitle}>Ingredients & portions</Text>
                      {result.ingredients.map((line, i) => (
                        <View key={`ing-${i}`} style={styles.ingredientRow}>
                          <View style={styles.ingredientDot} />
                          <Text style={styles.ingredientText}>{line}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.calResultCard}>
                    <View style={styles.calResultGlow} />
                    <Text style={styles.calResultEyebrow}>Estimated energy</Text>
                    <View style={styles.calResultRow}>
                      <Text style={styles.calResultValue}>{result.calories.toLocaleString()}</Text>
                      <Text style={styles.calResultUnit}>kcal</Text>
                    </View>
                    <View style={styles.calChips}>
                      <View style={styles.calChip}>
                        <Ionicons name="flame-outline" size={14} color={Palette.citrus} />
                        <Text style={styles.calChipText}>This meal</Text>
                      </View>
                      <View style={styles.calChip}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={Palette.lavender} />
                        <Text style={styles.calChipText}>Vision + Gemini</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.macrosSectionTitle}>Macronutrients</Text>
                  <Text style={styles.macrosSectionSub}>Bars show share of your daily targets from Home</Text>

                  <ResultMacroRow
                    label="Protein"
                    grams={result.proteinGrams}
                    dailyGoal={DASHBOARD_MACROS.protein.goal}
                    color={Palette.flamingo}
                    tint="#FFE8F0"
                    icon="fitness-outline"
                  />
                  <ResultMacroRow
                    label="Carbs"
                    grams={result.carbsGrams}
                    dailyGoal={DASHBOARD_MACROS.carbs.goal}
                    color={Palette.citrus}
                    tint="#FFF8EB"
                    icon="leaf-outline"
                  />
                  <ResultMacroRow
                    label="Fats"
                    grams={result.fatGrams}
                    dailyGoal={DASHBOARD_MACROS.fat.goal}
                    color={Palette.cyan}
                    tint="#E0F8FA"
                    icon="water-outline"
                  />

                  <Text style={styles.disclaimer}>
                    Estimates only — not medical advice. Adjust in your diary if needed.
                  </Text>

                  <Pressable
                    onPress={onAddToLog}
                    style={({ pressed }) => [styles.logCaloriesBtn, pressed && { opacity: 0.92 }]}>
                    <Ionicons name="add-circle" size={22} color="#FFFFFF" />
                    <Text style={styles.logCaloriesBtnText}>Log calories to Home</Text>
                  </Pressable>

                  <Pressable onPress={reset} style={styles.scanAgainBtn}>
                    <Ionicons name="camera-outline" size={20} color={Palette.iris} />
                    <Text style={styles.scanAgainText}>Scan another meal</Text>
                  </Pressable>
                </Animated.View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {err ? (
        <View style={[styles.errorToast, { bottom: insets.bottom + 100 }]}>
          <Ionicons name="alert-circle" size={18} color="#9B1F52" />
          <Text style={styles.errorText}>{err}</Text>
        </View>
      ) : null}

      {phase === 'camera' && cameraGranted && (
        <View style={[styles.shutterRow, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.shutterRowInner}>
            <Pressable
              onPress={() => void pickFromGallery()}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Choose meal photo from gallery"
              style={({ pressed }) => [
                styles.galleryBtn,
                busy && { opacity: 0.45 },
                pressed && { opacity: 0.85 },
              ]}>
              <Ionicons name="images-outline" size={26} color="#FFFFFF" />
              <Text style={styles.galleryBtnLabel}>Gallery</Text>
            </Pressable>
            <View style={styles.shutterCenter}>
              <Pressable
                onPress={capture}
                disabled={!cameraReady || busy}
                accessibilityRole="button"
                accessibilityLabel="Capture meal photo"
                style={({ pressed }) => [
                  styles.shutterOuter,
                  (!cameraReady || busy) && { opacity: 0.45 },
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}>
                <View style={styles.shutterInner} />
              </Pressable>
              <Text style={styles.shutterLabel}>Tap to capture</Text>
            </View>
            <View style={styles.shutterSideSpacer} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.void,
  },
  boot: {
    flex: 1,
    backgroundColor: Palette.ghost,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  bootText: {
    fontFamily: Fonts.medium,
    color: Palette.dusk,
  },
  permSafe: {
    flex: 1,
    backgroundColor: Palette.ghost,
    justifyContent: 'center',
    padding: 24,
  },
  permCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.1)',
    alignItems: 'center',
  },
  permIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Palette.haze,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permTitle: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Palette.obsidian,
    marginBottom: 10,
    textAlign: 'center',
  },
  permBody: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Palette.dusk,
    textAlign: 'center',
    marginBottom: 24,
  },
  permBtn: {
    backgroundColor: Palette.iris,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
  },
  permBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  permBtnSecondary: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    width: '100%',
    backgroundColor: Palette.haze,
    borderWidth: 1.5,
    borderColor: 'rgba(75, 35, 200, 0.2)',
  },
  permBtnSecondaryText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Palette.iris,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 10, 30, 0.55)',
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 10, 30, 0.35)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B9D',
  },
  liveText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  hintWrap: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  hintTitle: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  hintSub: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    textAlign: 'center',
  },
  viewfinder: {
    position: 'absolute',
    left: '9%',
    right: '9%',
    top: '30%',
    aspectRatio: 3 / 3.2,
    maxHeight: '46%',
  },
  cornerTL: {
    top: 0,
    left: 0,
    width: CORNER,
    height: CORNER,
    borderTopWidth: STROKE,
    borderLeftWidth: STROKE,
    borderTopLeftRadius: 14,
  },
  cornerTR: {
    top: 0,
    right: 0,
    width: CORNER,
    height: CORNER,
    borderTopWidth: STROKE,
    borderRightWidth: STROKE,
    borderTopRightRadius: 14,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: STROKE,
    borderLeftWidth: STROKE,
    borderBottomLeftRadius: 14,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: STROKE,
    borderRightWidth: STROKE,
    borderBottomRightRadius: 14,
  },
  scanLine: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '50%',
    height: 2,
    backgroundColor: 'rgba(196, 178, 250, 0.5)',
    borderRadius: 1,
  },
  shutterRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  shutterRowInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  galleryBtn: {
    width: 76,
    alignItems: 'center',
    paddingBottom: 10,
    gap: 6,
  },
  galleryBtnLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
  },
  shutterCenter: {
    flex: 1,
    alignItems: 'center',
  },
  shutterSideSpacer: {
    width: 76,
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  shutterLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 10, 30, 0.65)',
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.1)',
    shadowColor: Palette.obsidian,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.haze,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  sheetBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Palette.iris,
  },
  statusMain: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: Palette.obsidian,
    textAlign: 'center',
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.lavender,
  },
  pulseTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Palette.haze,
    overflow: 'hidden',
    marginBottom: 14,
  },
  pulseFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Palette.iris,
  },
  statusFoot: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Palette.dusk,
    textAlign: 'center',
    lineHeight: 20,
    paddingBottom: 8,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.haze,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  resultBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Palette.iris,
  },
  thumb: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: Palette.haze,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodName: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Palette.obsidian,
    textAlign: 'center',
    marginBottom: 10,
  },
  sceneDescription: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Palette.dusk,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  ingredientsCard: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.08)',
  },
  ingredientsTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Palette.obsidian,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  ingredientDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Palette.iris,
    marginTop: 6,
  },
  ingredientText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Palette.obsidian,
  },
  calResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.1)',
    overflow: 'hidden',
  },
  calResultGlow: {
    position: 'absolute',
    top: -36,
    right: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Palette.mist,
    opacity: 0.4,
  },
  calResultEyebrow: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: Palette.lavender,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  calResultRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 14,
  },
  calResultValue: {
    fontFamily: Fonts.bold,
    fontSize: 44,
    lineHeight: 48,
    color: Palette.iris,
  },
  calResultUnit: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    color: Palette.dusk,
  },
  calChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.haze,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  calChipText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Palette.obsidian,
  },
  macrosSectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Palette.obsidian,
    marginBottom: 4,
  },
  macrosSectionSub: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Palette.dusk,
    marginBottom: 14,
  },
  rmCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(75, 35, 200, 0.06)',
    gap: 14,
    alignItems: 'center',
  },
  rmIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rmBody: { flex: 1, minWidth: 0 },
  rmTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  rmLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Palette.obsidian,
  },
  rmGrams: { fontFamily: Fonts.regular, fontSize: 14 },
  rmGramsBold: { fontFamily: Fonts.semiBold, color: Palette.obsidian },
  rmGramsHint: { color: Palette.dusk },
  rmTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  rmFill: {
    height: '100%',
    borderRadius: 999,
  },
  rmFoot: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Palette.dusk,
  },
  disclaimer: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Palette.dusk,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 18,
  },
  logCaloriesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Palette.iris,
    paddingVertical: 16,
    borderRadius: 999,
    marginBottom: 12,
    shadowColor: Palette.iris,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  logCaloriesBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  scanAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginBottom: 12,
  },
  scanAgainText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Palette.iris,
  },
  errorToast: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFE8F2',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(155, 31, 82, 0.2)',
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: '#9B1F52',
  },
  webSafe: {
    flex: 1,
    backgroundColor: Palette.ghost,
  },
  webInner: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
  },
  webIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: Palette.haze,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  webTitle: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: Palette.obsidian,
    textAlign: 'center',
    marginBottom: 12,
  },
  webSub: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: Palette.dusk,
    textAlign: 'center',
  },
});
