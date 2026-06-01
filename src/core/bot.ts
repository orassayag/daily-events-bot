import { injectable, inject } from 'inversify';
import 'dotenv/config';
import {
  TelegramService,
  EventFileService,
  DatabaseService,
} from '../services/index.js';
import { Logger } from '../logging/index.js';
import { DateUtils } from '../utils/index.js';
import { settings } from '../settings/index.js';
import { EnvConfig, TYPES } from '../types/index.js';
import { EMOJIS } from '../constants/index.js';

@injectable()
export class DailyEventsBot {
  private config: EnvConfig;

  constructor(
    @inject(TYPES.TelegramService) private telegramService: TelegramService,
    @inject(TYPES.EventFileService) private eventFileService: EventFileService,
    @inject(TYPES.DatabaseService) private databaseService: DatabaseService,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.logger.setContext('DailyEventsBot');
    this.config = this.validateEnv();
    this.telegramService.init(this.config.TOKEN, this.config.CHAT_ID);
    this.eventFileService.init(settings.dailyFolderPath);
    this.databaseService.init(settings.dbPath);
  }

  /**
   * Validates environment variables.
   */
  private validateEnv(): EnvConfig {
    this.logger.debug('Validating environment variables');
    const { BOT_USERNAME, TARGET_USERNAME, TOKEN, CHAT_ID } = process.env;
    if (!BOT_USERNAME || !TARGET_USERNAME || !TOKEN || !CHAT_ID) {
      const error = new Error(
        'Missing environment variables: BOT_USERNAME, TARGET_USERNAME, TOKEN, or CHAT_ID. Please check your .env file.'
      );
      this.logger.error('Environment validation failed', error);
      throw error;
    }
    this.logger.debug('Environment validation successful');
    return { BOT_USERNAME, TARGET_USERNAME, TOKEN, CHAT_ID };
  }

  /**
   * Main execution flow.
   * @returns {Promise<boolean>} True if message was sent, false if already sent for today.
   */
  public async run(): Promise<boolean> {
    try {
      const dryMode = process.env.DRY_MODE === 'true';

      if (dryMode) {
        this.logger.info(
          `${EMOJIS.STATUS.INFO} RUNNING IN DRY MODE - NO MESSAGES WILL BE SENT`
        );
        const dateInfo = DateUtils.getJerusalemDateInfo();
        const eventsText =
          await this.eventFileService.getEventsForToday(dateInfo);
        console.log(`\n${eventsText}\n`);
        return true;
      }

      this.logger.info(`${EMOJIS.STATUS.INFO} Daily Events Bot Started`);

      const dateInfo = DateUtils.getJerusalemDateInfo();
      this.logger.info(`${EMOJIS.DATA.DATE} Date: ${dateInfo.formattedDate}`);

      this.logger.info(
        `${EMOJIS.ACTIONS.PROCESS} 1. Checking if message for today already sent`
      );
      const alreadySent = await this.databaseService.isDateSent(
        dateInfo.formattedDate
      );
      if (alreadySent) {
        this.logger.info(
          `${EMOJIS.STATUS.SUCCESS} Validation: A message for today (${dateInfo.formattedDate}) was already sent. Nothing to do.`
        );
        return false;
      }

      this.logger.info(`${EMOJIS.ACTIONS.PROCESS} 2. Validating bot and chat`);
      await this.telegramService.validateBot(this.config.BOT_USERNAME);
      await this.telegramService.validateChat(this.config.TARGET_USERNAME);

      this.logger.info(
        `${EMOJIS.ACTIONS.PROCESS} 3. Fetching events from file`
      );
      const eventsText =
        await this.eventFileService.getEventsForToday(dateInfo);

      this.logger.info(`${EMOJIS.ACTIONS.PROCESS} 4. Sending message`);
      await this.telegramService.sendMessage(eventsText);

      this.logger.info(`${EMOJIS.ACTIONS.PROCESS} 5. Marking date as sent`);
      await this.databaseService.markDateAsSent(dateInfo.formattedDate);

      this.logger.info(`${EMOJIS.STATUS.SUCCESS} Success: Message sent`);
      return true;
    } catch (error: any) {
      this.logger.error(`Execution failed: ${error.message}`, error);
      throw error;
    }
  }
}
