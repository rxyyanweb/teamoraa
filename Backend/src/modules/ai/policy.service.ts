import { Company } from '../organization/company.model.js';
import { LeavePolicy } from '../organization/leave-policy.model.js';

export interface CompanyPolicyContext {
  companyName: string;
  timezone: string;
  officeStart: string;
  officeEnd: string;
  graceMinutes: number;
  lateThreshold: string;
  halfDayHours: number;
  leaveQuotas: { annual: number; sick: number; casual: number; unpaid: string };
  salaryFormula: string;
  taxSlabs: string;
  threeLatePenalty: string;
}

export async function getCompanyPolicyContext(companyId: string): Promise<CompanyPolicyContext> {
  const company = await Company.findById(companyId);
  const leavePolicy = await LeavePolicy.findOne({ companyId });

  const officeStart = company?.officeStart || '09:00';
  const graceMinutes = company?.graceMinutes || 15;
  const halfDayHours = company?.halfDayHours || 5;

  // Compute late cutoff time (e.g. 09:15)
  const [startHour, startMin] = officeStart.split(':').map(Number);
  const cutoffTotal = (startHour || 9) * 60 + (startMin || 0) + graceMinutes;
  const cutoffH = String(Math.floor(cutoffTotal / 60)).padStart(2, '0');
  const cutoffM = String(cutoffTotal % 60).padStart(2, '0');
  const lateThreshold = `${cutoffH}:${cutoffM}`;

  const annualType = leavePolicy?.types?.find((t) => t.code === 'annual');
  const sickType = leavePolicy?.types?.find((t) => t.code === 'sick');
  const casualType = leavePolicy?.types?.find((t) => t.code === 'casual');

  return {
    companyName: company?.name || 'Teamora Technologies',
    timezone: company?.timezone || 'Asia/Karachi',
    officeStart,
    officeEnd: company?.officeEnd || '18:00',
    graceMinutes,
    lateThreshold,
    halfDayHours,
    leaveQuotas: {
      annual: annualType?.annualQuota ?? 14,
      sick: sickType?.annualQuota ?? 8,
      casual: casualType?.annualQuota ?? 10,
      unpaid: 'Unlimited',
    },
    salaryFormula: 'House Rent Allowance (HRA) = 40% of Basic, Medical Allowance = 10% of Basic, Gross Salary = 1.5 * Basic Salary',
    taxSlabs: 'Up to PKR 600,000: 0%; PKR 600,001-1,200,000: 5% of excess over 600k; PKR 1,200,001-2,400,000: 30,000 + 15% of excess over 1.2M; PKR 2,400,001-3,600,000: 210,000 + 25% of excess over 2.4M; Above 3,600,000: 510,000 + 35% of excess over 3.6M. Monthly Tax = Annual Tax / 12.',
    threeLatePenalty: 'Standard policy does not deduct salary for late arrivals. An optional bonus rule (3 lates = 0.5 day deduction) can be configured by Admin during draft creation.',
  };
}

export function formatPolicySystemPrompt(ctx: CompanyPolicyContext): string {
  return `
COMPANY POLICIES & BUSINESS RULES:
- Company: ${ctx.companyName} (${ctx.timezone})
- Working Hours: ${ctx.officeStart} to ${ctx.officeEnd}.
- Grace Period: ${ctx.graceMinutes} minutes. Employees checking in after ${ctx.lateThreshold} are marked "Late".
- Half-Day: Worked duration under ${ctx.halfDayHours} hours classifies the day as a Half-Day (deduction: 0.5 * daily pay rate).
- Leave Quotas (Working Days): Annual: ${ctx.leaveQuotas.annual} days, Sick: ${ctx.leaveQuotas.sick} days, Casual: ${ctx.leaveQuotas.casual} days, Unpaid: ${ctx.leaveQuotas.unpaid}.
- Weekends & Holidays: Saturday and Sunday are non-working days. Public holidays and weekends are never deducted from leave balances or pay.
- Overlapping & Balance: Overlapping leaves or requests exceeding balance are rejected with HTTP 422.
- Salary Structure: ${ctx.salaryFormula}.
- Payroll Deductions: Daily rate = Gross / Working Days in month. Deductions = (Absent days * Daily rate) + (Half days * 0.5 * Daily rate) + (Unpaid leave * Daily rate).
- Taxes: ${ctx.taxSlabs}
- Late Penalty: ${ctx.threeLatePenalty}
`;
}
