import 'reflect-metadata';
import { container, TYPES } from './di/index.js';
import { DailyEventsBot } from './bot.js';

const bot = container.get<DailyEventsBot>(TYPES.DailyEventsBot);
bot.run().catch((error) => {
  console.error('Fatal error during bot execution:', error);
  process.exit(1);
});
