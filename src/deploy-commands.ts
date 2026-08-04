import { REST, Routes } from 'discord.js';
import { env } from './lib/env.js';
import { peptalk } from './commands/peptalk.js';

const commands = [peptalk].map((command) => command.data.toJSON());

const rest = new REST().setToken(env.DISCORD_TOKEN);

async function main() {
  const route = env.DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID)
    : Routes.applicationCommands(env.DISCORD_CLIENT_ID);

  const scope = env.DISCORD_GUILD_ID ? `guild ${env.DISCORD_GUILD_ID}` : 'global';
  console.log(`Registering ${commands.length} command(s) to ${scope}...`);

  await rest.put(route, { body: commands });

  console.log('Done.');
}

main().catch((err) => {
  console.error('Failed to register commands:', err);
  process.exit(1);
});
