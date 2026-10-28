import type { Request, Response } from 'express';
import { Company } from '../organization/company.model.js';
import { getLeavePolicy } from '../organization/leave-policy.service.js';
import { localDate } from '../../utils/company-date.js';
import { objectIdInput, decisionInput } from '../../utils/workforce-validation.js';
import {
  applyLeaveInput,
  leaveRangeInput,
  balanceInput,
  myLeaveInput,
  leaveOverviewInput,
} from './leave.validation.js';
import { applyLeave, previewLeave, decideLeave, cancelLeave } from './leave.service.js';
import { leaveBalances } from './leave-balance.service.js';
import { leaveDetails, myLeave, leaveOverview } from './leave-query.service.js';
import { emptyInput } from '../attendance/attendance.validation.js';
export const previewLeaveController = async (req: Request, res: Response) =>
  res.json({ data: await previewLeave(req.auth!, leaveRangeInput.parse(req.query)) });
export const applyLeaveController = async (req: Request, res: Response) =>
  res.status(201).json({ data: await applyLeave(req.auth!, applyLeaveInput.parse(req.body)) });
export const myLeaveController = async (req: Request, res: Response) =>
  res.json({ data: await myLeave(req.auth!, myLeaveInput.parse(req.query)) });
export const leaveOverviewController = async (req: Request, res: Response) =>
  res.json({ data: await leaveOverview(req.auth!, leaveOverviewInput.parse(req.query)) });
export const leaveDetailsController = async (req: Request, res: Response) =>
  res.json({ data: await leaveDetails(req.auth!, objectIdInput.parse(req.params.id)) });
export const leaveDecisionController =
  (decision: 'approved' | 'rejected') => async (req: Request, res: Response) =>
    res.json({
      data: await decideLeave(
        req.auth!,
        objectIdInput.parse(req.params.id),
        decision,
        decisionInput.parse(req.body).comment,
      ),
    });
export const cancelLeaveController = async (req: Request, res: Response) => {
  emptyInput.parse(req.body);
  res.json({ data: await cancelLeave(req.auth!, objectIdInput.parse(req.params.id)) });
};
export const leaveTypesController = async (req: Request, res: Response) =>
  res.json({
    data: {
      types: (await getLeavePolicy(req.auth!.companyId)).types.filter((type) => type.active),
    },
  });
export const leaveBalancesController = async (req: Request, res: Response) => {
  const company = await Company.findById(req.auth!.companyId);
  const year =
    balanceInput.parse(req.query).year ??
    Number(localDate(new Date(), company!.timezone).slice(0, 4));
  res.json({
    data: { year, balances: await leaveBalances(req.auth!.companyId, req.auth!.id, year) },
  });
};
