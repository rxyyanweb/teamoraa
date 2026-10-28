import { Schema, model } from 'mongoose';

const payrollItemSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employeeCode: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    department: { type: String, default: '' },
    designation: { type: String, default: '' },

    basicSalary: { type: Number, required: true },
    houseRentAllowance: { type: Number, required: true },
    medicalAllowance: { type: Number, required: true },
    grossSalary: { type: Number, required: true },

    totalWorkingDays: { type: Number, required: true },
    eligibleWorkingDays: { type: Number, required: true },
    dailyRate: { type: Number, required: true },

    presentDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    paidLeaveDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },

    prorationDeduction: { type: Number, default: 0 },
    absentDeduction: { type: Number, default: 0 },
    halfDayDeduction: { type: Number, default: 0 },
    unpaidLeaveDeduction: { type: Number, default: 0 },
    latePenaltyDeduction: { type: Number, default: 0 },
    totalAttendanceDeductions: { type: Number, default: 0 },

    annualGross: { type: Number, required: true },
    annualTax: { type: Number, required: true },
    monthlyTax: { type: Number, required: true },
    effectiveTaxRate: { type: Number, default: 0 },

    totalDeductions: { type: Number, required: true },
    netSalary: { type: Number, required: true },
  },
  { _id: false },
);

const payrollRunSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    month: { type: String, required: true }, // Format: YYYY-MM
    status: {
      type: String,
      enum: ['draft', 'finalized'],
      default: 'draft',
      required: true,
      index: true,
    },
    totalEmployees: { type: Number, required: true },
    totalGrossSalary: { type: Number, required: true },
    totalDeductions: { type: Number, required: true },
    totalTax: { type: Number, required: true },
    totalNetSalary: { type: Number, required: true },

    items: { type: [payrollItemSchema], required: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    finalizedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

// One payroll run per company per month
payrollRunSchema.index({ companyId: 1, month: 1 }, { unique: true });

export const PayrollRun = model('PayrollRun', payrollRunSchema);
export type PayrollRunDocument = InstanceType<typeof PayrollRun>;
