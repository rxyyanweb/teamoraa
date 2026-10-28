import { calculateTaxBreakdown, type TaxBreakdown } from './tax-calculator.js';

export interface SalaryStructure {
  basicSalary: number;
  houseRentAllowance: number; // 40% of basic
  medicalAllowance: number; // 10% of basic
  grossSalary: number; // 1.5 * basic
}

export function calculateSalaryStructure(basicSalary: number): SalaryStructure {
  const basic = Math.max(0, Math.round(basicSalary * 100) / 100);
  const houseRentAllowance = Math.round(basic * 0.4 * 100) / 100;
  const medicalAllowance = Math.round(basic * 0.1 * 100) / 100;
  const grossSalary = Math.round((basic + houseRentAllowance + medicalAllowance) * 100) / 100;

  return {
    basicSalary: basic,
    houseRentAllowance,
    medicalAllowance,
    grossSalary,
  };
}

export interface EmployeePayrollCalculationInput {
  employeeId: string;
  employeeCode: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  basicSalary: number;
  joinedAt: Date;
  active: boolean;

  month: string; // YYYY-MM
  totalWorkingDaysInMonth: number;
  eligibleWorkingDays: number; // Prorated for joining date

  presentDays: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;

  latePenaltyBonusEnabled?: boolean;
}

export interface EmployeePayrollItem {
  employeeId: string;
  employeeCode: string;
  name: string;
  email: string;
  department: string;
  designation: string;

  basicSalary: number;
  houseRentAllowance: number;
  medicalAllowance: number;
  grossSalary: number;

  totalWorkingDays: number;
  eligibleWorkingDays: number;
  dailyRate: number;

  // Attendance metrics
  presentDays: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;

  // Deductions
  prorationDeduction: number;
  absentDeduction: number;
  halfDayDeduction: number;
  unpaidLeaveDeduction: number;
  latePenaltyDeduction: number;
  totalAttendanceDeductions: number;

  // Tax and Net
  tax: TaxBreakdown;
  annualGross: number;
  annualTax: number;
  monthlyTax: number;
  effectiveTaxRate: number;
  totalDeductions: number;
  netSalary: number;
}

export function calculateEmployeePayroll(input: EmployeePayrollCalculationInput): EmployeePayrollItem {
  const structure = calculateSalaryStructure(input.basicSalary);
  const totalWorkingDays = Math.max(1, input.totalWorkingDaysInMonth);
  const eligibleWorkingDays = Math.max(0, Math.min(totalWorkingDays, input.eligibleWorkingDays));

  // Daily rate is gross / total working days in month
  const dailyRate = Math.round((structure.grossSalary / totalWorkingDays) * 100) / 100;

  // Proration deduction if employee joined during this month:
  // Ineligible days = total working days - eligible working days
  const ineligibleDays = Math.max(0, totalWorkingDays - eligibleWorkingDays);
  const prorationDeduction = Math.round(ineligibleDays * dailyRate * 100) / 100;

  // Absent deduction
  const absentDeduction = Math.round(input.absentDays * dailyRate * 100) / 100;

  // Half-day deduction = 0.5 * halfDays * dailyRate
  const halfDayDeduction = Math.round(input.halfDays * 0.5 * dailyRate * 100) / 100;

  // Unpaid leave deduction
  const unpaidLeaveDeduction = Math.round(input.unpaidLeaveDays * dailyRate * 100) / 100;

  // Optional Late Penalty Bonus rule: 3 lates = 0.5 day deduction
  let latePenaltyDeduction = 0;
  if (input.latePenaltyBonusEnabled && input.lateDays >= 3) {
    const penaltyUnits = Math.floor(input.lateDays / 3);
    latePenaltyDeduction = Math.round(penaltyUnits * 0.5 * dailyRate * 100) / 100;
  }

  const totalAttendanceDeductions =
    Math.round(
      (prorationDeduction +
        absentDeduction +
        halfDayDeduction +
        unpaidLeaveDeduction +
        latePenaltyDeduction) *
        100,
    ) / 100;

  // Tax is calculated on monthly gross as per illustrative tax formula
  const tax = calculateTaxBreakdown(structure.grossSalary);
  const monthlyTax = tax.monthlyTax;

  const totalDeductions =
    Math.round((totalAttendanceDeductions + monthlyTax) * 100) / 100;

  // Net salary cannot be negative
  const netSalary = Math.max(
    0,
    Math.round((structure.grossSalary - totalDeductions) * 100) / 100,
  );

  return {
    employeeId: input.employeeId,
    employeeCode: input.employeeCode,
    name: input.name,
    email: input.email,
    department: input.department,
    designation: input.designation,

    basicSalary: structure.basicSalary,
    houseRentAllowance: structure.houseRentAllowance,
    medicalAllowance: structure.medicalAllowance,
    grossSalary: structure.grossSalary,

    totalWorkingDays,
    eligibleWorkingDays,
    dailyRate,

    presentDays: input.presentDays,
    lateDays: input.lateDays,
    halfDays: input.halfDays,
    absentDays: input.absentDays,
    paidLeaveDays: input.paidLeaveDays,
    unpaidLeaveDays: input.unpaidLeaveDays,

    prorationDeduction,
    absentDeduction,
    halfDayDeduction,
    unpaidLeaveDeduction,
    latePenaltyDeduction,
    totalAttendanceDeductions,

    tax,
    annualGross: tax.annualGross,
    annualTax: tax.annualTax,
    monthlyTax,
    effectiveTaxRate: tax.effectiveTaxRate,
    totalDeductions,
    netSalary,
  };
}
