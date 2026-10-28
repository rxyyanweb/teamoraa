import type { ClientSession } from 'mongoose';
import { z } from 'zod';
import type { AuthenticatedUser } from '../../types/auth.js';
import { Company } from '../organization/company.model.js';
import { getLeavePolicy } from '../organization/leave-policy.service.js';
import { Attendance } from '../attendance/attendance.model.js';
import { scopedEmployee } from '../attendance/attendance.service.js';
import { writeAudit } from '../audit/audit.service.js';
import { createNotification } from '../notifications/notification.service.js';
import { allowRoles, inTransaction, lockEmployee } from '../../utils/workforce-transaction.js';
import { localDate, employmentDate, workingDates } from '../../utils/company-date.js';
import { ApiError } from '../../utils/api-error.js';
import { leaveBalances } from './leave-balance.service.js';
import { Leave, type LeaveDocument } from './leave.model.js';
import { applyLeaveInput, leaveRangeInput } from './leave.validation.js';

export const leaveSnapshot = (request: LeaveDocument) => ({
  employeeId: request.employeeId.toString(),
  type: request.type,
  startDate: request.startDate,
  endDate: request.endDate,
  workingDates: [...request.workingDates],
  status: request.status,
  reason: request.reason,
  decisionComment: request.decisionComment,
  reviewedBy: request.reviewedBy?.toString() ?? null,
  reviewedAt: request.reviewedAt,
  cancelledAt: request.cancelledAt,
});

