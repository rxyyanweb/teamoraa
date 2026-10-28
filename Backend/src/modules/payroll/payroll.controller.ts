import type { Request, Response } from 'express';
import {
  createPayrollDraftSchema,
  updateSalaryStructureSchema,
  payrollListQuerySchema,
} from './payroll.validation.js';
import {
  getEmployeeSalaryStructure,
  updateEmployeeSalaryStructure,
  generateOrRecalculatePayrollDraft,
  finalizePayrollRun,
  listPayrollRuns,
  getPayrollRunDetails,
  getEmployeePayslips,
  getSinglePayslipData,
} from './payroll.service.js';
import { generatePayslipPdfBuffer } from './payslip.service.js';

export async function getSalaryStructureController(req: Request, res: Response) {
  const employeeId = String(req.params.employeeId);
  const data = await getEmployeeSalaryStructure(req.auth!.companyId, employeeId);
  res.json({ data });
}

export async function updateSalaryStructureController(req: Request, res: Response) {
  const employeeId = String(req.params.employeeId);
  const { basicSalary } = updateSalaryStructureSchema.parse(req.body);
  const data = await updateEmployeeSalaryStructure(req.auth!, employeeId, basicSalary);
  res.json({ data });
}

export async function createPayrollDraftController(req: Request, res: Response) {
  const { month, latePenaltyBonusEnabled } = createPayrollDraftSchema.parse(req.body);
  const data = await generateOrRecalculatePayrollDraft(
    req.auth!,
    month,
    latePenaltyBonusEnabled,
  );
  res.status(201).json({ data });
}

export async function finalizePayrollController(req: Request, res: Response) {
  const month = String(req.params.month);
  const data = await finalizePayrollRun(req.auth!, month);
  res.json({ data });
}

export async function listPayrollRunsController(req: Request, res: Response) {
  const query = payrollListQuerySchema.parse(req.query);
  const data = await listPayrollRuns(req.auth!.companyId, query.status);
  res.json({ data });
}

export async function getPayrollRunDetailsController(req: Request, res: Response) {
  const month = String(req.params.month);
  const data = await getPayrollRunDetails(req.auth!.companyId, month);
  res.json({ data });
}

export async function getMyPayslipsController(req: Request, res: Response) {
  const data = await getEmployeePayslips(req.auth!);
  res.json({ data });
}

export async function getEmployeePayslipsController(req: Request, res: Response) {
  const employeeId = String(req.params.employeeId);
  const data = await getEmployeePayslips(req.auth!, employeeId);
  res.json({ data });
}

export async function downloadPayslipPdfController(req: Request, res: Response) {
  const month = String(req.params.month);
  const employeeId = req.query.employeeId ? String(req.query.employeeId) : undefined;

  const { company, run, item } = await getSinglePayslipData(req.auth!, month, employeeId);
  const pdfBuffer = await generatePayslipPdfBuffer(company, run, item);

  const filename = `Payslip-${item.employeeCode}-${month}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
}
