import { GoogleGenerativeAI } from '@google/generative-ai';

import type { FoodVisionResult } from '@/lib/vision/vision-detect-food';

export function getGeminiScanConfig(): { apiKey: string; model: string } | null {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  const model = process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  if (!apiKey) return null;
  return { apiKey, model };
}

function visionBlock(vision: FoodVisionResult): string {
  if (vision.noFoodDetected || vision.topFoodLabels.length === 0) {
    return 'Google Vision did not return high-confidence food labels/objects (≥70%). Still examine the image carefully for any food.';
  }
  return `Google Vision food cues (≥70% confidence): ${vision.topFoodLabels
    .map((l) => `${l.description} (${(l.score * 100).toFixed(0)}%)`)
    .join('; ')}`;
}

const SCAN_SYSTEM_INSTRUCTION = `You are an expert nutrition analyst. You see a meal photo plus optional Google Vision cues.

Your job:
1. Name the meal concisely.
2. Describe EVERYTHING edible or drink-related visible: main items, sides, garnishes, sauces, toppings, bread, utensils are NOT ingredients—only food/drink.
3. List ingredients as separate lines with rough portions (e.g. "Grilled chicken breast ~150g", "Steamed white rice ~1 cup cooked").
4. Estimate TOTAL meal calories and protein, carbs, fat in grams for the whole plate/dish. Macros must be consistent with calories (allow ~12% slack: 4 kcal/g protein & carbs, 9 kcal/g fat).

If there is no food, set foodName to "Unrecognized — not food", sceneDescription to explain, ingredients to [], and all numbers to 0.

Respond with ONLY valid JSON — no markdown, no commentary.`;

const SCAN_JSON_SPEC = `{
  "foodName": "string, concise title, max 100 chars",
  "sceneDescription": "string, 2-6 sentences covering the full image",
  "ingredients": ["string each visible component with portion estimate", "..."],
  "calories": integer,
  "proteinGrams": integer,
  "carbsGrams": integer,
  "fatGrams": integer
}`;

/**
 * Multimodal Gemini: image + Vision context → structured meal analysis.
 */
export async function analyzeMealPhotoWithGemini(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png',
  vision: FoodVisionResult
): Promise<string> {
  const cfg = getGeminiScanConfig();
  if (!cfg) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY. Add it to .env and restart Expo.');
  }

  const genAI = new GoogleGenerativeAI(cfg.apiKey);
  const model = genAI.getGenerativeModel({
    model: cfg.model,
    systemInstruction: SCAN_SYSTEM_INSTRUCTION,
  });

  const userText = `${visionBlock(vision)}

Return JSON exactly in this shape (all keys required):
${SCAN_JSON_SPEC}

Rules:
- ingredients: minimum 1 entry for a clear single food; for mixed plates list 5–15 lines covering each distinct item.
- sceneDescription must mention layout, colors/textures if they help identify items.
- Use whole numbers for calories and macros.`;

  let text: string;
  try {
    const result = await model.generateContent([
      { inlineData: { mimeType, data: imageBase64 } },
      { text: userText },
    ]);
    text = result.response.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/API key|API_KEY|403|401|permission/i.test(msg)) {
      throw new Error('Invalid or missing Gemini API key. Check EXPO_PUBLIC_GEMINI_API_KEY.');
    }
    if (/404|not found|model/i.test(msg)) {
      throw new Error(
        `Gemini model may be unavailable: ${cfg.model}. Set EXPO_PUBLIC_GEMINI_MODEL (e.g. gemini-2.5-flash).`
      );
    }
    throw new Error(msg || 'Gemini request failed. Check your network and try again.');
  }

  if (!text?.trim()) {
    throw new Error('Empty response from Gemini. Try again.');
  }
  return text;
}
