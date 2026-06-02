import 'reflect-metadata';
import { container } from './di/index.js';
import { TYPES } from './types/index.js';
import { DailyEventsBot } from './core/index.js';
import { Logger } from './logging/index.js';
import { sleep } from './utils/index.js';

export { DailyEventsBot };

const logger = container.get<Logger>(TYPES.Logger);
logger.setContext('Main');

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 60000; // 1 minute between attempts

// Increased from 15 min to 25 min to accommodate:
//   - up to 2 min of network probing (12 × 10s)
//   - up to 4 × 15s per Telegram API call with retries
//   - 10 outer retry attempts × 1 min delay each
const GLOBAL_TIMEOUT_MS = 1_500_000; // 25 minutes

const timeoutHandle = setTimeout(async () => {
  logger.error(
    `${GLOBAL_TIMEOUT_MS / 60000} min global timeout reached. Force exiting.`
  );
  await logger.flush();
  process.exit(1);
}, GLOBAL_TIMEOUT_MS);

export async function main(): Promise<void> {
  const bot = container.get<DailyEventsBot>(TYPES.DailyEventsBot);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        logger.info(`Retry attempt ${attempt}/${MAX_RETRIES}...`);
      }

      await bot.run();

      // true = message sent, false = already sent today — either way, we're done
      clearTimeout(timeoutHandle);
      await logger.flush();
      process.exit(0);
    } catch (error: any) {
      if (error.message?.includes('process.exit')) throw error;

      logger.error(`Attempt ${attempt} failed: ${error.message}`);

      if (attempt === MAX_RETRIES) {
        logger.error('All retry attempts exhausted.');
        clearTimeout(timeoutHandle);
        logger.error('Fatal error during bot execution after retries', error);
        await logger.flush();
        process.exit(1);
      }

      logger.info(`Waiting ${RETRY_DELAY_MS / 1000}s before next retry...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  main().catch(() => {
    // Already handled inside main
  });
}
