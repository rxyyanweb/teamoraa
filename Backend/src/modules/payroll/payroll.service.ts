import mongoose from 'mongoose';
import { Company } from '../organization/company.model.js';
import { LeavePolicy } from '../organization/leave-policy.model.js';
import { User } from '../users/user.model.js';
import { Attendance } from '../attendance/attendance.model.js';
import { Leave } from '../leave/leave.model.js';
import { Audit } from '../audit/audit.model.js';
import { createNotification } from '../notifications/notification.service.js';
import { PayrollRun, type PayrollRunDocument } from './payroll.model.js';
import {
  calculateEmployeePayroll,
  calculateSalaryStructure,
  type EmployeePayrollItem,
} from './payroll-calculator.js';
import { monthDates, workingDates } from '../../utils/company-date.js';
import { ApiError } from '../../utils/api-error.js';
import type { AuthenticatedUser } from '../../types/auth.js';

export async function getEmployeeSalaryStructure(companyId: string, employeeId: string) {
  const user = await User.findOne({
    _id: employeeId,
    companyId,
    role: 'employee',
  }).select('+basicSalary');

  if (!user) throw new ApiError(404, 'NOT_FOUND', 'Employee not found.');

  const structure = calculateSalaryStructure(user.basicSalary || 0);

  return {
    employeeId: user._id.toString(),
    employeeCode: user.employeeCode,
    name: user.name,
    email: user.email,
    department: user.department,
    designation: user.designation,
    active: user.active,
    ...structure,
  };
}

export async function updateEmployeeSalaryStructure(
  actor: AuthenticatedUser,
  employeeId: string,
  basicSalary: number,
) {
  const user = await User.findOne({
    _id: employeeId,
    companyId: actor.companyId,
    role: 'employee',
  }).select('+basicSalary');

  if (!user) throw new ApiError(404, 'NOT_FOUND', 'Employee not found.');

  const oldBasic = user.basicSalary || 0;
  user.basicSalary = basicSalary;
  await user.save();

  await Audit.create({
    companyId: actor.companyId,
    actorId: actor.id,
    action: 'payroll.salary_updated',
    targetId: user._id.toString(),
    entity: 'salary_structure',
  });

  const structure = calculateSalaryStructure(basicSalary);

  return {
    employeeId: user._id.toString(),
    employeeCode: user.employeeCode,
    name: user.name,
    email: user.email,
    department: user.department,
    designation: user.designation,
    active: user.active,
    ...structure,
  };
}

export async function generateOrRecalculatePayrollDraft(
  actor: AuthenticatedUser,
  month: string,
  latePenaltyBonusEnabled = false,
) {
  const company = await Company.findById(actor.companyId);
  if (!company) throw new ApiError(404, 'NOT_FOUND', 'Company not found.');

  // Check if already finalized
  const existing = await PayrollRun.findOne({ companyId: actor.companyId, month });
  if (existing && existing.status === 'finalized') {
    throw new ApiError(
      409,
      'ALREADY_FINALIZED',
      `Payroll for ${month} has already been finalized and cannot be recalculated.`,
    );
  }

  // Get Leave Policy for holidays & weekend
  const leavePolicy = await LeavePolicy.findOne({ companyId: actor.companyId });
  const holidays = leavePolicy?.holidays || [];
  const weekend = [0, 6]; // Sunday & Saturday

  // Calculate working days in the month
  const allDaysInMonth = monthDates(month);
  const firstDay = allDaysInMonth[0]!;
  const lastDay = allDaysInMonth[allDaysInMonth.length - 1]!;
  const monthWorkingDates = workingDates(firstDay, lastDay, weekend, holidays);
  const totalWorkingDaysInMonth = monthWorkingDates.length;

  // Fetch all employees in this company
  const employees = await User.find({
    companyId: actor.companyId,
    role: 'employee',
  }).select('+basicSalary');

  const items: EmployeePayrollItem[] = [];

  for (const emp of employees) {
    // Determine eligible working days (handling joining date)
    const empJoinedStr = emp.joinedAt.toISOString().slice(0, 10);
    const eligibleWorkingDates = monthWorkingDates.filter((date) => date >= empJoinedStr);
    const eligibleWorkingDays = eligibleWorkingDates.length;

    // Get attendance records in this month
    const attendances = await Attendance.find({
      companyId: actor.companyId,
      employeeId: emp._id,
      date: { $gte: firstDay, $lte: lastDay },
    });

    const lateDays = attendances.filter((a) => a.isLate).length;
    const halfDays = attendances.filter((a) => a.isHalfDay).length;
    const presentDays = attendances.filter((a) => !a.isHalfDay).length;

    // Get approved leaves in this month
    const leaves = await Leave.find({
      companyId: actor.companyId,
      employeeId: emp._id,
      status: 'approved',
      startDate: { $lte: lastDay },
      endDate: { $gte: firstDay },
    });

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    for (const l of leaves) {
      // Find overlap dates with month working dates
      const leaveDays = l.workingDates.filter((d: string) => d >= firstDay && d <= lastDay);
      if (l.type === 'unpaid') {
        unpaidLeaveDays += leaveDays.length;
      } else {
        paidLeaveDays += leaveDays.length;
      }
    }

    // Absences = eligible working days - (present + late + half-day + paidLeave + unpaidLeave)
    const workedOrAccounted =
      presentDays + lateDays + halfDays + paidLeaveDays + unpaidLeaveDays;
    const absentDays = Math.max(0, eligibleWorkingDays - workedOrAccounted);

    const calculatedItem = calculateEmployeePayroll({
      employeeId: emp._id.toString(),
      employeeCode: emp.employeeCode,
      name: emp.name,
      email: emp.email,
      department: emp.department || 'General',
      designation: emp.designation || 'Staff',
      basicSalary: emp.basicSalary || 0,
      joinedAt: emp.joinedAt,
      active: emp.active,

      month,
      totalWorkingDaysInMonth,
      eligibleWorkingDays,

      presentDays,
      lateDays,
      halfDays,
      absentDays,
      paidLeaveDays,
      unpaidLeaveDays,

      latePenaltyBonusEnabled,
    });

    items.push(calculatedItem);
  }

  // Calculate totals
  const totalEmployees = items.length;
  const totalGrossSalary =
    Math.round(items.reduce((sum, item) => sum + item.grossSalary, 0) * 100) / 100;
  const totalDeductions =
    Math.round(items.reduce((sum, item) => sum + item.totalDeductions, 0) * 100) / 100;
  const totalTax =
    Math.round(items.reduce((sum, item) => sum + item.monthlyTax, 0) * 100) / 100;
  const totalNetSalary =
    Math.round(items.reduce((sum, item) => sum + item.netSalary, 0) * 100) / 100;

  let payrollRun: PayrollRunDocument;

  if (existing) {
    existing.items = items as any;
    existing.totalEmployees = totalEmployees;
    existing.totalGrossSalary = totalGrossSalary;
    existing.totalDeductions = totalDeductions;
    existing.totalTax = totalTax;
    existing.totalNetSalary = totalNetSalary;
    payrollRun = await existing.save();

    await Audit.create({
      companyId: actor.companyId,
      actorId: actor.id,
      action: 'payroll.draft_recalculated',
      targetId: existing._id.toString(),
      entity: 'payroll',
    });
  } else {
    payrollRun = await PayrollRun.create({
      companyId: actor.companyId,
      month,
      status: 'draft',
      totalEmployees,
      totalGrossSalary,
      totalDeductions,
      totalTax,
      totalNetSalary,
      items,
      createdBy: actor.id,
    });

    await Audit.create({
      companyId: actor.companyId,
      actorId: actor.id,
      action: 'payroll.draft_created',
      targetId: payrollRun._id.toString(),
      entity: 'payroll',
    });
  }

  return payrollRun;
}

