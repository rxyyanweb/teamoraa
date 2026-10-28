import { Schema, model } from 'mongoose';
const leaveSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    typeName: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    workingDates: { type: [String], required: true },
    timezone: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    decisionComment: { type: String, default: '' },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);
leaveSchema.index({ companyId: 1, employeeId: 1, status: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ companyId: 1, status: 1, workingDates: 1 });
leaveSchema.index({ companyId: 1, createdAt: -1 });
export const Leave = model('Leave', leaveSchema);
export type LeaveDocument = InstanceType<typeof Leave>;
