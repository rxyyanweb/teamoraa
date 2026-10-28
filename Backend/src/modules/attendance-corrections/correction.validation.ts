import { z } from 'zod';
import {
  dateInput,
  objectIdInput,
  pageInput,
  pageSizeInput,
  searchInput,
} from '../../utils/workforce-validation.js';
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a valid 24-hour time.');
export const correctionInput = z
  .object({
    date: dateInput,
    checkInTime: time,
    checkOutTime: time,
    nextDayCheckout: z.boolean().default(false),
    reason: z.string().trim().min(5).max(1500),
  })
  .strict();
export const correctionListInput = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    employeeId: objectIdInput.optional(),
    department: z.string().max(80).optional(),
    search: searchInput,
    page: pageInput,
    pageSize: pageSizeInput,
  })
  .strict();
