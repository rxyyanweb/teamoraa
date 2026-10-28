import { Schema, model } from 'mongoose';

const companySchema = new Schema(
  {
    singleton: { type: String, required: true, unique: true, default: 'primary' },
    name: { type: String, required: true, trim: true },
    timezone: { type: String, required: true, default: 'Asia/Karachi' },
    address: { type: String, default: '' },
    officeStart: { type: String, default: '09:00' },
    officeEnd: { type: String, default: '18:00' },
    graceMinutes: { type: Number, default: 15 },
    halfDayHours: { type: Number, default: 5 },
    weekend: { type: [Number], default: [0, 6] },
    officeLatitude: { type: Number, default: null },
    officeLongitude: { type: Number, default: null },
    officeRadius: { type: Number, default: 150 },
    departments: { type: [String], default: [] },
    designations: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export const Company = model('Company', companySchema);
export type CompanyDocument = InstanceType<typeof Company>;
