import { Router } from 'express';
import { requireRole } from '../../middleware/security.js';
import {
  getSalaryStructureController,
  updateSalaryStructureController,
  createPayrollDraftController,
  finalizePayrollController,
  listPayrollRunsController,
  getPayrollRunDetailsController,
  getMyPayslipsController,
  getEmployeePayslipsController,
  downloadPayslipPdfController,
} from './payroll.controller.js';

export function payrollRoutes() {
  const router = Router();

  // Employee: My Payslips
  router.get('/my-payslips', requireRole('employee'), getMyPayslipsController);

  // Payslip Download (Role checks handled in controller & service)
  router.get('/payslip/:month/pdf', downloadPayslipPdfController);

  // Salary Structure
  router.get(
    '/salary-structure/:employeeId',
    requireRole('admin', 'hr'),
    getSalaryStructureController,
  );
  router.put(
    '/salary-structure/:employeeId',
    requireRole('hr'),
    updateSalaryStructureController,
  );

  // Payroll Runs (List, Details)
  router.get('/runs', requireRole('admin', 'hr'), listPayrollRunsController);
  router.get('/runs/:month', requireRole('admin', 'hr'), getPayrollRunDetailsController);

  // Draft Creation / Recalculation (HR only)
  router.post('/draft', requireRole('hr'), createPayrollDraftController);

  // Finalization (Admin only)
  router.post('/finalize/:month', requireRole('admin'), finalizePayrollController);

  // Employee Payslips history by HR/Admin
  router.get(
    '/employee-payslips/:employeeId',
    requireRole('admin', 'hr'),
    getEmployeePayslipsController,
  );

  return router;
}
