/**
 * Error Handling Utilities
 * Centralized error handling with APIError type and Zod validation formatting
 * Requirements: 9.5, 10.1
 */
import { ZodError } from "zod";
import type { APIError } from "@/lib/types";

/**
 * Error codes for API responses
 */
export const ErrorCode = {
  INVALID_REQUEST: "INVALID_REQUEST",
  API_KEY_MISSING: "API_KEY_MISSING",
  API_KEY_INVALID: "API_KEY_INVALID",
  RATE_LIMITED: "RATE_LIMITED",
  AGENT_FAILED: "AGENT_FAILED",
  SEARCH_FAILED: "SEARCH_FAILED",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * HTTP status codes for each error type
 */
export const ErrorStatusCode: Record<ErrorCodeType, number> = {
  INVALID_REQUEST: 400,
  API_KEY_MISSING: 401,
  API_KEY_INVALID: 401,
  RATE_LIMITED: 429,
  AGENT_FAILED: 500,
  SEARCH_FAILED: 503,
};

/**
 * Format Zod validation errors into a human-readable string
 */
export function formatZodErrors(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    })
    .join("; ");
}

/**
 * Create an APIError object from various error types
 */
export function createAPIError(
  code: ErrorCodeType,
  message: string,
  details?: string,
  retryable?: boolean
): APIError {
  return {
    error: message,
    code,
    details,
    retryable: retryable ?? isRetryableErrorCode(code),
  };
}

/**
 * Determine if an error code is retryable
 */
export function isRetryableErrorCode(code: ErrorCodeType): boolean {
  return code === "RATE_LIMITED" || code === "AGENT_FAILED" || code === "SEARCH_FAILED";
}

/**
 * Create an APIError from a Zod validation error
 */
export function createValidationError(error: ZodError): APIError {
  return createAPIError(
    ErrorCode.INVALID_REQUEST,
    "Invalid request body",
    formatZodErrors(error),
    false
  );
}

/**
 * Create an APIError for missing API key
 */
export function createMissingKeyError(keyName: string): APIError {
  return createAPIError(
    ErrorCode.API_KEY_MISSING,
    `${keyName} API key is required`,
    `Please configure your ${keyName} API key in settings`,
    false
  );
}

/**
 * Create an APIError for invalid API key
 */
export function createInvalidKeyError(keyName: string, details?: string): APIError {
  return createAPIError(
    ErrorCode.API_KEY_INVALID,
    `Invalid ${keyName} API key`,
    details || `The ${keyName} API key is invalid or expired`,
    false
  );
}

/**
 * Create an APIError for rate limiting
 */
export function createRateLimitError(details?: string): APIError {
  return createAPIError(
    ErrorCode.RATE_LIMITED,
    "Rate limited",
    details || "Too many requests. Please try again later.",
    true
  );
}

/**
 * Create an APIError for search failures
 */
export function createSearchError(details?: string): APIError {
  return createAPIError(
    ErrorCode.SEARCH_FAILED,
    "Search service failed",
    details || "Web search is temporarily unavailable",
    true
  );
}

/**
 * Create an APIError for agent failures
 */
export function createAgentError(details?: string): APIError {
  return createAPIError(
    ErrorCode.AGENT_FAILED,
    "Agent execution failed",
    details || "The AI agent encountered an error",
    true
  );
}

/**
 * Parse an unknown error into an APIError
 */
export function parseError(err: unknown, context?: string): APIError {
  // Already an APIError
  if (isAPIError(err)) {
    return err;
  }

  // Error instance
  if (err instanceof Error) {
    const message = err.message.toLowerCase();

    // Check for API key errors
    if (message.includes("api key") || message.includes("authentication") || message.includes("unauthorized")) {
      return createInvalidKeyError("API", err.message);
    }

    // Check for rate limiting
    if (message.includes("rate limit") || message.includes("quota") || message.includes("429")) {
      return createRateLimitError(err.message);
    }

    // Check for search failures
    if (message.includes("exa") || message.includes("search")) {
      return createSearchError(err.message);
    }

    // Generic agent error
    return createAgentError(context ? `${context}: ${err.message}` : err.message);
  }

  // Unknown error
  return createAgentError(context || "Unknown error occurred");
}

/**
 * Type guard to check if an object is an APIError
 */
export function isAPIError(obj: unknown): obj is APIError {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "error" in obj &&
    "code" in obj &&
    "retryable" in obj &&
    typeof (obj as APIError).error === "string" &&
    typeof (obj as APIError).code === "string" &&
    typeof (obj as APIError).retryable === "boolean"
  );
}

/**
 * Create a JSON Response with the appropriate status code for an APIError
 */
export function errorResponse(error: APIError): Response {
  const statusCode = ErrorStatusCode[error.code as ErrorCodeType] || 500;
  return Response.json(error, { status: statusCode });
}

/**
 * Handle errors in API routes - parses error and returns appropriate Response
 */
export function handleAPIError(err: unknown, context?: string): Response {
  const apiError = parseError(err, context);
  console.error(`API Error [${apiError.code}]:`, apiError.error, apiError.details);
  return errorResponse(apiError);
}
