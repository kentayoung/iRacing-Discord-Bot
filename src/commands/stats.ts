import { ApplicationCommandOptionType } from '../types.js';

export const statsCommand = {
  name: 'stats',
  description: "Look up an iRacing driver's career stats (unofficial data source)",
  options: [
    {
      type: ApplicationCommandOptionType.INTEGER,
      name: 'cust_id',
      description: 'iRacing customer ID (the number in your iracing.com member profile URL)',
      required: true,
    },
    {
      type: ApplicationCommandOptionType.STRING,
      name: 'name',
      description: "Driver's name, shown in the reply",
      max_length: 50,
    },
  ],
};
