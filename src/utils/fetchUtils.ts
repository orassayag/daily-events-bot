/**
 * Options for fetch with retry and timeout.
 */
export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  parseJson?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Custom error class for fetch timeouts.
 */
export class FetchTimeoutError extends Error {
  constructor(
    message: string = 'Fetch request timed out',
    public readonly url?: string,
    public readonly timeoutMs?: number,
  ) {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

/**
 * Custom error class for when all retries are exhausted.
 */
export class FetchExhaustedError extends Error {
  constructor(
    public readonly url: string,
    public readonly attempts: number,
    public readonly cause: Error,
  ) {
    super(
      `All ${attempts} attempt(s) failed for ${url}. Last error: ${cause.message}`,
    );
    this.name = 'FetchExhaustedError';
  }
}

/**
 * Fetches a resource with per-attempt AbortController timeout and exponential
 * back-off retry logic.
 *
 * Key fix over the original: the AbortController is re-created on every
 * attempt (the original shared one controller across retries, meaning a
 * timed-out first attempt left the signal permanently aborted and all
 * subsequent retries failed instantly with AbortError).
 */
export async function fetchWithRetry<T = Response>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    timeoutMs = 30000,
    retries = 3,
    retryDelayMs = 1000,
    parseJson = false,
    onRetry,
    ...fetchOptions
  } = options;

  const totalAttempts = retries + 1; // attempt 0 … retries
  let lastError: Error = new Error(`Failed to fetch ${url}`);

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    // --- wait before retrying (exponential back-off) ---
    if (attempt > 0) {
      const delay = retryDelayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s …
      await sleep(delay);
      onRetry?.(attempt, lastError);
    }

    // --- fresh controller per attempt so a previous abort doesn't bleed in ---
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!parseJson) {
        return response as unknown as T;
      }

      // Parse JSON while the response body is still open.
      const data = await response.json();
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        url: response.url,
        redirected: response.redirected,
        type: response.type,
        // Convenience: keep the standard json() method working too.
        json: () => Promise.resolve(data),
        parsedData: data,
      } as unknown as T;
    } catch (error: any) {
      clearTimeout(timer);

      // Normalise timeout errors so callers can instanceof-check reliably.
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        lastError = new FetchTimeoutError(
          `Request to ${url} timed out after ${timeoutMs}ms (attempt ${attempt + 1}/${totalAttempts})`,
          url,
          timeoutMs,
        );
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
  }

  throw new FetchExhaustedError(url, totalAttempts, lastError);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
