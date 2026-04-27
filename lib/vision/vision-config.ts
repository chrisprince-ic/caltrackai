/** Google Cloud Vision API key (enable Cloud Vision API on the GCP project). */
export function getGoogleVisionConfig(): { apiKey: string } | null {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY?.trim();
  if (!apiKey) return null;
  return { apiKey };
}
