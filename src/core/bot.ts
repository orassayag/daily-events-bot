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
    this.eventFileService.init(
      settings.dailyFolderPath,
      settings.actionsReportPath,
      settings.scanContactsReportPath,
      settings.backupReportPath,
      settings.projectsUpdatesReportPath
    );
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
        const actionsReport = await this.eventFileService.getActionsReport();
        const tasksDetailsReport =
          await this.eventFileService.getTasksDetailsReport();

        let fullMessage = eventsText;
        if (actionsReport) fullMessage += `\n${actionsReport}`;
        if (tasksDetailsReport) fullMessage += `\n${tasksDetailsReport}`;

        console.log(`\n${fullMessage}\n`);
        return true;
      }

      this.logger.info(`${EMOJIS.STATUS.INFO} Daily Events Bot Started`);

      const dateInfo = DateUtils.getJerusalemDateInfo();
      this.logger.info(`${EMOJIS.DATA.DATE} Date: ${dateInfo.formattedDate}`);

      this.logger.info(
        `${EMOJIS.ACTIONS.PROCESS} 1. Checking if message for today already sent`
      );
      const sentRecords = await this.databaseService.getSentRecords(
        dateInfo.formattedDate
      );

      let prefix = '';
      if (sentRecords.length === 0) {
        if (DateUtils.isCloserToNight()) {
          this.logger.info(
            `${EMOJIS.STATUS.INFO} No messages sent today. Current time is closer to NIGHT. Preparing NIGHT message.`
          );
          prefix = '@NIGHT@\n';
        } else {
          this.logger.info(
            `${EMOJIS.STATUS.INFO} No messages sent today. Current time is closer to DAY. Preparing DAY message.`
          );
          prefix = '@DAY@\n';
        }
      } else if (sentRecords.length === 1) {
        const lastSent = sentRecords[0].timestamp;
        const now = Date.now();
        const hoursPassed = (now - lastSent) / (1000 * 60 * 60);

        if (hoursPassed < 9) {
          this.logger.info(
            `${EMOJIS.STATUS.SUCCESS} Validation: One message already sent today, but only ${hoursPassed.toFixed(1)} hours passed (minimum 9 required). Nothing to do.`
          );
          return false;
        }

        this.logger.info(
          `${EMOJIS.STATUS.INFO} One message sent today and >9 hours passed. Preparing NIGHT message.`
        );
        prefix = '@NIGHT@\n';
      } else {
        this.logger.info(
          `${EMOJIS.STATUS.SUCCESS} Validation: Maximum 2 messages for today (${dateInfo.formattedDate}) already sent. Nothing to do.`
        );
        return false;
      }

      // ── NEW: wait for the network before making any Telegram API calls ──
      this.logger.info(
        `${EMOJIS.ACTIONS.PROCESS} 2. Waiting for network connectivity`
      );
      await this.telegramService.waitForNetwork();

      this.logger.info(`${EMOJIS.ACTIONS.PROCESS} 3. Validating bot and chat`);
      await this.telegramService.validateBot(this.config.BOT_USERNAME);
      await this.telegramService.validateChat(this.config.TARGET_USERNAME);

      this.logger.info(
        `${EMOJIS.ACTIONS.PROCESS} 4. Fetching events from file`
      );
      const eventsText =
        await this.eventFileService.getEventsForToday(dateInfo);
      const actionsReport = await this.eventFileService.getActionsReport();
      const tasksDetailsReport =
        await this.eventFileService.getTasksDetailsReport();

      let rawMessage = eventsText;
      if (actionsReport) rawMessage += `\n${actionsReport}`;
      if (tasksDetailsReport) rawMessage += `\n${tasksDetailsReport}`;

      const fullMessage = `${prefix}${rawMessage}`;

      this.logger.info(`${EMOJIS.ACTIONS.PROCESS} 5. Sending message`);
      await this.telegramService.sendMessage(fullMessage);

      this.logger.info(`${EMOJIS.ACTIONS.PROCESS} 6. Marking date as sent`);
      await this.databaseService.markDateAsSent(dateInfo.formattedDate);

      this.logger.info(`${EMOJIS.STATUS.SUCCESS} Success: Message sent`);
      return true;
    } catch (error: any) {
      this.logger.error(`Execution failed: ${error.message}`, error);
      throw error;
    }
  }
}
