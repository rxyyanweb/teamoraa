import { Schema, model } from 'mongoose';
import { rulesSchema } from '../attendance/attendance.model.js';
const correctionSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    reason: { type: String, required: true },
    originalAttendanceId: { type: Schema.Types.ObjectId, default: null },
    originalRevision: { type: Number, default: null },
    originalCheckIn: { type: Date, default: null },
    originalCheckOut: { type: Date, default: null },
    requestedCheckIn: { type: Date, required: true },
    requestedCheckOut: { type: Date, required: true },
    rules: { type: rulesSchema, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    decisionComment: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false },
);
correctionSchema.index(
  { companyId: 1, employeeId: 1, date: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);
correctionSchema.index({ companyId: 1, status: 1, createdAt: -1 });
export const Correction = model('AttendanceCorrection', correctionSchema);
export type CorrectionDocument = InstanceType<typeof Correction>;
