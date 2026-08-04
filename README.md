# iRacing Pep Talk Bot

A Discord bot with one job: hype you up before your iRacing race. Run
`/peptalk`, optionally tell it your track, series/car, mood, and any extra
context, and Gemini generates a short pep talk.

This bot does **not** integrate with the iRacing API — iRacing currently has
new OAuth client ID registration paused for third-party apps, so this is
intentionally a standalone, stateless command for now.

## Discord Developer Portal Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a **New Application**.
2. Open the **Bot** tab, click **Reset Token**, and copy it — this is `DISCORD_TOKEN`.
3. Leave all privileged intents off (Message Content, Presence, Server Members). This bot only needs the default `Guilds` intent.
4. Open **OAuth2 → General** and copy the **Application (Client) ID** — this is `DISCORD_CLIENT_ID`.
5. Open **OAuth2 → URL Generator**, check the `bot` and `applications.commands` scopes (no bot permissions are required), and open the generated URL to invite the bot to your dev server.
6. In Discord, enable Developer Mode (User Settings → Advanced), then right-click your dev server and **Copy Server ID** — this is `DISCORD_GUILD_ID` (used only for fast dev command registration).

## Local Development

```bash
npm install
cp .env.example .env   # fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, GEMINI_API_KEY
npm run deploy-commands # registers /peptalk to your dev guild (near-instant)
npm run dev             # starts the bot
```

Then run `/peptalk` in your dev server.

## Environment Variables

| Var | Required | Notes |
|---|---|---|
| `DISCORD_TOKEN` | yes | bot token |
| `DISCORD_CLIENT_ID` | yes | application ID |
| `DISCORD_GUILD_ID` | no | dev-only; guild-scoped command registration when set, global when unset |
| `GEMINI_API_KEY` | yes | free tier via [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | no | defaults to `gemini-2.5-flash` |

## Deployment (Fly.io)

```bash
fly launch   # first time only, review fly.toml
fly secrets set DISCORD_TOKEN=... DISCORD_CLIENT_ID=... GEMINI_API_KEY=...
fly deploy
fly scale count 1
```

Make sure autostop/autosuspend is disabled — this bot needs an always-open
gateway connection and cannot tolerate being suspended.

`.github/workflows/deploy.yml` deploys automatically on push to `main`. It
needs these repo secrets: `FLY_API_TOKEN`, `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`,
`GEMINI_API_KEY`. It also re-registers global slash commands on every
deploy (propagation can take up to ~1 hour, unlike guild-scoped dev commands).

## Adding Another Command

Add a new file in `src/commands/` exporting a `Command` (see
`src/commands/peptalk.ts`), then add it to the array in `src/index.ts` and
`src/deploy-commands.ts`.
