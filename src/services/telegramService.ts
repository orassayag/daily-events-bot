import { injectable } from 'inversify';
import {
  TelegramBotInfo,
  TelegramChatInfo,
  TelegramUpdatesResponse,
} from '../types/index.js';

@injectable()
export class TelegramService {
  private token: string = '';
  private chatId: string = '';

  public init(token: string, chatId: string): void {
    this.token = token;
    this.chatId = chatId;
  }

  /**
   * Validates the bot username matches the expected BOT_USERNAME.
   */
  public async validateBot(expectedBotUsername: string): Promise<void> {
    const response = await fetch(
      `https://api.telegram.org/bot${this.token}/getMe`,
    );
    const data = (await response.json()) as TelegramBotInfo;

    if (!data.ok) {
      throw new Error(`Failed to get bot info: ${data.description}`);
    }

    const botUsername = data.result.username;
    if (botUsername !== expectedBotUsername) {
      throw new Error(
        `Bot validation failed: Expected bot username "${expectedBotUsername}", but found "${botUsername}"`,
      );
    }
  }

  /**
   * Validates the chat title matches the expected TARGET_USERNAME.
   */
  public async validateChat(expectedUsername: string): Promise<void> {
    const response = await fetch(
      `https://api.telegram.org/bot${this.token}/getChat?chat_id=${this.chatId}`,
    );
    const data = (await response.json()) as TelegramChatInfo;

    if (!data.ok) {
      throw new Error(`Failed to get chat info: ${data.description}`);
    }

    const chatTitle = data.result.title || data.result.username;
    if (chatTitle !== expectedUsername) {
      throw new Error(
        `Chat validation failed: Expected "${expectedUsername}", but found "${chatTitle}"`,
      );
    }
  }

  /**
   * Sends a message via Telegram Bot API.
   */
  public async sendMessage(text: string): Promise<void> {
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
      throw new Error(`Failed to send message: ${errorData.description}`);
    }
  }
}
