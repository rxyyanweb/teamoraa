import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import type { Environment } from './config/environment.js';
import { corsOptions } from './config/cors.js';
import { authenticate, csrfGuard, passwordChanged, portalGuard } from './middleware/security.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { hrAccountRoutes, managedLoginRoutes, profileRoutes } from './modules/users/user.routes.js';
import { employeeRoutes } from './modules/employees/employee.routes.js';
import { organizationRoutes } from './modules/organization/organization.routes.js';
import { dashboardRoutes } from './modules/analytics/dashboard.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { attendanceRoutes } from './modules/attendance/attendance.routes.js';
import { correctionRoutes } from './modules/attendance-corrections/correction.routes.js';
import { leaveRoutes } from './modules/leave/leave.routes.js';
import { payrollRoutes } from './modules/payroll/payroll.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { announcementRoutes } from './modules/announcements/announcement.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';

export function createApp(env: Environment) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  const helmetHandler =
    typeof helmet === 'function'
      ? (helmet as unknown as () => express.RequestHandler)()
      : typeof (helmet as unknown as { default?: () => express.RequestHandler }).default === 'function'
        ? (helmet as unknown as { default: () => express.RequestHandler }).default()
        : ((_req: express.Request, _res: express.Response, next: express.NextFunction) => next());
  app.use(helmetHandler, cors(corsOptions(env)), express.json({ limit: '16kb' }), cookieParser());
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'teamora-backend' });
  });
  // Keep the existing API health contract as the database readiness check.
  app.get('/api/health', async (_req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) throw new Error('Disconnected');
      await mongoose.connection.db!.admin().ping({ timeoutMS: 3000 });
      res.json({ data: { status: 'ready', database: 'teamora' } });
    } catch {
      res
        .status(503)
        .json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is unavailable.' } });
    }
  });
  app.use(
    '/api',
    rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }),
    portalGuard(env),
    csrfGuard(env),
  );
  app.use('/api/auth', authRoutes(env));
  app.use('/api', authenticate(env), passwordChanged);
  app.use('/api/users/hr', hrAccountRoutes());
  app.use('/api/users/accounts', managedLoginRoutes());
  app.use('/api/employees', employeeRoutes());
  app.use('/api/profile', profileRoutes());
  app.use('/api/organization', organizationRoutes());
  app.use('/api/dashboard', dashboardRoutes());
  app.use('/api/audit', auditRoutes());
  app.use('/api/attendance', attendanceRoutes());
  app.use('/api/attendance-corrections', correctionRoutes());
  app.use('/api/leave', leaveRoutes());
  app.use('/api/payroll', payrollRoutes());
  app.use('/api/analytics', analyticsRoutes());
  app.use('/api/announcements', announcementRoutes());
  app.use('/api/notifications', notificationRoutes());
  app.use('/api/ai', aiRoutes(env));
  app.use((_req, res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } }),
  );
  app.use(errorHandler);
  return app;
}
