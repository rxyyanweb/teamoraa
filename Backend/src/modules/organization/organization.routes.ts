import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireRole } from '../../middleware/security.js';
import { Company } from './company.model.js';
import { Audit } from '../audit/audit.model.js';
import { getLeavePolicy, updateLeavePolicy, leavePolicyInput } from './leave-policy.service.js';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const labels = z
  .array(z.string().trim().min(1).max(80))
  .max(100)
  .transform((values) => [...new Set(values)]);
const settingsSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().max(500),
    timezone: z
      .string()
      .max(80)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, 'Choose a valid IANA time zone.'),
    officeStart: time,
    officeEnd: time,
    departments: labels,
    designations: labels,
    graceMinutes: z.number().int().min(0).max(180),
    halfDayHours: z.number().positive().max(12),
    weekend: z
      .array(z.number().int().min(0).max(6))
      .max(6)
      .transform((values) => [...new Set(values)]),
    officeLatitude: z.number().min(-90).max(90).nullable(),
    officeLongitude: z.number().min(-180).max(180).nullable(),
    officeRadius: z.number().min(10).max(10000),
  })
  .strict()
  .refine(
    (input) => (input.officeLatitude === null) === (input.officeLongitude === null),
    'Set both office coordinates or leave both empty.',
  );
export function organizationRoutes() {
  const router = Router();
  router.get('/leave-policy', requireRole('admin', 'hr'), async (req, res) =>
    res.json({ data: { policy: await getLeavePolicy(req.auth!.companyId) } }),
  );
  router.patch('/leave-policy', requireRole('admin'), async (req, res) =>
    res.json({ data: await updateLeavePolicy(req.auth!, leavePolicyInput.parse(req.body)) }),
  );
  router.get('/', requireRole('admin', 'hr'), async (req, res) =>
    res.json({ data: { company: await Company.findById(req.auth!.companyId) } }),
  );
  router.patch('/', requireRole('admin'), async (req, res) => {
    const input = settingsSchema.parse(req.body);
    const session = await mongoose.startSession();
    try {
      const company = await session.withTransaction(async () => {
        const updated = await Company.findByIdAndUpdate(
          req.auth!.companyId,
          { $set: input },
          { new: true, runValidators: true, session },
        );
        await Audit.create(
          [
            {
              companyId: req.auth!.companyId,
              actorId: req.auth!.id,
              action: 'company.updated',
              targetId: req.auth!.companyId,
            },
          ],
          { session },
        );
        return updated;
      });
      res.json({ data: { company } });
    } finally {
      await session.endSession();
    }
  });
  return router;
}
