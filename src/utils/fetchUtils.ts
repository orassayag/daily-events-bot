/**
 * Options for fetch with retry and timeout.
 */
export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  parseJson?: boolean;
}

/**
 * Custom error class for fetch timeouts.
 */
export class FetchTimeoutError extends Error {
  constructor(message: string = 'Fetch request timed out') {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

/**
 * Fetches a resource with timeout and retry logic.
 */
export async function fetchWithRetry<T = Response>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    timeoutMs = 30000, // 30 seconds default
    retries = 3,
    retryDelayMs = 1000,
    parseJson = false,
    ...fetchOptions
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (attempt > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelayMs * Math.pow(2, attempt - 1)),
        );
      }

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      if (parseJson) {
        const data = await response.json();
        return {
          ...response,
          ok: response.ok,
          status: response.status,
          json: () => Promise.resolve(data),
          parsedData: data,
        } as unknown as T;
      }

      return response as unknown as T;
    } catch (error: any) {
      lastError = error;

      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        lastError = new FetchTimeoutError(
          `Request to ${url} timed out after ${timeoutMs}ms`,
        );
      }

      // If it's the last attempt, don't retry anymore
      if (attempt === retries) {
        break;
      }
    } finally {
      clearTimeout(id);
    }
  }

  throw (
    lastError || new Error(`Failed to fetch ${url} after ${retries} retries`)
  );
}
