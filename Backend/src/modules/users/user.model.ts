import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'hr', 'employee'], required: true },
    mustChangePassword: { type: Boolean, default: true },
    sessionVersion: { type: Number, default: 0, select: false },
    workforceRevision: { type: Number, default: 0, select: false },
    active: { type: Boolean, default: true },
    department: { type: String, default: '' },
    designation: { type: String, default: '' },
    employeeCode: { type: String, required: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    basicSalary: { type: Number, min: 0, default: 0, select: false },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);
userSchema.index({ companyId: 1, employeeCode: 1 }, { unique: true });
export const User = model('User', userSchema);
export type UserDocument = InstanceType<typeof User>;

export function publicUser(user: UserDocument) {
  return {
    id: user._id.toString(),
    companyId: user.companyId.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    active: user.active,
    department: user.department,
    designation: user.designation,
    employeeCode: user.employeeCode,
    phone: user.phone,
    address: user.address,
    joinedAt: user.joinedAt,
  };
}
