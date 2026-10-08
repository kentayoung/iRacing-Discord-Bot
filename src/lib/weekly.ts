import { DiscordError, discordRequest } from './discord.js';
import { generateTrackInsights } from './gemini.js';
import { buildWeeklySchedule, displayName, formatWeekRange, loadSchedule, type SeriesSchedule, type WeeklyEntry, type WeeklySchedule } from './schedule.js';
import { buildTrackVideoLinks } from './track-links.js';

const CONFIG_PREFIX = 'guild:';
const CATALOG_KEY = 'catalog';
const MAX_MESSAGE_LENGTH = 2000;
const MAX_THREAD_NAME_LENGTH = 100;
const FORUM_REQUIRE_TAG = 1 << 4;

export interface TrackedSeries {
  series: string;
  car?: string;
}

export interface SeriesInfo {
  name: string;
  label: string;
  cars: string[];
}

export interface GuildConfig {
  tracked: TrackedSeries[];
  thisWeekChannelId?: string;
  guidesChannelId?: string;
  thisWeekMessageId?: string;
  thisWeekStart?: number;
  posted: Record<string, number>;
}

export interface WeeklyEnv {
  CONFIG: KVNamespace;
  DISCORD_TOKEN: string;
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  YOUTUBE_CHANNELS?: string;
}

interface ForumChannel {
  flags?: number;
  available_tags?: { id: string; name: string }[];
}

export async function loadGuildConfig(env: WeeklyEnv, guildId: string): Promise<GuildConfig | null> {
  return env.CONFIG.get<GuildConfig>(`${CONFIG_PREFIX}${guildId}`, 'json');
}

export async function saveGuildConfig(env: WeeklyEnv, guildId: string, config: GuildConfig): Promise<void> {
  await env.CONFIG.put(`${CONFIG_PREFIX}${guildId}`, JSON.stringify(config));
}

export async function deleteGuildConfig(env: WeeklyEnv, guildId: string): Promise<void> {
  await env.CONFIG.delete(`${CONFIG_PREFIX}${guildId}`);
}

export async function refreshCatalog(env: WeeklyEnv, all?: SeriesSchedule[]): Promise<SeriesInfo[]> {
  const catalog = (all ?? (await loadSchedule())).map((series) => ({
    name: series.name,
    label: displayName(series.name),
    cars: series.cars ? series.cars.split(/,\s*/) : [],
  }));
  await env.CONFIG.put(CATALOG_KEY, JSON.stringify(catalog));
  return catalog;
}

export async function loadCatalog(env: WeeklyEnv): Promise<SeriesInfo[] | null> {
  return env.CONFIG.get<SeriesInfo[]>(CATALOG_KEY, 'json');
}

function guideKey(entry: WeeklyEntry, car: string): string {
  return `${entry.track}|${car || entry.series}`;
}

function guideCar(entry: WeeklyEntry, picked: string | undefined): string {
  if (picked) return picked;
  return entry.cars && !entry.cars.includes(',') ? entry.cars : '';
}

export function formatThisWeek(schedule: WeeklySchedule): string {
  const header = [`# ${schedule.season}`, `## Week ${schedule.week} · ${formatWeekRange(schedule.start)}`].filter(Boolean).join('\n');
  const lines = schedule.entries.map((entry) => `**${entry.series}**: ${[entry.track, entry.length].filter(Boolean).join(' · ')}`);

  let content = `${header}\n\n`;
  for (const line of lines) {
    if (content.length + line.length + 1 > MAX_MESSAGE_LENGTH) break;
    content += `${line}\n`;
  }
  return content.trimEnd();
}

async function postThisWeek(env: WeeklyEnv, config: GuildConfig, schedule: WeeklySchedule): Promise<void> {
  if (!config.thisWeekChannelId) return;
  const path = `/channels/${config.thisWeekChannelId}/messages`;
  const body = JSON.stringify({ content: formatThisWeek(schedule) });

  if (config.thisWeekMessageId && config.thisWeekStart === schedule.start) {
    try {
      await discordRequest(env.DISCORD_TOKEN, `${path}/${config.thisWeekMessageId}`, { method: 'PATCH', body });
      return;
    } catch (err) {
      if (!(err instanceof DiscordError && err.status === 404)) throw err;
    }
  }

  const message = await discordRequest<{ id: string }>(env.DISCORD_TOKEN, path, { method: 'POST', body });
  config.thisWeekMessageId = message.id;
  config.thisWeekStart = schedule.start;
}

