import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import supertest from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { startTestDatabase } from './test-database.js';
import { createApp } from '../app.js';
import { readEnvironment } from '../config/environment.js';
import { connectDatabase } from '../config/database.js';
import { Company } from '../modules/organization/company.model.js';
import { User } from '../modules/users/user.model.js';
import { Audit } from '../modules/audit/audit.model.js';

// A disposable real MongoDB replica set exercises indexes and transactions. Never Atlas.
const adminEmail = 'admin@teamora.test';
const adminPassword = 'Initial-Admin-Password!';
type Agent = ReturnType<typeof supertest.agent>;
let database: MongoMemoryReplSet;
let app: ReturnType<typeof createApp>;
let admin: Agent;
let hr: Agent;
let employee: Agent;
let hrId: string;
let employeeId: string;
let hrTemporary: string;
let employeeTemporary: string;
const origin = (portal: string) =>
  portal === 'admin' ? 'http://localhost:3001' : 'http://localhost:3000';
const get = (agent: Agent, portal: string, path: string) =>
  agent.get(`/api${path}`).set('X-Teamora-Portal', portal).set('Origin', origin(portal));
async function mutate(
  agent: Agent,
  portal: string,
  path: string,
  body: Record<string, unknown> = {},
  method: 'post' | 'patch' = 'post',
) {
  const token = await get(agent, portal, '/auth/csrf').expect(200);
  return agent[method](`/api${path}`)
    .set('X-Teamora-Portal', portal)
    .set('Origin', origin(portal))
    .set('X-CSRF-Token', token.body.data.csrfToken)
    .send(body);
}
beforeAll(async () => {
  database = await startTestDatabase();
  await connectDatabase(database.getUri());
  await Promise.all([Company.createIndexes(), User.createIndexes(), Audit.createIndexes()]);
  const env = readEnvironment({
    NODE_ENV: 'test',
    MONGODB_URI: database.getUri(),
    JWT_SECRET: 'test-only-'.repeat(10),
    ADMIN_EMAIL: adminEmail,
    ADMIN_PASSWORD: adminPassword,
    ADMIN_PANEL_URL: 'http://localhost:3001',
  });
  app = createApp(env);
  admin = supertest.agent(app);
  hr = supertest.agent(app);
  employee = supertest.agent(app);
});
afterAll(async () => {
  await mongoose.disconnect();
  if (database) await database.stop();
});

