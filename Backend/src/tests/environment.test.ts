import { describe, expect, it } from 'vitest';
import { readEnvironment } from '../config/environment.js';
import { cookieOptions } from '../middleware/security.js';

const configuration = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/teamora',
  JWT_SECRET: 'configuration-test-only-'.repeat(4),
  ADMIN_EMAIL: 'admin@teamora.test',
  ADMIN_PASSWORD: 'Configuration-Test-Password!',
};

describe('production security configuration', () => {
  it('supports the unified production frontend without a legacy admin origin', () => {
    const env = readEnvironment({ ...configuration, NODE_ENV: 'production',
      COOKIE_SECURE: 'true', FRONTEND_URL: 'https://teamora-seven.vercel.app' });
    expect(env.ADMIN_PANEL_URL).toBeUndefined();
    expect(cookieOptions(env)).toMatchObject({ secure: true, httpOnly: true, sameSite: 'lax' });
  });
  it('fails closed on missing secrets and insecure production cookies', () => {
    expect(() => readEnvironment({ ...configuration, JWT_SECRET: '' })).toThrow('JWT_SECRET');
    expect(() => readEnvironment({ ...configuration, NODE_ENV: 'production' })).toThrow(
      'COOKIE_SECURE',
    );
    expect(() => readEnvironment({ ...configuration, COOKIE_SAME_SITE: 'none' })).toThrow(
      'COOKIE_SECURE',
    );
  });

  it('rejects HTTP production origins even with secure cookies', () => {
    expect(() =>
      readEnvironment({ ...configuration, NODE_ENV: 'production', COOKIE_SECURE: 'true' }),
    ).toThrow('HTTPS');
  });

  it('supports secure HTTPS production cookies without exposing their values to JavaScript', () => {
    const env = readEnvironment({
      ...configuration,
      NODE_ENV: 'production',
      COOKIE_SECURE: 'true',
      COOKIE_SAME_SITE: 'none',
      FRONTEND_URL: 'https://app.teamora.test',
      ADMIN_PANEL_URL: 'https://admin.teamora.test',
    });
    expect(cookieOptions(env)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
  });
});
