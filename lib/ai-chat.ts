import { GoogleGenerativeAI } from '@google/generative-ai';

import { sanitizeGeminiModelName } from '@/lib/gemini-scan-analysis';

export type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};

export type TrainerContext = {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  weightGoal: string;
  dietarySummary: string;
};

/**
 * Multi-turn Gemini chat for the AI trainer.
 * `priorMessages` is the conversation history BEFORE the current user message.
 */
export async function sendTrainerMessage(
  priorMessages: ChatMessage[],
  userMessage: string,
  ctx: TrainerContext
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY');

  const model = sanitizeGeminiModelName(process.env.EXPO_PUBLIC_GEMINI_MODEL);
  const genAI = new GoogleGenerativeAI(apiKey);

  const goalLabel =
    ctx.weightGoal === 'lose'
      ? 'weight loss'
      : ctx.weightGoal === 'gain'
        ? 'weight gain'
        : 'weight maintenance';

  const systemInstruction = `You are Macrovia AI Coach — a friendly, knowledgeable, and motivating personal nutrition and fitness assistant.

User's current plan:
• Daily target: ${Math.round(ctx.dailyCalories)} kcal
• Protein ${Math.round(ctx.proteinG)}g · Carbs ${Math.round(ctx.carbsG)}g · Fat ${Math.round(ctx.fatG)}g
• Goal: ${goalLabel}
• Dietary notes: ${ctx.dietarySummary || 'none'}

Your responsibilities:
- Answer questions about meals, food choices, calorie content, and macros
- Give practical advice for weight loss, gain, or maintenance
- Suggest meal or snack ideas that fit the user's targets
- Explain nutrition and fitness concepts in plain, simple language
- Be encouraging, direct, and honest

Rules:
- Plain text only — no markdown, bullet symbols, or formatting characters
- Keep replies under 120 words unless a detailed plan is explicitly asked for
- Always relate advice to the user's actual targets above
- Never give medical advice; recommend a healthcare professional for medical questions`;

  const chatModel = genAI.getGenerativeModel({ model, systemInstruction });

  const chat = chatModel.startChat({
    history: priorMessages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text().trim();
}
