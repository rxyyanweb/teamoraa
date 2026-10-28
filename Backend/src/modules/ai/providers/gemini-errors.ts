import { ApiError } from '../../../utils/api-error.js';

export const AI_MESSAGES = {
  unavailable: 'Teamora AI is temporarily unavailable. Please contact the administrator.',
  rate: 'AI request limit reached. Please try again later.',
  network: 'Unable to connect to Teamora AI. Please check your connection.',
  timeout: 'Teamora AI took too long to respond. Please try again.',
} as const;

// Inspect provider text only for classification. Never return or log that text.
export function classifyGeminiError(error: unknown) {
  const value = error as { status?: number; message?: string; name?: string; cause?: { code?: string } } | null;
  const status = Number(value?.status) || 0;
  const message = String(value?.message || '');
  const reason = ['ACCESS_TOKEN_TYPE_UNSUPPORTED', 'API_KEY_INVALID', 'API_KEY_SERVICE_BLOCKED',
    'API_KEY_EXPIRED', 'UNAUTHENTICATED', 'PERMISSION_DENIED', 'RESOURCE_EXHAUSTED', 'NOT_FOUND']
    .find((code) => message.includes(code));
  let failure: ApiError;
  if ([401, 403].includes(status) || /API key not valid|API_KEY_|UNAUTHENTICATED|ACCESS_TOKEN_TYPE_UNSUPPORTED/i.test(message)) {
    failure = new ApiError(503, 'AI_AUTH_ERROR', AI_MESSAGES.unavailable);
  } else if (status === 429) {
    failure = new ApiError(429, 'AI_RATE_LIMITED', AI_MESSAGES.rate);
  } else if ([408, 504].includes(status) || ['AbortError', 'TimeoutError'].includes(value?.name || '') || /timeout|timed out|aborted/i.test(message)) {
    failure = new ApiError(504, 'AI_TIMEOUT', AI_MESSAGES.timeout);
  } else if (/fetch failed|network|ECONNRESET|ENOTFOUND|EAI_AGAIN|ECONNREFUSED/i.test(message + ' ' + value?.cause?.code)) {
    failure = new ApiError(503, 'AI_NETWORK_ERROR', AI_MESSAGES.network);
  } else {
    failure = new ApiError(503, status === 404 ? 'AI_MODEL_UNAVAILABLE' : 'AI_UNAVAILABLE', AI_MESSAGES.unavailable);
  }
  return { failure, diagnostic: { providerStatus: status || undefined, code: failure.code, reason } };
}
