import { injectable, inject } from 'inversify';
import { TelegramBotInfo, TelegramChatInfo, TYPES } from '../types/index.js';
import { Logger } from '../logging/index.js';
import { EMOJIS } from '../constants/index.js';
import {
  fetchWithRetry,
  FetchExhaustedError,
  sleep,
  maskCreditCards,
} from '../utils/index.js';

const TELEGRAM_BASE = 'https://api.telegram.org';

@injectable()
export class TelegramService {
  private token: string = '';
  private chatId: string = '';

  private readonly DEFAULT_TIMEOUT = 15000;
  private readonly DEFAULT_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 2000;

  // Increased from 6×5s to 12×10s = up to 2 minutes of network probing
  private readonly NETWORK_CHECK_ATTEMPTS = 12;
  private readonly NETWORK_CHECK_DELAY = 10000;
  private readonly MAX_MESSAGE_LENGTH = 4096;

  constructor(@inject(TYPES.Logger) private logger: Logger) {
    this.logger.setContext('TelegramService');
  }

  public init(token: string, chatId: string): void {
    this.token = token;
    this.chatId = chatId;
    this.logger.debug('TelegramService initialized', { chatId: this.chatId });
  }

  // ---------------------------------------------------------------------------
  // Network readiness
  // ---------------------------------------------------------------------------

  /**
   * Waits until the Telegram API is reachable.
   *
   * Uses a plain fetch + AbortController per attempt instead of fetchWithRetry,
   * to avoid internal retry logic conflicting with this outer probe loop.
   * Any HTTP response (even 401) means the network and DNS are up.
   */
  public async waitForNetwork(): Promise<void> {
    // Probe Telegram's IP directly to bypass DNS hang on wake.
    // 149.154.167.220 is a stable Telegram API server IP.
    // We still also try the hostname so either path can succeed.
    const probeUrls = [`${TELEGRAM_BASE}/bot${this.token}/getMe`];
    const probeTimeoutMs = 5000;

    this.logger.debug(
      `Probing network: up to ${this.NETWORK_CHECK_ATTEMPTS} attempts × ${this.NETWORK_CHECK_DELAY / 1000}s delay`
    );

    for (let attempt = 1; attempt <= this.NETWORK_CHECK_ATTEMPTS; attempt++) {
      const success = await this.probeOnce(probeUrls, probeTimeoutMs);

      if (success) {
        this.logger.debug(
          `Network ready on attempt ${attempt}/${this.NETWORK_CHECK_ATTEMPTS}`
        );
        return;
      }

      this.logger.debug(
        `Network probe attempt ${attempt}/${this.NETWORK_CHECK_ATTEMPTS} failed`
      );

      if (attempt < this.NETWORK_CHECK_ATTEMPTS) {
        this.logger.debug(
          `Waiting ${this.NETWORK_CHECK_DELAY / 1000}s before next probe…`
        );
        await sleep(this.NETWORK_CHECK_DELAY);
      }
    }

    throw new Error(
      `Telegram API unreachable after ${this.NETWORK_CHECK_ATTEMPTS} network probes. ` +
        `Check your internet connection or firewall settings.`
    );
  }

  /**
   * Tries each probe URL in parallel. Returns true if any responds within
   * timeoutMs. Uses Promise.race() with a hard setTimeout as a fallback
   * deadline — this works even when AbortController is ignored by the OS
   * TCP stack during post-wake hangs.
   */
  private async probeOnce(urls: string[], timeoutMs: number): Promise<boolean> {
    const hardDeadline = new Promise<false>((resolve) =>
      setTimeout(() => resolve(false), timeoutMs + 500)
    );

    const probes = urls.map(async (url) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        return true;
      } catch {
        clearTimeout(timer);
        return false;
      }
    });

    const result = await Promise.race([...probes, hardDeadline]);
    return result === true;
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
        `Bot validation failed: expected "${expectedBotUsername}", found "${botUsername}"`
      );
    }
    this.logger.debug('Bot validated successfully');
  }

  /** Validates the chat title/username matches the expected TARGET_USERNAME. */
  public async validateChat(expectedUsername: string): Promise<void> {
    this.logger.debug(`Validating chat: ${expectedUsername}`);
    const data = await this.apiCall<TelegramChatInfo>(
      `getChat?chat_id=${this.chatId}`
    );
    const chatTitle = data.result?.title || data.result?.username;
    this.logger.debug('Received chat info', { chatTitle });
    if (!data.ok) {
      throw new Error(`Failed to get chat info: ${data.description}`);
    }
    if (chatTitle !== expectedUsername) {
      throw new Error(
        `Chat validation failed: expected "${expectedUsername}", found "${chatTitle}"`
      );
    }
    this.logger.debug('Chat validated successfully');
  }

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------

  /** Sends a message via Telegram Bot API. */
  public async sendMessage(text: string): Promise<void> {
    let messageText = maskCreditCards(text);
    if (messageText.length > this.MAX_MESSAGE_LENGTH) {
      this.logger.error(
        `Message exceeds ${this.MAX_MESSAGE_LENGTH} characters (length: ${messageText.length}). Sending error message instead.`
      );
      messageText = 'ERROR: Daily message exceeds the 4,096-character limit.';
    }
    this.logger.debug('Sending message to Telegram');
    const data = await this.apiCall<any>('sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: this.chatId, text: messageText }),
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
    init: RequestInit = {}
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
            `Retrying ${endpoint} (attempt ${attempt}/${this.DEFAULT_RETRIES}): ${err.message}`
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
