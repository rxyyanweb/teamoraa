import assert from 'node:assert/strict';
import { generatePayslipPdfBuffer } from '../dist/modules/payroll/payslip.service.js';
import { calculateEmployeePayroll } from '../dist/modules/payroll/payroll-calculator.js';

const item = calculateEmployeePayroll({ employeeId: 'synthetic', employeeCode: 'TEST-001',
  name: 'Synthetic Employee', email: 'test@example.test', department: 'Test', designation: 'Test',
  basicSalary: 50000, joinedAt: new Date('2025-01-01'), active: true, month: '2026-10',
  totalWorkingDaysInMonth: 22, eligibleWorkingDays: 22, presentDays: 22,
  lateDays: 0, halfDays: 0, absentDays: 0, paidLeaveDays: 0, unpaidLeaveDays: 0 });
assert.equal(item.netSalary, 73750);
const buffer = await generatePayslipPdfBuffer({ name: 'Synthetic Company', timezone: 'Asia/Karachi' },
  { month: '2026-10', status: 'finalized' }, item);
assert.ok(buffer.length > 1000);
assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
assert.match(buffer.subarray(-20).toString(), /%%EOF/);
console.log(`PDFKit: valid in-memory payslip generated (${buffer.length} bytes); payroll fixture PASS.`);
