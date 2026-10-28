import PDFDocument from 'pdfkit';
import type { PayrollRunDocument } from './payroll.model.js';
import type { CompanyDocument } from '../organization/company.model.js';

export function formatCurrencyPKR(amount: number): string {
  return 'PKR ' + amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generatePayslipPdfBuffer(
  company: CompanyDocument,
  run: PayrollRunDocument,
  item: PayrollRunDocument['items'][number],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Color Palette
    const primaryColor = '#0f766e'; // Teal 700
    const secondaryColor = '#065f46'; // Emerald 800
    const darkText = '#1e293b'; // Slate 800
    const mutedText = '#64748b'; // Slate 500
    const lightBg = '#f8fafc'; // Slate 50
    const borderColor = '#e2e8f0'; // Slate 200

    // Header Background Accent Bar
    doc.rect(40, 40, 515, 6).fill(primaryColor);

    // Company Header
    doc
      .fontSize(22)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text(company.name || 'Teamora Technologies', 40, 60);

    doc
      .fontSize(9)
      .fillColor(mutedText)
      .font('Helvetica')
      .text('Automated Human Capital Management & Payroll System', 40, 86)
      .text(`Timezone: ${company.timezone || 'Asia/Karachi'} | Currency: PKR`, 40, 98);

    // Document Title & Month Badge
    doc
      .fontSize(16)
      .fillColor(secondaryColor)
      .font('Helvetica-Bold')
      .text('MONTHLY PAYSLIP', 380, 60, { align: 'right' });

    doc
      .fontSize(10)
      .fillColor(darkText)
      .font('Helvetica-Bold')
      .text(`Period: ${run.month}`, 380, 80, { align: 'right' });

    doc
      .fontSize(8)
      .fillColor(mutedText)
      .font('Helvetica')
      .text(`Status: ${run.status.toUpperCase()}`, 380, 94, { align: 'right' })
      .text(`Generated: ${new Date().toLocaleDateString('en-PK')}`, 380, 106, { align: 'right' });

    // Divider
    doc.moveTo(40, 125).lineTo(555, 125).strokeColor(borderColor).stroke();

    // Employee & Job Information Card
    doc.roundedRect(40, 135, 515, 75, 4).fillAndStroke(lightBg, borderColor);

    doc.fillColor(darkText).fontSize(9);

    // Left Column
    doc.font('Helvetica-Bold').text('Employee Name:', 55, 148);
    doc.font('Helvetica').text(item.name, 150, 148);

    doc.font('Helvetica-Bold').text('Employee Code:', 55, 166);
    doc.font('Helvetica').text(item.employeeCode, 150, 166);

    doc.font('Helvetica-Bold').text('Email Address:', 55, 184);
    doc.font('Helvetica').text(item.email, 150, 184);

    // Right Column
    doc.font('Helvetica-Bold').text('Department:', 310, 148);
    doc.font('Helvetica').text(item.department || 'General', 400, 148);

    doc.font('Helvetica-Bold').text('Designation:', 310, 166);
    doc.font('Helvetica').text(item.designation || 'Staff', 400, 166);

    doc.font('Helvetica-Bold').text('Working Days:', 310, 184);
    doc.font('Helvetica').text(`${item.eligibleWorkingDays} / ${item.totalWorkingDays} Days`, 400, 184);

    // Attendance Summary Card
    doc.roundedRect(40, 220, 515, 45, 4).fillAndStroke('#f1f5f9', borderColor);
    doc.fillColor(darkText).fontSize(8.5);

    const attY = 236;
    doc.font('Helvetica-Bold').text('Present:', 55, attY);
    doc.font('Helvetica').text(`${item.presentDays}d`, 100, attY);

    doc.font('Helvetica-Bold').text('Late:', 135, attY);
    doc.font('Helvetica').text(`${item.lateDays}d`, 165, attY);

    doc.font('Helvetica-Bold').text('Half-Day:', 200, attY);
    doc.font('Helvetica').text(`${item.halfDays}d`, 250, attY);

    doc.font('Helvetica-Bold').text('Absent:', 285, attY);
    doc.font('Helvetica').text(`${item.absentDays}d`, 330, attY);

    doc.font('Helvetica-Bold').text('Paid Leave:', 365, attY);
    doc.font('Helvetica').text(`${item.paidLeaveDays}d`, 425, attY);

    doc.font('Helvetica-Bold').text('Unpaid Leave:', 460, attY);
    doc.font('Helvetica').text(`${item.unpaidLeaveDays}d`, 525, attY);

    // Earnings & Deductions Tables Side-by-Side
    const tableTop = 280;
    const halfWidth = 250;

    // Table Headers
    doc.rect(40, tableTop, halfWidth, 22).fill(primaryColor);
    doc.rect(305, tableTop, halfWidth, 22).fill('#991b1b'); // Crimson Red for Deductions

    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('EARNINGS & ALLOWANCES', 50, tableTop + 6);
    doc.text('AMOUNT', 230, tableTop + 6, { align: 'right' });

    doc.text('DEDUCTIONS & TAX', 315, tableTop + 6);
    doc.text('AMOUNT', 495, tableTop + 6, { align: 'right' });

    // Table Content Rows
    let currentY = tableTop + 30;
    const rowHeight = 20;

    const earnings = [
      { label: 'Basic Salary', amount: item.basicSalary },
      { label: 'House Rent Allowance (HRA 40%)', amount: item.houseRentAllowance },
      { label: 'Medical Allowance (10%)', amount: item.medicalAllowance },
    ];

    const deductions = [
      { label: `Absence (${item.absentDays} days)`, amount: item.absentDeduction },
      { label: `Half-day (${item.halfDays} days @ 0.5)`, amount: item.halfDayDeduction },
      { label: `Unpaid Leave (${item.unpaidLeaveDays} days)`, amount: item.unpaidLeaveDeduction },
      { label: 'Proration / Unemployed Days', amount: item.prorationDeduction },
      ...(item.latePenaltyDeduction > 0
        ? [{ label: `Late Penalty (${item.lateDays} lates)`, amount: item.latePenaltyDeduction }]
        : []),
      { label: 'Income Tax (Illustrative Slab)', amount: item.monthlyTax },
    ];

    const maxRows = Math.max(earnings.length, deductions.length);

    for (let i = 0; i < maxRows; i++) {
      const earn = earnings[i];
      const ded = deductions[i];

      doc.fillColor(darkText).fontSize(8.5).font('Helvetica');

      if (earn) {
        doc.text(earn.label, 50, currentY);
        doc.font('Helvetica-Bold').text(formatCurrencyPKR(earn.amount), 180, currentY, { width: 100, align: 'right' });
      }

      if (ded) {
        doc.font('Helvetica').text(ded.label, 315, currentY);
        doc.font('Helvetica-Bold').text(formatCurrencyPKR(ded.amount), 445, currentY, { width: 100, align: 'right' });
      }

      currentY += rowHeight;
      doc.moveTo(40, currentY - 5).lineTo(290, currentY - 5).strokeColor('#f1f5f9').stroke();
      doc.moveTo(305, currentY - 5).lineTo(555, currentY - 5).strokeColor('#f1f5f9').stroke();
    }

    // Totals Row
    currentY += 10;
    doc.rect(40, currentY, halfWidth, 24).fill('#e0f2fe'); // Light sky blue
    doc.rect(305, currentY, halfWidth, 24).fill('#fee2e2'); // Light red

    doc.fillColor(darkText).fontSize(9).font('Helvetica-Bold');
    doc.text('TOTAL GROSS SALARY', 50, currentY + 7);
    doc.text(formatCurrencyPKR(item.grossSalary), 180, currentY + 7, { width: 100, align: 'right' });

    doc.text('TOTAL DEDUCTIONS', 315, currentY + 7);
    doc.text(formatCurrencyPKR(item.totalDeductions), 445, currentY + 7, { width: 100, align: 'right' });

    // Net Salary Banner
    currentY += 45;
    doc.roundedRect(40, currentY, 515, 55, 6).fillAndStroke('#0f766e', '#0d9488');

    doc.fillColor('#ffffff');
    doc.fontSize(11).font('Helvetica-Bold').text('NET PAYABLE SALARY', 55, currentY + 14);
    doc.fontSize(8.5).font('Helvetica').text('Direct Bank Transfer / Company Payroll Disbursement', 55, currentY + 30);

    doc.fontSize(18).font('Helvetica-Bold').text(formatCurrencyPKR(item.netSalary), 320, currentY + 18, { width: 220, align: 'right' });

    // Footer & Disclaimer
    doc
      .fontSize(8)
      .fillColor(mutedText)
      .font('Helvetica')
      .text(
        'This is a computer-generated payslip from Teamora HCM and does not require a physical signature.',
        40,
        760,
        { align: 'center', width: 515 },
      )
      .text('Confidential | For Employee Reference Only', 40, 772, { align: 'center', width: 515 });

    doc.end();
  });
}
