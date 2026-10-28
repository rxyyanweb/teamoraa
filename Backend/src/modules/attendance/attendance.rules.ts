import { DateTime } from 'luxon';
import type { AttendanceRules } from './attendance.model.js';
import { localInstant, weekday } from '../../utils/company-date.js';
import { ApiError } from '../../utils/api-error.js';

export function attendanceRules(
  company: {
    timezone: string;
    officeStart: string;
    officeEnd: string;
    graceMinutes: number;
    halfDayHours: number;
    weekend: number[];
  },
  date: string,
  holidays: readonly { date: string }[],
): AttendanceRules {
  return {
    timezone: company.timezone,
    officeStart: company.officeStart,
    officeEnd: company.officeEnd,
    graceMinutes: company.graceMinutes,
    halfDayHours: company.halfDayHours,
    scheduled:
      !company.weekend.includes(weekday(date)) &&
      !holidays.some((holiday) => holiday.date === date),
  };
}
export function scheduledEnd(date: string, rules: AttendanceRules) {
  let end = DateTime.fromISO(`${date}T${rules.officeEnd}`, { zone: rules.timezone });
  if (rules.officeEnd <= rules.officeStart) end = end.plus({ days: 1 });
  return end.toJSDate();
}
export function missingAfter(date: string, rules: AttendanceRules) {
  const nextMidnight = DateTime.fromISO(date, { zone: rules.timezone })
    .plus({ days: 1 })
    .startOf('day')
    .toMillis();
  return new Date(Math.max(nextMidnight, scheduledEnd(date, rules).getTime()));
}
export function calculateAttendance(
  date: string,
  checkedInAt: Date,
  checkedOutAt: Date | null,
  rules: AttendanceRules,
) {
  const cutoff =
    localInstant(date, rules.officeStart, rules.timezone).getTime() + rules.graceMinutes * 60_000;
  const duration = checkedOutAt ? checkedOutAt.getTime() - checkedInAt.getTime() : 0;
  if (checkedOutAt && (duration <= 0 || duration > 24 * 60 * 60_000))
    throw new ApiError(
      422,
      'INVALID_DURATION',
      'A completed shift must last more than zero and at most 24 hours.',
    );
  return {
    workedMinutes: Math.floor(duration / 60_000),
    isLate: rules.scheduled && checkedInAt.getTime() > cutoff,
    isHalfDay: rules.scheduled && !!checkedOutAt && duration < rules.halfDayHours * 60 * 60_000,
  };
}
export interface AttendanceRecord {
  _id: { toString(): string };
  date: string;
  checkedInAt: Date;
  checkedOutAt?: Date | null;
  workedMinutes: number;
  isLate: boolean;
  isHalfDay: boolean;
  missingAfter: Date;
  rules: AttendanceRules;
  source: string;
  corrected: boolean;
  revision: number;
}
export function attendanceView(record: AttendanceRecord, now = new Date()) {
  const missing = !record.checkedOutAt && now >= record.missingAfter;
  return {
    id: record._id.toString(),
    date: record.date,
    checkedInAt: record.checkedInAt,
    checkedOutAt: record.checkedOutAt ?? null,
    workedMinutes: record.workedMinutes,
    isLate: record.isLate,
    isHalfDay: record.isHalfDay,
    status: missing
      ? 'missing_checkout'
      : record.isHalfDay
        ? 'half_day'
        : record.isLate
          ? 'late'
          : 'present',
    shiftState: record.checkedOutAt ? 'completed' : missing ? 'missing_checkout' : 'working',
    timezone: record.rules.timezone,
    scheduled: record.rules.scheduled,
    source: record.source,
    corrected: record.corrected,
    revision: record.revision,
  };
}
export function attendanceSnapshot(record: AttendanceRecord | null) {
  if (!record) return null;
  return {
    date: record.date,
    checkedInAt: record.checkedInAt,
    checkedOutAt: record.checkedOutAt ?? null,
    workedMinutes: record.workedMinutes,
    isLate: record.isLate,
    isHalfDay: record.isHalfDay,
    rules: record.rules,
    revision: record.revision,
  };
}
