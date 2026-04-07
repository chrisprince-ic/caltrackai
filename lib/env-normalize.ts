/** Strip JSON-style quotes/commas often pasted into .env by mistake. */
export function normalizeExpoPublicValue(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  let s = value.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/,$/, '').trim();
  return s.length > 0 ? s : undefined;
}
