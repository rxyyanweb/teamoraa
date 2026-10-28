// Run after building: node scripts/smoke-production.mjs [absolute-path-to-deno]
// All writes go to a newly created disposable local replica set, never Atlas.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const deno = process.argv[2];
const runtime = deno || process.execPath;
const runtimeArgs = deno ? ['run', '-A'] : [];
const database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const env = { ...process.env, NODE_ENV: 'production', PORT: String(port),
  MONGODB_URI: database.getUri(), DNS_SERVERS: '', JWT_SECRET: randomBytes(48).toString('hex'),
  ADMIN_EMAIL: 'smoke@example.test', ADMIN_PASSWORD: 'Isolated-Smoke-Password-2026!',
  FRONTEND_URL: 'https://teamora-seven.vercel.app', ADMIN_PANEL_URL: 'https://teamora-seven.vercel.app',
  COOKIE_SECURE: 'true', COOKIE_SAME_SITE: 'lax', COOKIE_DOMAIN: '', TRUST_PROXY: '0', GEMINI_API_KEY: '',
};
const child = spawn(runtime, [...runtimeArgs, 'dist/server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let serverOutput = '';
child.stdout.on('data', chunk => { serverOutput += chunk; });
child.stderr.on('data', chunk => { serverOutput += chunk; });
const base = `http://127.0.0.1:${port}`;
const cookies = new Map();
async function request(path, options = {}) {
  const response = await fetch(base + path, { ...options, signal: AbortSignal.timeout(5000), headers: {
    Origin: env.FRONTEND_URL, 'X-Teamora-Portal': 'admin', 'Content-Type': 'application/json',
    Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '), ...options.headers,
  } });
  for (const cookie of response.headers.getSetCookie()) {
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.doesNotMatch(cookie, /;\s*Domain=/i);
    const [pair] = cookie.split(';');
    const index = pair.indexOf('=');
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return response;
}
async function mutate(path, body = {}) {
  const csrf = await request('/api/auth/csrf');
  assert.equal(csrf.status, 200);
  const token = (await csrf.json()).data.csrfToken;
  return request(path, { method: 'POST', headers: { 'X-CSRF-Token': token }, body: JSON.stringify(body) });
}
try {
  let started = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error('Production entrypoint exited before listening');
    try { if ((await fetch(base + '/health')).ok) { started = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(started, 'Server must start within 20 seconds');
  assert.deepEqual(await (await request('/health')).json(), { status: 'ok', service: 'teamora-backend' });
  const conflicting = spawn(runtime, [...runtimeArgs, 'dist/server.js'], { env, stdio: ['ignore', 'ignore', 'pipe'] });
  let failureOutput = '';
  conflicting.stderr.on('data', chunk => { failureOutput += chunk; });
  const conflictTimeout = setTimeout(() => conflicting.kill('SIGKILL'), 15000);
  const [conflictCode] = await once(conflicting, 'exit');
  clearTimeout(conflictTimeout);
  assert.equal(conflictCode, 1, 'Occupied port must fail cleanly');
  assert.match(failureOutput, /Backend startup failed/);
  assert.ok(!failureOutput.includes(env.JWT_SECRET));
  assert.ok(!failureOutput.includes(env.MONGODB_URI));
  console.log('Occupied port: clean exit 1 and redacted startup error PASS.');
  assert.equal((await request('/api/health')).status, 200);
  assert.equal((await request('/api/auth/me')).status, 401);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: '{}' })).status, 403);
  assert.equal((await request('/api/auth/csrf', { headers: { Origin: 'https://evil.test' } })).status, 403);
  const preflight = await request('/api/payroll/salary-structure', { method: 'OPTIONS', headers: {
    'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'X-CSRF-Token,X-Teamora-Portal',
  } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), env.FRONTEND_URL);
  assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
  assert.match(preflight.headers.get('access-control-allow-methods'), /PUT/);
  const credentials = { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD };
  assert.equal((await mutate('/api/auth/setup', { ...credentials, name: 'Smoke Admin', companyName: 'Disposable Test' })).status, 201);
  assert.equal((await request('/api/auth/me')).status, 200);
  assert.equal((await mutate('/api/auth/logout')).status, 200);
  assert.equal((await request('/api/auth/me')).status, 401);
  assert.equal((await mutate('/api/auth/login', credentials)).status, 200);
  assert.equal((await request('/api/auth/me')).status, 200);
  console.log(`${deno ? 'Deno' : 'Node'} production entrypoint: startup, health, MongoDB, cookies, CORS PUT, CSRF, login, session and logout PASS.`);
  await database.stop();
  await new Promise(resolve => setTimeout(resolve, 1000));
  assert.equal((await request('/health')).status, 200);
  assert.equal((await request('/api/health')).status, 503);
  console.log('Disconnected database: liveness 200, readiness 503 PASS.');
} catch (error) {
  // Child only uses synthetic credentials, but still suppress raw driver output.
  console.error('Production smoke failed:', error instanceof assert.AssertionError ? error.message : 'Runtime startup or request failure');
  console.error('Server reached listening state:', serverOutput.includes('Teamora API listening'));
  process.exitCode = 1;
} finally {
  if (child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGINT');
    const force = setTimeout(() => child.kill('SIGKILL'), 6000);
    await exited;
    clearTimeout(force);
  }
  await database.stop();
}
