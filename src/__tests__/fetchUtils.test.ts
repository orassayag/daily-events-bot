import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry, FetchTimeoutError } from '../utils/fetchUtils.js';

describe('fetchUtils', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should fetch successfully on the first attempt', async () => {
    const mockResponse = {
      ok: true,
      json: (): Promise<any> => Promise.resolve({ data: 'success' }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const response = await fetchWithRetry('https://example.com');
    const data = await response.json();

    expect(data).toEqual({ data: 'success' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const mockFailure = new Error('Network error');
    const mockSuccess = {
      ok: true,
      json: (): Promise<any> => Promise.resolve({ data: 'success' }),
    };

    vi.mocked(fetch)
      .mockRejectedValueOnce(mockFailure)
      .mockRejectedValueOnce(mockFailure)
      .mockResolvedValueOnce(mockSuccess as any);

    const fetchPromise = fetchWithRetry('https://example.com', {
      retries: 3,
      retryDelayMs: 100,
    });

    // Fast-forward through retries
    await vi.runAllTimersAsync();

    const response = await fetchPromise;
    const data = await response.json();

    expect(data).toEqual({ data: 'success' });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should throw FetchTimeoutError on timeout', async () => {
    vi.mocked(fetch).mockImplementation((_url, options: any) => {
      return new Promise((_, reject) => {
        if (options?.signal) {
          if (options.signal.aborted) {
            const error = new Error('AbortError');
            error.name = 'AbortError';
            reject(error);
          } else {
            options.signal.addEventListener('abort', () => {
              const error = new Error('AbortError');
              error.name = 'AbortError';
              reject(error);
            });
          }
        }
      });
    });

    const fetchPromise = fetchWithRetry('https://example.com', {
      timeoutMs: 1000,
      retries: 0,
    });

    // Fast-forward to trigger timeout
    await vi.advanceTimersByTimeAsync(1500);

    await expect(fetchPromise).rejects.toThrow(FetchTimeoutError);
  });

  it('should retry on timeout', async () => {
    vi.mocked(fetch)
      .mockImplementationOnce(
        (): Promise<any> =>
          new Promise((_, reject) => {
            const error = new Error('AbortError');
            error.name = 'AbortError';
            setTimeout(() => reject(error), 100);
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: (): Promise<any> => Promise.resolve({ data: 'success' }),
      } as any);

    const fetchPromise = fetchWithRetry('https://example.com', {
      timeoutMs: 500,
      retries: 1,
      retryDelayMs: 100,
    });

    await vi.runAllTimersAsync();

    const response = await fetchPromise;
    const data = await response.json();

    expect(data).toEqual({ data: 'success' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
