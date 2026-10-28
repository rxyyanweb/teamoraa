import { Schema, model } from 'mongoose';
export const rulesSchema = new Schema(
  {
    timezone: { type: String, required: true },
    officeStart: { type: String, required: true },
    officeEnd: { type: String, required: true },
    graceMinutes: { type: Number, required: true },
    halfDayHours: { type: Number, required: true },
    scheduled: { type: Boolean, required: true },
  },
  { _id: false },
);
export interface AttendanceRules {
  timezone: string;
  officeStart: string;
  officeEnd: string;
  graceMinutes: number;
  halfDayHours: number;
  scheduled: boolean;
}
const attendanceSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    checkedInAt: { type: Date, required: true },
    checkedOutAt: { type: Date, default: null },
    workedMinutes: { type: Number, default: 0 },
    isLate: { type: Boolean, default: false },
    isHalfDay: { type: Boolean, default: false },
    missingAfter: { type: Date, required: true },
    rules: { type: rulesSchema, required: true },
    revision: { type: Number, default: 0 },
    source: { type: String, enum: ['web', 'correction'], default: 'web' },
    corrected: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);
attendanceSchema.index({ companyId: 1, employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ companyId: 1, date: 1, isLate: 1 });
attendanceSchema.index({ companyId: 1, employeeId: 1, checkedOutAt: 1, checkedInAt: -1 });
export const Attendance = model('Attendance', attendanceSchema);
export type AttendanceDocument = InstanceType<typeof Attendance>;
