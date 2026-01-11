/**
 * Retry Utility
 * Implements exponential backoff retry logic for transient failures
 * Requirements: 10.4
 */

/**
 * Configuration options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 2) */
  maxRetries?: number;
  /** Base delay in milliseconds before first retry (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Optional callback when a retry occurs */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "onRetry" | "isRetryable">> = {
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Determine if an error is retryable based on common patterns
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("rate limit") ||
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("socket hang up") ||
      message.includes("503") ||
      message.includes("429") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("504") ||
      message.includes("temporarily unavailable") ||
      message.includes("service unavailable")
    );
  }
  return false;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  // Exponential backoff: baseDelay * multiplier^attempt
  const exponentialDelay = baseDelay * Math.pow(multiplier, attempt);
  
  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  
  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Execute a function with retry logic and exponential backoff
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries fail
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetchData(),
 *   { maxRetries: 3, baseDelay: 500 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    baseDelay = DEFAULT_OPTIONS.baseDelay,
    maxDelay = DEFAULT_OPTIONS.maxDelay,
    backoffMultiplier = DEFAULT_OPTIONS.backoffMultiplier,
    onRetry,
    isRetryable = isRetryableError,
  } = options;

  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldRetry = attempt < maxRetries && isRetryable(error);

      if (!shouldRetry) {
        // Not retryable or max retries reached, throw immediately
        throw lastError;
      }

      const delay = calculateDelay(attempt, baseDelay, maxDelay, backoffMultiplier);
      
      // Call onRetry callback if provided
      onRetry?.(lastError, attempt + 1, delay);
      
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retry wrapper with preset options
 * Useful for creating reusable retry configurations
 * 
 * @example
 * ```typescript
 * const apiRetry = createRetryWrapper({ maxRetries: 3, baseDelay: 500 });
 * const result = await apiRetry(() => fetchData());
 * ```
 */
export function createRetryWrapper(defaultOptions: RetryOptions) {
  return <T>(fn: () => Promise<T>, overrideOptions?: RetryOptions): Promise<T> => {
    return withRetry(fn, { ...defaultOptions, ...overrideOptions });
  };
}

/**
 * Pre-configured retry wrapper for API calls
 * Uses 2 retries with 1 second base delay
 */
export const apiRetry = createRetryWrapper({
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
});

/**
 * Pre-configured retry wrapper for search operations
 * Uses 1 retry with 500ms base delay (faster failure for search)
 */
export const searchRetry = createRetryWrapper({
  maxRetries: 1,
  baseDelay: 500,
  maxDelay: 2000,
  backoffMultiplier: 2,
});
