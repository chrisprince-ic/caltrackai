/**
 * Google Cloud Vision — public entrypoints for the app.
 * Implementation lives under `lib/vision/`.
 */
export { getGoogleVisionConfig } from '@/lib/vision/vision-config';
export {
  detectFoodWithVision,
  type FoodVisionLabel,
  type FoodVisionResult,
} from '@/lib/vision/vision-detect-food';
