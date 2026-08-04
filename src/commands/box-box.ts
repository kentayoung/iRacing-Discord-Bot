import { ApplicationCommandOptionType } from '../types.js';

export const boxBoxCommand = {
  name: 'box-box',
  description: 'Get an AI-generated pep talk to hype you up before your race',
  options: [
    {
      type: ApplicationCommandOptionType.STRING,
      name: 'name',
      description: 'Your name, so the roast is personal',
      max_length: 50,
    },
    {
      type: ApplicationCommandOptionType.STRING,
      name: 'track',
      description: 'Track name (e.g. Daytona, Spa, Watkins Glen)',
      max_length: 100,
    },
    {
      type: ApplicationCommandOptionType.STRING,
      name: 'series',
      description: 'Series or car (e.g. iRacing GT3, Formula iRacing, Dirt Late Model)',
      max_length: 100,
    },
    {
      type: ApplicationCommandOptionType.STRING,
      name: 'mood',
      description: 'How are you feeling before the race? (e.g. nervous, confident, still salty about last week)',
      max_length: 100,
    },
    {
      type: ApplicationCommandOptionType.STRING,
      name: 'context',
      description: 'Anything else? e.g. rain forecast, P1 last time, first oval race',
      max_length: 500,
    },
    {
      type: ApplicationCommandOptionType.INTEGER,
      name: 'cust_id',
      description: 'Your iRacing customer ID, to roast your real stats (optional, unofficial data source)',
    },
  ],
};
