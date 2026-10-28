import { Types, type PipelineStage } from 'mongoose';
import { z } from 'zod';
import type { AuthenticatedUser } from '../../types/auth.js';
import { ApiError } from '../../utils/api-error.js';
import { literalSearch } from '../../utils/workforce-validation.js';
import { User } from '../users/user.model.js';
import type { AttendanceRules } from '../attendance/attendance.model.js';
import { calculateAttendance } from '../attendance/attendance.rules.js';
import { Correction } from './correction.model.js';
import { correctionListInput } from './correction.validation.js';

interface CorrectionReadRecord {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  date: string;
  reason: string;
  status: string;
  rules: AttendanceRules;
  originalCheckIn: Date | null;
  originalCheckOut: Date | null;
  requestedCheckIn: Date;
  requestedCheckOut: Date;
  decisionComment: string;
  reviewedAt: Date | null;
  createdAt: Date;
  employee: { _id: Types.ObjectId; name: string; department: string; employeeCode: string };
  reviewer?: { name: string };
}
function correctionView(record: CorrectionReadRecord, actor: AuthenticatedUser) {
  return {
    id: record._id.toString(),
    date: record.date,
    reason: record.reason,
    status: record.status,
    timezone: record.rules.timezone,
    employee: {
      id: record.employeeId.toString(),
      name: record.employee.name,
      department: record.employee.department,
      employeeCode: record.employee.employeeCode,
    },
    original: { checkedInAt: record.originalCheckIn, checkedOutAt: record.originalCheckOut },
    requested: {
      checkedInAt: record.requestedCheckIn,
      checkedOutAt: record.requestedCheckOut,
      ...calculateAttendance(
        record.date,
        record.requestedCheckIn,
        record.requestedCheckOut,
        record.rules,
      ),
    },
    decisionComment: record.decisionComment,
    reviewedAt: record.reviewedAt,
    reviewer: record.reviewer?.name ?? null,
    createdAt: record.createdAt,
    canDecide:
      actor.role === 'hr' &&
      actor.id !== record.employeeId.toString() &&
      record.status === 'pending',
  };
}
const people: PipelineStage[] = [
  {
    $lookup: {
      from: User.collection.name,
      localField: 'employeeId',
      foreignField: '_id',
      pipeline: [{ $project: { name: 1, department: 1, employeeCode: 1 } }],
      as: 'people',
    },
  },
  {
    $lookup: {
      from: User.collection.name,
      localField: 'reviewedBy',
      foreignField: '_id',
      pipeline: [{ $project: { name: 1 } }],
      as: 'reviewers',
    },
  },
  { $set: { employee: { $first: '$people' }, reviewer: { $first: '$reviewers' } } },
  { $unset: ['people', 'reviewers'] },
];
export async function listCorrections(
  actor: AuthenticatedUser,
  query: z.infer<typeof correctionListInput>,
) {
  if (actor.role === 'employee' && query.employeeId && query.employeeId !== actor.id)
    throw new ApiError(403, 'FORBIDDEN', 'You can only access your own corrections.');
  const employeeId = actor.role === 'employee' ? actor.id : query.employeeId;
  const search = literalSearch(query.search);
  const base: PipelineStage[] = [
    {
      $match: {
        companyId: new Types.ObjectId(actor.companyId),
        ...(employeeId ? { employeeId: new Types.ObjectId(employeeId) } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
    },
    ...people,
    {
      $match: {
        ...(query.department
          ? { 'employee.department': query.department === '__unassigned__' ? '' : query.department }
          : {}),
        ...(search ? { 'employee.name': { $regex: search, $options: 'i' } } : {}),
      },
    },
  ];
  const [result] = await Correction.aggregate<{
    items: CorrectionReadRecord[];
    total: { count: number }[];
  }>([
    ...base,
    {
      $facet: {
        items: [
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: (query.page - 1) * query.pageSize },
          { $limit: query.pageSize },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ]);
  return {
    items: (result?.items ?? []).map((record) => correctionView(record, actor)),
    total: result?.total[0]?.count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  };
}
export async function correctionDetails(actor: AuthenticatedUser, id: string) {
  const [record] = await Correction.aggregate<CorrectionReadRecord>([
    {
      $match: {
        _id: new Types.ObjectId(id),
        companyId: new Types.ObjectId(actor.companyId),
        ...(actor.role === 'employee' ? { employeeId: new Types.ObjectId(actor.id) } : {}),
      },
    },
    ...people,
  ]);
  if (!record) throw new ApiError(404, 'NOT_FOUND', 'Correction request not found.');
  return { request: correctionView(record, actor) };
}
