/**
 * Pure helpers for the Insights screen: post-process the AI coach summary
 * into a tight headline/body shape, and derive small per-day callouts (best
 * day / hardest day / most consistent macro) directly from logged data.
 *
 * The AI prompt asks for 3–6 sentences. On a phone screen that produces a
 * wall of text users skim past. These helpers don't change what the model
 * returns server-side; they only re-shape it client-side so the visible card
 * fits a coaching tone (forward-looking, no surveillance-feel dates, no
 * decimal-precision numbers).
 */

import type { DayTotals } from './nutrition-sync';

// ---- AI tip post-processing ----------------------------------------------

const HEADLINE_MAX_WORDS = 12;
const BODY_MAX_WORDS = 30;

const MONTH_PATTERN =
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?\b/gi;

const ISO_DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/g;

function truncateWords(text: string, max: number): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const words = trimmed.split(/\s+/);
  if (words.length <= max) return trimmed;
  return words.slice(0, max).join(' ').replace(/[,;:]+$/, '') + '…';
}

/**
 * Round any "12.34g" / "3.6 kcal" / "1.2 oz" style decimals to whole units.
 * Coaching tips reading "3.6g of fiber" feel forensic; "4g" reads natural.
 */
function roundDecimalUnits(text: string): string {
  return text.replace(
    /(\d+)\.(\d+)\s?(g|kg|kcal|cal|oz|ml|l|lb)\b/gi,
    (_match, whole: string, frac: string, unit: string) => {
      const n = Math.round(Number(`${whole}.${frac}`));
      return `${n}${unit.toLowerCase() === 'lb' ? ' ' : ''}${unit}`;
    },
  );
}

/**
 * Replace explicit calendar dates with "recently" so the tip reads like a
 * coach, not a surveillance dossier. Keeps numeric counts and percentages.
 */
function softenDates(text: string): string {
  return text.replace(MONTH_PATTERN, 'recently').replace(ISO_DATE_PATTERN, 'recently');
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Turn the AI's 3–6 sentence summary into a punchier shape:
 *   - headline: the lead sentence, capped at 12 words
 *   - body: the next 1–2 sentences, capped at 30 words total
 *
 * Specific dates and decimal-precision numbers are normalised so the card
 * reads forward-looking and human, not investigative.
 */
export function formatCoachTip(raw: string | null | undefined): {
  headline: string;
  body: string;
} {
  if (!raw) return { headline: '', body: '' };

  const cleaned = roundDecimalUnits(softenDates(raw)).replace(/\s+/g, ' ').trim();
  const sentences = splitSentences(cleaned);

  if (sentences.length === 0) {
    return { headline: truncateWords(cleaned, HEADLINE_MAX_WORDS), body: '' };
  }

  const headline = truncateWords(sentences[0], HEADLINE_MAX_WORDS);
  const bodyRaw = sentences.slice(1, 3).join(' ');
  const body = truncateWords(bodyRaw, BODY_MAX_WORDS);

  return { headline, body };
}

// ---- Day insight derivations ---------------------------------------------

export type DayInsightSummary = {
  /** Day where calories were closest to (within ±10% of) goal AND all three
   *  macros logged. Returns null if no day qualifies. */
  bestDay: { dateKey: string; calories: number } | null;

  /** Day in the period with no logged data (or the lowest-data day). Returns
   *  null when every day was logged. */
  hardestDay: { dateKey: string } | null;

  /** Which macro was logged most consistently across the period (greatest
   *  number of days with a non-zero entry for that macro). Returns null when
   *  no macros have any logs. */
  mostConsistentMacro:
    | { id: 'protein' | 'carbs' | 'fat'; daysLogged: number; totalDays: number }
    | null;
};

const ON_TARGET_LO = 0.9;
const ON_TARGET_HI = 1.1;

function dayHasLog(d: DayTotals): boolean {
  return d.calories > 0 || d.proteinGrams > 0 || d.carbsGrams > 0 || d.fatGrams > 0;
}

export function deriveDayInsights(
  days: DayTotals[],
  goalCalories: number,
): DayInsightSummary {
  if (days.length === 0) {
    return { bestDay: null, hardestDay: null, mostConsistentMacro: null };
  }

  // Best day: closest to goal among "all macros logged" days.
  let best: { day: DayTotals; deviation: number } | null = null;
  for (const d of days) {
    if (!dayHasLog(d)) continue;
    if (d.proteinGrams <= 0 || d.carbsGrams <= 0 || d.fatGrams <= 0) continue;
    if (goalCalories <= 0) continue;
    const ratio = d.calories / goalCalories;
    if (ratio < ON_TARGET_LO || ratio > ON_TARGET_HI) continue;
    const dev = Math.abs(ratio - 1);
    if (!best || dev < best.deviation) best = { day: d, deviation: dev };
  }

  // Hardest day: prefer fully-empty days, then lowest-log days.
  const empty = days.find((d) => !dayHasLog(d));
  let hardest: { dateKey: string } | null = empty ? { dateKey: empty.dateKey } : null;
  if (!hardest) {
    let weakest: { day: DayTotals; cals: number } | null = null;
    for (const d of days) {
      if (!weakest || d.calories < weakest.cals) weakest = { day: d, cals: d.calories };
    }
    if (weakest && weakest.day.calories < goalCalories * 0.4) {
      hardest = { dateKey: weakest.day.dateKey };
    }
  }

  // Most consistent macro: which macro has the most days-with-a-log.
  const counts = {
    protein: days.filter((d) => d.proteinGrams > 0).length,
    carbs: days.filter((d) => d.carbsGrams > 0).length,
    fat: days.filter((d) => d.fatGrams > 0).length,
  };
  const winner = (Object.keys(counts) as ('protein' | 'carbs' | 'fat')[]).reduce(
    (acc, k) => (counts[k] > counts[acc] ? k : acc),
    'protein' as 'protein' | 'carbs' | 'fat',
  );
  const mostConsistentMacro =
    counts[winner] > 0
      ? { id: winner, daysLogged: counts[winner], totalDays: days.length }
      : null;

  return {
    bestDay: best ? { dateKey: best.day.dateKey, calories: best.day.calories } : null,
    hardestDay: hardest,
    mostConsistentMacro,
  };
}

// ---- Display utilities ----------------------------------------------------

/** "2026-04-30" → "Apr 30" using the device locale. */
export function formatDateKeyShort(dateKey: string): string {
  try {
    const d = new Date(`${dateKey}T12:00:00`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateKey;
  }
}

/** Number of days in the slice that contain at least one logged macro/cal. */
export function countLoggedDays(days: DayTotals[]): number {
  return days.filter(dayHasLog).length;
}

/** Average calories per day across days with at least one log. */
export function averageCaloriesLogged(days: DayTotals[]): number {
  const logged = days.filter(dayHasLog);
  if (!logged.length) return 0;
  return Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length);
}

/**
 * Compute the relative change between two averages, expressed as an integer
 * percentage. Returns null when there isn't enough data to compare.
 */
export function deltaPct(current: number, prior: number): number | null {
  if (prior <= 0) return null;
  return Math.round(((current - prior) / prior) * 100);
}
