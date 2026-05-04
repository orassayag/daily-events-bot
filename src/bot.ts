import { injectable, inject } from 'inversify';
import 'dotenv/config';
import { TYPES } from './di/identifiers.js';
import { TelegramService } from './services/telegramService.js';
import { EventFileService } from './services/eventFileService.js';
import { DatabaseService } from './services/databaseService.js';
import { DateUtils } from './utils/dateUtils.js';
import { settings } from './settings/index.js';
import { EnvConfig } from './types/index.js';

@injectable()
export class DailyEventsBot {
  private config: EnvConfig;

  constructor(
    @inject(TYPES.TelegramService) private telegramService: TelegramService,
    @inject(TYPES.EventFileService) private eventFileService: EventFileService,
    @inject(TYPES.DatabaseService) private databaseService: DatabaseService,
  ) {
    this.config = this.validateEnv();
    this.telegramService.init(this.config.TOKEN, this.config.CHAT_ID);
    this.eventFileService.init(settings.dailyFolderPath);
    this.databaseService.init(settings.dbPath);
  }

  /**
   * Validates environment variables.
   */
  private validateEnv(): EnvConfig {
    const { BOT_USERNAME, TARGET_USERNAME, TOKEN, CHAT_ID } = process.env;
    if (!BOT_USERNAME || !TARGET_USERNAME || !TOKEN || !CHAT_ID) {
      throw new Error(
        'Missing environment variables: BOT_USERNAME, TARGET_USERNAME, TOKEN, or CHAT_ID. Please check your .env file.',
      );
    }
    return { BOT_USERNAME, TARGET_USERNAME, TOKEN, CHAT_ID };
  }

  /**
   * Main execution flow.
   */
  public async run(): Promise<void> {
    try {
      console.log('===Daily Events Bot Started===');

      const dateInfo = DateUtils.getJerusalemDateInfo();
      console.log(`Date: ${dateInfo.formattedDate}`);

      console.log('1. Checking if message for today already sent');
      const alreadySent = await this.databaseService.isDateSent(
        dateInfo.formattedDate,
      );
      if (alreadySent) {
        throw new Error(
          `Validation Error: A message for today (${dateInfo.formattedDate}) was already sent.`,
        );
      }

      console.log('2. Validating bot and chat');
      await this.telegramService.validateBot(this.config.BOT_USERNAME);
      await this.telegramService.validateChat(this.config.TARGET_USERNAME);

      console.log('3. Fetching events from file');
      const eventsText =
        await this.eventFileService.getEventsForToday(dateInfo);

      console.log('4. Sending message');
      await this.telegramService.sendMessage(eventsText);

      console.log('5. Marking date as sent');
      await this.databaseService.markDateAsSent(dateInfo.formattedDate);

      console.log('===Success: Message sent===');
    } catch (error: any) {
      console.error(`\n===Error: ${error.message}===`);
      process.exit(1);
    }
  }
}
