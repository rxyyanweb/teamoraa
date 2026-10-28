import type { ClientSession } from 'mongoose';
import { z } from 'zod';
import { LeavePolicy, defaultLeaveTypes, type LeavePolicyValues } from './leave-policy.model.js';
import type { AuthenticatedUser } from '../../types/auth.js';
import { allowRoles, inTransaction } from '../../utils/workforce-transaction.js';
import { dateInput } from '../../utils/workforce-validation.js';
import { ApiError } from '../../utils/api-error.js';
import { writeAudit } from '../audit/audit.service.js';

export const leavePolicyInput = z
  .object({
    types: z
      .array(
        z
          .object({
            code: z.string().regex(/^[a-z][a-z0-9_]{1,30}$/),
            name: z.string().trim().min(2).max(60),
            annualQuota: z.number().int().min(0).max(366).nullable(),
            active: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    holidays: z
      .array(z.object({ date: dateInput, name: z.string().trim().min(2).max(100) }).strict())
      .max(200),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (new Set(input.types.map((type) => type.code)).size !== input.types.length)
      ctx.addIssue({
        code: 'custom',
        path: ['types'],
        message: 'Leave type codes must be unique.',
      });
    if (new Set(input.holidays.map((day) => day.date)).size !== input.holidays.length)
      ctx.addIssue({
        code: 'custom',
        path: ['holidays'],
        message: 'Each public holiday date must be unique.',
      });
    if (!input.types.some((type) => type.active))
      ctx.addIssue({
        code: 'custom',
        path: ['types'],
        message: 'Keep at least one leave type active.',
      });
  });
export async function getLeavePolicy(
  companyId: string,
  session?: ClientSession,
): Promise<LeavePolicyValues> {
  const policy = await LeavePolicy.findOne({ companyId })
    .session(session ?? null)
    .lean();
  return policy
    ? {
        types: policy.types.map((type) => ({
          code: type.code,
          name: type.name,
          annualQuota: type.annualQuota ?? null,
          active: type.active,
        })),
        holidays: policy.holidays,
      }
    : { types: defaultLeaveTypes.map((type) => ({ ...type })), holidays: [] };
}
export async function updateLeavePolicy(
  actor: AuthenticatedUser,
  input: z.infer<typeof leavePolicyInput>,
) {
  allowRoles(actor, 'admin');
  return inTransaction(async (session) => {
    const before = await getLeavePolicy(actor.companyId, session);
    if (before.types.some((type) => !input.types.some((next) => next.code === type.code)))
      throw new ApiError(
        422,
        'RETAIN_LEAVE_TYPES',
        'Deactivate existing leave types instead of removing their codes, so history stays readable.',
      );
    const policy = await LeavePolicy.findOneAndUpdate(
      { companyId: actor.companyId },
      { $set: input },
      { upsert: true, new: true, runValidators: true, session },
    );
    await writeAudit(
      actor,
      'leave_policy.updated',
      'leave_policy',
      policy.id,
      before,
      input,
      session,
    );
    return { policy: { types: policy.types, holidays: policy.holidays } };
  });
}
