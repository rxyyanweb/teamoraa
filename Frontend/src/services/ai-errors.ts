import { ApiError } from './api';

/**
 * Sanitized user-friendly error messages for Teamora AI.
 * Never expose raw provider errors, API keys, or technical traces to users.
 */
export function aiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429 || ['RATE_LIMITED', 'AI_RATE_LIMITED'].includes(error.code)) {
      return 'AI request limit reached. Please try again later.';
    }
    if (error.status === 504 || error.code === 'AI_TIMEOUT') {
      return 'Teamora AI took too long to respond. Please try again.';
    }
    if (error.status === 0 || ['NETWORK_ERROR', 'AI_NETWORK_ERROR'].includes(error.code)) {
      return 'Unable to connect to Teamora AI. Please check your connection.';
    }
    if (['FORBIDDEN', 'CSRF_REJECTED'].includes(error.code)) {
      return 'Unable to complete this request. Refresh the page and try again.';
    }
  }

  // Check if string contains rate limit, timeout, or network clues without showing raw text
  const msg = error instanceof Error ? error.message : String(error || '');
  if (/rate limit|too many requests|429/i.test(msg)) {
    return 'AI request limit reached. Please try again later.';
  }
  if (/timeout|timed out|504|aborted/i.test(msg)) {
    return 'Teamora AI took too long to respond. Please try again.';
  }
  if (/network|fetch failed|failed to fetch|econnrefused/i.test(msg)) {
    return 'Unable to connect to Teamora AI. Please check your connection.';
  }

  // Default safe error message
  return 'Teamora AI is temporarily unavailable. Please contact the administrator.';
}
