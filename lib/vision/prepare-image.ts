import * as ImageManipulator from 'expo-image-manipulator';

/** Longest edge cap (width for landscape; manipulator uses width as max width dimension). */
const MAX_WIDTH = 1024;
const JPEG_QUALITY = 0.82;
const MIN_BASE64_CHARS = 80;
const MAX_BASE64_CHARS = 10_000_000;

/**
 * Remove data-URL prefix and all whitespace/newlines (Vision rejects dirty base64).
 */
export function normalizeBase64ForVision(input: string): string {
  let s = input.trim();
  if (s.startsWith('data:')) {
    const comma = s.indexOf(',');
    if (comma !== -1) {
      s = s.slice(comma + 1);
    }
  }
  return s.replace(/\s/g, '');
}

/**
 * Reject empty, tiny, or obviously invalid payloads before calling Google.
 */
export function validateVisionBase64(base64: string): void {
  if (!base64 || base64.length < MIN_BASE64_CHARS) {
    throw new Error('Invalid image: empty or corrupted file.');
  }
  if (base64.length > MAX_BASE64_CHARS) {
    throw new Error('Image is too large. Try a smaller photo.');
  }
  const head = base64.slice(0, Math.min(2000, base64.length));
  if (!/^[A-Za-z0-9+/]+=*$/.test(head)) {
    throw new Error('Invalid image encoding. Try taking a new photo.');
  }
}

export type PreparedVisionImage = {
  base64: string;
  mimeType: 'image/jpeg';
};

/**
 * Resize (max width 1024px, aspect preserved), JPEG compress, return raw base64 for Vision `image.content`.
 */
export async function prepareImageUriForVision(uri: string): Promise<PreparedVisionImage> {
  if (!uri?.trim()) {
    throw new Error('Invalid image: missing file.');
  }

  let manipulated: ImageManipulator.ImageResult;
  try {
    manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_WIDTH } }],
      {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      msg.toLowerCase().includes('bad') || msg.toLowerCase().includes('invalid')
        ? 'Could not read this image. Try another photo or take a new picture.'
        : `Image processing failed: ${msg}`
    );
  }

  const raw = manipulated.base64;
  if (!raw?.trim()) {
    throw new Error('Could not process this image. Try another photo.');
  }

  const base64 = normalizeBase64ForVision(raw);
  validateVisionBase64(base64);

  return { base64, mimeType: 'image/jpeg' };
}
