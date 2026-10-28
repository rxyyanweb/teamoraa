import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../../middleware/security.js';
import { ApiError } from '../../utils/api-error.js';
import { User, publicUser } from '../users/user.model.js';
import { validateId } from '../users/user.routes.js';
import { createUserSchema, updateUserSchema } from '../users/user.validation.js';
import { createUser, listUsers, updateManagedUser } from '../users/user.service.js';

export function employeeRoutes() {
  const router = Router();
  router.get('/', requireRole('admin', 'hr'), async (req, res) => {
    const query = z
      .object({
        page: z.coerce.number().int().min(1).max(100000).default(1),
        search: z.string().trim().max(100).default(''),
        department: z.string().max(80).optional(),
        designation: z.string().max(80).optional(),
        active: z.enum(['', 'true', 'false']).optional(),
      })
      .parse(req.query);
    res.json({
      data: await listUsers(req.auth!.companyId, 'employee', query.page, query.search, query),
    });
  });
  router.post('/', requireRole('hr'), async (req, res) =>
    res.status(201).json({
      data: await createUser(
        req.auth!,
        createUserSchema.required({ basicSalary: true }).parse(req.body),
        'employee',
      ),
    }),
  );
  router.get('/:id', validateId, async (req, res) => {
    if (req.auth!.role === 'employee' && req.auth!.id !== req.params.id)
      throw new ApiError(403, 'FORBIDDEN', 'You can only access your own employee record.');
    const user = await User.findOne({
      _id: req.params.id,
      companyId: req.auth!.companyId,
      role: 'employee',
    }).select(req.auth!.role === 'employee' ? '' : '+basicSalary');
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'Employee not found.');
    res.json({
      data: {
        user: {
          ...publicUser(user),
          ...(req.auth!.role !== 'employee' ? { basicSalary: user.basicSalary } : {}),
        },
      },
    });
  });
  router.patch('/:id', requireRole('hr'), validateId, async (req, res) =>
    res.json({
      data: await updateManagedUser(
        req.auth!,
        String(req.params.id),
        'employee',
        updateUserSchema.parse(req.body),
      ),
    }),
  );
  return router;
}
