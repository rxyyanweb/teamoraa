import { z } from 'zod';
export const dateInput = z.iso
  .date()
  .refine(
    (value) => value >= '2000-01-01' && value <= '2100-12-31',
    'Choose a date between 2000 and 2100.',
  );
export const monthInput = z.string().regex(/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/);
export const objectIdInput = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
export const pageInput = z.coerce.number().int().min(1).max(100000).default(1);
export const pageSizeInput = z.coerce.number().int().min(1).max(50).default(15);
export const searchInput = z.string().trim().max(100).default('');
export const literalSearch = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const decisionInput = z
  .object({
    comment: z.string().trim().min(3, 'Add a decision comment of at least 3 characters.').max(1000),
  })
  .strict();
