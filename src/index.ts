import 'reflect-metadata';
import { container, TYPES } from './di/index.js';
import { DailyEventsBot } from './bot.js';
import { Logger } from './logging/index.js';

const logger = container.get<Logger>(TYPES.Logger);
logger.setContext('Main');

const bot = container.get<DailyEventsBot>(TYPES.DailyEventsBot);
bot.run().catch((error) => {
  logger.error('Fatal error during bot execution', error);
  process.exit(1);
});
