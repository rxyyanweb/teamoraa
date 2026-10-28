import { z } from 'zod';
export const email = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase().trim());
export const password = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'Password must be at most 72 UTF-8 bytes.',
  );
export const loginSchema = z.object({ email, password: z.string().min(1).max(72) }).strict();
export const setupSchema = z
  .object({
    email,
    password,
    name: z.string().trim().min(2).max(100),
    companyName: z.string().trim().min(2).max(120),
  })
  .strict();
export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(72), newPassword: password })
  .strict();
