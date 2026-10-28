import { describe, expect, it } from 'vitest';
import {
  calculateAnnualTax,
  calculateTaxBreakdown,
} from '../modules/payroll/tax-calculator.js';
import {
  calculateSalaryStructure,
  calculateEmployeePayroll,
} from '../modules/payroll/payroll-calculator.js';

describe('Phase 3: Tax Calculator & Salary Structure Tests', () => {
  it('correctly calculates salary structure: HRA 40%, Medical 10%, Gross 1.5x basic', () => {
    const structure = calculateSalaryStructure(50_000);
    expect(structure.basicSalary).toBe(50_000);
    expect(structure.houseRentAllowance).toBe(20_000);
    expect(structure.medicalAllowance).toBe(5_000);
    expect(structure.grossSalary).toBe(75_000);
  });

  describe('Illustrative Annual Tax Slabs & Boundary Tests', () => {
    it('Slab 1: Up to 600,000 is 0 tax', () => {
      expect(calculateAnnualTax(0)).toBe(0);
      expect(calculateAnnualTax(300_000)).toBe(0);
      expect(calculateAnnualTax(599_999)).toBe(0);
      expect(calculateAnnualTax(600_000)).toBe(0);
    });

    it('Slab 2: Above 600,000 up to 1,200,000 is 5% of amount above 600,000', () => {
      // 600,001 => 1 * 0.05 = 0.05
      expect(calculateAnnualTax(600_001)).toBe(0.05);

      // PDF Example: Basic 50,000 => Gross 75,000 => Annual Gross 900,000
      // Taxable = 900,000 - 600,000 = 300,000. 5% = 15,000
      expect(calculateAnnualTax(900_000)).toBe(15_000);

      // Boundary: 1,200,000 => 600,000 * 0.05 = 30,000
      expect(calculateAnnualTax(1_200_000)).toBe(30_000);
    });

    it('Slab 3: Above 1,200,000 up to 2,400,000 is 30,000 + 15% of amount above 1,200,000', () => {
      // 1,200,001 => 30,000 + 0.15 = 30,000.15
      expect(calculateAnnualTax(1_200_001)).toBe(30_000.15);

      // Mid: 1,800,000 => 30,000 + 600,000 * 0.15 = 30,000 + 90,000 = 120,000
      expect(calculateAnnualTax(1_800_000)).toBe(120_000);

      // Boundary: 2,400,000 => 30,000 + 1,200,000 * 0.15 = 30,000 + 180,000 = 210,000
      expect(calculateAnnualTax(2_400_000)).toBe(210_000);
    });

    it('Slab 4: Above 2,400,000 up to 3,600,000 is 210,000 + 25% of amount above 2,400,000', () => {
      // 2,400,001 => 210,000 + 0.25 = 210,000.25
      expect(calculateAnnualTax(2_400_001)).toBe(210_000.25);

      // Mid: 3,000,000 => 210,000 + 600,000 * 0.25 = 210,000 + 150,000 = 360,000
      expect(calculateAnnualTax(3_000_000)).toBe(360_000);

      // Boundary: 3,600,000 => 210,000 + 1,200,000 * 0.25 = 210,000 + 300,000 = 510,000
      expect(calculateAnnualTax(3_600_000)).toBe(510_000);
    });

    it('Slab 5: Above 3,600,000 is 510,000 + 35% of amount above 3,600,000', () => {
      // 3,600,001 => 510,000 + 0.35 = 510,000.35
      expect(calculateAnnualTax(3_600_001)).toBe(510_000.35);

      // 4,600,000 => 510,000 + 1,000,000 * 0.35 = 510,000 + 350,000 = 860,000
      expect(calculateAnnualTax(4_600_000)).toBe(860_000);
    });

    it('verifies the mandatory PDF example: Basic 50k, Gross 75k, Annual Gross 900k => Monthly Tax 1,250, Net 73,750', () => {
      const breakdown = calculateTaxBreakdown(75_000);
      expect(breakdown.annualGross).toBe(900_000);
      expect(breakdown.annualTax).toBe(15_000);
      expect(breakdown.monthlyTax).toBe(1_250);

      const payrollItem = calculateEmployeePayroll({
        employeeId: 'emp_123',
        employeeCode: 'EMP-001',
        name: 'John Doe',
        email: 'john@example.com',
        department: 'Engineering',
        designation: 'Developer',
        basicSalary: 50_000,
        joinedAt: new Date('2025-01-01'),
        active: true,
        month: '2026-10',
        totalWorkingDaysInMonth: 22,
        eligibleWorkingDays: 22,
        presentDays: 22,
        lateDays: 0,
        halfDays: 0,
        absentDays: 0,
        paidLeaveDays: 0,
        unpaidLeaveDays: 0,
      });

      expect(payrollItem.grossSalary).toBe(75_000);
      expect(payrollItem.totalAttendanceDeductions).toBe(0);
      expect(payrollItem.monthlyTax).toBe(1_250);
      expect(payrollItem.totalDeductions).toBe(1_250);
      expect(payrollItem.netSalary).toBe(73_750);
    });
  });

  describe('Attendance Deductions & Proration Tests', () => {
    it('accurately deducts absent days and half-days without double deduction', () => {
      // 20 working days, gross 100,000 => dailyRate = 5,000
      // 2 absences => 10,000
      // 1 half-day => 0.5 * 5,000 = 2,500
      // 1 unpaid leave => 5,000
      // Total attendance deduction = 17,500
      const item = calculateEmployeePayroll({
        employeeId: 'emp_456',
        employeeCode: 'EMP-002',
        name: 'Jane Smith',
        email: 'jane@example.com',
        department: 'HR',
        designation: 'Executive',
        basicSalary: 66_666.67, // Gross approx 100,000
        joinedAt: new Date('2025-01-01'),
        active: true,
        month: '2026-10',
        totalWorkingDaysInMonth: 20,
        eligibleWorkingDays: 20,
        presentDays: 16,
        lateDays: 2,
        halfDays: 1,
        absentDays: 2,
        paidLeaveDays: 1, // Paid leave has 0 deduction
        unpaidLeaveDays: 1,
      });

      const dailyRate = Math.round((item.grossSalary / 20) * 100) / 100;
      expect(item.absentDeduction).toBe(Math.round(2 * dailyRate * 100) / 100);
      expect(item.halfDayDeduction).toBe(Math.round(0.5 * dailyRate * 100) / 100);
      expect(item.unpaidLeaveDeduction).toBe(Math.round(1 * dailyRate * 100) / 100);
    });

    it('prorates salary for employees joining mid-month', () => {
      // 20 working days, eligible only 10 days
      // Ineligible days = 10
      const item = calculateEmployeePayroll({
        employeeId: 'emp_789',
        employeeCode: 'EMP-003',
        name: 'New Joiner',
        email: 'new@example.com',
        department: 'Sales',
        designation: 'Associate',
        basicSalary: 40_000, // Gross 60,000 => daily rate 3,000
        joinedAt: new Date('2026-10-15'),
        active: true,
        month: '2026-10',
        totalWorkingDaysInMonth: 20,
        eligibleWorkingDays: 10,
        presentDays: 10,
        lateDays: 0,
        halfDays: 0,
        absentDays: 0,
        paidLeaveDays: 0,
        unpaidLeaveDays: 0,
      });

      expect(item.dailyRate).toBe(3_000);
      expect(item.prorationDeduction).toBe(30_000); // 10 days * 3,000
      expect(item.totalAttendanceDeductions).toBe(30_000);
    });
  });
});
