import { Router } from 'express';
import { z } from 'zod';
import { AiService } from './ai.service.js';
import type { Environment } from '../../config/environment.js';

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(50),
});

const smartLeaveSchema = z.object({
  prompt: z.string().min(3).max(1000),
});

const summarySchema = z.object({
  department: z.string().optional(),
});

export function aiRoutes(env: Environment) {
  const router = Router();
  const aiService = new AiService(env);

  // AI Chat Assistant
  router.post('/chat', async (req, res) => {
    const { messages } = chatSchema.parse(req.body);
    const result = await aiService.handleChat(req.auth!, messages);
    res.json({ data: result });
  });

  // AI Executive Dashboard Summary (Admin & HR)
  router.post('/dashboard-summary', async (req, res) => {
    const { department } = summarySchema.parse(req.body || {});
    const result = await aiService.handleDashboardSummary(req.auth!, department);
    res.json({ data: { ...result, isAiGenerated: true } });
  });

  // AI Smart Leave Assistant
  router.post('/smart-leave', async (req, res) => {
    const { prompt } = smartLeaveSchema.parse(req.body);
    const result = await aiService.handleSmartLeave(req.auth!, prompt);
    res.json({ data: { ...result, isAiGenerated: true } });
  });

  // Company Policy Details
  router.get('/policy', async (req, res) => {
    const data = await aiService.getPolicyInfo(req.auth!.companyId);
    res.json({ data });
  });

  return router;
}
