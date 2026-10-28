import { DateTime } from 'luxon';
import { ApiError } from './api-error.js';

export const localDate = (now: Date, timezone: string) =>
  DateTime.fromJSDate(now, { zone: timezone }).toISODate()!;
export const employmentDate = (joinedAt: Date) => joinedAt.toISOString().slice(0, 10);
export function dateRange(start: string, end: string, maximum = 366) {
  const first = DateTime.fromISO(start, { zone: 'UTC' });
  const last = DateTime.fromISO(end, { zone: 'UTC' });
  const length = last.diff(first, 'days').days + 1;
  if (
    !first.isValid ||
    !last.isValid ||
    !Number.isInteger(length) ||
    length < 1 ||
    length > maximum
  ) {
    throw new ApiError(
      422,
      'INVALID_DATE_RANGE',
      `Choose an ordered date range of at most ${maximum} calendar days.`,
    );
  }
  return Array.from({ length }, (_, index) => first.plus({ days: index }).toISODate()!);
}
export function monthDates(month: string) {
  const start = DateTime.fromISO(`${month}-01`, { zone: 'UTC' });
  if (!start.isValid) throw new ApiError(400, 'INVALID_MONTH', 'Choose a valid month.');
  return dateRange(start.toISODate()!, start.endOf('month').toISODate()!);
}
export const weekday = (date: string) => DateTime.fromISO(date, { zone: 'UTC' }).weekday % 7;
export const addDays = (date: string, amount: number) =>
  DateTime.fromISO(date, { zone: 'UTC' }).plus({ days: amount }).toISODate()!;
export function localInstant(date: string, time: string, timezone: string) {
  const value = DateTime.fromISO(`${date}T${time}`, { zone: timezone });
  if (
    !value.isValid ||
    value.toFormat('yyyy-MM-dd HH:mm') !== `${date} ${time}` ||
    value.getPossibleOffsets().length > 1
  ) {
    throw new ApiError(
      422,
      'INVALID_LOCAL_TIME',
      'This local time is invalid or ambiguous because of a time-zone change. Choose an unambiguous time.',
    );
  }
  return value.toJSDate();
}
export function workingDates(
  start: string,
  end: string,
  weekend: readonly number[],
  holidays: readonly { date: string }[],
) {
  const dates = new Set(holidays.map((item) => item.date));
  return dateRange(start, end).filter(
    (date) => !weekend.includes(weekday(date)) && !dates.has(date),
  );
}