describe('Phase 1 authentication, role enforcement and real database persistence', () => {
  it('reports an actual successful database ping and empty setup', async () => {
    const health = await supertest(app).get('/api/health').expect(200);
    expect(health.body.data.database).toBe('teamora');
    expect((await get(admin, 'admin', '/auth/setup-status')).body.data.setupRequired).toBe(true);
    expect(await User.countDocuments()).toBe(0);
  });
  it('rejects unauthenticated data requests, missing CSRF, bad origins and portal headers', async () => {
    await get(supertest.agent(app), 'admin', '/dashboard').expect(401);
    await supertest(app)
      .post('/api/auth/login')
      .set('X-Teamora-Portal', 'staff')
      .send({ email: adminEmail, password: adminPassword })
      .expect(403);
    await supertest(app)
      .get('/api/auth/csrf')
      .set('X-Teamora-Portal', 'admin')
      .set('Origin', 'https://evil.test')
      .expect(403);
    await supertest(app).get('/api/dashboard').expect(400);
    const cors = await supertest(app)
      .options('/api/auth/login')
      .set('Origin', 'https://evil.test')
      .set('Access-Control-Request-Method', 'POST');
    expect(cors.headers['access-control-allow-origin']).toBeUndefined();
    const permitted = await supertest(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST');
    expect(permitted.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(permitted.headers['access-control-allow-credentials']).toBe('true');
  });
  it('protects first-run setup and creates exactly one company/admin atomically', async () => {
    await mutate(admin, 'admin', '/auth/setup', {
      email: adminEmail,
      password: 'Wrong-Password!!',
      name: 'Admin User',
      companyName: 'Teamora Test',
    }).then((response) => expect(response.status).toBe(401));
    const result = await mutate(admin, 'admin', '/auth/setup', {
      email: adminEmail,
      password: adminPassword,
      name: 'Admin User',
      companyName: 'Teamora Test',
    });
    expect(result.status).toBe(201);
    expect(String(result.headers['set-cookie'])).toContain('HttpOnly');
    expect(String(result.headers['set-cookie'])).toContain('SameSite=Lax');
    expect(result.body.data.user.role).toBe('admin');
    expect(result.body.data.user.passwordHash).toBeUndefined();
    expect(result.body.data.user.sessionVersion).toBeUndefined();
    expect(await Company.countDocuments()).toBe(1);
    const repeated = await mutate(admin, 'admin', '/auth/setup', {
      email: adminEmail,
      password: adminPassword,
      name: 'Admin User',
      companyName: 'Another',
    });
    expect(repeated.status).toBe(409);
  });
  it('persists company settings and shows empty real dashboard counts', async () => {
    const company = (await get(admin, 'admin', '/organization')).body.data.company;
    const { _id, singleton, createdAt, updatedAt, ...settings } = company;
    void _id;
    void singleton;
    void createdAt;
    void updatedAt;
    const saved = await mutate(
      admin,
      'admin',
      '/organization',
      { ...settings, departments: ['Engineering'], designations: ['Developer', 'HR Manager'] },
      'patch',
    );
    expect(saved.status).toBe(200);
    expect((await get(admin, 'admin', '/dashboard')).body.data.statistics.totalEmployees).toBe(0);
    expect((await get(admin, 'admin', '/dashboard')).body.data.statistics.departments).toBe(1);
  });
  it('creates HR with a random hashed temporary password and enforces unique email', async () => {
    const response = await mutate(admin, 'admin', '/users/hr', {
      name: 'HR User',
      email: 'hr@teamora.test',
      department: 'Engineering',
      designation: 'HR Manager',
    });
    expect(response.status).toBe(201);
    hrId = response.body.data.user.id;
    hrTemporary = response.body.data.temporaryPassword;
    const stored = await User.findById(hrId).select('+passwordHash');
    expect(stored!.passwordHash).not.toBe(hrTemporary);
    expect(await bcrypt.compare(hrTemporary, stored!.passwordHash)).toBe(true);
    expect(response.body.data.user.mustChangePassword).toBe(true);
    expect(
      (await mutate(admin, 'admin', '/users/hr', { name: 'Duplicate', email: 'hr@teamora.test' }))
        .status,
    ).toBe(409);
  });
  it('signs out/in on Admin portal and rejects all cross-portal sign-ins', async () => {
    expect(
      (
        await mutate(supertest.agent(app), 'staff', '/auth/login', {
          email: adminEmail,
          password: adminPassword,
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await mutate(supertest.agent(app), 'admin', '/auth/login', {
          email: 'hr@teamora.test',
          password: hrTemporary,
        })
      ).status,
    ).toBe(401);
    expect((await mutate(admin, 'admin', '/auth/logout')).status).toBe(200);
    await get(admin, 'admin', '/dashboard').expect(401);
    expect(
      (await mutate(admin, 'admin', '/auth/login', { email: adminEmail, password: adminPassword }))
        .status,
    ).toBe(200);
    await get(admin, 'admin', '/dashboard').expect(200);
  });
  it('blocks temporary-password HR from protected features until password change', async () => {
    const login = await mutate(hr, 'staff', '/auth/login', {
      email: 'hr@teamora.test',
      password: hrTemporary,
    });
    expect(login.status).toBe(200);
    const cookies = login.headers['set-cookie'] as unknown as string[];
    const originalSession = cookies
      .find((value) => value.startsWith('teamora_staff_session='))!
      .split(';')[0]!;
    // Relabeling a staff JWT as an Admin cookie cannot bypass the JWT audience.
    await supertest(app)
      .get('/api/users/hr')
      .set('X-Teamora-Portal', 'admin')
      .set('Origin', origin('admin'))
      .set('Cookie', originalSession.replace('teamora_staff_session=', 'teamora_admin_session='))
      .expect(401);
    const blocked = await get(hr, 'staff', '/employees');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(
      (
        await mutate(hr, 'staff', '/auth/change-password', {
          currentPassword: hrTemporary,
          newPassword: 'A-New-HR-Password!',
        })
      ).status,
    ).toBe(200);
    await get(hr, 'staff', '/dashboard').expect(200);
    // A copied pre-change JWT is revoked, independently of clearing browser cookies.
    await supertest(app)
      .get('/api/dashboard')
      .set('X-Teamora-Portal', 'staff')
      .set('Origin', origin('staff'))
      .set('Cookie', originalSession)
      .expect(401);
  });
  it('denies HR company settings, HR account management, audit, account resets and role injection', async () => {
    await get(hr, 'staff', '/users/hr').expect(403);
    await get(hr, 'staff', '/audit').expect(403);
    expect((await mutate(hr, 'staff', '/organization', {}, 'patch')).status).toBe(403);
    expect((await mutate(hr, 'staff', '/users/accounts/' + hrId + '/reset-password')).status).toBe(
      403,
    );
    expect(
      (
        await mutate(hr, 'staff', '/employees', {
          name: 'Injected Admin',
          email: 'bad@teamora.test',
          role: 'admin',
          basicSalary: 100000,
        })
      ).status,
    ).toBe(400);
  });
  it('HR registers employee with valid salary; Admin only views employee registration', async () => {
    expect(
      (
        await mutate(admin, 'admin', '/employees', {
          name: 'Cannot Register',
          email: 'nobody@teamora.test',
          basicSalary: 50000,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await mutate(hr, 'staff', '/employees', {
          name: 'Invalid Salary',
          email: 'salary@teamora.test',
          basicSalary: -1,
        })
      ).status,
    ).toBe(400);
    const created = await mutate(hr, 'staff', '/employees', {
      name: 'Employee One',
      email: 'employee@teamora.test',
      department: 'Engineering',
      designation: 'Developer',
      basicSalary: 100000,
    });
    expect(created.status).toBe(201);
    employeeId = created.body.data.user.id;
    employeeTemporary = created.body.data.temporaryPassword;
    expect((await get(hr, 'staff', '/employees/' + employeeId)).body.data.user.basicSalary).toBe(
      100000,
    );
  });
  it('enforces temporary-password flow for employees and rejects old passwords', async () => {
    expect(
      (
        await mutate(employee, 'staff', '/auth/login', {
          email: 'employee@teamora.test',
          password: employeeTemporary,
        })
      ).status,
    ).toBe(200);
    await get(employee, 'staff', '/dashboard').expect(403);
    expect(
      (
        await mutate(employee, 'staff', '/auth/change-password', {
          currentPassword: employeeTemporary,
          newPassword: 'A-New-Employee-Password!',
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await mutate(supertest.agent(app), 'staff', '/auth/login', {
          email: 'employee@teamora.test',
          password: employeeTemporary,
        })
      ).status,
    ).toBe(401);
  });
  it('employee sees own data, edits phone/address only and cannot access privileged endpoints', async () => {
    await get(employee, 'staff', '/employees/' + employeeId).expect(200);
    await get(employee, 'staff', '/employees/' + hrId).expect(403);
    for (const path of ['/employees', '/users/hr', '/organization', '/audit'])
      await get(employee, 'staff', path).expect(403);
    expect(
      (
        await mutate(
          employee,
          'staff',
          '/profile',
          { phone: '+923001234567', address: 'Karachi' },
          'patch',
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await mutate(
          employee,
          'staff',
          '/profile',
          { phone: '', address: '', role: 'admin' },
          'patch',
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await mutate(
          employee,
          'staff',
          '/profile',
          { phone: '', address: '', name: 'New identity' },
          'patch',
        )
      ).status,
    ).toBe(400);
    const dashboard = (await get(employee, 'staff', '/dashboard')).body.data;
    expect(dashboard.user.id).toBe(employeeId);
    expect(dashboard.statistics).toBeUndefined();
    expect(dashboard.recentEmployees).toBeUndefined();
  });
  it('Admin controls login status; deactivation and reset immediately revoke sessions', async () => {
    expect(
      (await mutate(hr, 'staff', '/employees/' + employeeId, { active: false }, 'patch')).status,
    ).toBe(400);
    expect(
      (
        await mutate(
          admin,
          'admin',
          '/users/accounts/' + employeeId + '/status',
          { active: false },
          'patch',
        )
      ).status,
    ).toBe(200);
    await get(employee, 'staff', '/auth/me').expect(401);
    expect(
      (
        await mutate(
          admin,
          'admin',
          '/users/accounts/' + employeeId + '/status',
          { active: true },
          'patch',
        )
      ).status,
    ).toBe(200);
    const reset = await mutate(admin, 'admin', '/users/accounts/' + employeeId + '/reset-password');
    expect(reset.status).toBe(200);
    expect(
      (
        await mutate(employee, 'staff', '/auth/login', {
          email: 'employee@teamora.test',
          password: reset.body.data.temporaryPassword,
        })
      ).status,
    ).toBe(200);
    const blocked = await get(employee, 'staff', '/dashboard');
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });
  it('enforces tenant scope even for Admin and HR using manually crafted IDs', async () => {
    const outsiderId = new mongoose.Types.ObjectId();
    const outsider = await User.create({
      companyId: outsiderId,
      role: 'employee',
      employeeCode: 'OUTSIDE',
      name: 'Outside Company',
      email: 'outside@teamora.test',
      passwordHash: 'not-used',
      mustChangePassword: false,
    });
    await get(hr, 'staff', '/employees/' + outsider.id).expect(404);
    await get(admin, 'admin', '/employees/' + outsider.id).expect(404);
    expect(
      (
        await mutate(
          admin,
          'admin',
          '/users/accounts/' + outsider.id + '/status',
          { active: false },
          'patch',
        )
      ).status,
    ).toBe(404);
    const dashboard = (await get(admin, 'admin', '/dashboard')).body.data;
    expect(dashboard.statistics.totalEmployees).toBe(1);
    expect(dashboard.statistics.hrAccounts).toBe(1);
  });
  it('rejects audit modifications and excludes secrets from every audit record', async () => {
    const events = (await get(admin, 'admin', '/audit')).body.data.events;
    expect(events.length).toBeGreaterThan(8);
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain(hrTemporary);
    await expect(Audit.updateMany({}, { $set: { action: 'tampered' } })).rejects.toThrow(
      'append-only',
    );
    await expect(Audit.deleteMany({})).rejects.toThrow('append-only');
  });
  it('searches employee codes and organization fields with bounded, tenant-scoped filters', async () => {
    const person = await User.findById(employeeId);
    expect(person).not.toBeNull();
    const byCode = await get(
      admin,
      'admin',
      '/employees?search=' + encodeURIComponent(person!.employeeCode),
    ).expect(200);
    expect(byCode.body.data.users.map((u: { id: string }) => u.id)).toEqual([employeeId]);
    const byDepartment = await get(
      admin,
      'admin',
      '/employees?department=Engineering&designation=Developer&active=true',
    ).expect(200);
    expect(byDepartment.body.data.users.map((u: { id: string }) => u.id)).toEqual([employeeId]);
    expect(
      (await get(admin, 'admin', '/employees?department=Missing').expect(200)).body.data.total,
    ).toBe(0);
    expect((await get(admin, 'admin', '/employees?active=false').expect(200)).body.data.total).toBe(
      0,
    );
    expect(
      (await get(admin, 'admin', '/employees?search=OUTSIDE').expect(200)).body.data.total,
    ).toBe(0);
    expect((await get(admin, 'admin', '/employees?search=.*').expect(200)).body.data.total).toBe(0);
    expect(byCode.body.data.pageSize).toBe(20);
    expect(byCode.body.data.users[0]).not.toHaveProperty('basicSalary');
    await get(admin, 'admin', '/employees?active=anything').expect(400);
    await get(admin, 'admin', '/employees?department=' + 'x'.repeat(81)).expect(400);
  });
});
