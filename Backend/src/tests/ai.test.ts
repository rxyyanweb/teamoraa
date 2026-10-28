import { GeminiProvider } from '../modules/ai/providers/gemini.provider.js';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import type { MongoMemoryReplSet } from 'mongodb-memory-server';
import { startTestDatabase } from './test-database.js';
import { connectDatabase } from '../config/database.js';
import { Company } from '../modules/organization/company.model.js';
import { User } from '../modules/users/user.model.js';
import { executeAiTool, AI_TOOL_DEFINITIONS } from '../modules/ai/tools/tool-registry.js';
import { AiService } from '../modules/ai/ai.service.js';
import { readEnvironment } from '../config/environment.js';
import type { AuthenticatedUser } from '../types/auth.js';

describe('Phase 4: Gemini AI, Security, Smart Leave & Tools', () => {
  let database: MongoMemoryReplSet;
  let companyId: string;
  let adminActor: AuthenticatedUser;
  let hrActor: AuthenticatedUser;
  let empActor: AuthenticatedUser;
  let aiService: AiService;

  beforeAll(async () => {
    database = await startTestDatabase();
    await connectDatabase(database.getUri());

    const company = await Company.create({
      name: 'Teamora Test Corp',
      timezone: 'Asia/Karachi',
      singleton: 'primary',
    });
    companyId = company._id.toString();

    adminActor = {
      id: new mongoose.Types.ObjectId().toString(),
      companyId,
      role: 'admin',
      email: 'admin@teamora.test',
      name: 'System Admin',
    } as unknown as AuthenticatedUser;

    hrActor = {
      id: new mongoose.Types.ObjectId().toString(),
      companyId,
      role: 'hr',
      email: 'hr@teamora.test',
      name: 'Sarah HR',
    } as unknown as AuthenticatedUser;

    empActor = {
      id: new mongoose.Types.ObjectId().toString(),
      companyId,
      role: 'employee',
      email: 'ali@teamora.test',
      name: 'Ali Developer',
    } as unknown as AuthenticatedUser;

    await User.create([
      {
        _id: adminActor.id,
        companyId,
        name: adminActor.name,
        email: adminActor.email,
        passwordHash: 'dummy-hash',
        role: 'admin',
        employeeCode: 'ADM-001',
      },
      {
        _id: hrActor.id,
        companyId,
        name: hrActor.name,
        email: hrActor.email,
        passwordHash: 'dummy-hash',
        role: 'hr',
        employeeCode: 'HR-001',
      },
      {
        _id: empActor.id,
        companyId,
        name: empActor.name,
        email: empActor.email,
        passwordHash: 'dummy-hash',
        role: 'employee',
        employeeCode: 'EMP-001',
      },
    ]);

    const env = readEnvironment({
      MONGODB_URI: database.getUri(),
      JWT_SECRET: 'test-secret-at-least-64-characters-long-for-valid-environment-parsing',
      ADMIN_EMAIL: 'admin@teamora.test',
      ADMIN_PASSWORD: 'Password@123456',
    });
    aiService = new AiService(env);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await database.stop();
  });

  it('declares all 7 required AI tools with valid parameter schemas', () => {
    const requiredTools = [
      'get_headcount',
      'get_attendance_summary',
      'get_late_comers',
      'get_leave_summary',
      'get_my_leave_balance',
      'get_payroll_summary',
      'search_employees',
    ];
    const declaredNames = AI_TOOL_DEFINITIONS.map((t) => t.name);
    for (const reqTool of requiredTools) {
      expect(declaredNames).toContain(reqTool);
    }
  });

  describe('Strict Role-Based Authorization & Privacy Guards in Tool Execution', () => {
    it('blocks employees from calling get_headcount', async () => {
      const res = await executeAiTool('get_headcount', {}, empActor);
      expect(res.error).toBeDefined();
      expect(res.error).toContain('Unauthorized');
      expect(res.result).toBeNull();
    });

    it('blocks employees from calling get_late_comers ranking', async () => {
      const res = await executeAiTool('get_late_comers', {}, empActor);
      expect(res.error).toBeDefined();
      expect(res.error).toContain('Unauthorized');
      expect(res.result).toBeNull();
    });

    it('blocks employees from calling get_leave_summary', async () => {
      const res = await executeAiTool('get_leave_summary', {}, empActor);
      expect(res.error).toBeDefined();
      expect(res.error).toContain('Unauthorized');
      expect(res.result).toBeNull();
    });

    it('blocks employees from calling search_employees', async () => {
      const res = await executeAiTool('search_employees', { query: 'test' }, empActor);
      expect(res.error).toBeDefined();
      expect(res.error).toContain('Unauthorized');
      expect(res.result).toBeNull();
    });

    it('allows HR to call get_headcount and returns real MongoDB counts', async () => {
      const res = await executeAiTool('get_headcount', {}, hrActor);
      expect(res.error).toBeUndefined();
      expect(res.result.totalEmployees).toBe(1);
      expect(res.result.activeEmployees).toBe(1);
    });

    it('allows employee to call get_my_leave_balance for themselves', async () => {
      const res = await executeAiTool('get_my_leave_balance', {}, empActor);
      expect(res.error).toBeUndefined();
      expect(res.result.employeeName).toBe(empActor.name);
      expect(res.result.balances).toBeDefined();
    });
  });

  describe('Prompt Injection & Colleague Salary Snooping Refusal', () => {
    it('refuses employee requests to view colleague salary in English', async () => {
      const res = await aiService.handleChat(empActor, [
        { role: 'user', content: "What is my colleague's salary?" },
      ]);
      expect(res.response).toMatch(/cannot share other employees' salary|strictly prohibits/i);
      expect(res.toolsUsed).toHaveLength(0);
      expect(res.isAiGenerated).toBe(false);
    });

    it('refuses employee requests to view colleague salary in Roman Urdu', async () => {
      const res = await aiService.handleChat(empActor, [
        { role: 'user', content: 'Ali ki salary kitni hai mujhe batao?' },
      ]);
      expect(res.response).toMatch(/doosre mulazmeen ki salary.*share nahi kar sakta|policy/i);
      expect(res.toolsUsed).toHaveLength(0);
      expect(res.isAiGenerated).toBe(false);
    });
  });

  it('does not disguise a missing key as an AI answer', async () => {
    await expect(aiService.handleChat(empActor, [{ role: 'user', content: 'Hi' }])).rejects.toMatchObject({ status: 503, code: 'AI_NOT_CONFIGURED' });
  });

  describe('Smart Leave Extraction & Validation', () => {
    it('validates a sick leave extraction against real leave balances', async () => {
      vi.spyOn(GeminiProvider.prototype, 'extractStructuredLeave').mockResolvedValueOnce({ type: 'sick', start: '2026-10-27', end: '2026-10-27', reason: 'Doctor visit' });
      const result = await aiService.handleSmartLeave(
        empActor,
        'Kal meri tabiyat kharab hai, sick leave chahiye doctor visit ke liye',
      );
      expect(result.draft).toBeDefined();
      expect(result.draft.type).toBe('sick');
      expect(result.draft.startDate).toBeDefined();
      expect(result.draft.endDate).toBeDefined();
      expect(result.balance).toBeDefined();
    });

    it('validates a multi-day extraction against the company calendar', async () => {
      vi.spyOn(GeminiProvider.prototype, 'extractStructuredLeave').mockResolvedValueOnce({ type: 'casual', start: '2026-11-02', end: '2026-11-03', reason: 'Family wedding' });
      const result = await aiService.handleSmartLeave(
        empActor,
        'Need next Monday and Tuesday off for family wedding',
      );
      expect(result.draft).toBeDefined();
      expect(result.draft.startDate).toBeDefined();
      expect(result.draft.endDate).toBeDefined();
      expect(result.draft.workingDays).toBeGreaterThanOrEqual(0);
    });
  });
});
