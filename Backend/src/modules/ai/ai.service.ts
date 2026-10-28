import { AiLog } from './ai-log.model.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { getCompanyPolicyContext, formatPolicySystemPrompt } from './policy.service.js';
import { processSmartLeaveRequest, type SmartLeaveResult } from './smart-leave.service.js';
import { generateDashboardSummary } from './dashboard-summary.service.js';
import type { Environment } from '../../config/environment.js';
import type { AuthenticatedUser } from '../../types/auth.js';
import { AI_MESSAGES } from './providers/gemini-errors.js';
import { ApiError } from '../../utils/api-error.js';

export class AiService {
  private gemini: GeminiProvider;
  private rateLimitPerHour: number;

  constructor(env: Environment) {
    this.gemini = new GeminiProvider(env);
    this.rateLimitPerHour = env.AI_RATE_LIMIT_PER_HOUR || 20;
  }

  private async recordFailure<T>(actor: AuthenticatedUser, category: 'chat' | 'smart-leave' | 'summary', operation: () => Promise<T>): Promise<T> {
    const started = Date.now();
    try { return await operation(); }
    catch (error) {
      await AiLog.create({ companyId: actor.companyId, userId: actor.id, role: actor.role,
        requestCategory: category, promptSnippet: '[failed request]', toolsUsed: [],
        latencyMs: Date.now() - started, status: 'error',
        errorMessage: error instanceof ApiError ? error.code : 'AI_REQUEST_FAILED',
      });
      throw error;
    }
  }

