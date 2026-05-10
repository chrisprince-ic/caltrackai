/** Strip JSON-style quotes/commas and UTF-8 BOM (common when copying from editors). */
export function normalizeExpoPublicValue(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  let s = value.trim();
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/,$/, '').trim();
  return s.length > 0 ? s : undefined;
}
