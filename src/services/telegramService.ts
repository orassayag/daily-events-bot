import { injectable, inject } from 'inversify';
import { TelegramBotInfo, TelegramChatInfo } from '../types/index.js';
import { TYPES } from '../di/identifiers.js';
import { Logger } from '../logging/index.js';
import { EMOJIS } from '../constants/emojis.js';

@injectable()
export class TelegramService {
  private token: string = '';
  private chatId: string = '';

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
    const response = await fetch(
      `https://api.telegram.org/bot${this.token}/getMe`,
    );
    const data = (await response.json()) as TelegramBotInfo;

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
  }

  /**
   * Validates the chat title matches the expected TARGET_USERNAME.
   */
  public async validateChat(expectedUsername: string): Promise<void> {
    this.logger.debug(`Validating chat: ${expectedUsername}`);
    const response = await fetch(
      `https://api.telegram.org/bot${this.token}/getChat?chat_id=${this.chatId}`,
    );
    const data = (await response.json()) as TelegramChatInfo;

    if (!data.ok) {
      const error = new Error(`Failed to get chat info: ${data.description}`);
      this.logger.error('Chat validation API call failed', error);
      throw error;
    }

    const chatTitle = data.result.title || data.result.username;
    if (chatTitle !== expectedUsername) {
      const error = new Error(
        `Chat validation failed: Expected "${expectedUsername}", but found "${chatTitle}"`,
      );
      this.logger.error('Chat title/username mismatch', error);
      throw error;
    }
    this.logger.debug('Chat validated successfully');
  }

  /**
   * Sends a message via Telegram Bot API.
   */
  public async sendMessage(text: string): Promise<void> {
    this.logger.debug('Sending message to Telegram');
    const response = await fetch(
      `https://api.telegram.org/bot${this.token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
        }),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json()) as any;
      const error = new Error(
        `Failed to send message: ${errorData.description}`,
      );
      this.logger.error('Failed to send message via Telegram', error);
      throw error;
    }
    this.logger.info(`${EMOJIS.TELEGRAM.MESSAGE} Message sent successfully`);
  }
}
