import { z } from 'zod';

export const createPayrollDraftSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format (e.g. 2026-10)'),
  latePenaltyBonusEnabled: z.boolean().optional().default(false),
});

export const updateSalaryStructureSchema = z.object({
  basicSalary: z.number().min(0, 'Basic salary cannot be negative'),
});

export const payrollListQuerySchema = z.object({
  status: z.enum(['draft', 'finalized']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
