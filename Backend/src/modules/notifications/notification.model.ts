import { Schema, model } from 'mongoose';

const notificationSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['leave_approved', 'leave_rejected', 'payslip_available', 'announcement', 'attendance_correction', 'info'],
      default: 'info',
    },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

notificationSchema.index({ companyId: 1, userId: 1, read: 1, createdAt: -1 });

export const Notification = model('Notification', notificationSchema);
export type NotificationDocument = InstanceType<typeof Notification>;
