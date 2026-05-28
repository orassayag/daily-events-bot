/**
 * Options for fetch with retry and timeout.
 */
export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
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
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const {
    timeoutMs = 30000, // 30 seconds default
    retries = 3,
    retryDelayMs = 1000,
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

      return response;
    } catch (error: any) {
      lastError = error;

      if (error.name === 'AbortError') {
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
