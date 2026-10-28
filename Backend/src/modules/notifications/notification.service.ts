import mongoose from 'mongoose';
import { Notification } from './notification.model.js';
import { User } from '../users/user.model.js';

export async function createNotification(
  companyId: string,
  userId: string,
  title: string,
  message: string,
  type: 'leave_approved' | 'leave_rejected' | 'payslip_available' | 'announcement' | 'attendance_correction' | 'info' = 'info',
  link = '',
) {
  return Notification.create({
    companyId,
    userId,
    title,
    message,
    type,
    link,
  });
}

export async function notifyCompanyUsers(
  companyId: string,
  title: string,
  message: string,
  type: 'announcement' | 'info' = 'announcement',
  link = '',
  excludeUserId?: string,
) {
  const query: Record<string, any> = { companyId, active: true };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  const users = await User.find(query).select('_id');
  if (users.length === 0) return;

  const docs = users.map((u) => ({
    companyId: new mongoose.Types.ObjectId(companyId),
    userId: u._id,
    title,
    message,
    type,
    link,
    read: false,
    createdAt: new Date(),
  }));

  await Notification.insertMany(docs);
}

export async function listUserNotifications(companyId: string, userId: string, limit = 30) {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ companyId, userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({ companyId, userId, read: false }),
  ]);

  return { notifications, unreadCount };
}

export async function markNotificationAsRead(companyId: string, userId: string, notificationId: string) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, companyId, userId },
    { $set: { read: true } },
    { new: true },
  );
}

export async function markAllNotificationsAsRead(companyId: string, userId: string) {
  await Notification.updateMany({ companyId, userId, read: false }, { $set: { read: true } });
  return { success: true };
}
