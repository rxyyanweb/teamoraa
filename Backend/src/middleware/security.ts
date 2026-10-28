import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Environment } from '../config/environment.js';
import { User, publicUser, type UserDocument } from '../modules/users/user.model.js';
import type { AuthenticatedUser, Role } from '../types/auth.js';
import { ApiError } from '../utils/api-error.js';

export function cookieOptions(env: Environment): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}
export const sessionName = (req: Request) => `teamora_${req.portal}_session`;
const csrfName = (req: Request) => `teamora_${req.portal}_csrf`;
export function safeEqual(a: string, b: string) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}
export function portalGuard(env: Environment): RequestHandler {
  return (req, _res, next) => {
    const portal = req.get('X-Teamora-Portal');
    if (portal !== 'admin' && portal !== 'staff')
      throw new ApiError(400, 'PORTAL_REQUIRED', 'A valid portal header is required.');
    req.portal = portal;
    const origin = req.get('Origin');
    const allowed = [env.FRONTEND_URL, env.ADMIN_PANEL_URL].filter(Boolean);
    if (origin && !allowed.includes(origin))
      throw new ApiError(403, 'ORIGIN_REJECTED', 'This origin cannot use the selected portal.');
    next();
  };
}
export function issueCsrf(req: Request, res: Response, env: Environment) {
  const existing: unknown = req.cookies[csrfName(req)];
  if (typeof existing === 'string' && /^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(existing)) {
    const [nonce, signature] = existing.split('.');
    const expected = createHmac('sha256', env.JWT_SECRET)
      .update(`${req.portal}:${nonce}`)
      .digest('hex');
    if (signature && safeEqual(signature, expected)) return existing;
  }
  const nonce = randomBytes(32).toString('hex');
  const token = `${nonce}.${createHmac('sha256', env.JWT_SECRET).update(`${req.portal}:${nonce}`).digest('hex')}`;
  res.cookie(csrfName(req), token, { ...cookieOptions(env), maxAge: 8 * 60 * 60 * 1000 });
  return token;
}
export function csrfGuard(env: Environment): RequestHandler {
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const header = req.get('X-CSRF-Token') ?? '';
    const cookie = req.cookies[csrfName(req)] as unknown;
    const [nonce, signature] = header.split('.');
    if (
      typeof cookie !== 'string' ||
      !nonce ||
      !signature ||
      !safeEqual(header, cookie) ||
      !safeEqual(
        signature,
        createHmac('sha256', env.JWT_SECRET).update(`${req.portal}:${nonce}`).digest('hex'),
      )
    ) {
      throw new ApiError(
        403,
        'CSRF_REJECTED',
        'Your security token expired. Refresh and try again.',
      );
    }
    next();
  };
}
export function issueSession(req: Request, res: Response, user: UserDocument, env: Environment) {
  const token = jwt.sign({ version: user.sessionVersion }, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: user._id.toString(),
    issuer: 'teamora-api',
    audience: req.portal,
    expiresIn: '8h',
  });
  res.cookie(sessionName(req), token, { ...cookieOptions(env), maxAge: 8 * 60 * 60 * 1000 });
}
export function authenticate(env: Environment): RequestHandler {
  return async (req, _res, next) => {
    let claims: jwt.JwtPayload;
    try {
      const token: unknown = req.cookies[sessionName(req)];
      if (typeof token !== 'string') throw new Error('Missing session');
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'teamora-api',
        audience: req.portal,
      });
      if (typeof decoded === 'string' || !decoded.sub) throw new Error('Invalid session');
      claims = decoded;
    } catch {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }
    const user = await User.findById(claims.sub).select('+sessionVersion');
    if (!user || !user.active || claims.version !== user.sessionVersion)
      throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has expired.');
    if ((req.portal === 'admin') !== (user.role === 'admin'))
      throw new ApiError(403, 'FORBIDDEN', 'This account cannot access this portal.');
    req.auth = publicUser(user) as AuthenticatedUser;
    next();
  };
}
export const passwordChanged: RequestHandler = (req, _res, next) => {
  if (req.auth?.mustChangePassword)
    throw new ApiError(
      403,
      'PASSWORD_CHANGE_REQUIRED',
      'Change your temporary password before continuing.',
    );
  next();
};
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.role))
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this resource.');
    next();
  };
