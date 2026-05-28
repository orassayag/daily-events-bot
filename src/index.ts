import 'reflect-metadata';
import { container, TYPES } from './di/index.js';
import { DailyEventsBot } from './bot.js';
import { Logger } from './logging/index.js';

const logger = container.get<Logger>(TYPES.Logger);
logger.setContext('Main');

// Global timeout: If the bot takes more than 2 minutes, force exit
const GLOBAL_TIMEOUT_MS = 120000;
const timeoutHandle = setTimeout(() => {
  logger.error(
    `Bot execution timed out after ${GLOBAL_TIMEOUT_MS}ms. Force exiting.`,
  );
  process.exit(1);
}, GLOBAL_TIMEOUT_MS);

const bot = container.get<DailyEventsBot>(TYPES.DailyEventsBot);
bot
  .run()
  .then(() => {
    clearTimeout(timeoutHandle);
  })
  .catch((error) => {
    clearTimeout(timeoutHandle);
    logger.error('Fatal error during bot execution', error);
    process.exit(1);
  });
