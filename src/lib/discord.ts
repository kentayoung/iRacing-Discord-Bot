const DISCORD_API = 'https://discord.com/api/v10';

export class DiscordError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function discordRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: { authorization: `Bot ${token}`, 'content-type': 'application/json' },
  });
  if (!response.ok) {
    throw new DiscordError(response.status, `Discord ${init.method ?? 'GET'} ${path} failed with ${response.status}: ${await response.text()}`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
