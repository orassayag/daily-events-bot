import 'reflect-metadata';
import { container, TYPES } from './di/index.js';
import { DailyEventsBot } from './bot.js';
import { Logger } from './logging/index.js';

const logger = container.get<Logger>(TYPES.Logger);
logger.setContext('Main');

// Global timeout: If the bot takes more than 5 minutes, force exit
const GLOBAL_TIMEOUT_MS = 300000;
const timeoutHandle = setTimeout(async () => {
  logger.error(
    `Bot execution timed out after ${GLOBAL_TIMEOUT_MS}ms. Force exiting.`,
  );
  await logger.flush();
  process.exit(1);
}, GLOBAL_TIMEOUT_MS);

const bot = container.get<DailyEventsBot>(TYPES.DailyEventsBot);
bot
  .run()
  .then(async () => {
    clearTimeout(timeoutHandle);
    await logger.flush();
    process.exit(0);
  })
  .catch(async (error) => {
    clearTimeout(timeoutHandle);
    logger.error('Fatal error during bot execution', error);
    await logger.flush();
    process.exit(1);
  });
