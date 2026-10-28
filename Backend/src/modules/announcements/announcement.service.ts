import { Announcement } from './announcement.model.js';
import { Audit } from '../audit/audit.model.js';
import { notifyCompanyUsers } from '../notifications/notification.service.js';
import { ApiError } from '../../utils/api-error.js';
import type { AuthenticatedUser } from '../../types/auth.js';

export async function createAnnouncement(
  actor: AuthenticatedUser,
  input: { title: string; content: string; pinned?: boolean },
) {
  if (actor.role !== 'admin' && actor.role !== 'hr') {
    throw new ApiError(403, 'FORBIDDEN', 'Only Admin and HR can post announcements.');
  }

  const announcement = await Announcement.create({
    companyId: actor.companyId,
    title: input.title.trim(),
    content: input.content.trim(),
    authorId: actor.id,
    authorName: actor.name,
    authorRole: actor.role,
    pinned: !!input.pinned,
  });

  // Notify company users
  await notifyCompanyUsers(
    actor.companyId,
    `New Announcement: ${announcement.title}`,
    announcement.content.slice(0, 120),
    'announcement',
    '#announcements',
    actor.id,
  );

  // Audit log
  await Audit.create({
    companyId: actor.companyId,
    actorId: actor.id,
    action: 'announcement.created',
    targetId: announcement._id.toString(),
    entity: 'announcement',
  });

  return announcement;
}

export async function listAnnouncements(companyId: string, limit = 30) {
  return Announcement.find({ companyId })
    .sort({ pinned: -1, createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function deleteAnnouncement(actor: AuthenticatedUser, announcementId: string) {
  if (actor.role !== 'admin' && actor.role !== 'hr') {
    throw new ApiError(403, 'FORBIDDEN', 'Only Admin and HR can delete announcements.');
  }

  const query: Record<string, any> = { _id: announcementId, companyId: actor.companyId };
  if (actor.role === 'hr') {
    query.authorId = actor.id; // HR can only delete their own announcements
  }

  const announcement = await Announcement.findOneAndDelete(query);
  if (!announcement) {
    throw new ApiError(404, 'NOT_FOUND', 'Announcement not found or unauthorized.');
  }

  await Audit.create({
    companyId: actor.companyId,
    actorId: actor.id,
    action: 'announcement.deleted',
    targetId: announcementId,
    entity: 'announcement',
  });

  return { success: true };
}
