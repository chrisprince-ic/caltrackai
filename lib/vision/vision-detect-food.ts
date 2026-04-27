import { filterRankTopFoodLabels, type ScoredName } from '@/lib/vision/food-lexicon';
import { getGoogleVisionConfig } from '@/lib/vision/vision-config';

const MIN_CONFIDENCE = 0.7;
const TOP_N = 3;
const LABEL_MAX = 20;
const OBJECT_MAX = 10;

export type FoodVisionLabel = {
  description: string;
  score: number;
};

export type FoodVisionResult = {
  /** Up to 3 food-related labels/objects with score >= MIN_CONFIDENCE */
  topFoodLabels: FoodVisionLabel[];
  /** True when nothing food-like met the confidence threshold after filtering */
  noFoodDetected: boolean;
};

type VisionJson = {
  responses?: {
    labelAnnotations?: { description?: string; score?: number }[];
    localizedObjectAnnotations?: { name?: string; score?: number }[];
    error?: { message?: string };
  }[];
  error?: { message?: string };
};

function toCandidates(
  labels: { description?: string; score?: number }[] | undefined,
  objects: { name?: string; score?: number }[] | undefined
): ScoredName[] {
  const out: ScoredName[] = [];
  for (const a of labels ?? []) {
    if (a.description != null && typeof a.score === 'number') {
      out.push({ name: String(a.description), score: Number(a.score) });
    }
  }
  for (const o of objects ?? []) {
    if (o.name != null && typeof o.score === 'number') {
      out.push({ name: String(o.name), score: Number(o.score) });
    }
  }
  return out;
}

/**
 * LABEL_DETECTION + OBJECT_LOCALIZATION in one request; food filter; confidence >= 0.7; top 3.
 */
export async function detectFoodWithVision(base64: string): Promise<FoodVisionResult> {
  const cfg = getGoogleVisionConfig();
  if (!cfg) {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_VISION_API_KEY. Add it to .env and restart Expo.');
  }

  const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(cfg.apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64 },
          features: [
            { type: 'LABEL_DETECTION', maxResults: LABEL_MAX },
            { type: 'OBJECT_LOCALIZATION', maxResults: OBJECT_MAX },
          ],
        },
      ],
    }),
  });

  const json = (await res.json()) as VisionJson;

  if (json.error?.message) {
    throw new Error(`Vision API: ${json.error.message}`);
  }
  if (!res.ok) {
    const msg = json.error?.message || JSON.stringify(json).slice(0, 240);
    throw new Error(msg || `Google Vision request failed (${res.status}).`);
  }

  const first = json.responses?.[0];
  if (first?.error?.message) {
    const m = first.error.message;
    if (/bad image data|invalid image|image/i.test(m)) {
      throw new Error('Bad image data — try a clearer photo or retake the picture.');
    }
    throw new Error(`Vision API: ${m}`);
  }

  const labels = first?.labelAnnotations;
  const objects = first?.localizedObjectAnnotations;
  const candidates = toCandidates(labels, objects);
  const ranked = filterRankTopFoodLabels(candidates, MIN_CONFIDENCE, TOP_N);

  const topFoodLabels: FoodVisionLabel[] = ranked.map((r) => ({
    description: r.name,
    score: r.score,
  }));

  return {
    topFoodLabels,
    noFoodDetected: topFoodLabels.length === 0,
  };
}
