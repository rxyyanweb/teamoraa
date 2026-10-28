import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../../middleware/security.js';
import {
  createAnnouncement,
  listAnnouncements,
  deleteAnnouncement,
} from './announcement.service.js';

const announcementSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(5).max(5000),
  pinned: z.boolean().optional(),
});

export function announcementRoutes() {
  const router = Router();

  // All authenticated users can view announcements for their company
  router.get('/', async (req, res) => {
    const announcements = await listAnnouncements(req.auth!.companyId);
    res.json({ data: { announcements, total: announcements.length } });
  });

  // HR & Admin can create announcements
  router.post('/', requireRole('admin', 'hr'), async (req, res) => {
    const input = announcementSchema.parse(req.body);
    const data = await createAnnouncement(req.auth!, input);
    res.status(201).json({ data });
  });

  // HR & Admin can delete announcements
  router.delete('/:id', requireRole('admin', 'hr'), async (req, res) => {
    const data = await deleteAnnouncement(req.auth!, String(req.params.id));
    res.json({ data });
  });

  return router;
}
