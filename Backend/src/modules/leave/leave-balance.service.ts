import { Types, type ClientSession } from 'mongoose';
import { Leave } from './leave.model.js';
import { getLeavePolicy } from '../organization/leave-policy.service.js';
import type { LeaveType } from '../organization/leave-policy.model.js';

export async function leaveBalances(
  companyId: string,
  employeeId: string,
  year: number,
  session?: ClientSession,
  configuredTypes?: LeaveType[],
) {
  const types = configuredTypes ?? (await getLeavePolicy(companyId, session)).types;
  const counts = await Leave.aggregate<{ _id: { type: string; status: string }; days: number }>([
    {
      $match: {
        companyId: new Types.ObjectId(companyId),
        employeeId: new Types.ObjectId(employeeId),
        status: { $in: ['approved', 'pending'] },
      },
    },
    { $unwind: '$workingDates' },
    { $match: { workingDates: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } } },
    { $group: { _id: { type: '$type', status: '$status' }, days: { $sum: 1 } } },
  ]).session(session ?? null);
  return types.map((type) => {
    const used =
      counts.find((count) => count._id.type === type.code && count._id.status === 'approved')
        ?.days ?? 0;
    const pending =
      counts.find((count) => count._id.type === type.code && count._id.status === 'pending')
        ?.days ?? 0;
    return {
      ...type,
      year,
      used,
      pending,
      available: type.annualQuota === null ? null : Math.max(0, type.annualQuota - used),
    };
  });
}
