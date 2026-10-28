import { Router } from 'express';
import {
  listUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './notification.service.js';

export function notificationRoutes() {
  const router = Router();

  router.get('/', async (req, res) => {
    const data = await listUserNotifications(req.auth!.companyId, req.auth!.id);
    res.json({ data });
  });

  router.patch('/:id/read', async (req, res) => {
    const notification = await markNotificationAsRead(
      req.auth!.companyId,
      req.auth!.id,
      String(req.params.id),
    );
    res.json({ data: { notification } });
  });

  router.post('/read-all', async (req, res) => {
    await markAllNotificationsAsRead(req.auth!.companyId, req.auth!.id);
    res.json({ data: { message: 'All notifications marked as read.' } });
  });

  return router;
}
