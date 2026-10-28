import { z } from 'zod';
import type { AuthenticatedUser } from '../../types/auth.js';
import { ApiError } from '../../utils/api-error.js';
import { allowRoles, inTransaction, lockEmployee } from '../../utils/workforce-transaction.js';
import { localDate, localInstant, employmentDate, addDays } from '../../utils/company-date.js';
import { Company } from '../organization/company.model.js';
import { getLeavePolicy } from '../organization/leave-policy.service.js';
import { Attendance } from '../attendance/attendance.model.js';
import {
  attendanceRules,
  calculateAttendance,
  attendanceSnapshot,
  missingAfter,
} from '../attendance/attendance.rules.js';
import { Leave } from '../leave/leave.model.js';
import { writeAudit } from '../audit/audit.service.js';
import { Correction, type CorrectionDocument } from './correction.model.js';
import { correctionInput } from './correction.validation.js';

const snapshot = (request: CorrectionDocument) => ({
  employeeId: request.employeeId.toString(),
  date: request.date,
  status: request.status,
  originalCheckIn: request.originalCheckIn,
  originalCheckOut: request.originalCheckOut,
  requestedCheckIn: request.requestedCheckIn,
  requestedCheckOut: request.requestedCheckOut,
  reason: request.reason,
  decisionComment: request.decisionComment,
  reviewedAt: request.reviewedAt,
});

export async function requestCorrection(
  actor: AuthenticatedUser,
  input: z.infer<typeof correctionInput>,
  now = new Date(),
) {
  allowRoles(actor, 'employee');
  return inTransaction(async (session) => {
    const employee = await lockEmployee(actor.companyId, actor.id, session);
    const company = await Company.findById(actor.companyId).session(session);
    if (!company) throw new ApiError(404, 'NOT_FOUND', 'Company not found.');
    const record = await Attendance.findOne({
      companyId: actor.companyId,
      employeeId: actor.id,
      date: input.date,
    }).session(session);
    const policy = await getLeavePolicy(actor.companyId, session);
    const rules = record?.rules ?? attendanceRules(company, input.date, policy.holidays);
    if (
      input.date > localDate(now, rules.timezone) ||
      input.date < employmentDate(employee.joinedAt)
    )
      throw new ApiError(
        422,
        'INVALID_CORRECTION_DATE',
        'Choose an attendance date from your joining date through today.',
      );
    const requestedCheckIn = localInstant(input.date, input.checkInTime, rules.timezone);
    const requestedCheckOut = localInstant(
      input.nextDayCheckout ? addDays(input.date, 1) : input.date,
      input.checkOutTime,
      rules.timezone,
    );
    if (requestedCheckIn > now || requestedCheckOut > now)
      throw new ApiError(422, 'FUTURE_CORRECTION', 'Correction times cannot be in the future.');
    calculateAttendance(input.date, requestedCheckIn, requestedCheckOut, rules);
    if (
      await Leave.exists({
        companyId: actor.companyId,
        employeeId: actor.id,
        status: 'approved',
        workingDates: input.date,
      }).session(session)
    )
      throw new ApiError(
        409,
        'LEAVE_CONFLICT',
        'Approved leave exists on this date. Ask HR to resolve the leave first.',
      );
    if (
      await Correction.exists({
        companyId: actor.companyId,
        employeeId: actor.id,
        date: input.date,
        status: 'pending',
      }).session(session)
    )
      throw new ApiError(
        409,
        'CORRECTION_PENDING',
        'A correction for this date is already awaiting review.',
      );
    const [request] = await Correction.create(
      [
        {
          companyId: actor.companyId,
          employeeId: actor.id,
          date: input.date,
          reason: input.reason,
          originalAttendanceId: record?._id ?? null,
          originalRevision: record?.revision ?? null,
          originalCheckIn: record?.checkedInAt ?? null,
          originalCheckOut: record?.checkedOutAt ?? null,
          requestedCheckIn,
          requestedCheckOut,
          rules,
        },
      ],
      { session },
    );
    await writeAudit(
      actor,
      'attendance_correction.requested',
      'attendance_correction',
      request!.id,
      null,
      snapshot(request!),
      session,
    );
    return { id: request!.id, status: request!.status };
  });
}
export async function decideCorrection(
  actor: AuthenticatedUser,
  id: string,
  decision: 'approved' | 'rejected',
  comment: string,
  now = new Date(),
) {
  allowRoles(actor, 'hr');
  const candidate = await Correction.findOne({ _id: id, companyId: actor.companyId });
  if (!candidate) throw new ApiError(404, 'NOT_FOUND', 'Correction request not found.');
  if (candidate.employeeId.toString() === actor.id)
    throw new ApiError(403, 'SELF_APPROVAL', 'You cannot review your own attendance correction.');
  return inTransaction(async (session) => {
    await lockEmployee(actor.companyId, candidate.employeeId.toString(), session, false);
    const request = await Correction.findOne({ _id: id, companyId: actor.companyId }).session(
      session,
    );
    if (!request || request.status !== 'pending')
      throw new ApiError(
        409,
        'ALREADY_DECIDED',
        'This correction has already been processed. Refresh the inbox.',
      );
    const before = snapshot(request);
    if (decision === 'approved') {
      const record = await Attendance.findOne({
        companyId: actor.companyId,
        employeeId: request.employeeId,
        date: request.date,
      }).session(session);
      if (
        (request.originalAttendanceId &&
          (!record ||
            record.id !== request.originalAttendanceId.toString() ||
            record.revision !== request.originalRevision)) ||
        (!request.originalAttendanceId && record)
      ) {
        throw new ApiError(
          409,
          'CORRECTION_STALE',
          'Attendance changed after this request was submitted. Reject it and ask the employee for a fresh correction.',
        );
      }
      if (request.requestedCheckIn > now || request.requestedCheckOut > now)
        throw new ApiError(422, 'FUTURE_CORRECTION', 'The requested times are in the future.');
      if (
        await Leave.exists({
          companyId: actor.companyId,
          employeeId: request.employeeId,
          status: 'approved',
          workingDates: request.date,
        }).session(session)
      )
        throw new ApiError(
          409,
          'LEAVE_CONFLICT',
          'Approved leave now exists on this date. The correction cannot be applied.',
        );
      const calculated = calculateAttendance(
        request.date,
        request.requestedCheckIn,
        request.requestedCheckOut,
        request.rules,
      );
      const prior = attendanceSnapshot(record);
      let updated;
      if (record) {
        record.set({
          checkedInAt: request.requestedCheckIn,
          checkedOutAt: request.requestedCheckOut,
          ...calculated,
          corrected: true,
          revision: record.revision + 1,
        });
        updated = await record.save({ session });
      } else {
        [updated] = await Attendance.create(
          [
            {
              companyId: actor.companyId,
              employeeId: request.employeeId,
              date: request.date,
              checkedInAt: request.requestedCheckIn,
              checkedOutAt: request.requestedCheckOut,
              ...calculated,
              rules: request.rules,
              missingAfter: missingAfter(request.date, request.rules),
              source: 'correction',
              corrected: true,
              revision: 1,
            },
          ],
          { session },
        );
      }
      await writeAudit(
        actor,
        'attendance.corrected',
        'attendance',
        updated!.id,
        prior,
        attendanceSnapshot(updated!),
        session,
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
      `attendance_correction.${decision}`,
      'attendance_correction',
      request.id,
      before,
      snapshot(request),
      session,
    );
    return { id: request.id, status: request.status };
  });
}
