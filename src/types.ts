export const ApplicationCommandOptionType = {
  STRING: 3,
  INTEGER: 4,
} as const;

export interface PepTalkInput {
  name?: string;
  track?: string;
  series?: string;
  mood?: string;
  context?: string;
  statsSummary?: string;
}