async function checkAvailable(
  companyId: string,
  employeeId: string,
  type: string,
  dates: string[],
  session?: ClientSession,
) {
  const years = [...new Set(dates.map((date) => Number(date.slice(0, 4))))];
  const allocations = [];
  for (const year of years) {
    const balance = (await leaveBalances(companyId, employeeId, year, session)).find(
      (item) => item.code === type,
    );
    if (!balance)
      throw new ApiError(422, 'UNKNOWN_LEAVE_TYPE', 'This leave type is no longer configured.');
    const requested = dates.filter((date) => date.startsWith(String(year))).length;
    if (balance.available !== null && requested > balance.available)
      throw new ApiError(
        422,
        'INSUFFICIENT_BALANCE',
        `Only ${balance.available} ${balance.name.toLowerCase()} days remain in ${year}; this request needs ${requested}. Pending requests do not reserve quota.`,
      );
    allocations.push({ year, requested, available: balance.available, used: balance.used });
  }
  return allocations;
}
async function leavePlan(
  actor: AuthenticatedUser,
  input: z.infer<typeof leaveRangeInput>,
  joinedAt: Date,
  now: Date,
  session?: ClientSession,
) {
  const company = await Company.findById(actor.companyId).session(session ?? null);
  if (!company) throw new ApiError(404, 'NOT_FOUND', 'Company not found.');
  const today = localDate(now, company.timezone);
  if (input.startDate < today)
    throw new ApiError(422, 'PAST_LEAVE', 'New leave requests must start today or later.');
  if (input.startDate < employmentDate(joinedAt))
    throw new ApiError(422, 'NOT_YET_JOINED', 'Leave must start on or after your joining date.');
  const policy = await getLeavePolicy(actor.companyId, session);
  const type = policy.types.find((type) => type.code === input.type && type.active);
  if (!type) throw new ApiError(422, 'UNKNOWN_LEAVE_TYPE', 'Choose an active leave type.');
  const dates = workingDates(input.startDate, input.endDate, company.weekend, policy.holidays);
  if (!dates.length)
    throw new ApiError(
      422,
      'NO_WORKING_DAYS',
      'This range contains only weekends or public holidays. Choose at least one working day.',
    );
  if (
    await Leave.exists({
      companyId: actor.companyId,
      employeeId: actor.id,
      status: { $in: ['pending', 'approved'] },
      startDate: { $lte: input.endDate },
      endDate: { $gte: input.startDate },
    }).session(session ?? null)
  )
    throw new ApiError(
      422,
      'LEAVE_OVERLAP',
      'These dates overlap an existing pending or approved request.',
    );
  if (
    await Attendance.exists({
      companyId: actor.companyId,
      employeeId: actor.id,
      date: { $in: dates },
    }).session(session ?? null)
  )
    throw new ApiError(
      422,
      'ATTENDANCE_CONFLICT',
      'Attendance already exists for a requested working day.',
    );
  const allocations = await checkAvailable(actor.companyId, actor.id, input.type, dates, session);
  return {
    type,
    workingDates: dates,
    workingDays: dates.length,
    timezone: company.timezone,
    allocations,
    today,
  };
}
export async function previewLeave(
  actor: AuthenticatedUser,
  input: z.infer<typeof leaveRangeInput>,
  now = new Date(),
) {
  allowRoles(actor, 'hr', 'employee');
  const employee = await scopedEmployee(actor);
  return leavePlan(actor, input, employee.joinedAt, now);
}
export async function applyLeave(
  actor: AuthenticatedUser,
  input: z.infer<typeof applyLeaveInput>,
  now = new Date(),
) {
  allowRoles(actor, 'hr', 'employee');
  return inTransaction(async (session) => {
    const employee = await lockEmployee(actor.companyId, actor.id, session);
    const plan = await leavePlan(actor, input, employee.joinedAt, now, session);
    const [request] = await Leave.create(
      [
        {
          companyId: actor.companyId,
          employeeId: actor.id,
          ...input,
          typeName: plan.type.name,
          workingDates: plan.workingDates,
          timezone: plan.timezone,
        },
      ],
      { session },
    );
    await writeAudit(
      actor,
      'leave.requested',
      'leave',
      request!.id,
      null,
      leaveSnapshot(request!),
      session,
    );
    return { id: request!.id, status: request!.status, workingDays: request!.workingDates.length };
  });
}
export async function decideLeave(
  actor: AuthenticatedUser,
  id: string,
  decision: 'approved' | 'rejected',
  comment: string,
  now = new Date(),
) {
  allowRoles(actor, 'hr');
  const candidate = await Leave.findOne({ _id: id, companyId: actor.companyId });
  if (!candidate) throw new ApiError(404, 'NOT_FOUND', 'Leave request not found.');
  if (candidate.employeeId.toString() === actor.id)
    throw new ApiError(403, 'SELF_APPROVAL', 'Another HR team member must review your own leave.');
  const result = await inTransaction(async (session) => {
    const employee = await lockEmployee(
      actor.companyId,
      candidate.employeeId.toString(),
      session,
      false,
    );
    const request = await Leave.findOne({ _id: id, companyId: actor.companyId }).session(session);
    if (!request || request.status !== 'pending')
      throw new ApiError(
        409,
        'ALREADY_DECIDED',
        'This request has already been processed. Refresh the inbox.',
      );
    const before = leaveSnapshot(request);
    if (decision === 'approved') {
      if (!employee.active)
        throw new ApiError(
          409,
          'ACCOUNT_INACTIVE',
          'An inactive employee cannot receive a new leave approval.',
        );
      await checkAvailable(
        actor.companyId,
        employee.id,
        request.type,
        request.workingDates,
        session,
      );
      if (
        await Leave.exists({
          _id: { $ne: request._id },
          companyId: actor.companyId,
          employeeId: employee._id,
          status: 'approved',
          startDate: { $lte: request.endDate },
          endDate: { $gte: request.startDate },
        }).session(session)
      )
        throw new ApiError(422, 'LEAVE_OVERLAP', 'Another approved request overlaps these dates.');
      if (
        await Attendance.exists({
          companyId: actor.companyId,
          employeeId: employee._id,
          date: { $in: request.workingDates },
        }).session(session)
      )
        throw new ApiError(
          409,
          'ATTENDANCE_CONFLICT',
          'Attendance now exists on a requested day. Reject the request and ask for corrected dates.',
        );
    }
    request.set({
      status: decision,
      decisionComment: comment,
      reviewedBy: actor.id,
      reviewedAt: now,
    });
    await request.save({ session });
    await writeAudit(
      actor,
      `leave.${decision}`,
      'leave',
      request.id,
      before,
      leaveSnapshot(request),
      session,
    );
    void createNotification(
      actor.companyId,
      candidate.employeeId.toString(),
      `Leave Request ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
      decision === 'approved'
        ? `Your ${candidate.typeName} request (${candidate.startDate} to ${candidate.endDate}) has been approved.`
        : `Your ${candidate.typeName} request (${candidate.startDate} to ${candidate.endDate}) was rejected: ${comment || 'No comment provided.'}`,
      decision === 'approved' ? 'leave_approved' : 'leave_rejected',
      '/employee/leave',
    );
    return { id: request.id, status: request.status };
  });
  return result;
}
export async function cancelLeave(actor: AuthenticatedUser, id: string, now = new Date()) {
  allowRoles(actor, 'hr', 'employee');
  return inTransaction(async (session) => {
    await lockEmployee(actor.companyId, actor.id, session);
    const request = await Leave.findOne({
      _id: id,
      companyId: actor.companyId,
      employeeId: actor.id,
    }).session(session);
    if (!request) throw new ApiError(404, 'NOT_FOUND', 'Leave request not found.');
    if (request.status !== 'pending' && request.status !== 'approved')
      throw new ApiError(
        409,
        'CANNOT_CANCEL',
        'Only pending or eligible approved leave can be cancelled.',
      );
    if (request.status === 'approved' && localDate(now, request.timezone) >= request.startDate)
      throw new ApiError(
        422,
        'LEAVE_STARTED',
        'Approved leave can only be cancelled before its first calendar day.',
      );
    const before = leaveSnapshot(request);
    request.status = 'cancelled';
    request.cancelledAt = now;
    await request.save({ session });
    await writeAudit(
      actor,
      'leave.cancelled',
      'leave',
      request.id,
      before,
      leaveSnapshot(request),
      session,
    );
    return { id: request.id, status: request.status };
  });
}
