import { env } from './lib/env.js';
import { peptalkCommand } from './commands/peptalk.js';

const commands = [peptalkCommand];

async function main() {
  const route = env.DISCORD_GUILD_ID
    ? `https://discord.com/api/v10/applications/${env.DISCORD_CLIENT_ID}/guilds/${env.DISCORD_GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${env.DISCORD_CLIENT_ID}/commands`;

  const scope = env.DISCORD_GUILD_ID ? `guild ${env.DISCORD_GUILD_ID}` : 'global';
  console.log(`Registering ${commands.length} command(s) to ${scope}...`);

  const response = await fetch(route, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord API returned ${response.status}: ${body}`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Failed to register commands:', err);
  process.exit(1);
});
