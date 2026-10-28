import { GoogleGenAI } from '@google/genai';
import type { Environment } from '../../../config/environment.js';

export function createGeminiClient(env: Environment): GoogleGenAI | null {
  const apiKey = env.GEMINI_API_KEY.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    // Pin the Developer API even if deployment inherits Cloud SDK flags/URLs.
    vertexai: false,
    enterprise: false,
    httpOptions: {
      baseUrl: 'https://generativelanguage.googleapis.com',
      apiVersion: 'v1beta',
      timeout: env.AI_TIMEOUT_MS,
      retryOptions: { attempts: 1 },
    },
  });
}
