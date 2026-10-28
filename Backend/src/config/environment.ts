import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { isIP } from 'node:net';

// Resolve Backend/.env from this module in both src/ and dist/, independent of cwd.
// Explicit deployment environment variables retain precedence.
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    MONGODB_URI: z
      .string()
      .min(1, 'Set the teamora-cluster MongoDB URI in Backend/.env')
      .regex(/^mongodb(?:\+srv)?:\/\//),
    DNS_SERVERS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      )
      .refine(
        (values) => values.every((value) => isIP(value) !== 0),
        'Use comma-separated DNS server IP addresses.',
      ),
    JWT_SECRET: z.string().min(64, 'Provide a random secret of at least 64 characters'),
    ADMIN_EMAIL: z.email().transform((value) => value.toLowerCase()),
    ADMIN_PASSWORD: z.string().min(12).max(72),
    FRONTEND_URL: z.url().default('http://localhost:3000'),
    ADMIN_PANEL_URL: z.url().optional(),
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_DOMAIN: z.string().optional(),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    GEMINI_API_KEY: z.string().optional().default(''),
    GEMINI_MODEL: z.string().trim().min(1).default('gemini-3.1-flash-lite'),
    AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(60000),
    AI_RATE_LIMIT_PER_HOUR: z.coerce.number().int().min(1).max(500).default(20),
  })
  .superRefine((env, ctx) => {
    if ((env.NODE_ENV === 'production' || env.COOKIE_SAME_SITE === 'none') && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        message: 'Production and SameSite=None cookies require COOKIE_SECURE=true',
        path: ['COOKIE_SECURE'],
      });
    }
    if (
      env.NODE_ENV === 'production' &&
      [env.FRONTEND_URL, env.ADMIN_PANEL_URL].some((url) => url && !url.startsWith('https://'))
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Production origins must use HTTPS',
        path: ['FRONTEND_URL'],
      });
    }
  });

export type Environment = z.infer<typeof schema>;
export function readEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const result = schema.safeParse(source);
  if (!result.success) {
    // Never print source values, since they may contain credentials.
    throw new Error(
      `Invalid backend configuration: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    );
  }
  return result.data;
}
