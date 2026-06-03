import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelegramService } from '../services/index.js';
import { Logger } from '../logging/index.js';
import { fetchWithRetry, FetchExhaustedError } from '../utils/index.js';

vi.mock('../utils/index.js', () => ({
  fetchWithRetry: vi.fn(),
  FetchTimeoutError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'FetchTimeoutError';
    }
  },
  FetchExhaustedError: class extends Error {
    constructor(url: string, attempts: number, cause: Error) {
      super(
        `All ${attempts} attempt(s) failed for ${url}. Last error: ${cause.message}`
      );
      this.name = 'FetchExhaustedError';
      (this as any).cause = cause;
    }
  },
  sleep: vi.fn().mockResolvedValue(undefined),
}));

describe('TelegramService', () => {
  let telegramService: TelegramService;
  let mockLogger: Logger;

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock global fetch for waitForNetwork
    global.fetch = vi.fn();
    mockLogger = {
      setContext: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any;
    telegramService = new TelegramService(mockLogger);
    telegramService.init('test-token', 'test-chat-id');
    vi.resetAllMocks(); // Use reset instead of clear to clear mock implementations
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('waitForNetwork', () => {
    it('should return if network is reachable on first attempt', async () => {
      vi.mocked(fetch).mockResolvedValue({ status: 200 } as any);

      await telegramService.waitForNetwork();
      // Now probes only 1 URL per attempt
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry if network is not reachable initially', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Network down')) // Attempt 1 fails
        .mockResolvedValueOnce({ status: 200 } as any); // Attempt 2 succeeds

      const promise = telegramService.waitForNetwork();

      // Fast-forward through the sleep
      await vi.runAllTimersAsync();

      await promise;
      // 1 URL in attempt 1 + 1 URL in attempt 2
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Network ready on attempt 2/12')
      );
    });

    it('should handle probe failures during network check', async () => {
      // fetch doesn't throw FetchTimeoutError, it throws AbortError when aborted
      vi.mocked(fetch)
        .mockRejectedValueOnce({ name: 'AbortError' })
        .mockResolvedValueOnce({ status: 200 } as any);

      const promise = telegramService.waitForNetwork();
      await vi.runAllTimersAsync();
      await promise;

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Network probe attempt 1/12 failed')
      );
    });

    it('should throw error after all network check attempts fail', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Persistent network error'));

      const promise = telegramService.waitForNetwork();

      await Promise.all([
        vi.runAllTimersAsync(),
        expect(promise).rejects.toThrow(/unreachable after 12 network probes/),
      ]);

      // 12 attempts * 1 URL per attempt
      expect(fetch).toHaveBeenCalledTimes(12);
    });

    it('should handle non-Error objects in probe catch', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce('string error')
        .mockResolvedValueOnce({ status: 200 } as any);

      const promise = telegramService.waitForNetwork();
      await vi.runAllTimersAsync();
      await promise;

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Network probe attempt 1/12 failed')
      );
    });

    it('should handle error without message in probe catch', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce({})
        .mockResolvedValueOnce({ status: 200 } as any);

      const promise = telegramService.waitForNetwork();
      await vi.runAllTimersAsync();
      await promise;

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Network probe attempt 1/12 failed')
      );
    });
  });

  describe('validateBot', () => {
    it('should validate bot username successfully', async () => {
      vi.mocked(fetchWithRetry).mockResolvedValueOnce({
        parsedData: { ok: true, result: { username: 'expected_bot' } },
      } as any);

      await telegramService.validateBot('expected_bot');
      expect(fetchWithRetry).toHaveBeenCalled();
    });

    it('should throw error if bot info retrieval fails', async () => {
      vi.mocked(fetchWithRetry).mockResolvedValueOnce({
        parsedData: { ok: false, description: 'Not Authorized' },
      } as any);

      await expect(telegramService.validateBot('any')).rejects.toThrow(
        /Failed to get bot info: Not Authorized/
      );
    });

    it('should throw error if bot username does not match', async () => {
      vi.mocked(fetchWithRetry).mockResolvedValueOnce({
        parsedData: { ok: true, result: { username: 'wrong_bot' } },
      } as any);

      await expect(telegramService.validateBot('expected_bot')).rejects.toThrow(
        /Bot validation failed/
      );
    });
  });

  describe('validateChat', () => {
    it('should validate chat title/username successfully (using title)', async () => {
      vi.mocked(fetchWithRetry).mockResolvedValueOnce({
        parsedData: { ok: true, result: { title: 'expected_chat' } },
      } as any);

      await telegramService.validateChat('expected_chat');
      expect(fetchWithRetry).toHaveBeenCalled();
    });

    it('should validate chat title/username successfully (using username)', async () => {
      vi.mocked(fetchWithRetry).mockResolvedValueOnce({
        parsedData: { ok: true, result: { username: 'expected_chat' } },
      } as any);

      await telegramService.validateChat('expected_chat');
      expect(fetchWithRetry).toHaveBeenCalled();
    });

    it('should throw error if chat validation fails', async () => {
      vi.mocked(fetchWithRetry).mockResolvedValueOnce({
        parsedData: { ok: true, result: { title: 'wrong_chat' } },
      } as any);

      await expect(
        telegramService.validateChat('expected_chat')
      ).rejects.toThrow(/Chat validation failed/);
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      vi.mocked(fetchWithRetry).mockResolvedValueOnce({
        parsedData: { ok: true },
      } as any);

      await telegramService.sendMessage('Hello');
      expect(fetchWithRetry).toHaveBeenCalledWith(
        expect.stringContaining('sendMessage'),
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Message sent successfully')
      );
    });

    it('should throw error if sendMessage fails', async () => {
      vi.mocked(fetchWithRetry).mockResolvedValueOnce({
        parsedData: { ok: false, description: 'Forbidden' },
      } as any);

      await expect(telegramService.sendMessage('Hello')).rejects.toThrow(
        /Failed to send message: Forbidden/
      );
    });

    it('should send error message if text exceeds 4096 characters', async () => {
      vi.mocked(fetchWithRetry).mockResolvedValueOnce({
        parsedData: { ok: true },
      } as any);

      const longMessage = 'a'.repeat(4097);
      await telegramService.sendMessage(longMessage);

      expect(fetchWithRetry).toHaveBeenCalledWith(
        expect.stringContaining('sendMessage'),
        expect.objectContaining({
          body: expect.stringContaining(
            'ERROR: Daily message exceeds the 4,096-character limit.'
          ),
        })
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Message exceeds 4096 characters')
      );
    });
  });

  describe('apiCall internal', () => {
    it('should call onRetry and log debug message', async () => {
      vi.mocked(fetchWithRetry).mockImplementation((_url, options: any) => {
        if (options.onRetry) {
          options.onRetry(1, new Error('Attempt 1 failed'));
        }
        return Promise.resolve({ parsedData: { ok: true } } as any);
      });

      await telegramService.sendMessage('test');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          'Retrying sendMessage (attempt 1/3): Attempt 1 failed'
        )
      );
    });

    it('should handle FetchExhaustedError in apiCall', async () => {
      const cause = new Error('Original cause');
      vi.mocked(fetchWithRetry).mockRejectedValueOnce(
        new FetchExhaustedError('url', 3, cause)
      );

      await expect(telegramService.sendMessage('test')).rejects.toThrow(
        /Telegram API call exhausted retries/
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle generic error in apiCall', async () => {
      vi.mocked(fetchWithRetry).mockRejectedValueOnce(
        new Error('Generic error')
      );

      await expect(telegramService.sendMessage('test')).rejects.toThrow(
        /Telegram API call failed/
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
