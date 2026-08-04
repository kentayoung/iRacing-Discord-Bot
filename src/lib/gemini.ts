import { GoogleGenAI } from '@google/genai';
import { env } from './env.js';
import { MOOD_LABELS, type PepTalkInput } from '../types.js';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are a snarky, sarcastic crew chief hyping up a sim racer on iRacing
right before their race. Roast them a little — their nerves, their last
result, their "strategy" — using the specific details they give you (track,
car/series, how they're feeling, extra context). Rather than generic
sports-movie clichés, be a smartass about it. Under the sarcasm it should
still land as genuinely motivating — needle them, then hype them up. Keep it
to 2-4 short paragraphs (roughly 80-150 words). No headers, no bullet
points — punchy, spoken-word-style prose, like it's coming through the radio
before green flag. End on a cocky, confidence-boosting closing line. Keep the
snark playful, never genuinely mean or insulting.`;

function buildUserPrompt(input: PepTalkInput): string {
  const lines: string[] = [];
  if (input.track) lines.push(`Track: ${input.track}`);
  if (input.series) lines.push(`Series/car: ${input.series}`);
  if (input.mood) lines.push(`How they're feeling: ${MOOD_LABELS[input.mood]}`);
  if (input.context) lines.push(`Extra context: ${input.context}`);

  if (lines.length === 0) {
    return 'Give me a pep talk before my race. No specific details provided — keep it general but still fired up.';
  }
  return `Give me a pep talk before my race.\n\n${lines.join('\n')}`;
}

export async function generatePepTalk(input: PepTalkInput): Promise<string> {
  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: buildUserPrompt(input),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      maxOutputTokens: 600,
      thinkingConfig: { thinkingBudget: 0 },
      httpOptions: { timeout: 15_000 },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini response contained no text content');
  }
  return text;
}
