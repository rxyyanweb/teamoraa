import type { Content, GenerateContentConfig, GoogleGenAI } from '@google/genai';
import { Type, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import type { Environment } from '../../../config/environment.js';
import { AI_TOOL_DEFINITIONS, executeAiTool } from '../tools/tool-registry.js';
import type { AuthenticatedUser } from '../../../types/auth.js';
import { ApiError } from '../../../utils/api-error.js';
import { createGeminiClient } from './gemini-client.js';
import { AI_MESSAGES, classifyGeminiError } from './gemini-errors.js';

export class GeminiProvider {
  private ai: GoogleGenAI | null;
  constructor(private env: Environment) { this.ai = createGeminiClient(env); }
  private generationConfig(): GenerateContentConfig {
    return this.env.GEMINI_MODEL.startsWith('gemini-3')
      ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      : { temperature: 0.2 };
  }
  public isAvailable() { return this.ai !== null; }

  private async callModel(ai: GoogleGenAI, contents: Content[] | string, config: GenerateContentConfig) {
    return ai.models.generateContent({ model: this.env.GEMINI_MODEL, contents, config });
  }

  private async run<T>(operation: (ai: GoogleGenAI, signal: AbortSignal) => Promise<T>): Promise<T> {
    if (!this.ai) throw new ApiError(503, 'AI_NOT_CONFIGURED', AI_MESSAGES.unavailable);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new ApiError(504, 'AI_TIMEOUT', AI_MESSAGES.timeout));
      }, this.env.AI_TIMEOUT_MS);
    });
    try { return await Promise.race([operation(this.ai, controller.signal), deadline]); }
    catch (error) {
      if (error instanceof ApiError) throw error;
      const { failure, diagnostic } = classifyGeminiError(error);
      if (this.env.NODE_ENV === 'development') console.warn('Teamora Gemini request failed', diagnostic);
      throw failure;
    } finally { clearTimeout(timer); }
  }

  public async chatWithTools(messages: { role: 'user' | 'model'; content: string }[], actor: AuthenticatedUser, systemPrompt: string): Promise<{ text: string; toolsUsed: string[]; latencyMs: number }> {
    const started = Date.now();
    return this.run(async (ai, signal) => {
      const contents: Content[] = messages.map(m => ({ role: m.role, parts: [{ text: m.content }] }));
      const toolsUsed: string[] = [];
      const config: GenerateContentConfig = {
        systemInstruction: systemPrompt, ...this.generationConfig(), maxOutputTokens: 4096,
        abortSignal: signal, tools: [{ functionDeclarations: AI_TOOL_DEFINITIONS.map(tool => ({
          name: tool.name, description: tool.description,
          parameters: { type: Type.OBJECT, required: tool.parameters.required,
            properties: Object.fromEntries(Object.entries(tool.parameters.properties).map(([name, schema]) =>
              [name, { ...schema, type: Type[schema.type] }])),
          },
        })) }],
      };
      for (let turn = 0; turn < 4; turn++) {
        signal.throwIfAborted();
        const response = await this.callModel(ai, contents, config);
        const content = response.candidates?.[0]?.content;
        const calls = content?.parts?.flatMap(p => p.functionCall ? [p.functionCall] : []) || [];
        if (!calls.length) {
          const text = response.text?.trim();
          if (!text) throw new ApiError(503, 'AI_EMPTY_RESPONSE', AI_MESSAGES.unavailable);
          return { text, toolsUsed: [...new Set(toolsUsed)], latencyMs: Date.now() - started };
        }
        if (calls.length > 7 || turn === 3) throw new ApiError(503, 'AI_TOOL_LIMIT', AI_MESSAGES.unavailable);
        // Preserve all model parts, including thought signatures required by newer models.
        contents.push(content!);
        const parts = [];
        for (const call of calls) {
          signal.throwIfAborted();
          if (!call.name || !AI_TOOL_DEFINITIONS.some(t => t.name === call.name)) throw new ApiError(503, 'AI_INVALID_TOOL', AI_MESSAGES.unavailable);
          // Actor comes only from the authenticated backend, never from the model.
          const result = await executeAiTool(call.name, call.args || {}, actor);
          toolsUsed.push(call.name);
          parts.push({ functionResponse: { name: call.name, ...(call.id ? { id: call.id } : {}), response: result.error ? { error: result.error } : { output: result.result } } });
        }
        contents.push({ role: 'user', parts });
      }
      throw new ApiError(503, 'AI_TOOL_LIMIT', AI_MESSAGES.unavailable);
    });
  }

  public async generateDashboardInsights(metrics: Record<string, unknown>, role: string, systemPrompt: string): Promise<string[]> {
    return this.run(async (ai, signal) => {
      const response = await this.callModel(
        ai,
        `Generate 3 to 5 concise factual bullets for a ${role} user, strictly from these metrics. Never invent statistics. Start each bullet with "- ".\n${JSON.stringify(metrics)}`,
        { systemInstruction: systemPrompt, ...this.generationConfig(), maxOutputTokens: 2048, abortSignal: signal },
      );
      const lines = (response.text || '').split('\n').map(l => l.replace(/^[-*•\d.]+\s*/, '').trim()).filter(Boolean);
      if (!lines.length) throw new ApiError(503, 'AI_EMPTY_RESPONSE', AI_MESSAGES.unavailable);
      return lines.slice(0, 5);
    });
  }

  public async extractStructuredLeave(userText: string, today: string, timezone: string, validCodes: string[]) {
    return this.run(async (ai, signal) => {
      const response = await this.callModel(
        ai,
        `Extract a leave draft from English or Roman Urdu. Today is ${today}, timezone ${timezone}. Valid types: ${validCodes.join(', ')}.
Kal means tomorrow; parson means day after tomorrow; next Monday means the upcoming Monday. Use exact YYYY-MM-DD dates. Map tabiyat kharab/bimari/fever/doctor to sick, shaadi/family/personal to casual, vacation/trip to annual, using only valid types. For one day use identical start/end. Return JSON with type, start, end, reason (brief English).\nUser request: ${JSON.stringify(userText)}`,
        { ...this.generationConfig(), responseMimeType: 'application/json', maxOutputTokens: 2048, abortSignal: signal },
      );
      let parsed: unknown;
      try { parsed = JSON.parse(response.text || ''); } catch { throw new ApiError(503, 'AI_INVALID_RESPONSE', AI_MESSAGES.unavailable); }
      const draft = z.object({ type: z.string().refine(t => validCodes.includes(t)), start: z.iso.date(), end: z.iso.date(), reason: z.string().min(1).max(1000) }).refine(d => d.end >= d.start).safeParse(parsed);
      if (!draft.success) throw new ApiError(503, 'AI_INVALID_RESPONSE', AI_MESSAGES.unavailable);
      return draft.data;
    });
  }
}
