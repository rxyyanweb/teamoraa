import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../../middleware/security.js';
import { Audit } from './audit.model.js';
export function auditRoutes() {
  const router = Router();
  router.get('/', requireRole('admin'), async (req, res) => {
    const query = z
      .object({
        page: z.coerce.number().int().min(1).max(100000).default(1),
        action: z.string().optional(),
        entity: z.string().optional(),
        search: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .parse(req.query);

    const filter: Record<string, any> = { companyId: req.auth!.companyId };

    if (query.action) {
      filter.action = query.action;
    }
    if (query.entity) {
      filter.entity = query.entity;
    }
    if (query.search) {
      filter.$or = [
        { action: { $regex: query.search, $options: 'i' } },
        { entity: { $regex: query.search, $options: 'i' } },
        { targetId: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate + 'T23:59:59.999Z');
    }

    const [events, total] = await Promise.all([
      Audit.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * 25)
        .limit(25)
        .lean(),
      Audit.countDocuments(filter),
    ]);
    res.json({ data: { events, total, page: query.page, pageSize: 25 } });
  });
  return router;
}
