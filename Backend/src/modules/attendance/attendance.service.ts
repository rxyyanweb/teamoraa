import type { AuthenticatedUser } from '../../types/auth.js';
import { Company } from '../organization/company.model.js';
import { getLeavePolicy } from '../organization/leave-policy.service.js';
import { User } from '../users/user.model.js';
import { Leave } from '../leave/leave.model.js';
import { Attendance } from './attendance.model.js';
import {
  attendanceRules,
  calculateAttendance,
  missingAfter,
  attendanceView,
  attendanceSnapshot,
} from './attendance.rules.js';
import { localDate, employmentDate } from '../../utils/company-date.js';
import { allowRoles, inTransaction, lockEmployee } from '../../utils/workforce-transaction.js';
import { ApiError } from '../../utils/api-error.js';
import { writeAudit } from '../audit/audit.service.js';

export async function scopedEmployee(actor: AuthenticatedUser, employeeId?: string) {
  if (employeeId) allowRoles(actor, 'admin', 'hr');
  else allowRoles(actor, 'hr', 'employee');
  const employee = await User.findOne({
    _id: employeeId ?? actor.id,
    companyId: actor.companyId,
    role: { $in: ['hr', 'employee'] },
  });
  if (!employee) throw new ApiError(404, 'NOT_FOUND', 'Employee not found.');
  return employee;
}
export async function checkIn(actor: AuthenticatedUser, now = new Date()) {
  allowRoles(actor, 'employee', 'hr');
  return inTransaction(async (session) => {
    const employee = await lockEmployee(actor.companyId, actor.id, session);
    const company = await Company.findById(actor.companyId).session(session);
    if (!company) throw new ApiError(404, 'NOT_FOUND', 'Company not found.');
    const date = localDate(now, company.timezone);
    if (date < employmentDate(employee.joinedAt))
      throw new ApiError(422, 'NOT_YET_JOINED', 'You can check in from your joining date.');
    if (
      await Attendance.exists({ companyId: actor.companyId, employeeId: actor.id, date }).session(
        session,
      )
    )
      throw new ApiError(
        409,
        'ALREADY_CHECKED_IN',
        'You have already checked in for this company date.',
      );
    if (
      await Attendance.exists({
        companyId: actor.companyId,
        employeeId: actor.id,
        checkedOutAt: null,
        checkedInAt: { $gt: new Date(now.getTime() - 24 * 60 * 60_000) },
      }).session(session)
    )
      throw new ApiError(
        409,
        'SHIFT_OPEN',
        'Check out of your existing shift before starting another.',
      );
    if (
      await Leave.exists({
        companyId: actor.companyId,
        employeeId: actor.id,
        status: 'approved',
        workingDates: date,
      }).session(session)
    )
      throw new ApiError(
        409,
        'ON_APPROVED_LEAVE',
        'You have approved leave today. Ask HR to resolve the leave before recording attendance.',
      );
    const policy = await getLeavePolicy(actor.companyId, session);
    const rules = attendanceRules(company, date, policy.holidays);
    const [record] = await Attendance.create(
      [
        {
          companyId: actor.companyId,
          employeeId: actor.id,
          date,
          checkedInAt: now,
          rules,
          missingAfter: missingAfter(date, rules),
          ...calculateAttendance(date, now, null, rules),
        },
      ],
      { session },
    );
    await writeAudit(
      actor,
      'attendance.checked_in',
      'attendance',
      record!.id,
      null,
      attendanceSnapshot(record!),
      session,
    );
    return { attendance: attendanceView(record!, now) };
  });
}
export async function checkOut(actor: AuthenticatedUser, now = new Date()) {
  allowRoles(actor, 'employee', 'hr');
  return inTransaction(async (session) => {
    await lockEmployee(actor.companyId, actor.id, session);
    const record = await Attendance.findOne({ companyId: actor.companyId, employeeId: actor.id })
      .sort({ checkedInAt: -1 })
      .session(session);
    if (!record) throw new ApiError(409, 'NOT_CHECKED_IN', 'Check in before checking out.');
    if (record.checkedOutAt)
      throw new ApiError(409, 'ALREADY_CHECKED_OUT', 'This shift has already been checked out.');
    if (now.getTime() - record.checkedInAt.getTime() > 24 * 60 * 60_000)
      throw new ApiError(
        422,
        'SHIFT_EXPIRED',
        'This shift is over 24 hours old. Request an attendance correction.',
      );
    const before = attendanceSnapshot(record);
    record.set({
      checkedOutAt: now,
      ...calculateAttendance(record.date, record.checkedInAt, now, record.rules),
      revision: record.revision + 1,
    });
    await record.save({ session });
    await writeAudit(
      actor,
      'attendance.checked_out',
      'attendance',
      record.id,
      before,
      attendanceSnapshot(record),
      session,
    );
    return { attendance: attendanceView(record, now) };
  });
}
