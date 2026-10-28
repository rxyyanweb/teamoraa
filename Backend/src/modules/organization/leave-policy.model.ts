import { Schema, model } from 'mongoose';
export const defaultLeaveTypes = [
  { code: 'annual', name: 'Annual leave', annualQuota: 14, active: true },
  { code: 'sick', name: 'Sick leave', annualQuota: 8, active: true },
  { code: 'casual', name: 'Casual leave', annualQuota: 10, active: true },
  { code: 'unpaid', name: 'Unpaid leave', annualQuota: null, active: true },
];
export interface LeaveType {
  code: string;
  name: string;
  annualQuota: number | null;
  active: boolean;
}
export interface LeavePolicyValues {
  types: LeaveType[];
  holidays: { date: string; name: string }[];
}
const leavePolicySchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, unique: true },
    types: {
      type: [
        new Schema(
          {
            code: { type: String, required: true },
            name: { type: String, required: true },
            annualQuota: { type: Number, default: null },
            active: { type: Boolean, default: true },
          },
          { _id: false },
        ),
      ],
      default: () => defaultLeaveTypes.map((type) => ({ ...type })),
    },
    holidays: {
      type: [
        new Schema(
          { date: { type: String, required: true }, name: { type: String, required: true } },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true, versionKey: false },
);
export const LeavePolicy = model('LeavePolicy', leavePolicySchema);
