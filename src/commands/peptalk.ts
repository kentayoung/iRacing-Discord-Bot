import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { generatePepTalk } from '../lib/claude.js';
import { MOOD_CHOICES, type Command, type Mood, type PepTalkInput } from '../types.js';

function extractInput(interaction: ChatInputCommandInteraction): PepTalkInput {
  return {
    track: interaction.options.getString('track') ?? undefined,
    series: interaction.options.getString('series') ?? undefined,
    mood: (interaction.options.getString('mood') as Mood | null) ?? undefined,
    context: interaction.options.getString('context') ?? undefined,
  };
}

export const peptalk: Command = {
  data: new SlashCommandBuilder()
    .setName('peptalk')
    .setDescription('Get an AI-generated pep talk to hype you up before your race')
    .addStringOption((option) =>
      option
        .setName('track')
        .setDescription('Track name (e.g. Daytona, Spa, Watkins Glen)')
        .setMaxLength(100),
    )
    .addStringOption((option) =>
      option
        .setName('series')
        .setDescription('Series or car (e.g. iRacing GT3, Formula iRacing, Dirt Late Model)')
        .setMaxLength(100),
    )
    .addStringOption((option) =>
      option
        .setName('mood')
        .setDescription("How are you feeling before the race?")
        .addChoices(...MOOD_CHOICES),
    )
    .addStringOption((option) =>
      option
        .setName('context')
        .setDescription('Anything else? e.g. rain forecast, P1 last time, first oval race')
        .setMaxLength(500),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const text = await generatePepTalk(extractInput(interaction));
      await interaction.editReply({ content: text });
    } catch (err) {
      console.error('peptalk generation failed:', err);
      await interaction.editReply({
        content:
          "Couldn't fire up your pep talk right now — the AI pit crew is having issues. Try again in a bit! 🏁",
      });
    }
  },
};
