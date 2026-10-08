import type { DiscordCommandOption, DiscordInteraction } from '../types.js';
import { loadSchedule } from './schedule.js';
import {
  deleteGuildConfig,
  loadCatalog,
  loadGuildConfig,
  refreshCatalog,
  saveGuildConfig,
  syncGuild,
  type GuildConfig,
  type SeriesInfo,
  type WeeklyEnv,
} from './weekly.js';

const MAX_CHOICES = 25;
const MAX_CHOICE_LENGTH = 100;

interface Choice {
  name: string;
  value: string;
}

function matchesQuery(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => lower.includes(word));
}

function optionValue(options: DiscordCommandOption[] | undefined, name: string): string | undefined {
  const value = options?.find((option) => option.name === name)?.value;
  return value === undefined ? undefined : String(value);
}

function describe(item: { series: string; car?: string }, catalog: SeriesInfo[] | null): string {
  const label = catalog?.find((series) => series.name === item.series)?.label ?? item.series;
  return item.car ? `${label} · ${item.car}` : label;
}

export async function autocompleteWeekly(interaction: DiscordInteraction, env: WeeklyEnv, ctx: ExecutionContext): Promise<Choice[]> {
  const sub = interaction.data?.options?.[0];
  const focused = sub?.options?.find((option) => option.focused);
  if (!sub || !focused) return [];
  const query = String(focused.value ?? '');

  if (sub.name === 'remove' && interaction.guild_id) {
    const [config, catalog] = await Promise.all([loadGuildConfig(env, interaction.guild_id), loadCatalog(env)]);
    return (config?.tracked ?? [])
      .map((item, index) => ({ name: describe(item, catalog).slice(0, MAX_CHOICE_LENGTH), value: String(index) }))
      .filter((choice) => matchesQuery(choice.name, query))
      .slice(0, MAX_CHOICES);
  }

  const catalog = await loadCatalog(env);
  if (!catalog) {
    ctx.waitUntil(refreshCatalog(env).catch((err) => console.error('catalog refresh failed:', err)));
    return [];
  }

  if (focused.name === 'series') {
    return catalog
      .filter((series) => matchesQuery(series.label, query))
      .slice(0, MAX_CHOICES)
      .map((series) => ({ name: series.label.slice(0, MAX_CHOICE_LENGTH), value: series.name.slice(0, MAX_CHOICE_LENGTH) }));
  }

  if (focused.name === 'car') {
    const series = catalog.find((candidate) => candidate.name === optionValue(sub.options, 'series'));
    return (series?.cars ?? [])
      .filter((car) => matchesQuery(car, query))
      .slice(0, MAX_CHOICES)
      .map((car) => ({ name: car.slice(0, MAX_CHOICE_LENGTH), value: car.slice(0, MAX_CHOICE_LENGTH) }));
  }

  return [];
}

async function syncAndDescribe(env: WeeklyEnv, guildId: string, config: GuildConfig, all: Awaited<ReturnType<typeof loadSchedule>>): Promise<string> {
  if (!config.thisWeekChannelId && !config.guidesChannelId) {
    return 'Set where to post with `/weekly channels`.';
  }
  try {
    const schedule = await syncGuild(env, guildId, config, all);
    return schedule ? 'Posts are up to date.' : 'None of your series have a race this week yet.';
  } catch (err) {
    console.error('weekly sync failed:', err);
    return "I saved that, but couldn't post. Check I can view, post and create threads in those channels.";
  }
}

export async function handleWeekly(interaction: DiscordInteraction, env: WeeklyEnv, reply: (content: string) => Promise<void>): Promise<void> {
  const guildId = interaction.guild_id;
  const sub = interaction.data?.options?.[0];

  try {
    if (!guildId || !sub) throw new Error('weekly used outside a guild or without a subcommand');
    const config = (await loadGuildConfig(env, guildId)) ?? { tracked: [], posted: {} };

    if (sub.name === 'stop') {
      await deleteGuildConfig(env, guildId);
      await reply('Weekly posts are off. Existing posts stay where they are.');
      return;
    }

    if (sub.name === 'list') {
      const catalog = await loadCatalog(env);
      const channels = [config.thisWeekChannelId && `<#${config.thisWeekChannelId}>`, config.guidesChannelId && `<#${config.guidesChannelId}>`].filter(Boolean);
      const tracked = config.tracked.map((item) => `- ${describe(item, catalog)}`).join('\n') || 'Nothing yet. Add a series with `/weekly add`.';
      await reply(`**Channels:** ${channels.join(', ') || 'not set'}\n**Tracking:**\n${tracked}`);
      return;
    }

    if (sub.name === 'remove') {
      const [removed] = config.tracked.splice(Number(optionValue(sub.options, 'series')), 1);
      if (!removed) {
        await reply("Couldn't find that one. Pick it from the list as you type.");
        return;
      }
      await saveGuildConfig(env, guildId, config);
      await reply(`Stopped tracking ${describe(removed, await loadCatalog(env))}.`);
      return;
    }

    if (sub.name === 'channels') {
      const thisWeek = optionValue(sub.options, 'this_week_channel');
      const guides = optionValue(sub.options, 'track_guides_channel');
      if (!thisWeek && !guides) {
        await reply('Pick `this_week_channel`, `track_guides_channel`, or both.');
        return;
      }
      if (thisWeek && thisWeek !== config.thisWeekChannelId) {
        config.thisWeekChannelId = thisWeek;
        config.thisWeekMessageId = undefined;
        config.thisWeekStart = undefined;
      }
      if (guides && guides !== config.guidesChannelId) {
        config.guidesChannelId = guides;
        config.posted = {};
      }
      await saveGuildConfig(env, guildId, config);
      await reply(`Channels saved. ${await syncAndDescribe(env, guildId, config, await loadSchedule())}`);
      return;
    }

    if (sub.name === 'add') {
      const name = optionValue(sub.options, 'series');
      const car = optionValue(sub.options, 'car');
      const all = await loadSchedule();
      await refreshCatalog(env, all);

      const series = all.find((candidate) => candidate.name === name);
      if (!series) {
        await reply("I don't know that series. Pick it from the list as you type.");
        return;
      }
      const cars = series.cars ? series.cars.split(/,\s*/) : [];
      if (car && cars.length > 0 && !cars.includes(car)) {
        await reply(`That car isn't in this series. Pick one from the list: ${cars.join(', ')}.`);
        return;
      }

      if (!config.tracked.some((item) => item.series === series.name && item.car === car)) {
        config.tracked.push(car ? { series: series.name, car } : { series: series.name });
      }
      await saveGuildConfig(env, guildId, config);
      await reply(`Tracking ${describe({ series: series.name, car }, await loadCatalog(env))}. ${await syncAndDescribe(env, guildId, config, all)}`);
      return;
    }
  } catch (err) {
    console.error('weekly command failed:', err);
    await reply("Couldn't do that right now. Try again in a bit.");
  }
}
