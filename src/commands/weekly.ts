import { ApplicationCommandOptionType, ChannelType } from '../types.js';

const MANAGE_GUILD = String(1 << 5);

export const weeklyCommand = {
  name: 'weekly',
  description: "Weekly iRacing track list and track guides for your series",
  default_member_permissions: MANAGE_GUILD,
  dm_permission: false,
  options: [
    {
      type: ApplicationCommandOptionType.SUB_COMMAND,
      name: 'add',
      description: 'Track a series in the weekly list, optionally with a track guide post',
      options: [
        { type: ApplicationCommandOptionType.STRING, name: 'series', description: 'Series to track', required: true, autocomplete: true },
        { type: ApplicationCommandOptionType.BOOLEAN, name: 'guide', description: 'Also post a weekly track guide for this series (off by default)' },
        { type: ApplicationCommandOptionType.STRING, name: 'car', description: 'Car for the track guide and its YouTube links (needs guide:True)', autocomplete: true },
      ],
    },
    {
      type: ApplicationCommandOptionType.SUB_COMMAND,
      name: 'remove',
      description: 'Stop tracking a series',
      options: [{ type: ApplicationCommandOptionType.STRING, name: 'series', description: 'Tracked series to remove', required: true, autocomplete: true }],
    },
    {
      type: ApplicationCommandOptionType.SUB_COMMAND,
      name: 'channels',
      description: 'Choose where the weekly posts go',
      options: [
        {
          type: ApplicationCommandOptionType.CHANNEL,
          name: 'this_week_channel',
          description: 'Text channel for the weekly track list',
          channel_types: [ChannelType.GUILD_TEXT, ChannelType.GUILD_ANNOUNCEMENT],
        },
        {
          type: ApplicationCommandOptionType.CHANNEL,
          name: 'track_guides_channel',
          description: 'Forum channel for a track guide post per series each week',
          channel_types: [ChannelType.GUILD_FORUM],
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.SUB_COMMAND,
      name: 'refresh',
      description: 'Update the weekly posts now',
      options: [
        {
          type: ApplicationCommandOptionType.BOOLEAN,
          name: 'force',
          description: 'Also repost track guides already posted this week (e.g. one you deleted)',
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.SUB_COMMAND,
      name: 'list',
      description: 'Show what is being tracked',
    },
    {
      type: ApplicationCommandOptionType.SUB_COMMAND,
      name: 'stop',
      description: 'Stop all weekly posts for this server',
    },
  ],
};
