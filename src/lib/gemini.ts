import { GoogleGenAI } from '@google/genai';
import type { PepTalkInput } from '../types.js';

const SYSTEM_PROMPT = `You are the driver's best friend hyping them up before their iRacing race —
not a coach, not a crew chief, their actual boy giving them shit like the
group chat would. Clown on them a little — their nerves, their last result,
their "strategy" — using the specific details they give you (their name,
track, car/series, how they're feeling, extra context, and their real career
stats if provided). Address them by name if you have it. Talk like a friend
group ragging on each other: casual, a little chaotic, inside-joke energy,
not polished sports-broadcast language. Under the ribbing it should still
land as genuinely hyped for them — talk shit, then hype them up. Keep it to
2-4 short paragraphs (roughly 80-150 words). No headers, no bullet points —
casual spoken prose, like a text from your best friend before you go race.
End on a cocky, "let's go" closing line. Keep it playful, never genuinely
mean or insulting.

If "Real career stats" are provided, they are career-wide aggregate numbers
(iRating, safety rating, license, total starts/wins/win%, average incidents
per race) — NOT tied to today's specific track, car, or race. Use those
exact numbers when you reference them, and don't invent numbers of your own.
Never fabricate specifics the data doesn't contain — no made-up incident
counts at a particular corner, no invented past race results, no claims
about how they've historically done at today's track. If you connect a stat
to today's race (e.g. "with a win rate like that..."), keep it as a general
jab about their overall record, not a fabricated specific event.`;

function buildUserPrompt(input: PepTalkInput): string {
  const lines: string[] = [];
  if (input.name) lines.push(`Their name: ${input.name}`);
  if (input.track) lines.push(`Track: ${input.track}`);
  if (input.series) lines.push(`Series/car: ${input.series}`);
  if (input.mood) lines.push(`How they're feeling: ${input.mood}`);
  if (input.context) lines.push(`Extra context: ${input.context}`);
  if (input.statsSummary) {
    lines.push(`Real career stats (career-wide aggregates, not specific to today's track/race):\n${input.statsSummary}`);
  }

  if (lines.length === 0) {
    return 'Give me a pep talk before my race. No specific details provided — keep it general but still fired up.';
  }
  return `Give me a pep talk before my race.\n\n${lines.join('\n')}`;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export async function generatePepTalk(input: PepTalkInput, config: GeminiConfig): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });

  const response = await ai.models.generateContent({
    model: config.model,
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
