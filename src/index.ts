import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { env } from './lib/env.js';
import { peptalk } from './commands/peptalk.js';
import type { Command } from './types.js';

const commands = new Collection<string, Command>();
for (const command of [peptalk]) {
  commands.set(command.data.name, command);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    console.error(`No handler registered for command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error executing command ${interaction.commandName}:`, err);
    const errorReply = { content: 'Something went wrong running that command.', ephemeral: true } as const;
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorReply);
    } else {
      await interaction.reply(errorReply);
    }
  }
});

client.login(env.DISCORD_TOKEN);
