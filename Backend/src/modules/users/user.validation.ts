import { z } from 'zod';
import { email } from '../auth/auth.validation.js';

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
    department: z.string().trim().max(80).default(''),
    designation: z.string().trim().max(80).default(''),
    phone: z.string().trim().max(30).default(''),
    address: z.string().trim().max(500).default(''),
    basicSalary: z.number().positive().max(1_000_000_000).optional(),
    joinedAt: z.iso.date().optional(),
  })
  .strict();
export const updateUserSchema = createUserSchema.omit({ email: true }).partial().strict();
export const profileSchema = z
  .object({ phone: z.string().trim().max(30), address: z.string().trim().max(500) })
  .strict();
