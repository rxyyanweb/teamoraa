import type { CorsOptions } from 'cors';
import type { Environment } from './environment.js';

export function corsOptions(env: Environment): CorsOptions {
  const allowed = [env.FRONTEND_URL, env.ADMIN_PANEL_URL];
  return {
    credentials: true,
    origin(origin, callback) {
      callback(null, !origin || allowed.includes(origin));
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Teamora-Portal'],
  };
}
