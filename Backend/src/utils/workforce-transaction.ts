import mongoose, { type ClientSession } from 'mongoose';
import { User } from '../modules/users/user.model.js';
import { ApiError } from './api-error.js';
import type { AuthenticatedUser, Role } from '../types/auth.js';

export function allowRoles(actor: AuthenticatedUser, ...roles: Role[]) {
  if (!roles.includes(actor.role))
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
}
export async function inTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    return (await session.withTransaction(() => work(session)))!;
  } finally {
    await session.endSession();
  }
}
export async function lockEmployee(
  companyId: string,
  employeeId: string,
  session: ClientSession,
  requireActive = true,
) {
  // All attendance/leave writes for one employee touch this document first.
  // MongoDB retries write conflicts with a fresh snapshot, preventing overlapping
  // applications, double decisions and concurrent approvals exceeding annual quota.
  const employee = await User.findOneAndUpdate(
    {
      _id: employeeId,
      companyId,
      role: { $in: ['hr', 'employee'] },
      ...(requireActive ? { active: true } : {}),
    },
    { $inc: { workforceRevision: 1 } },
    { new: true, session },
  );
  if (!employee)
    throw new ApiError(404, 'NOT_FOUND', 'An eligible employee account was not found.');
  return employee;
}
