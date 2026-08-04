import { GoogleGenAI } from '@google/genai';
import { env } from './env.js';
import { MOOD_LABELS, type PepTalkInput } from '../types.js';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are the driver's best friend hyping them up before their iRacing race —
not a coach, not a crew chief, their actual boy giving them shit like the
group chat would. Clown on them a little — their nerves, their last result,
their "strategy" — using the specific details they give you (track,
car/series, how they're feeling, extra context). Talk like a friend group
ragging on each other: casual, a little chaotic, inside-joke energy, not
polished sports-broadcast language. Under the ribbing it should still land as
genuinely hyped for them — talk shit, then hype them up. Keep it to 2-4 short
paragraphs (roughly 80-150 words). No headers, no bullet points — casual
spoken prose, like a text from your best friend before you go race. End on a
cocky, "let's go" closing line. Keep it playful, never genuinely mean or
insulting.`;

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
