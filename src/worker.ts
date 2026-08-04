import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
import { boxBoxCommand } from './commands/box-box.js';
import { generatePepTalk } from './lib/gemini.js';
import type { PepTalkInput } from './types.js';

export interface Env {
  DISCORD_PUBLIC_KEY: string;
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
}

interface DiscordCommandOption {
  name: string;
  value: string;
}

interface DiscordInteraction {
  type: number;
  application_id: string;
  token: string;
  data?: {
    name: string;
    options?: DiscordCommandOption[];
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
}

function extractInput(options: DiscordCommandOption[] | undefined): PepTalkInput {
  const values = new Map((options ?? []).map((option) => [option.name, option.value]));
  return {
    track: values.get('track'),
    series: values.get('series'),
    mood: values.get('mood'),
    context: values.get('context'),
  };
}

async function editOriginalResponse(applicationId: string, token: string, content: string): Promise<void> {
  await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

async function handleBoxBox(interaction: DiscordInteraction, env: Env): Promise<void> {
  try {
    const text = await generatePepTalk(extractInput(interaction.data?.options), {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
    });
    await editOriginalResponse(interaction.application_id, interaction.token, text);
  } catch (err) {
    console.error('box-box generation failed:', err);
    await editOriginalResponse(
      interaction.application_id,
      interaction.token,
      "Couldn't fire up your pep talk right now — the AI pit crew is having issues. Try again in a bit! 🏁",
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Expected POST', { status: 405 });
    }

    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();

    if (!signature || !timestamp || !(await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY))) {
      return new Response('Bad request signature', { status: 401 });
    }

    const interaction = JSON.parse(body) as DiscordInteraction;

    if (interaction.type === InteractionType.PING) {
      return jsonResponse({ type: InteractionResponseType.PONG });
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data?.name === boxBoxCommand.name) {
      ctx.waitUntil(handleBoxBox(interaction, env));
      return jsonResponse({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });
    }

    return new Response('Unknown interaction', { status: 400 });
  },
};
