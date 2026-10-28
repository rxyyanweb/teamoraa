import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { requireRole } from '../../middleware/security.js';
import { ApiError } from '../../utils/api-error.js';
import { User, publicUser } from './user.model.js';
import { createUserSchema, profileSchema, updateUserSchema } from './user.validation.js';
import { createUser, listUsers, resetManagedPassword, updateManagedUser } from './user.service.js';
import { Audit } from '../audit/audit.model.js';

export const validateId: RequestHandler = (req, _res, next) => {
  if (!/^[a-f0-9]{24}$/i.test(String(req.params.id)))
    throw new ApiError(400, 'INVALID_ID', 'Invalid account identifier.');
  next();
};
export function hrAccountRoutes() {
  const router = Router();
  router.use(requireRole('admin'));
  router.get('/', async (req, res) => {
    const query = z
      .object({
        page: z.coerce.number().int().min(1).max(100000).default(1),
        search: z.string().trim().max(100).default(''),
        department: z.string().max(80).optional(),
        designation: z.string().max(80).optional(),
        active: z.enum(['', 'true', 'false']).optional(),
      })
      .parse(req.query);
    res.json({ data: await listUsers(req.auth!.companyId, 'hr', query.page, query.search, query) });
  });
  router.post('/', async (req, res) =>
    res
      .status(201)
      .json({ data: await createUser(req.auth!, createUserSchema.parse(req.body), 'hr') }),
  );
  router.patch('/:id', validateId, async (req, res) =>
    res.json({
      data: await updateManagedUser(
        req.auth!,
        String(req.params.id),
        'hr',
        updateUserSchema.parse(req.body),
      ),
    }),
  );
  router.post('/:id/reset-password', validateId, async (req, res) =>
    res.json({ data: await resetManagedPassword(req.auth!, String(req.params.id), 'hr') }),
  );
  return router;
}
export function profileRoutes() {
  const router = Router();
  router.get('/', (req, res) => res.json({ data: { user: req.auth } }));
  router.patch('/', async (req, res) => {
    const input = profileSchema.parse(req.body);
    const session = await mongoose.startSession();
    try {
      const user = await session.withTransaction(async () => {
        const updated = await User.findOneAndUpdate(
          { _id: req.auth!.id, companyId: req.auth!.companyId },
          { $set: input },
          { new: true, runValidators: true, session },
        );
        await Audit.create(
          [
            {
              companyId: req.auth!.companyId,
              actorId: req.auth!.id,
              action: 'profile.updated',
              targetId: req.auth!.id,
            },
          ],
          { session },
        );
        return updated!;
      });
      res.json({ data: { user: publicUser(user!) } });
    } finally {
      await session.endSession();
    }
  });
  return router;
}

export function managedLoginRoutes() {
  const router = Router();
  router.use(requireRole('admin'));
  router.post('/:id/reset-password', validateId, async (req, res) => {
    const target = await User.findOne({
      _id: req.params.id,
      companyId: req.auth!.companyId,
      role: { $in: ['hr', 'employee'] },
    });
    if (!target) throw new ApiError(404, 'NOT_FOUND', 'Account not found.');
    res.json({ data: await resetManagedPassword(req.auth!, target.id, target.role) });
  });
  router.patch('/:id/status', validateId, async (req, res) => {
    const input = z.object({ active: z.boolean() }).strict().parse(req.body);
    const session = await mongoose.startSession();
    try {
      const user = await session.withTransaction(async () => {
        const target = await User.findOneAndUpdate(
          { _id: req.params.id, companyId: req.auth!.companyId, role: { $in: ['hr', 'employee'] } },
          { $set: input, $inc: { sessionVersion: 1 } },
          { new: true, session },
        );
        if (!target) throw new ApiError(404, 'NOT_FOUND', 'Account not found.');
        await Audit.create(
          [
            {
              companyId: req.auth!.companyId,
              actorId: req.auth!.id,
              action: input.active ? 'account.activated' : 'account.deactivated',
              targetId: target.id,
            },
          ],
          { session },
        );
        return target;
      });
      res.json({ data: { user: publicUser(user!) } });
    } finally {
      await session.endSession();
    }
  });
  return router;
}
