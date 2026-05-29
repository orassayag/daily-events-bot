import { injectable, inject } from 'inversify';
import { TelegramBotInfo, TelegramChatInfo } from '../types/index.js';
import { TYPES } from '../di/identifiers.js';
import { Logger } from '../logging/index.js';
import { EMOJIS } from '../constants/emojis.js';
import { fetchWithRetry } from '../utils/fetchUtils.js';

@injectable()
export class TelegramService {
  private token: string = '';
  private chatId: string = '';
  private readonly DEFAULT_TIMEOUT = 15000; // 15 seconds
  private readonly DEFAULT_RETRIES = 3;

  constructor(@inject(TYPES.Logger) private logger: Logger) {
    this.logger.setContext('TelegramService');
  }

  public init(token: string, chatId: string): void {
    this.token = token;
    this.chatId = chatId;
    this.logger.debug('TelegramService initialized', { chatId: this.chatId });
  }

  /**
   * Validates the bot username matches the expected BOT_USERNAME.
   */
  public async validateBot(expectedBotUsername: string): Promise<void> {
    this.logger.debug(`Validating bot: ${expectedBotUsername}`);
    try {
      this.logger.debug('Calling getMe API...');
      const response = await fetchWithRetry<
        Response & { parsedData: TelegramBotInfo }
      >(`https://api.telegram.org/bot${this.token}/getMe`, {
        timeoutMs: this.DEFAULT_TIMEOUT,
        retries: this.DEFAULT_RETRIES,
        parseJson: true,
      });
      const data = response.parsedData;
      this.logger.debug('Received bot info', {
        username: data.result?.username,
      });

      if (!data.ok) {
        const error = new Error(`Failed to get bot info: ${data.description}`);
        this.logger.error('Bot validation API call failed', error);
        throw error;
      }

      const botUsername = data.result.username;
      if (botUsername !== expectedBotUsername) {
        const error = new Error(
          `Bot validation failed: Expected bot username "${expectedBotUsername}", but found "${botUsername}"`,
        );
        this.logger.error('Bot username mismatch', error);
        throw error;
      }
      this.logger.debug('Bot validated successfully');
    } catch (error: any) {
      this.logger.error(`Bot validation failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Validates the chat title matches the expected TARGET_USERNAME.
   */
  public async validateChat(expectedUsername: string): Promise<void> {
    this.logger.debug(`Validating chat: ${expectedUsername}`);
    try {
      this.logger.debug('Calling getChat API...');
      const response = await fetchWithRetry<
        Response & { parsedData: TelegramChatInfo }
      >(
        `https://api.telegram.org/bot${this.token}/getChat?chat_id=${this.chatId}`,
        {
          timeoutMs: this.DEFAULT_TIMEOUT,
          retries: this.DEFAULT_RETRIES,
          parseJson: true,
        },
      );
      const data = response.parsedData;
      const chatTitle = data.result?.title || data.result?.username;
      this.logger.debug('Received chat info', { chatTitle });

      if (!data.ok) {
        const error = new Error(`Failed to get chat info: ${data.description}`);
        this.logger.error('Chat validation API call failed', error);
        throw error;
      }

      if (chatTitle !== expectedUsername) {
        const error = new Error(
          `Chat validation failed: Expected "${expectedUsername}", but found "${chatTitle}"`,
        );
        this.logger.error('Chat title/username mismatch', error);
        throw error;
      }
      this.logger.debug('Chat validated successfully');
    } catch (error: any) {
      this.logger.error(`Chat validation failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Sends a message via Telegram Bot API.
   */
  public async sendMessage(text: string): Promise<void> {
    this.logger.debug('Sending message to Telegram');
    try {
      this.logger.debug('Calling sendMessage API...');
      const response = await fetchWithRetry<Response & { parsedData: any }>(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text,
          }),
          timeoutMs: this.DEFAULT_TIMEOUT,
          retries: this.DEFAULT_RETRIES,
          parseJson: true,
        },
      );

      const data = response.parsedData;
      if (!response.ok) {
        const error = new Error(`Failed to send message: ${data.description}`);
        this.logger.error('Failed to send message via Telegram', error);
        throw error;
      }
      this.logger.info(`${EMOJIS.TELEGRAM.MESSAGE} Message sent successfully`);
    } catch (error: any) {
      this.logger.error(`Message sending failed: ${error.message}`, error);
      throw error;
    }
  }
}