export async function finalizePayrollRun(actor: AuthenticatedUser, month: string) {
  if (actor.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Only administrators can finalize payroll runs.');
  }

  const run = await PayrollRun.findOne({ companyId: actor.companyId, month });
  if (!run) {
    throw new ApiError(404, 'NOT_FOUND', `No payroll draft found for ${month}. Create a draft first.`);
  }

  if (run.status === 'finalized') {
    throw new ApiError(409, 'ALREADY_FINALIZED', `Payroll for ${month} is already finalized.`);
  }

  run.status = 'finalized';
  run.finalizedBy = new mongoose.Types.ObjectId(actor.id) as any;
  run.finalizedAt = new Date();

  await run.save();

  await Audit.create({
    companyId: actor.companyId,
    actorId: actor.id,
    action: 'payroll.finalized',
    targetId: run._id.toString(),
    entity: 'payroll',
  });

  // Notify all employees that payslips are ready
  for (const item of run.items) {
    void createNotification(
      actor.companyId,
      item.employeeId.toString(),
      `Payslip Available: ${month}`,
      `Your finalized payslip for ${month} (Net: PKR ${item.netSalary.toLocaleString()}) is now available for download.`,
      'payslip_available',
      '/employee/payslips',
    );
  }

  return run;
}

export async function listPayrollRuns(companyId: string, status?: string) {
  const filter: Record<string, any> = { companyId };
  if (status) filter.status = status;

  return PayrollRun.find(filter)
    .sort({ month: -1 })
    .select('-items');
}

export async function getPayrollRunDetails(companyId: string, month: string) {
  const run = await PayrollRun.findOne({ companyId, month });
  if (!run) throw new ApiError(404, 'NOT_FOUND', `Payroll run for ${month} not found.`);
  return run;
}

export async function getEmployeePayslips(actor: AuthenticatedUser, employeeId?: string) {
  const targetEmployeeId = actor.role === 'employee' ? actor.id : employeeId;
  if (!targetEmployeeId) {
    throw new ApiError(400, 'BAD_REQUEST', 'Employee ID is required.');
  }

  // Employees can only query finalized runs; HR/Admin can view all
  const filter: Record<string, any> = { companyId: actor.companyId };
  if (actor.role === 'employee') {
    filter.status = 'finalized';
  }

  const runs = await PayrollRun.find(filter).sort({ month: -1 });

  const payslips: any[] = [];

  for (const run of runs) {
    const item = run.items.find(
      (it) => it.employeeId.toString() === targetEmployeeId,
    );
    if (item) {
      payslips.push({
        runId: run._id.toString(),
        month: run.month,
        status: run.status,
        finalizedAt: run.finalizedAt,
        item,
      });
    }
  }

  return payslips;
}

export async function getSinglePayslipData(
  actor: AuthenticatedUser,
  month: string,
  employeeId?: string,
) {
  const targetEmployeeId = actor.role === 'employee' ? actor.id : (employeeId || actor.id);

  const run = await PayrollRun.findOne({ companyId: actor.companyId, month });
  if (!run) {
    throw new ApiError(404, 'NOT_FOUND', `Payroll run for ${month} not found.`);
  }

  if (actor.role === 'employee' && run.status !== 'finalized') {
    throw new ApiError(403, 'FORBIDDEN', 'Payslips are available only after payroll is finalized.');
  }

  const item = run.items.find((it) => it.employeeId.toString() === targetEmployeeId);
  if (!item) {
    throw new ApiError(404, 'NOT_FOUND', 'No payslip record found for this employee in the requested month.');
  }

  const company = await Company.findById(actor.companyId);

  return { company: company!, run, item };
}
