import { GoogleGenerativeAI } from '@google/generative-ai';

import type { FoodAnalysisResult } from '@/types/food-analysis';

const PROMPT = `You are a nutrition estimation assistant. Look at this food photo and estimate the total calories and macronutrients for what is visibly served (one reasonable portion). If multiple items appear, combine into one meal estimate.

Respond with ONLY valid JSON — no markdown fences, no commentary. Use exactly these keys and number types (integers):
{"foodName":"short descriptive name","calories":0,"proteinGrams":0,"carbsGrams":0,"fatGrams":0}

Rules:
- foodName: max 80 characters, title case when natural
- calories: total kcal estimate
- proteinGrams, carbsGrams, fatGrams: grams, whole numbers
- If the image is not food, return reasonable defaults with foodName "Unrecognized — not food" and zeros.`;

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : parseInt(String(n), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

function parseResult(raw: string): FoodAnalysisResult {
  const jsonStr = extractJsonObject(raw);
  const data = JSON.parse(jsonStr) as Record<string, unknown>;
  return {
    foodName:
      typeof data.foodName === 'string' && data.foodName.trim().length > 0
        ? data.foodName.trim().slice(0, 120)
        : 'Meal',
    calories: clampInt(data.calories, 0, 8000, 0),
    proteinGrams: clampInt(data.proteinGrams, 0, 500, 0),
    carbsGrams: clampInt(data.carbsGrams, 0, 1000, 0),
    fatGrams: clampInt(data.fatGrams, 0, 500, 0),
  };
}

export function getGeminiConfig(): { apiKey: string; model: string } | null {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  const model = process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
  if (!apiKey) return null;
  return { apiKey, model };
}

/** ~6MB decoded cap — avoids huge payloads and runaway API cost. */
const MAX_BASE64_CHARS = 8_500_000;

export async function analyzeFoodFromBase64(
  base64: string,
  mimeType: string = 'image/jpeg'
): Promise<FoodAnalysisResult> {
  const cfg = getGeminiConfig();
  if (!cfg) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY. Add it to your .env and restart Expo.');
  }
  if (base64.length > MAX_BASE64_CHARS) {
    throw new Error('Photo is too large. Try again with a bit more distance or light.');
  }

  const genAI = new GoogleGenerativeAI(cfg.apiKey);
  const model = genAI.getGenerativeModel({ model: cfg.model });

  let text: string;
  try {
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      { text: PROMPT },
    ]);
    text = result.response.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/API key|API_KEY|403|401/i.test(msg)) {
      throw new Error('Invalid or missing Gemini API key. Check EXPO_PUBLIC_GEMINI_API_KEY and billing.');
    }
    if (/404|not found|model/i.test(msg)) {
      throw new Error(
        `Model may be unavailable: ${cfg.model}. Set EXPO_PUBLIC_GEMINI_MODEL (e.g. gemini-2.0-flash or gemini-1.5-flash).`
      );
    }
    throw new Error(msg || 'Gemini request failed. Check your network and try again.');
  }

  if (!text?.trim()) {
    throw new Error('Empty response from model. Try again or check EXPO_PUBLIC_GEMINI_MODEL.');
  }

  try {
    return parseResult(text);
  } catch {
    throw new Error('Could not parse nutrition data from AI. Try a clearer photo.');
  }
}
