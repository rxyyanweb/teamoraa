import { z } from 'zod';
import {
  dateInput,
  monthInput,
  pageInput,
  pageSizeInput,
  searchInput,
} from '../../utils/workforce-validation.js';
export const attendanceStatuses = [
  'present',
  'late',
  'half_day',
  'missing_checkout',
  'absent',
  'on_leave',
  'not_checked_in',
  'weekend',
  'holiday',
  'upcoming',
] as const;
export const personalAttendanceInput = z
  .object({ month: monthInput.optional(), page: pageInput, pageSize: pageSizeInput })
  .strict();
export const boardInput = z
  .object({
    date: dateInput.optional(),
    department: z.string().max(80).optional(),
    search: searchInput,
    status: z.enum(attendanceStatuses).optional(),
    page: pageInput,
    pageSize: pageSizeInput,
  })
  .strict();
export const emptyInput = z.object({}).strict();
