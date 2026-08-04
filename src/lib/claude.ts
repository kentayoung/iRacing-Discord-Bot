import Anthropic from '@anthropic-ai/sdk';
import { env } from './env.js';
import { MOOD_LABELS, type PepTalkInput } from '../types.js';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a hype coach for sim racers on iRacing. You write short, high-energy
pep talks that get drivers fired up right before they get in the car for a
race. Reference the specific details the driver gives you (track, car/series,
how they're feeling, extra context) rather than generic sports-movie
clichés. Keep it to 2-4 short paragraphs (roughly 80-150 words). No headers,
no bullet points — punchy, spoken-word-style prose, like a crew chief
talking through the radio before green flag. End on a strong,
confidence-boosting closing line.`;

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
  const response = await anthropic.messages.create(
    {
      model: env.ANTHROPIC_MODEL,
      max_tokens: 600,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    },
    { timeout: 15_000 },
  );

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('Claude response contained no text content');
  }
  return textBlock.text;
}
