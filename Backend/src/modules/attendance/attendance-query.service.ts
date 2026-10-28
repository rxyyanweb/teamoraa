import { Types, type PipelineStage } from 'mongoose';
import { z } from 'zod';
import type { AuthenticatedUser } from '../../types/auth.js';
import { ApiError } from '../../utils/api-error.js';
import {
  localDate,
  monthDates,
  employmentDate,
  weekday,
  addDays,
} from '../../utils/company-date.js';
import { allowRoles } from '../../utils/workforce-transaction.js';
import { literalSearch } from '../../utils/workforce-validation.js';
import { Company } from '../organization/company.model.js';
import { getLeavePolicy } from '../organization/leave-policy.service.js';
import { User } from '../users/user.model.js';
import { Leave } from '../leave/leave.model.js';
import { Attendance } from './attendance.model.js';
import {
  attendanceRules,
  attendanceView,
  scheduledEnd,
  type AttendanceRecord,
} from './attendance.rules.js';
import { scopedEmployee } from './attendance.service.js';
import { boardInput, personalAttendanceInput } from './attendance.validation.js';

function emptyDayStatus(
  date: string,
  today: string,
  company: {
    timezone: string;
    officeStart: string;
    officeEnd: string;
    graceMinutes: number;
    halfDayHours: number;
    weekend: number[];
  },
  holidays: { date: string }[],
  now: Date,
) {
  if (holidays.some((day) => day.date === date)) return 'holiday';
  if (company.weekend.includes(weekday(date))) return 'weekend';
  if (date > today) return 'upcoming';
  return now >= scheduledEnd(date, attendanceRules(company, date, holidays))
    ? 'absent'
    : 'not_checked_in';
}
export async function myAttendance(
  actor: AuthenticatedUser,
  query: z.infer<typeof personalAttendanceInput>,
  employeeId?: string,
  now = new Date(),
) {
  const employee = await scopedEmployee(actor, employeeId);
  const company = await Company.findById(actor.companyId);
  if (!company) throw new ApiError(404, 'NOT_FOUND', 'Company not found.');
  const today = localDate(now, company.timezone);
  const month = query.month ?? today.slice(0, 7);
  const dates = monthDates(month);
  const scope = { companyId: actor.companyId, employeeId: employee._id };
  const [records, approved, policy, todayRecord, openShift] = await Promise.all([
    Attendance.find({ ...scope, date: { $gte: dates[0], $lte: dates.at(-1) } }).sort({ date: -1 }),
    Leave.find({
      ...scope,
      status: 'approved',
      workingDates: { $gte: dates[0], $lte: dates.at(-1) },
    }).select('workingDates typeName'),
    getLeavePolicy(actor.companyId),
    Attendance.findOne({ ...scope, date: today }),
    Attendance.findOne({
      ...scope,
      checkedOutAt: null,
      checkedInAt: { $gt: new Date(now.getTime() - 24 * 60 * 60_000) },
    }).sort({ checkedInAt: -1 }),
  ]);
  const byDate = new Map(records.map((record) => [record.date, attendanceView(record, now)]));
  const leaveDates = new Map(
    approved.flatMap((leave) => leave.workingDates.map((date) => [date, leave.typeName] as const)),
  );
  const calendar = dates.map((date) => ({
    date,
    status:
      byDate.get(date)?.status ??
      (date < employmentDate(employee.joinedAt)
        ? 'not_employed'
        : leaveDates.has(date)
          ? 'on_leave'
          : emptyDayStatus(date, today, company, policy.holidays, now)),
    attendance: byDate.get(date) ?? null,
    leaveType: leaveDates.get(date) ?? null,
  }));
  const summary = {
    workedMinutes: records.reduce((sum, record) => sum + record.workedMinutes, 0),
    late: records.filter((record) => record.isLate).length,
    halfDays: records.filter((record) => record.isHalfDay).length,
    missingCheckouts: calendar.filter((day) => day.status === 'missing_checkout').length,
    absent: calendar.filter((day) => day.status === 'absent').length,
    onLeave: calendar.filter((day) => day.status === 'on_leave').length,
    attendedDays: records.length,
  };
  return {
    month,
    today,
    timezone: company.timezone,
    now: now.toISOString(),
    officeStart: company.officeStart,
    officeEnd: company.officeEnd,
    employee: {
      id: employee.id,
      name: employee.name,
      department: employee.department,
      employeeCode: employee.employeeCode,
    },
    todayAttendance: todayRecord ? attendanceView(todayRecord, now) : null,
    activeShift: openShift ? attendanceView(openShift, now) : null,
    calendar,
    summary,
    items: records
      .slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
      .map((record) => attendanceView(record, now)),
    total: records.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}

interface BoardEntry {
  _id: Types.ObjectId;
  name: string;
  department: string;
  employeeCode: string;
  role: string;
  attendance: AttendanceRecord | null;
  status: string;
  leaveType: string | null;
}
interface BoardFacet {
  items: BoardEntry[];
  total: { count: number }[];
  summary: {
    _id: null;
    headcount: number;
    present: number;
    late: number;
    halfDay: number;
    onLeave: number;
    absent: number;
    missingCheckout: number;
    notCheckedIn: number;
  }[];
}
export async function attendanceBoard(
  actor: AuthenticatedUser,
  query: z.infer<typeof boardInput>,
  now = new Date(),
) {
  allowRoles(actor, 'admin', 'hr');
  const company = await Company.findById(actor.companyId);
  if (!company) throw new ApiError(404, 'NOT_FOUND', 'Company not found.');
  const policy = await getLeavePolicy(actor.companyId);
  const today = localDate(now, company.timezone);
  const date = query.date ?? today;
  const companyId = new Types.ObjectId(actor.companyId);
  const fallbackStatus = emptyDayStatus(date, today, company, policy.holidays, now);
  const search = literalSearch(query.search);
  const countStatus = (status: string) => ({
    $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] },
  });
  const pipeline: PipelineStage[] = [
    {
      $match: {
        companyId,
        role: { $in: ['hr', 'employee'] },
        joinedAt: { $lt: new Date(`${addDays(date, 1)}T00:00:00Z`) },
        ...(query.department
          ? { department: query.department === '__unassigned__' ? '' : query.department }
          : {}),
        ...(search
          ? {
              $or: [
                { name: { $regex: search, $options: 'i' } },
                { employeeCode: { $regex: search, $options: 'i' } },
              ],
            }
          : {}),
      },
    },
    {
      $lookup: {
        from: Attendance.collection.name,
        let: { person: '$_id' },
        pipeline: [{ $match: { companyId, date, $expr: { $eq: ['$employeeId', '$$person'] } } }],
        as: 'attendanceRows',
      },
    },
    {
      $lookup: {
        from: Leave.collection.name,
        let: { person: '$_id' },
        pipeline: [
          {
            $match: {
              companyId,
              status: 'approved',
              workingDates: date,
              $expr: { $eq: ['$employeeId', '$$person'] },
            },
          },
          { $project: { typeName: 1 } },
        ],
        as: 'leaveRows',
      },
    },
    {
      $set: {
        attendance: { $ifNull: [{ $first: '$attendanceRows' }, null] },
        approvedLeave: { $ifNull: [{ $first: '$leaveRows' }, null] },
      },
    },
    {
      $match: {
        $or: [{ active: true }, { attendance: { $ne: null } }, { approvedLeave: { $ne: null } }],
      },
    },
    {
      $set: {
        status: {
          $cond: [
            { $ne: ['$attendance', null] },
            {
              $switch: {
                branches: [
                  {
                    case: {
                      $and: [
                        { $eq: ['$attendance.checkedOutAt', null] },
                        { $lte: ['$attendance.missingAfter', now] },
                      ],
                    },
                    then: 'missing_checkout',
                  },
                  { case: '$attendance.isHalfDay', then: 'half_day' },
                  { case: '$attendance.isLate', then: 'late' },
                ],
                default: 'present',
              },
            },
            { $cond: [{ $ne: ['$approvedLeave', null] }, 'on_leave', fallbackStatus] },
          ],
        },
        leaveType: '$approvedLeave.typeName',
      },
    },
    {
      $facet: {
        items: [
          ...(query.status ? [{ $match: { status: query.status } }] : []),
          { $sort: { name: 1, _id: 1 } },
          { $skip: (query.page - 1) * query.pageSize },
          { $limit: query.pageSize },
          {
            $project: {
              name: 1,
              department: 1,
              employeeCode: 1,
              role: 1,
              attendance: 1,
              status: 1,
              leaveType: 1,
            },
          },
        ],
        total: [
          ...(query.status ? [{ $match: { status: query.status } }] : []),
          { $count: 'count' },
        ],
        summary: [
          {
            $group: {
              _id: null,
              headcount: { $sum: 1 },
              present: { $sum: { $cond: [{ $ne: ['$attendance', null] }, 1, 0] } },
              late: { $sum: { $cond: ['$attendance.isLate', 1, 0] } },
              halfDay: { $sum: { $cond: ['$attendance.isHalfDay', 1, 0] } },
              onLeave: countStatus('on_leave'),
              absent: countStatus('absent'),
              missingCheckout: countStatus('missing_checkout'),
              notCheckedIn: countStatus('not_checked_in'),
            },
          },
        ],
      },
    },
  ];
  const [result] = await User.aggregate<BoardFacet>(pipeline);
  const summary = result?.summary[0];
  return {
    date,
    today,
    timezone: company.timezone,
    now: now.toISOString(),
    departments: company.departments,
    summary: {
      headcount: summary?.headcount ?? 0,
      present: summary?.present ?? 0,
      late: summary?.late ?? 0,
      halfDay: summary?.halfDay ?? 0,
      onLeave: summary?.onLeave ?? 0,
      absent: summary?.absent ?? 0,
      missingCheckout: summary?.missingCheckout ?? 0,
      notCheckedIn: summary?.notCheckedIn ?? 0,
    },
    items: (result?.items ?? []).map((item) => ({
      employee: {
        id: item._id.toString(),
        name: item.name,
        department: item.department,
        employeeCode: item.employeeCode,
        role: item.role,
      },
      attendance: item.attendance ? attendanceView(item.attendance, now) : null,
      status: item.status,
      leaveType: item.leaveType ?? null,
    })),
    total: result?.total[0]?.count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  };
}
