import { Types, type PipelineStage } from 'mongoose';
import { z } from 'zod';
import type { AuthenticatedUser } from '../../types/auth.js';
import { allowRoles } from '../../utils/workforce-transaction.js';
import { localDate } from '../../utils/company-date.js';
import { literalSearch } from '../../utils/workforce-validation.js';
import { ApiError } from '../../utils/api-error.js';
import { Company } from '../organization/company.model.js';
import { getLeavePolicy } from '../organization/leave-policy.service.js';
import { User } from '../users/user.model.js';
import { Leave } from './leave.model.js';
import { leaveBalances } from './leave-balance.service.js';
import { myLeaveInput, leaveOverviewInput } from './leave.validation.js';

export interface LeaveReadRecord {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  type: string;
  typeName: string;
  startDate: string;
  endDate: string;
  workingDates: string[];
  timezone: string;
  reason: string;
  status: string;
  decisionComment: string;
  reviewedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  employee?: { _id: Types.ObjectId; name: string; department: string; employeeCode: string };
  reviewer?: { name: string };
}
export function leaveView(request: LeaveReadRecord, actor: AuthenticatedUser, now = new Date()) {
  return {
    id: request._id.toString(),
    employeeId: request.employeeId.toString(),
    employee: request.employee
      ? {
          id: request.employee._id.toString(),
          name: request.employee.name,
          department: request.employee.department,
          employeeCode: request.employee.employeeCode,
        }
      : null,
    type: request.type,
    typeName: request.typeName,
    startDate: request.startDate,
    endDate: request.endDate,
    workingDates: request.workingDates,
    workingDays: request.workingDates.length,
    status: request.status,
    reason: request.reason,
    decisionComment: request.decisionComment,
    reviewedAt: request.reviewedAt,
    reviewer: request.reviewer?.name ?? null,
    cancelledAt: request.cancelledAt,
    createdAt: request.createdAt,
    canDecide:
      actor.role === 'hr' &&
      actor.id !== request.employeeId.toString() &&
      request.status === 'pending',
    canCancel:
      actor.id === request.employeeId.toString() &&
      (request.status === 'pending' ||
        (request.status === 'approved' && localDate(now, request.timezone) < request.startDate)),
  };
}
export const leavePeopleLookups: PipelineStage[] = [
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
export async function leaveDetails(actor: AuthenticatedUser, id: string, now = new Date()) {
  const [request] = await Leave.aggregate<LeaveReadRecord>([
    {
      $match: {
        _id: new Types.ObjectId(id),
        companyId: new Types.ObjectId(actor.companyId),
        ...(actor.role === 'employee' ? { employeeId: new Types.ObjectId(actor.id) } : {}),
      },
    },
    ...leavePeopleLookups,
  ]);
  if (!request) throw new ApiError(404, 'NOT_FOUND', 'Leave request not found.');
  const years = [...new Set(request.workingDates.map((date) => Number(date.slice(0, 4))))];
  const availability = await Promise.all(
    years.map(async (year) =>
      (await leaveBalances(actor.companyId, request.employeeId.toString(), year)).find(
        (balance) => balance.code === request.type,
      ),
    ),
  );
  return { request: leaveView(request, actor, now), availability };
}
export async function myLeave(
  actor: AuthenticatedUser,
  query: z.infer<typeof myLeaveInput>,
  now = new Date(),
) {
  allowRoles(actor, 'hr', 'employee');
  const company = await Company.findById(actor.companyId);
  if (!company) throw new ApiError(404, 'NOT_FOUND', 'Company not found.');
  const today = localDate(now, company.timezone);
  const month = query.month ?? today.slice(0, 7);
  const year = Number(month.slice(0, 4));
  const base = {
    companyId: new Types.ObjectId(actor.companyId),
    employeeId: new Types.ObjectId(actor.id),
    startDate: { $lte: `${year}-12-31` },
    endDate: { $gte: `${year}-01-01` },
  };
  const filter = { ...base, ...(query.status ? { status: query.status } : {}) };
  const [records, total, calendarRequests, balances, policy] = await Promise.all([
    Leave.aggregate<LeaveReadRecord>([
      { $match: filter },
      { $sort: { createdAt: -1, _id: -1 } },
      { $skip: (query.page - 1) * query.pageSize },
      { $limit: query.pageSize },
      ...leavePeopleLookups,
    ]),
    Leave.countDocuments(filter),
    Leave.find({ ...base, status: { $in: ['pending', 'approved'] } }).select(
      'workingDates typeName status',
    ),
    leaveBalances(actor.companyId, actor.id, year),
    getLeavePolicy(actor.companyId),
  ]);
  return {
    month,
    year,
    today,
    timezone: company.timezone,
    balances,
    types: policy.types.filter((type) => type.active),
    calendar: calendarRequests.flatMap((request) =>
      request.workingDates
        .filter((date) => date.startsWith(month))
        .map((date) => ({
          date,
          requestId: request.id,
          typeName: request.typeName,
          status: request.status,
        })),
    ),
    items: records.map((record) => leaveView(record, actor, now)),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}
interface LeaveFacet {
  items: LeaveReadRecord[];
  total: { count: number }[];
  summary: {
    _id: null;
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    approvedDays: number;
  }[];
  departments: { _id: string; approvedDays: number; pending: number }[];
}
export async function leaveOverview(
  actor: AuthenticatedUser,
  query: z.infer<typeof leaveOverviewInput>,
  now = new Date(),
) {
  allowRoles(actor, 'admin', 'hr');
  const company = await Company.findById(actor.companyId);
  if (!company) throw new ApiError(404, 'NOT_FOUND', 'Company not found.');
  const year = query.year ?? Number(localDate(now, company.timezone).slice(0, 4));
  const search = literalSearch(query.search);
  const count = (status: string) => ({ $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] } });
  const [result] = await Leave.aggregate<LeaveFacet>([
    {
      $match: {
        companyId: new Types.ObjectId(actor.companyId),
        startDate: { $lte: `${year}-12-31` },
        endDate: { $gte: `${year}-01-01` },
      },
    },
    ...leavePeopleLookups,
    {
      $match: {
        ...(query.department
          ? { 'employee.department': query.department === '__unassigned__' ? '' : query.department }
          : {}),
        ...(search
          ? {
              $or: [
                { 'employee.name': { $regex: search, $options: 'i' } },
                { 'employee.employeeCode': { $regex: search, $options: 'i' } },
              ],
            }
          : {}),
      },
    },
    {
      $set: {
        daysInYear: {
          $size: {
            $filter: {
              input: '$workingDates',
              as: 'date',
              cond: {
                $and: [
                  { $gte: ['$$date', `${year}-01-01`] },
                  { $lte: ['$$date', `${year}-12-31`] },
                ],
              },
            },
          },
        },
      },
    },
    {
      $facet: {
        items: [
          ...(query.status ? [{ $match: { status: query.status } }] : []),
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: (query.page - 1) * query.pageSize },
          { $limit: query.pageSize },
        ],
        total: [
          ...(query.status ? [{ $match: { status: query.status } }] : []),
          { $count: 'count' },
        ],
        summary: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              pending: count('pending'),
              approved: count('approved'),
              rejected: count('rejected'),
              cancelled: count('cancelled'),
              approvedDays: {
                $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$daysInYear', 0] },
              },
            },
          },
        ],
        departments: [
          {
            $group: {
              _id: '$employee.department',
              approvedDays: {
                $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$daysInYear', 0] },
              },
              pending: count('pending'),
            },
          },
          { $sort: { approvedDays: -1, _id: 1 } },
        ],
      },
    },
  ]);
  const summary = result?.summary[0];
  return {
    year,
    timezone: company.timezone,
    departments: company.departments,
    summary: {
      total: summary?.total ?? 0,
      pending: summary?.pending ?? 0,
      approved: summary?.approved ?? 0,
      rejected: summary?.rejected ?? 0,
      cancelled: summary?.cancelled ?? 0,
      approvedDays: summary?.approvedDays ?? 0,
    },
    departmentUsage: (result?.departments ?? []).map((row) => ({
      department: row._id || 'Unassigned',
      approvedDays: row.approvedDays,
      pending: row.pending,
    })),
    items: (result?.items ?? []).map((record) => leaveView(record, actor, now)),
    total: result?.total[0]?.count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  };
}
