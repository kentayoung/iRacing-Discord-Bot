export const MOOD_CHOICES = [
  { name: 'Nervous', value: 'nervous' },
  { name: 'Confident', value: 'confident' },
  { name: 'Focused', value: 'focused' },
  { name: 'Redemption (avenging a bad result)', value: 'redemption' },
  { name: 'First time on this track/series', value: 'first_timer' },
  { name: 'Underdog (starting from the back)', value: 'underdog' },
] as const;

export type Mood = (typeof MOOD_CHOICES)[number]['value'];

export const MOOD_LABELS: Record<Mood, string> = Object.fromEntries(
  MOOD_CHOICES.map((c) => [c.value, c.name]),
) as Record<Mood, string>;

export interface PepTalkInput {
  track?: string;
  series?: string;
  mood?: Mood;
  context?: string;
}
