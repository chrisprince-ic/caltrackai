export type DeepSeekConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

/**
 * DeepSeek (OpenAI-compatible) — used for meal plans, coach text, and insights (meal scan uses Gemini + Vision).
 * https://api.deepseek.com
 */
export function getDeepSeekConfig(): DeepSeekConfig | null {
  const apiKey = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = (process.env.EXPO_PUBLIC_DEEPSEEK_BASE_URL?.trim() || 'https://api.deepseek.com').replace(/\/$/, '');
  const model = process.env.EXPO_PUBLIC_DEEPSEEK_MODEL?.trim() || 'deepseek-chat';
  return { apiKey, model, baseUrl };
}

export async function deepSeekComplete(prompt: string): Promise<string> {
  const cfg = getDeepSeekConfig();
  if (!cfg) {
    throw new Error('Missing EXPO_PUBLIC_DEEPSEEK_API_KEY. Add it to .env and restart Expo.');
  }

  const url = `${cfg.baseUrl}/v1/chat/completions`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 8192,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(msg || 'DeepSeek request failed. Check your network.');
  }

  const rawText = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    throw new Error(`DeepSeek returned non-JSON (${res.status}). Check EXPO_PUBLIC_DEEPSEEK_API_KEY.`);
  }

  if (!res.ok) {
    const err = json as { error?: { message?: string } };
    const msg = err.error?.message || rawText.slice(0, 200);
    if (/401|403|invalid|key/i.test(msg)) {
      throw new Error('Invalid or unauthorized DeepSeek API key. Check EXPO_PUBLIC_DEEPSEEK_API_KEY.');
    }
    throw new Error(msg || `DeepSeek request failed (${res.status}).`);
  }

  const data = json as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Empty response from DeepSeek. Try again or check EXPO_PUBLIC_DEEPSEEK_MODEL.');
  }
  return content;
}
