import 'reflect-metadata';
import { container, TYPES } from './di/index.js';
import { DailyEventsBot } from './bot.js';
import { Logger } from './logging/index.js';
import { sleep } from './utils/fetchUtils.js';

const logger = container.get<Logger>(TYPES.Logger);
logger.setContext('Main');

// Retry configuration
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 60000; // 1 minute

// Global timeout: If the bot takes more than 15 minutes (10 retries * 1 min + buffer), force exit
const GLOBAL_TIMEOUT_MS = 900000;
const timeoutHandle = setTimeout(async () => {
  logger.error(
    `Bot execution timed out after ${GLOBAL_TIMEOUT_MS}ms. Force exiting.`,
  );
  await logger.flush();
  process.exit(1);
}, GLOBAL_TIMEOUT_MS);

async function runWithRetry(): Promise<void> {
  const bot = container.get<DailyEventsBot>(TYPES.DailyEventsBot);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        logger.info(`Retry attempt ${attempt}/${MAX_RETRIES}...`);
      }

      await bot.run();

      // If result is true (sent) or false (already sent), we are done
      clearTimeout(timeoutHandle);
      await logger.flush();
      process.exit(0);
    } catch (error: any) {
      logger.error(`Attempt ${attempt} failed: ${error.message}`);

      if (attempt === MAX_RETRIES) {
        logger.error('All retry attempts exhausted.');
        throw error;
      }

      logger.info(`Waiting ${RETRY_DELAY_MS / 1000}s before next retry...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
}

runWithRetry().catch(async (error) => {
  clearTimeout(timeoutHandle);
  logger.error('Fatal error during bot execution after retries', error);
  await logger.flush();
  process.exit(1);
});
