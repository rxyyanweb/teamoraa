import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/api-error.js';
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; '),
      },
    });
    return;
  }
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (typeof error === 'object' && error && 'code' in error && error.code === 11000) {
    res
      .status(409)
      .json({ error: { code: 'CONFLICT', message: 'This account or company already exists.' } });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res
      .status(400)
      .json({ error: { code: 'INVALID_JSON', message: 'Provide a valid JSON request.' } });
    return;
  }
  // Do not log request bodies, MongoDB URIs, tokens, passwords or driver error messages.
  console.error('API request failed:', error instanceof Error ? error.name : 'UnknownError');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'The request could not be completed. Please try again.',
    },
  });
};
