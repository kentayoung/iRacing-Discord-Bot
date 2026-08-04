try {
  process.loadEnvFile();
} catch {
  // no .env file present (e.g. in CI, where secrets come from the environment) — fine to ignore
}

const REQUIRED = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'] as const;

function readRequiredEnv(): Record<(typeof REQUIRED)[number], string> {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in the values, or set them on the host.');
    process.exit(1);
  }

  return Object.fromEntries(REQUIRED.map((key) => [key, process.env[key] as string])) as Record<
    (typeof REQUIRED)[number],
    string
  >;
}

export const env = {
  ...readRequiredEnv(),
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
};