function pickTags(forum: ForumChannel, entry: WeeklyEntry, car: string): string[] {
  const tags = forum.available_tags ?? [];
  const haystack = `${entry.series} ${car || entry.cars}`.toLowerCase();
  const matched = tags.filter((tag) => haystack.includes(tag.name.toLowerCase()));
  if (matched.length === 0 && (forum.flags ?? 0) & FORUM_REQUIRE_TAG && tags[0]) return [tags[0].id];
  return matched.slice(0, 5).map((tag) => tag.id);
}

async function postGuide(env: WeeklyEnv, forum: ForumChannel, channelId: string, entry: WeeklyEntry, car: string, schedule: WeeklySchedule): Promise<void> {
  const subject = car || entry.series;

  let insights = '';
  try {
    insights = await generateTrackInsights(entry.track, subject, { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL });
  } catch (err) {
    console.error(`track insights failed for ${entry.track}, posting guide without them:`, err);
  }

  const details = [
    `**Series:** ${entry.series}`,
    `**Week:** ${schedule.week} (${formatWeekRange(schedule.start)})`,
    entry.length && `**Race:** ${entry.length}`,
    car && `**Car:** ${car}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const channels = (env.YOUTUBE_CHANNELS ?? '')
    .split(',')
    .map((handle) => handle.trim())
    .filter(Boolean);
  const links = buildTrackVideoLinks(entry.track, subject, channels);
  const fixed = [details, links].filter(Boolean).join('\n\n');
  const room = MAX_MESSAGE_LENGTH - fixed.length - 2;
  const content = insights && room > 100 ? [details, insights.slice(0, room), links].filter(Boolean).join('\n\n') : fixed;

  await discordRequest(env.DISCORD_TOKEN, `/channels/${channelId}/threads`, {
    method: 'POST',
    body: JSON.stringify({
      name: `${entry.track} · ${subject}`.slice(0, MAX_THREAD_NAME_LENGTH),
      message: { content },
      applied_tags: pickTags(forum, entry, car),
    }),
  });
}

async function postGuides(env: WeeklyEnv, config: GuildConfig, schedule: WeeklySchedule): Promise<void> {
  if (!config.guidesChannelId) return;

  const forum = await discordRequest<ForumChannel>(env.DISCORD_TOKEN, `/channels/${config.guidesChannelId}`);
  const posted: Record<string, number> = {};

  for (const { series, car: picked } of config.tracked) {
    const entry = schedule.entries.find((candidate) => candidate.name === series);
    if (!entry) continue;
    const car = guideCar(entry, picked);
    const key = guideKey(entry, car);
    if (key in posted) continue;
    if (config.posted[key] === schedule.start) {
      posted[key] = schedule.start;
      continue;
    }
    await postGuide(env, forum, config.guidesChannelId, entry, car, schedule);
    posted[key] = schedule.start;
    config.posted = { ...config.posted, ...posted };
  }

  config.posted = posted;
}

export async function syncGuild(env: WeeklyEnv, guildId: string, config: GuildConfig, all: SeriesSchedule[], now = new Date()): Promise<WeeklySchedule | undefined> {
  const schedule = buildWeeklySchedule(all, [...new Set(config.tracked.map((item) => item.series))], now);
  if (!schedule) {
    console.log(`guild ${guildId}: no tracked series has a current week, leaving channels untouched`);
    return undefined;
  }

  try {
    await postThisWeek(env, config, schedule);
    await postGuides(env, config, schedule);
  } finally {
    await saveGuildConfig(env, guildId, config);
  }
  return schedule;
}

export async function syncAllGuilds(env: WeeklyEnv): Promise<void> {
  const all = await loadSchedule();
  await refreshCatalog(env, all);

  const { keys } = await env.CONFIG.list({ prefix: CONFIG_PREFIX });
  for (const { name } of keys) {
    const guildId = name.slice(CONFIG_PREFIX.length);
    try {
      const config = await loadGuildConfig(env, guildId);
      if (config) await syncGuild(env, guildId, config, all);
    } catch (err) {
      console.error(`weekly sync failed for guild ${guildId}:`, err);
    }
  }
}
