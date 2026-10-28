import { afterEach, describe, expect, it, vi } from 'vitest';
import { readEnvironment } from '../config/environment.js';
import { GeminiProvider } from '../modules/ai/providers/gemini.provider.js';
import { AI_MESSAGES } from '../modules/ai/providers/gemini-errors.js';
import * as tools from '../modules/ai/tools/tool-registry.js';
import type { AuthenticatedUser } from '../types/auth.js';

const env = readEnvironment({ NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1/test',
  JWT_SECRET: 'fixture-only-'.repeat(8), ADMIN_EMAIL: 'admin@test.test', ADMIN_PASSWORD: 'Fixture-password-only',
  GEMINI_API_KEY: 'AQ.fixture-key-not-a-real-secret', AI_TIMEOUT_MS: '1000' });
const actor = { id: 'employee-fixture', companyId: 'company-fixture', role: 'employee', name: 'Fixture' } as AuthenticatedUser;
const messages = [{ role: 'user' as const, content: 'Hi' }];
const answer = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text }] } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('Gemini authentication and failure boundary', () => {
  it('uses the explicit AQ key header and Developer API despite conflicting Cloud environment', async () => {
    vi.stubEnv('GOOGLE_API_KEY', 'unwanted-fixture-key');
    vi.stubEnv('GOOGLE_GENAI_USE_VERTEXAI', 'true');
    vi.stubEnv('GOOGLE_GENAI_USE_ENTERPRISE', 'true');
    vi.stubEnv('GOOGLE_GEMINI_BASE_URL', 'https://unwanted.invalid');
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init);
      expect(new URL(req.url).origin).toBe('https://generativelanguage.googleapis.com');
      expect(req.headers.get('x-goog-api-key')).toBe(env.GEMINI_API_KEY);
      expect(req.headers.has('authorization')).toBe(false);
      expect(req.url).not.toContain(env.GEMINI_API_KEY);
      return answer('Hello');
    });
    vi.stubGlobal('fetch', fetch);
    expect((await new GeminiProvider(env).chatWithTools(messages, actor, 'Test')).text).toBe('Hello');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, 'AI_AUTH_ERROR', AI_MESSAGES.unavailable, 503],
    [403, 'AI_AUTH_ERROR', AI_MESSAGES.unavailable, 503],
    [429, 'AI_RATE_LIMITED', AI_MESSAGES.rate, 429],
    [504, 'AI_TIMEOUT', AI_MESSAGES.timeout, 504],
    [404, 'AI_MODEL_UNAVAILABLE', AI_MESSAGES.unavailable, 503],
    [500, 'AI_UNAVAILABLE', AI_MESSAGES.unavailable, 503],
  ])('sanitizes Google HTTP %s and never retries it', async (status, code, message, httpStatus) => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: { code: status, message: 'PRIVATE_PROVIDER_BLOB' } }), { status: Number(status) }));
    vi.stubGlobal('fetch', fetch);
    await expect(new GeminiProvider(env).chatWithTools(messages, actor, 'Test')).rejects.toMatchObject({ status: httpStatus, code, message });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('maps network errors without exposing transport details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed PRIVATE_PROVIDER_BLOB')));
    await expect(new GeminiProvider(env).chatWithTools(messages, actor, 'Test')).rejects.toMatchObject({ code: 'AI_NETWORK_ERROR', message: AI_MESSAGES.network });
  });

  it('cancels a hanging request at the configured deadline', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const check = expect(new GeminiProvider(env).chatWithTools(messages, actor, 'Test')).rejects.toMatchObject({ code: 'AI_TIMEOUT', message: AI_MESSAGES.timeout });
    await vi.advanceTimersByTimeAsync(1001);
    await check;
  });

  it('never supplies offline answers, invented summaries or parsed leave on missing credentials', async () => {
    const provider = new GeminiProvider({ ...env, GEMINI_API_KEY: '' });
    for (const request of [() => provider.chatWithTools(messages, actor, ''), () => provider.generateDashboardInsights({}, 'admin', ''), () => provider.extractStructuredLeave('kal sick leave', '2026-10-26', 'Asia/Karachi', ['sick'])]) {
      await expect(request()).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED', status: 503 });
    }
  });

  it('preserves conversation and signatures, executes every call with the server actor, and relays permission denial', async () => {
    const execute = vi.spyOn(tools, 'executeAiTool').mockResolvedValueOnce({ result: { available: 8 } }).mockResolvedValueOnce({ result: null, error: 'Unauthorized' });
    const modelContent = { role: 'model', parts: [
      { functionCall: { name: 'get_my_leave_balance', args: {} }, thoughtSignature: 'fixture-signature' },
      { functionCall: { name: 'get_headcount', args: { companyId: 'untrusted-company' } } },
    ] };
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = await new Request(input, init).json();
      if (calls++ === 0) return new Response(JSON.stringify({ candidates: [{ content: modelContent }] }), { status: 200 });
      expect(body.contents[0].parts[0].text).toBe('Hi');
      expect(body.contents[1]).toEqual(modelContent);
      expect(body.contents[2].parts).toHaveLength(2);
      expect(body.contents[2].parts[1].functionResponse.response).toEqual({ error: 'Unauthorized' });
      return answer('Only your own leave balance is available.');
    }));
    const result = await new GeminiProvider(env).chatWithTools(messages, actor, 'Test');
    expect(result.toolsUsed).toEqual(['get_my_leave_balance', 'get_headcount']);
    expect(execute).toHaveBeenNthCalledWith(2, 'get_headcount', { companyId: 'untrusted-company' }, actor);
  });
});
