import { injectable, inject } from 'inversify';
import { TelegramBotInfo, TelegramChatInfo } from '../types/index.js';
import { TYPES } from '../di/identifiers.js';
import { Logger } from '../logging/index.js';
import { EMOJIS } from '../constants/emojis.js';
import {
  fetchWithRetry,
  FetchTimeoutError,
  FetchExhaustedError,
} from '../utils/fetchUtils.js';

const TELEGRAM_BASE = 'https://api.telegram.org';

@injectable()
export class TelegramService {
  private token: string = '';
  private chatId: string = '';

  private readonly DEFAULT_TIMEOUT = 15000; // 15 s per attempt
  private readonly DEFAULT_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 2000; // 2 s → 4 s → 8 s

  // How many times to check for network before giving up at startup
  private readonly NETWORK_CHECK_ATTEMPTS = 6;
  private readonly NETWORK_CHECK_DELAY = 5000; // 5 s between checks

  constructor(@inject(TYPES.Logger) private logger: Logger) {
    this.logger.setContext('TelegramService');
  }

  public init(token: string, chatId: string): void {
    this.token = token;
    this.chatId = chatId;
    this.logger.debug('TelegramService initialized', { chatId: this.chatId });
  }

  // ---------------------------------------------------------------------------
  // Network readiness — call once at startup before any other method
  // ---------------------------------------------------------------------------

  /**
   * Waits until the Telegram API endpoint is reachable.
   *
   * Windows Task Scheduler sessions often start before the network adapter is
   * fully up. A plain fetch will stall or fail immediately rather than waiting.
   * This method retries a lightweight HEAD-like probe until the host responds,
   * giving the OS up to ~30 s to bring the interface online.
   */
  public async waitForNetwork(): Promise<void> {
    this.logger.debug(
      `Waiting for network (up to ${this.NETWORK_CHECK_ATTEMPTS} attempts × ${this.NETWORK_CHECK_DELAY / 1000}s)…`,
    );

    for (let attempt = 1; attempt <= this.NETWORK_CHECK_ATTEMPTS; attempt++) {
      try {
        // Use a short per-attempt timeout — we just need to know if the host
        // is reachable, not wait a full 15 s each time.
        const response = await fetchWithRetry<Response & { parsedData: any }>(
          `${TELEGRAM_BASE}/bot${this.token}/getMe`,
          {
            timeoutMs: 5000,
            retries: 0, // handled by our own loop here
            parseJson: true,
          },
        );

        // Any HTTP response (even 401 for a bad token) means the network is up.
        this.logger.debug(
          `Network reachable on attempt ${attempt}/${this.NETWORK_CHECK_ATTEMPTS} (HTTP ${response.status})`,
        );
        return;
      } catch (err: any) {
        const reason =
          err instanceof FetchTimeoutError
            ? `timed out after 5s`
            : (err?.message ?? String(err));

        this.logger.debug(
          `Network check attempt ${attempt}/${this.NETWORK_CHECK_ATTEMPTS} failed: ${reason}`,
        );

        if (attempt < this.NETWORK_CHECK_ATTEMPTS) {
          this.logger.debug(
            `Waiting ${this.NETWORK_CHECK_DELAY / 1000}s before next check…`,
          );
          await sleep(this.NETWORK_CHECK_DELAY);
        }
      }
    }

    throw new Error(
      `Telegram API (${TELEGRAM_BASE}) unreachable after ` +
        `${this.NETWORK_CHECK_ATTEMPTS} network checks. ` +
        `Check your internet connection or Windows firewall settings.`,
    );
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  /** Validates the bot username matches the expected BOT_USERNAME. */
  public async validateBot(expectedBotUsername: string): Promise<void> {
    this.logger.debug(`Validating bot: ${expectedBotUsername}`);

    const data = await this.apiCall<TelegramBotInfo>('getMe');

    this.logger.debug('Received bot info', { username: data.result?.username });

    if (!data.ok) {
      throw new Error(`Failed to get bot info: ${data.description}`);
    }

    const botUsername = data.result.username;
    if (botUsername !== expectedBotUsername) {
      throw new Error(
        `Bot validation failed: expected "${expectedBotUsername}", found "${botUsername}"`,
      );
    }

    this.logger.debug('Bot validated successfully');
  }

  /** Validates the chat title/username matches the expected TARGET_USERNAME. */
  public async validateChat(expectedUsername: string): Promise<void> {
    this.logger.debug(`Validating chat: ${expectedUsername}`);

    const data = await this.apiCall<TelegramChatInfo>(
      `getChat?chat_id=${this.chatId}`,
    );

    const chatTitle = data.result?.title || data.result?.username;
    this.logger.debug('Received chat info', { chatTitle });

    if (!data.ok) {
      throw new Error(`Failed to get chat info: ${data.description}`);
    }

    if (chatTitle !== expectedUsername) {
      throw new Error(
        `Chat validation failed: expected "${expectedUsername}", found "${chatTitle}"`,
      );
    }

    this.logger.debug('Chat validated successfully');
  }

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------

  /** Sends a message via Telegram Bot API. */
  public async sendMessage(text: string): Promise<void> {
    this.logger.debug('Sending message to Telegram');

    const data = await this.apiCall<any>('sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: this.chatId, text }),
    });

    if (!data.ok) {
      throw new Error(`Failed to send message: ${data.description}`);
    }

    this.logger.info(`${EMOJIS.TELEGRAM.MESSAGE} Message sent successfully`);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Wraps fetchWithRetry for Telegram Bot API calls with shared config and
   * per-retry debug logging.
   */
  private async apiCall<T>(
    endpoint: string,
    init: RequestInit = {},
  ): Promise<T> {
    const url = `${TELEGRAM_BASE}/bot${this.token}/${endpoint}`;

    this.logger.debug(`Calling Telegram API: ${endpoint}`);

    try {
      const response = await fetchWithRetry<Response & { parsedData: T }>(url, {
        ...init,
        timeoutMs: this.DEFAULT_TIMEOUT,
        retries: this.DEFAULT_RETRIES,
        retryDelayMs: this.DEFAULT_RETRY_DELAY,
        parseJson: true,
        onRetry: (attempt, err) => {
          this.logger.debug(
            `Retrying ${endpoint} (attempt ${attempt}/${this.DEFAULT_RETRIES}): ${err.message}`,
          );
        },
      });

      return response.parsedData;
    } catch (err: any) {
      // Re-wrap with context so upstream callers see which endpoint failed.
      const message =
        err instanceof FetchExhaustedError
          ? `Telegram API call exhausted retries [${endpoint}]: ${err.cause?.message}`
          : `Telegram API call failed [${endpoint}]: ${err.message}`;

      this.logger.error(message, err);
      throw new Error(message);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