  /**
   * Rate-limiting check per authenticated user
   */
  private async checkRateLimit(userId: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await AiLog.countDocuments({
      userId,
      status: { $ne: 'error' },
      createdAt: { $gte: oneHourAgo },
    });

    if (count >= this.rateLimitPerHour) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        AI_MESSAGES.rate,
      );
    }
  }

  /**
   * Build complete role-aware system prompt with Roman Urdu and security rules
   */
  private buildSystemPrompt(
    actor: AuthenticatedUser,
    policyText: string,
  ): string {
    return `
You are Teamora AI, an intelligent, trustworthy, and helpful Human Capital Management assistant for "${actor.name}" (Role: ${actor.role.toUpperCase()}).

${policyText}

STRICT SECURITY & PRIVACY MANDATES:
1. Role Scoping:
   - You are conversing with an authenticated ${actor.role.toUpperCase()} (ID: ${actor.id}).
   - IF ROLE IS "EMPLOYEE":
     * The user CANNOT view other employees' salaries, performance, private notes, or attendance.
     * The user CANNOT view company-wide financial totals or audit trails.
     * IF ASKED about a colleague's salary (e.g. "What is my colleague's salary?", "Ali ki salary kitni hai?", "Show me HR's pay"), you MUST REFUSE directly: "I cannot share other employees' salary or private compensation details." (also in Roman Urdu: "Me doosre mulazmeen ki salary ya compensation details share nahi kar sakta.").
   - IF ROLE IS "HR":
     * Can query workforce headcount, attendance summaries, top late comers, pending leave requests, and search employee profiles.
     * Cannot view system audit logs or alter company setup.
   - IF ROLE IS "ADMIN":
     * Full company-wide operational and financial analytics access.

2. Language & Tone:
   - You are fully bilingual in ENGLISH and ROMAN URDU (Urdu written in Latin alphabet, widely used in Pakistan).
   - If the user greets or asks in Roman Urdu (e.g. "Meri attendance is month kaisi rahi?", "Kitni leaves baqi hain?", "Aaj kitne log chutti pe hain?"), respond in natural, friendly, polite Roman Urdu.
   - If the user asks in English, respond in professional, polished English.
   - You may blend both naturally if the user asks in mixed English/Urdu.

3. Tool Grounding:
   - Always call the provided authorized tools to get real data before answering questions about headcount, attendance, leaves, late arrivals, or payroll.
   - Never fabricate or guess employee counts, leave balances, or salary figures.
   - Always adhere to the company's timezone (Asia/Karachi).
`;
  }

  /**
   * AI Chat turn with real tool calling and audit logging
   */
  public async handleChat(
    actor: AuthenticatedUser,
    messages: { role: 'user' | 'model'; content: string }[],
  ): Promise<{ response: string; toolsUsed: string[]; latencyMs: number; isAiGenerated: boolean }> {
    await this.checkRateLimit(actor.id);

    const latestUserMessage = messages[messages.length - 1]?.content || '';
    const policyContext = await getCompanyPolicyContext(actor.companyId);
    const policyPrompt = formatPolicySystemPrompt(policyContext);
    const systemPrompt = this.buildSystemPrompt(actor, policyPrompt);

    // Fast-path security check for salary snooping by employees
    if (
      actor.role === 'employee' &&
      /(colleague|other|someone|ali|sarah|boss|manager|everyone|anyone).*salary|salary.*(colleague|other|ali|sarah)|doosre.*salary|kisi.*salary/i.test(
        latestUserMessage,
      )
    ) {
      const isUrdu = /(kitni|hai|kisi|doosre|batao|chahiye|meri|mera|mujhe|apna)/i.test(
        latestUserMessage,
      );
      const refusal = isUrdu
        ? 'Me policy ke tehat doosre mulazmeen ki salary ya personal compensation share nahi kar sakta. Aap sirf apni finalized payslip dekh sakte hain.'
        : 'Company privacy policy strictly prohibits sharing compensation details of other employees. You may only view your own finalized payslip.';

      await AiLog.create({
        companyId: actor.companyId,
        userId: actor.id,
        role: actor.role,
        requestCategory: 'chat',
        promptSnippet: latestUserMessage.slice(0, 100),
        toolsUsed: [],
        latencyMs: 10,
        status: 'refused',
      });

      return {
        response: refusal,
        toolsUsed: [],
        latencyMs: 10,
        isAiGenerated: false,
      };
    }

    const { text, toolsUsed, latencyMs } = await this.recordFailure(actor, 'chat', () => this.gemini.chatWithTools(messages, actor, systemPrompt));

    // Log the AI invocation
    await AiLog.create({
      companyId: actor.companyId,
      userId: actor.id,
      role: actor.role,
      requestCategory: 'chat',
      promptSnippet: latestUserMessage.slice(0, 120),
      toolsUsed,
      latencyMs,
      status: 'success',
    });

    return {
      response: text,
      toolsUsed,
      latencyMs,
      isAiGenerated: true,
    };
  }

  /**
   * Smart Leave Assistant
   */
  public async handleSmartLeave(
    actor: AuthenticatedUser,
    userText: string,
  ): Promise<SmartLeaveResult> {
    await this.checkRateLimit(actor.id);
    const startTime = Date.now();

    const result = await this.recordFailure(actor, 'smart-leave', () => processSmartLeaveRequest(actor, userText, this.gemini));

    await AiLog.create({
      companyId: actor.companyId,
      userId: actor.id,
      role: actor.role,
      requestCategory: 'smart-leave',
      promptSnippet: userText.slice(0, 120),
      toolsUsed: ['smart_leave_extractor'],
      latencyMs: Date.now() - startTime,
      status: 'success',
    });

    return result;
  }

  /**
   * Executive Dashboard Summaries
   */
  public async handleDashboardSummary(
    actor: AuthenticatedUser,
    departmentFilter?: string,
  ) {
    await this.checkRateLimit(actor.id);
    const startTime = Date.now();

    const result = await this.recordFailure(actor, 'summary', () => generateDashboardSummary(actor, this.gemini, departmentFilter));

    await AiLog.create({
      companyId: actor.companyId,
      userId: actor.id,
      role: actor.role,
      requestCategory: 'summary',
      promptSnippet: `Dashboard summary for ${actor.role} (dept: ${departmentFilter || 'All'})`,
      toolsUsed: ['get_analytics_summary'],
      latencyMs: Date.now() - startTime,
      status: 'success',
    });

    return result;
  }

  /**
   * Company Policy Explanations
   */
  public async getPolicyInfo(companyId: string) {
    return getCompanyPolicyContext(companyId);
  }
}
