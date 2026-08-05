import { ApplicationCommandOptionType } from '../types.js';

export const trackInsightsCommand = {
  name: 'track-insights',
  description: 'Get key insights for a track (and optionally a car) before you race',
  options: [
    {
      type: ApplicationCommandOptionType.STRING,
      name: 'track',
      description: 'Track name (e.g. Daytona, Spa, Watkins Glen)',
      required: true,
      max_length: 100,
    },
    {
      type: ApplicationCommandOptionType.STRING,
      name: 'car',
      description: 'Car or series (e.g. iRacing GT3, Formula iRacing)',
      max_length: 100,
    },
  ],
};
