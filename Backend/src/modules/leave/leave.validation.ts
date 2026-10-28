import { z } from 'zod';
import {
  dateInput,
  monthInput,
  pageInput,
  pageSizeInput,
  searchInput,
} from '../../utils/workforce-validation.js';
export const leaveRangeInput = z
  .object({
    type: z.string().regex(/^[a-z][a-z0-9_]{1,30}$/),
    startDate: dateInput,
    endDate: dateInput,
  })
  .strict();
export const applyLeaveInput = leaveRangeInput
  .extend({
    reason: z
      .string()
      .trim()
      .min(5, 'Please explain your request in at least 5 characters.')
      .max(1500),
  })
  .strict();
export const leaveStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export const myLeaveInput = z
  .object({
    month: monthInput.optional(),
    status: z.enum(leaveStatuses).optional(),
    page: pageInput,
    pageSize: pageSizeInput,
  })
  .strict();
export const leaveOverviewInput = z
  .object({
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    status: z.enum(leaveStatuses).optional(),
    department: z.string().max(80).optional(),
    search: searchInput,
    page: pageInput,
    pageSize: pageSizeInput,
  })
  .strict();
export const balanceInput = z
  .object({ year: z.coerce.number().int().min(2000).max(2100).optional() })
  .strict();
