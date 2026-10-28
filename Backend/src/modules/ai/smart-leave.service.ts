import { Company } from '../organization/company.model.js';
import { LeavePolicy } from '../organization/leave-policy.model.js';
import { leaveBalances } from '../leave/leave-balance.service.js';
import { workingDates, localDate } from '../../utils/company-date.js';
import type { GeminiProvider } from './providers/gemini.provider.js';
import type { AuthenticatedUser } from '../../types/auth.js';

export interface SmartLeaveResult {
  draft: {
    type: string;
    typeName: string;
    startDate: string;
    endDate: string;
    workingDays: number;
    reason: string;
  };
  balance: {
    remainingDays: number;
    sufficientBalance: boolean;
  };
  warnings: string[];
}

export async function processSmartLeaveRequest(
  actor: AuthenticatedUser,
  userText: string,
  gemini: GeminiProvider,
): Promise<SmartLeaveResult> {
  const company = await Company.findById(actor.companyId);
  const timezone = company?.timezone || 'Asia/Karachi';
  const todayStr = localDate(new Date(), timezone);

  const policy = await LeavePolicy.findOne({ companyId: actor.companyId });
  const types = policy?.types || [
    { code: 'annual', name: 'Annual Leave', daysPerYear: 14, active: true },
    { code: 'sick', name: 'Sick Leave', daysPerYear: 8, active: true },
    { code: 'casual', name: 'Casual Leave', daysPerYear: 10, active: true },
    { code: 'unpaid', name: 'Unpaid Leave', daysPerYear: 0, active: true },
  ];
  const validCodes = types.filter((t) => t.active).map((t) => t.code);

  const extracted = await gemini.extractStructuredLeave(userText, todayStr, timezone, validCodes);

  const selectedTypeObj = types.find((t) => t.code === extracted!.type) || types[0]!;

  // Calculate working days
  const holidays = policy?.holidays || [];
  const weekend = company?.weekend || [0, 6];
  const daysList = workingDates(extracted.start, extracted.end, weekend, holidays);
  const workingDays = daysList.length;

  // Check user leave balance
  const currentYear = new Date().getFullYear();
  const balances = await leaveBalances(actor.companyId, actor.id, currentYear);
  const userBalance = balances.find((b) => b.code === selectedTypeObj.code);
  const remaining = userBalance?.available ?? 0;
  const sufficientBalance = selectedTypeObj.code === 'unpaid' || remaining >= workingDays;

  const warnings: string[] = [];
  if (workingDays === 0) {
    warnings.push('The selected date range contains only weekends or public holidays (0 working days).');
  }
  if (!sufficientBalance) {
    warnings.push(
      `Insufficient leave balance. You requested ${workingDays} days, but have only ${remaining} days remaining.`,
    );
  }

  return {
    draft: {
      type: selectedTypeObj.code,
      typeName: selectedTypeObj.name,
      startDate: extracted.start,
      endDate: extracted.end,
      workingDays,
      reason: extracted.reason,
    },
    balance: {
      remainingDays: remaining,
      sufficientBalance,
    },
    warnings,
  };
}

