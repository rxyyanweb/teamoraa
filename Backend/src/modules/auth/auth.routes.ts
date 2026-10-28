import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import type { Environment } from '../../config/environment.js';
import {
  authenticate,
  cookieOptions,
  issueCsrf,
  issueSession,
  safeEqual,
  sessionName,
} from '../../middleware/security.js';
import { Audit } from '../audit/audit.model.js';
import { Company } from '../organization/company.model.js';
import { User, publicUser } from '../users/user.model.js';
import { ApiError } from '../../utils/api-error.js';
import { changePasswordSchema, loginSchema, setupSchema } from './auth.validation.js';

export function authRoutes(env: Environment) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in 15 minutes.' },
    },
  });
  const dummyHash = bcrypt.hashSync('teamora-timing-only-not-a-password', 12);
  router.get('/csrf', (req, res) => res.json({ data: { csrfToken: issueCsrf(req, res, env) } }));
  router.get('/setup-status', async (_req, res) =>
    res.json({ data: { setupRequired: !(await Company.exists({ singleton: 'primary' })) } }),
  );
  router.post('/setup', limiter, async (req, res) => {
    if (req.portal !== 'admin')
      throw new ApiError(403, 'FORBIDDEN', 'Use the Admin Panel for company setup.');
    const input = setupSchema.parse(req.body);
    if (
      !safeEqual(input.email, env.ADMIN_EMAIL) ||
      !safeEqual(input.password, env.ADMIN_PASSWORD)
    ) {
      throw new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Use the administrator credentials configured in Backend/.env.',
      );
    }
    if (await Company.exists({ singleton: 'primary' }))
      throw new ApiError(409, 'ALREADY_CONFIGURED', 'Company setup is already complete.');
    const passwordHash = await bcrypt.hash(input.password, 12);
    const session = await mongoose.startSession();
    try {
      const admin = await session.withTransaction(async () => {
        const [company] = await Company.create([{ name: input.companyName }], { session });
        const [user] = await User.create(
          [
            {
              companyId: company!._id,
              name: input.name,
              email: input.email,
              passwordHash,
              role: 'admin',
              employeeCode: 'ADMIN',
              mustChangePassword: false,
            },
          ],
          { session },
        );
        await Audit.create(
          [
            {
              companyId: company!._id,
              actorId: user!._id,
              action: 'company.setup',
              targetId: company!._id.toString(),
            },
          ],
          { session },
        );
        return user!;
      });
      issueSession(req, res, admin!, env);
      res.status(201).json({ data: { user: publicUser(admin!) } });
    } finally {
      await session.endSession();
    }
  });
  router.post('/login', limiter, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await User.findOne({ email: input.email }).select('+passwordHash +sessionVersion');
    const valid = await bcrypt.compare(input.password, user?.passwordHash ?? dummyHash);
    if (!user || !valid || !user.active || (req.portal === 'admin') !== (user.role === 'admin')) {
      throw new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect for this portal.',
      );
    }
    await Audit.create({
      companyId: user.companyId,
      actorId: user._id,
      action: 'auth.login',
      targetId: user._id.toString(),
    });
    issueSession(req, res, user, env);
    res.json({ data: { user: publicUser(user) } });
  });
  router.get('/me', authenticate(env), (req, res) => res.json({ data: { user: req.auth } }));
  router.post('/change-password', limiter, authenticate(env), async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    const user = await User.findById(req.auth!.id).select('+passwordHash +sessionVersion');
    if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash)))
      throw new ApiError(400, 'INCORRECT_PASSWORD', 'Your current password is incorrect.');
    if (await bcrypt.compare(input.newPassword, user.passwordHash))
      throw new ApiError(
        400,
        'PASSWORD_REUSED',
        'Choose a password different from your current password.',
      );
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        user.passwordHash = await bcrypt.hash(input.newPassword, 12);
        user.mustChangePassword = false;
        user.sessionVersion += 1;
        await user.save({ session });
        await Audit.create(
          [
            {
              companyId: user.companyId,
              actorId: user._id,
              action: 'auth.password_changed',
              targetId: user._id.toString(),
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    issueSession(req, res, user, env);
    issueCsrf(req, res, env); // Client retrieves a fresh token before its next mutation.
    res.json({ data: { user: publicUser(user) } });
  });
  router.post('/logout', authenticate(env), async (req, res) => {
    await User.updateOne({ _id: req.auth!.id }, { $inc: { sessionVersion: 1 } });
    res.clearCookie(sessionName(req), cookieOptions(env));
    res.json({ data: { message: 'Signed out.' } });
  });
  return router;
}
