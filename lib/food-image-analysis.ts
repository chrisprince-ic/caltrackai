import { extractJsonObject } from '@/lib/ai-json-utils';
import { analyzeMealPhotoWithGemini, getGeminiScanConfig } from '@/lib/gemini-scan-analysis';
import { getGoogleVisionConfig } from '@/lib/vision/vision-config';
import {
  normalizeBase64ForVision,
  prepareImageUriForVision,
  validateVisionBase64,
} from '@/lib/vision/prepare-image';
import { detectFoodWithVision, type FoodVisionResult } from '@/lib/vision/vision-detect-food';
import type { FoodAnalysisResult } from '@/types/food-analysis';

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : parseInt(String(n), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

function parseIngredients(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const lines = raw
    .map((x) => (typeof x === 'string' ? x.trim() : String(x)))
    .filter((s) => s.length > 0)
    .map((s) => s.slice(0, 160))
    .slice(0, 20);
  return lines.length ? lines : undefined;
}

function parseGeminiScanJson(raw: string): FoodAnalysisResult {
  const jsonStr = extractJsonObject(raw);
  const data = JSON.parse(jsonStr) as Record<string, unknown>;

  const sceneDescription =
    typeof data.sceneDescription === 'string' ? data.sceneDescription.trim().slice(0, 1200) : undefined;

  return {
    foodName:
      typeof data.foodName === 'string' && data.foodName.trim().length > 0
        ? data.foodName.trim().slice(0, 120)
        : 'Meal',
    calories: clampInt(data.calories, 0, 8000, 0),
    proteinGrams: clampInt(data.proteinGrams, 0, 500, 0),
    carbsGrams: clampInt(data.carbsGrams, 0, 1000, 0),
    fatGrams: clampInt(data.fatGrams, 0, 500, 0),
    sceneDescription: sceneDescription || undefined,
    ingredients: parseIngredients(data.ingredients),
  };
}

async function runGeminiFromVision(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png',
  vision: FoodVisionResult
): Promise<FoodAnalysisResult> {
  const text = await analyzeMealPhotoWithGemini(imageBase64, mimeType, vision);
  try {
    return parseGeminiScanJson(text);
  } catch {
    throw new Error('Could not parse meal data from Gemini. Try a clearer photo.');
  }
}

/** Vision + Gemini keys (DeepSeek is not used for scan). */
export function isFoodScanConfigured(): boolean {
  return Boolean(getGoogleVisionConfig() && getGeminiScanConfig());
}

/**
 * Resize/compress image → Vision cues → Gemini multimodal (image + cues) for full meal breakdown.
 */
export async function analyzeFoodFromScanUri(uri: string): Promise<FoodAnalysisResult> {
  if (!isFoodScanConfigured()) {
    throw new Error(
      'Add EXPO_PUBLIC_GOOGLE_VISION_API_KEY and EXPO_PUBLIC_GEMINI_API_KEY to .env, then restart Expo.'
    );
  }

  const prepared = await prepareImageUriForVision(uri);

  let vision: FoodVisionResult;
  try {
    vision = await detectFoodWithVision(prepared.base64);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/API key|API_KEY|403|401|PERMISSION_DENIED/i.test(msg)) {
      throw new Error(
        'Google Vision API error. Check EXPO_PUBLIC_GOOGLE_VISION_API_KEY and that Cloud Vision API is enabled.'
      );
    }
    throw new Error(msg || 'Google Vision request failed.');
  }

  return runGeminiFromVision(prepared.base64, prepared.mimeType, vision);
}

export async function analyzeFoodFromBase64(
  base64Input: string,
  mimeTypeInput: string = 'image/jpeg'
): Promise<FoodAnalysisResult> {
  if (!isFoodScanConfigured()) {
    throw new Error(
      'Add EXPO_PUBLIC_GOOGLE_VISION_API_KEY and EXPO_PUBLIC_GEMINI_API_KEY to .env, then restart Expo.'
    );
  }

  const base64 = normalizeBase64ForVision(base64Input);
  validateVisionBase64(base64);

  let vision: FoodVisionResult;
  try {
    vision = await detectFoodWithVision(base64);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/API key|API_KEY|403|401|PERMISSION_DENIED/i.test(msg)) {
      throw new Error(
        'Google Vision API error. Check EXPO_PUBLIC_GOOGLE_VISION_API_KEY and that Cloud Vision API is enabled.'
      );
    }
    throw new Error(msg || 'Google Vision request failed.');
  }

  const mimeType: 'image/jpeg' | 'image/png' =
    mimeTypeInput === 'image/png' ? 'image/png' : 'image/jpeg';

  return runGeminiFromVision(base64, mimeType, vision);
}
