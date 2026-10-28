import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import supertest from 'supertest';
import type { MongoMemoryReplSet } from 'mongodb-memory-server';
import { startTestDatabase } from './test-database.js';
import { connectDatabase } from '../config/database.js';
import { ensureModelIndexes } from '../config/model-indexes.js';
import { readEnvironment } from '../config/environment.js';
import { createApp } from '../app.js';
import { Company } from '../modules/organization/company.model.js';
import { User, publicUser } from '../modules/users/user.model.js';
import { LeavePolicy, defaultLeaveTypes } from '../modules/organization/leave-policy.model.js';
import { updateLeavePolicy } from '../modules/organization/leave-policy.service.js';
import { Attendance } from '../modules/attendance/attendance.model.js';
import { checkIn, checkOut } from '../modules/attendance/attendance.service.js';
import { myAttendance, attendanceBoard } from '../modules/attendance/attendance-query.service.js';
import {
  boardInput,
  personalAttendanceInput,
} from '../modules/attendance/attendance.validation.js';
import { Correction } from '../modules/attendance-corrections/correction.model.js';
import {
  requestCorrection,
  decideCorrection,
} from '../modules/attendance-corrections/correction.service.js';
import { correctionDetails } from '../modules/attendance-corrections/correction-query.service.js';
import { Leave } from '../modules/leave/leave.model.js';
import {
  applyLeave,
  decideLeave,
  cancelLeave,
  previewLeave,
} from '../modules/leave/leave.service.js';
import { leaveBalances } from '../modules/leave/leave-balance.service.js';
import { leaveDetails, leaveOverview } from '../modules/leave/leave-query.service.js';
import { leaveOverviewInput } from '../modules/leave/leave.validation.js';
import { Audit } from '../modules/audit/audit.model.js';
import { localDate, localInstant, workingDates } from '../utils/company-date.js';
import type { AuthenticatedUser, Role } from '../types/auth.js';

let database: MongoMemoryReplSet;
let app: ReturnType<typeof createApp>;
let admin: AuthenticatedUser;
let hr: AuthenticatedUser;
let otherHr: AuthenticatedUser;
let employee: AuthenticatedUser;
let peer: AuthenticatedUser;
let employeeAgent: ReturnType<typeof supertest.agent>;
let hrAgent: ReturnType<typeof supertest.agent>;
let adminAgent: ReturnType<typeof supertest.agent>;
const at = (local: string) => new Date(`${local}+05:00`);
const monday = at('2026-10-26T09:00:00');
const requestInput = (type = 'annual', startDate = '2026-11-02', endDate = '2026-11-03') => ({
  type,
  startDate,
  endDate,
  reason: 'Personal time with family',
});
const correction = {
  date: '2026-10-26',
  checkInTime: '09:00',
  checkOutTime: '18:00',
  nextDayCheckout: false,
  reason: 'The checkout was not recorded correctly',
};
const dayEnd = at('2026-10-26T19:00:00');
const status = (error: unknown, code: number) => expect(error).toMatchObject({ status: code });

beforeAll(async () => {
  database = await startTestDatabase();
  await connectDatabase(database.getUri());
  await ensureModelIndexes();
  const company = await Company.create({
    name: 'Disposable Phase Two Test',
    departments: ['Engineering', 'People'],
    timezone: 'Asia/Karachi',
  });
  const hash = await bcrypt.hash('Workforce-Test-Password!', 12);
  async function person(role: Role, name: string, code: string) {
    const user = await User.create({
      companyId: company._id,
      role,
      name,
      email: `${code.toLowerCase()}@teamora.test`,
      employeeCode: code,
      passwordHash: hash,
      mustChangePassword: false,
      joinedAt: new Date('2026-01-01'),
      department: role === 'hr' ? 'People' : 'Engineering',
    });
    return publicUser(user) as AuthenticatedUser;
  }
  admin = await person('admin', 'Company Admin', 'ADMIN');
  hr = await person('hr', 'HR Reviewer', 'HR1');
  otherHr = await person('hr', 'HR Colleague', 'HR2');
  employee = await person('employee', 'Aisha Employee', 'EMP1');
  peer = await person('employee', 'Bilal Employee', 'EMP2');
  app = createApp(
    readEnvironment({
      NODE_ENV: 'test',
      MONGODB_URI: database.getUri(),
      JWT_SECRET: 'workforce-test-secret-'.repeat(4),
      ADMIN_EMAIL: admin.email,
      ADMIN_PASSWORD: 'Workforce-Test-Password!',
    }),
  );
  async function login(actor: AuthenticatedUser) {
    const agent = supertest.agent(app);
    const portal = actor.role === 'admin' ? 'admin' : 'staff';
    const token = await agent.get('/api/auth/csrf').set('X-Teamora-Portal', portal);
    await agent
      .post('/api/auth/login')
      .set('X-Teamora-Portal', portal)
      .set('X-CSRF-Token', token.body.data.csrfToken)
      .send({ email: actor.email, password: 'Workforce-Test-Password!' })
      .expect(200);
    return agent;
  }
  employeeAgent = await login(employee);
  hrAgent = await login(hr);
  adminAgent = await login(admin);
});
beforeEach(async () => {
  await Promise.all([
    Attendance.deleteMany({}),
    Correction.deleteMany({}),
    Leave.deleteMany({}),
    LeavePolicy.deleteMany({}),
  ]);
  await Company.updateOne(
    { _id: admin.companyId },
    {
      $set: {
        timezone: 'Asia/Karachi',
        weekend: [0, 6],
        graceMinutes: 15,
        halfDayHours: 5,
        officeStart: '09:00',
        officeEnd: '18:00',
      },
    },
  );
  await User.updateMany(
    { companyId: admin.companyId },
    { $set: { active: true, joinedAt: new Date('2026-01-01') } },
  );
});
afterAll(async () => {
  await mongoose.disconnect();
  if (database) await database.stop();
});

describe('attendance with real MongoDB and company-local dates', () => {
  it('records a real check-in and completed shift from server times', async () => {
    const input = await checkIn(employee, monday);
    expect(input.attendance.date).toBe('2026-10-26');
    expect(input.attendance.checkedInAt).toEqual(monday);
    const out = await checkOut(employee, at('2026-10-26T18:00:00'));
    expect(out.attendance.workedMinutes).toBe(540);
    expect(out.attendance.status).toBe('present');
    expect(await Attendance.countDocuments()).toBe(1);
  });
  it('returns 409 for duplicate check-in, including simultaneous requests', async () => {
    const results = await Promise.allSettled([
      checkIn(employee, monday),
      checkIn(employee, monday),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find((result) => result.status === 'rejected') as PromiseRejectedResult;
    status(failure.reason, 409);
    expect(await Attendance.countDocuments()).toBe(1);
  });
  it('enforces the unique company/employee/date index independently of application locks', async () => {
    await checkIn(employee, monday);
    const record = await Attendance.findOne().lean();
    const { _id, ...duplicate } = record!;
    void _id;
    await expect(Attendance.create(duplicate)).rejects.toMatchObject({ code: 11000 });
  });
  it('rejects check-out without check-in and repeated concurrent check-outs', async () => {
    await expect(checkOut(employee, monday)).rejects.toMatchObject({ status: 409 });
    await checkIn(employee, monday);
    const results = await Promise.allSettled([
      checkOut(employee, dayEnd),
      checkOut(employee, dayEnd),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    status(
      (results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason,
      409,
    );
  });
  it('treats 09:15 exactly as on time, and preserves late + half-day flags together', async () => {
    expect((await checkIn(peer, at('2026-10-26T09:15:00'))).attendance.isLate).toBe(false);
    expect((await checkIn(employee, at('2026-10-26T09:15:01'))).attendance.isLate).toBe(true);
    const out = await checkOut(employee, at('2026-10-26T13:00:00'));
    expect(out.attendance).toMatchObject({ isLate: true, isHalfDay: true, status: 'half_day' });
    const board = await attendanceBoard(
      hr,
      boardInput.parse({ date: '2026-10-26', department: 'Engineering' }),
      dayEnd,
    );
    expect(board.summary.late).toBe(1);
    expect(board.summary.halfDay).toBe(1);
  });
  it('marks open past shifts missing and permits a safe overnight check-out', async () => {
    await checkIn(employee, monday);
    const nextMorning = at('2026-10-27T08:00:00');
    const history = await myAttendance(
      employee,
      personalAttendanceInput.parse({ month: '2026-10' }),
      undefined,
      nextMorning,
    );
    expect(history.calendar.find((day) => day.date === '2026-10-26')?.status).toBe(
      'missing_checkout',
    );
    await expect(checkIn(employee, nextMorning)).rejects.toMatchObject({
      status: 409,
      code: 'SHIFT_OPEN',
    });
    expect((await checkOut(employee, nextMorning)).attendance.workedMinutes).toBe(1380);
  });
  it('requires a correction for a shift over 24h, while allowing a new-day check-in', async () => {
    await checkIn(employee, monday);
    const later = at('2026-10-27T10:00:00');
    await expect(checkOut(employee, later)).rejects.toMatchObject({ status: 422 });
    await checkIn(employee, later);
    expect(await Attendance.countDocuments()).toBe(2);
  });
  it('uses the company-local date rather than UTC and snapshots rules for existing records', async () => {
    const early = at('2026-10-26T01:30:00');
    expect(early.toISOString().slice(0, 10)).toBe('2026-10-25');
    expect((await checkIn(employee, early)).attendance.date).toBe('2026-10-26');
    await Company.updateOne(
      { _id: admin.companyId },
      { $set: { halfDayHours: 10, officeStart: '00:00' } },
    );
    const out = await checkOut(employee, at('2026-10-26T08:00:00'));
    expect(out.attendance.isLate).toBe(false);
    expect(out.attendance.isHalfDay).toBe(false);
  });
  it('does not manufacture absence for weekends, future dates or before joining', async () => {
    const result = await myAttendance(
      employee,
      personalAttendanceInput.parse({ month: '2026-10' }),
      undefined,
      monday,
    );
    expect(result.calendar.find((day) => day.date === '2026-10-25')?.status).toBe('weekend');
    expect(result.calendar.find((day) => day.date === '2026-10-27')?.status).toBe('upcoming');
    expect(result.calendar.find((day) => day.date === '2026-10-26')?.status).toBe('not_checked_in');
    await User.updateOne({ _id: employee.id }, { $set: { joinedAt: new Date('2026-10-27') } });
    await expect(checkIn(employee, monday)).rejects.toMatchObject({ status: 422 });
  });
  it('supports HR self attendance and blocks Admin attendance writes', async () => {
    await checkIn(hr, monday);
    await checkOut(hr, dayEnd);
    await expect(checkIn(admin, monday)).rejects.toMatchObject({ status: 403 });
  });
  it('filters the real aggregation by department, employee search and status', async () => {
    await checkIn(employee, at('2026-10-26T10:00:00'));
    await checkIn(hr, monday);
    const board = await attendanceBoard(
      admin,
      boardInput.parse({
        date: '2026-10-26',
        department: 'Engineering',
        search: 'Aisha',
        status: 'late',
      }),
      dayEnd,
    );
    expect(board.items).toHaveLength(1);
    expect(board.items[0]?.employee.id).toBe(employee.id);
    expect(board.summary.headcount).toBe(1);
    expect(board.summary.present).toBe(1);
    expect(
      (await attendanceBoard(admin, boardInput.parse({ date: '2026-10-26', search: '.*' }), dayEnd))
        .total,
    ).toBe(0);
  });
});

describe('leave dates, quota and serialized approvals', () => {
  it('provides default annual/sick/casual/unlimited quotas from the policy service', async () => {
    const balances = await leaveBalances(admin.companyId, employee.id, 2026);
    expect(balances.map((item) => item.available)).toEqual([14, 8, 10, null]);
  });
  it('excludes weekends and Admin-configured public holidays in the authoritative preview', async () => {
    await updateLeavePolicy(admin, {
      types: defaultLeaveTypes,
      holidays: [{ date: '2026-11-02', name: 'Office holiday' }],
    });
    const preview = await previewLeave(
      employee,
      requestInput('annual', '2026-10-30', '2026-11-03'),
      monday,
    );
    expect(preview.workingDates).toEqual(['2026-10-30', '2026-11-03']);
    await expect(
      previewLeave(employee, requestInput('annual', '2026-10-31', '2026-11-01'), monday),
    ).rejects.toMatchObject({ status: 422, code: 'NO_WORKING_DAYS' });
  });
  it('uses customized quotas and disables a type for new requests without deleting history', async () => {
    await updateLeavePolicy(admin, {
      types: defaultLeaveTypes.map((type) => ({
        ...type,
        annualQuota: type.code === 'annual' ? 1 : type.annualQuota,
        active: type.code !== 'casual',
      })),
      holidays: [],
    });
    await expect(applyLeave(employee, requestInput(), monday)).rejects.toMatchObject({
      status: 422,
      code: 'INSUFFICIENT_BALANCE',
    });
    await expect(applyLeave(employee, requestInput('casual'), monday)).rejects.toMatchObject({
      status: 422,
      code: 'UNKNOWN_LEAVE_TYPE',
    });
    await expect(
      updateLeavePolicy(hr, { types: defaultLeaveTypes, holidays: [] }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it.each(['annual', 'sick', 'casual', 'unpaid'])(
    'applies and approves %s leave with real balance updates',
    async (type) => {
      const request = await applyLeave(employee, requestInput(type), monday);
      let balance = (await leaveBalances(admin.companyId, employee.id, 2026)).find(
        (item) => item.code === type,
      )!;
      expect(balance.used).toBe(0);
      expect(balance.pending).toBe(2);
      expect(await decideLeave(hr, request.id, 'approved', 'Coverage is arranged', monday)).toEqual({ id: request.id, status: 'approved' });
      balance = (await leaveBalances(admin.companyId, employee.id, 2026)).find(
        (item) => item.code === type,
      )!;
      expect(balance.used).toBe(2);
      expect(balance.pending).toBe(0);
      expect(balance.available).toBe(balance.annualQuota === null ? null : balance.annualQuota - 2);
    },
  );
  it('rejects overlaps with 422, including simultaneous applications', async () => {
    const results = await Promise.allSettled([
      applyLeave(employee, requestInput(), monday),
      applyLeave(employee, requestInput('sick', '2026-11-03', '2026-11-04'), monday),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    status(
      (results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason,
      422,
    );
  });
  it('rejects over-balance applications with 422', async () => {
    await expect(
      applyLeave(employee, requestInput('annual', '2026-11-02', '2026-11-20'), monday),
    ).rejects.toMatchObject({ status: 422, code: 'INSUFFICIENT_BALANCE' });
  });
  it('prevents concurrent approvals from overspending quota without reserving pending requests', async () => {
    const first = await applyLeave(
      employee,
      requestInput('sick', '2026-11-02', '2026-11-09'),
      monday,
    );
    const second = await applyLeave(
      employee,
      requestInput('sick', '2026-11-16', '2026-11-23'),
      monday,
    );
    const results = await Promise.allSettled([
      decideLeave(hr, first.id, 'approved', 'Approved after review', monday),
      decideLeave(otherHr, second.id, 'approved', 'Approved after review', monday),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    status(
      (results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason,
      422,
    );
    expect(
      (await leaveBalances(admin.companyId, employee.id, 2026)).find((type) => type.code === 'sick')
        ?.used,
    ).toBe(6);
  });
  it('rejects repeat decisions and saves a rejection comment without consuming leave', async () => {
    const request = await applyLeave(employee, requestInput(), monday);
    await decideLeave(hr, request.id, 'rejected', 'Please arrange alternative coverage', monday);
    await expect(
      decideLeave(hr, request.id, 'approved', 'Changed decision', monday),
    ).rejects.toMatchObject({ status: 409 });
    expect((await leaveDetails(employee, request.id, monday)).request.decisionComment).toContain(
      'coverage',
    );
    expect((await leaveBalances(admin.companyId, employee.id, 2026))[0]?.used).toBe(0);
  });
  it('restores approved quota on eligible cancellation, and rejects cancellation once leave starts', async () => {
    const request = await applyLeave(employee, requestInput(), monday);
    await decideLeave(hr, request.id, 'approved', 'Approved after review', monday);
    await cancelLeave(employee, request.id, monday);
    expect((await leaveBalances(admin.companyId, employee.id, 2026))[0]?.available).toBe(14);
    const started = await applyLeave(
      employee,
      requestInput('annual', '2026-10-26', '2026-10-26'),
      monday,
    );
    await decideLeave(hr, started.id, 'approved', 'Approved after review', monday);
    await expect(cancelLeave(employee, started.id, monday)).rejects.toMatchObject({
      status: 422,
      code: 'LEAVE_STARTED',
    });
  });
  it('splits cross-year requests against each calendar-year quota with no carry-forward', async () => {
    const request = await applyLeave(
      employee,
      requestInput('annual', '2026-12-31', '2027-01-04'),
      monday,
    );
    await decideLeave(hr, request.id, 'approved', 'Year boundaries reviewed', monday);
    expect((await leaveBalances(admin.companyId, employee.id, 2026))[0]?.used).toBe(1);
    expect((await leaveBalances(admin.companyId, employee.id, 2027))[0]?.used).toBe(2);
  });
  it('keeps requested working dates stable when holidays change later', async () => {
    const request = await applyLeave(employee, requestInput(), monday);
    await updateLeavePolicy(admin, {
      types: defaultLeaveTypes,
      holidays: [{ date: '2026-11-02', name: 'New holiday' }],
    });
    await decideLeave(hr, request.id, 'approved', 'Original dates verified', monday);
    expect((await leaveDetails(employee, request.id, monday)).request.workingDays).toBe(2);
  });
  it('requires another HR reviewer for HR leave and refuses Admin approval', async () => {
    const request = await applyLeave(hr, requestInput(), monday);
    await expect(
      decideLeave(hr, request.id, 'approved', 'Self review', monday),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      decideLeave(admin, request.id, 'approved', 'Admin review', monday),
    ).rejects.toMatchObject({ status: 403 });
    await decideLeave(otherHr, request.id, 'approved', 'Reviewed by another HR', monday);
  });
  it('counts approved leave instead of absence and rejects check-in on approved leave', async () => {
    const request = await applyLeave(employee, requestInput(), monday);
    await decideLeave(hr, request.id, 'approved', 'Coverage approved', monday);
    const leaveDay = at('2026-11-02T19:00:00');
    const board = await attendanceBoard(
      admin,
      boardInput.parse({ date: '2026-11-02', department: 'Engineering' }),
      leaveDay,
    );
    expect(board.summary.onLeave).toBe(1);
    expect(board.summary.absent).toBe(1);
    await expect(checkIn(employee, leaveDay)).rejects.toMatchObject({
      status: 409,
      code: 'ON_APPROVED_LEAVE',
    });
    const overview = await leaveOverview(
      admin,
      leaveOverviewInput.parse({ year: 2026, department: 'Engineering' }),
      monday,
    );
    expect(overview.summary.approvedDays).toBe(2);
    expect(overview.departmentUsage[0]?.approvedDays).toBe(2);
  });
  it('revalidates attendance conflicts at approval time', async () => {
    const request = await applyLeave(employee, requestInput(), monday);
    await checkIn(employee, at('2026-11-02T09:00:00'));
    await expect(
      decideLeave(hr, request.id, 'approved', 'Review after check-in', at('2026-11-02T10:00:00')),
    ).rejects.toMatchObject({ status: 409, code: 'ATTENDANCE_CONFLICT' });
  });
  it('isolates employee leave details and cancellation by owner', async () => {
    const request = await applyLeave(employee, requestInput(), monday);
    await expect(leaveDetails(peer, request.id, monday)).rejects.toMatchObject({ status: 404 });
    await expect(cancelLeave(peer, request.id, monday)).rejects.toMatchObject({ status: 404 });
    expect((await leaveDetails(admin, request.id, monday)).request.canDecide).toBe(false);
  });
});

describe('correction approval and immutable snapshots', () => {
  it('keeps official data unchanged until HR approves, then recalculates late and half-day flags', async () => {
    await checkIn(employee, at('2026-10-26T10:00:00'));
    await checkOut(employee, at('2026-10-26T11:00:00'));
    const request = await requestCorrection(employee, correction, dayEnd);
    expect((await Attendance.findOne())!.isHalfDay).toBe(true);
    await decideCorrection(hr, request.id, 'approved', 'Verified against office records', dayEnd);
    const corrected = await Attendance.findOne();
    expect(corrected).toMatchObject({
      isLate: false,
      isHalfDay: false,
      workedMinutes: 540,
      corrected: true,
    });
    const audit = await Audit.findOne({ action: 'attendance.corrected', targetId: corrected!.id })
      .sort({ createdAt: -1 })
      .lean();
    expect(audit?.before).toMatchObject({ isLate: true, isHalfDay: true });
    expect(audit?.after).toMatchObject({ isLate: false, isHalfDay: false });
  });
  it('can fill a missing attendance date and rejects duplicate processing', async () => {
    const request = await requestCorrection(employee, correction, dayEnd);
    await decideCorrection(hr, request.id, 'approved', 'Office entry confirmed', dayEnd);
    expect(await Attendance.countDocuments()).toBe(1);
    await expect(
      decideCorrection(hr, request.id, 'approved', 'Second review', dayEnd),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('rejects duplicate pending corrections and unauthorized reviewers', async () => {
    const request = await requestCorrection(employee, correction, dayEnd);
    await expect(requestCorrection(employee, correction, dayEnd)).rejects.toMatchObject({
      status: 409,
    });
    await expect(
      decideCorrection(admin, request.id, 'approved', 'Admin review', dayEnd),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      decideCorrection(employee, request.id, 'approved', 'Own review', dayEnd),
    ).rejects.toMatchObject({ status: 403 });
    await expect(correctionDetails(peer, request.id)).rejects.toMatchObject({ status: 404 });
    await expect(requestCorrection(hr, correction, dayEnd)).rejects.toMatchObject({ status: 403 });
  });
  it('detects a stale correction when an employee checks out after submitting it', async () => {
    await checkIn(employee, monday);
    const request = await requestCorrection(
      employee,
      { ...correction, checkOutTime: '10:00' },
      at('2026-10-26T11:00:00'),
    );
    await checkOut(employee, at('2026-10-26T12:00:00'));
    await expect(
      decideCorrection(hr, request.id, 'approved', 'Old snapshot', dayEnd),
    ).rejects.toMatchObject({ status: 409, code: 'CORRECTION_STALE' });
    await decideCorrection(
      hr,
      request.id,
      'rejected',
      'Please submit the latest attendance values',
      dayEnd,
    );
    expect((await correctionDetails(employee, request.id)).request.status).toBe('rejected');
  });
  it('rejects future, reversed and excessive correction times', async () => {
    await expect(requestCorrection(employee, correction, monday)).rejects.toMatchObject({
      status: 422,
    });
    await expect(
      requestCorrection(employee, { ...correction, checkOutTime: '08:00' }, dayEnd),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      requestCorrection(
        employee,
        { ...correction, nextDayCheckout: true },
        at('2026-10-27T20:00:00'),
      ),
    ).rejects.toMatchObject({ status: 422 });
  });
  it('serializes leave and correction approvals so the same day cannot be both worked and on leave', async () => {
    const leave = await applyLeave(
      employee,
      requestInput('annual', '2026-10-26', '2026-10-26'),
      monday,
    );
    const request = await requestCorrection(employee, correction, dayEnd);
    const outcomes = await Promise.allSettled([
      decideLeave(hr, leave.id, 'approved', 'Leave review', dayEnd),
      decideCorrection(otherHr, request.id, 'approved', 'Attendance review', dayEnd),
    ]);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    status(
      (outcomes.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason,
      409,
    );
  });
});

describe('HTTP permissions, CSRF and date edge cases', () => {
  async function mutation(
    agent: typeof employeeAgent,
    portal: string,
    path: string,
    body: object = {},
  ) {
    const csrf = await agent.get('/api/auth/csrf').set('X-Teamora-Portal', portal);
    return agent
      .post(`/api${path}`)
      .set('X-Teamora-Portal', portal)
      .set('X-CSRF-Token', csrf.body.data.csrfToken)
      .send(body);
  }
  it('rejects client-controlled timestamps and arbitrary employee selectors', async () => {
    expect(
      (await mutation(employeeAgent, 'staff', '/attendance/check-in', { checkedInAt: monday }))
        .status,
    ).toBe(400);
    await employeeAgent
      .get('/api/attendance/me')
      .query({ employeeId: peer.id })
      .set('X-Teamora-Portal', 'staff')
      .expect(400);
    await employeeAgent
      .get(`/api/attendance/employees/${peer.id}`)
      .set('X-Teamora-Portal', 'staff')
      .expect(403);
    await employeeAgent.get('/api/attendance/board').set('X-Teamora-Portal', 'staff').expect(403);
    await employeeAgent.get('/api/leave/overview').set('X-Teamora-Portal', 'staff').expect(403);
    expect((await mutation(adminAgent, 'admin', '/attendance/check-in')).status).toBe(403);
    expect(
      (
        await mutation(
          adminAgent,
          'admin',
          `/leave/requests/${new mongoose.Types.ObjectId()}/approve`,
          { comment: 'Not authorized' },
        )
      ).status,
    ).toBe(403);
  });
  it('allows company overviews to HR/Admin and returns meaningful empty results', async () => {
    for (const [agent, portal] of [
      [hrAgent, 'staff'],
      [adminAgent, 'admin'],
    ] as const) {
      const result = await agent
        .get('/api/leave/overview')
        .set('X-Teamora-Portal', portal)
        .expect(200);
      expect(result.body.data.summary.total).toBe(0);
      await agent.get('/api/attendance/board').set('X-Teamora-Portal', portal).expect(200);
    }
  });
  it('keeps the CSRF token stable across tabs while rejecting a forged token', async () => {
    const first = await employeeAgent.get('/api/auth/csrf').set('X-Teamora-Portal', 'staff');
    const next = await employeeAgent.get('/api/auth/csrf').set('X-Teamora-Portal', 'staff');
    expect(next.body.data.csrfToken).toBe(first.body.data.csrfToken);
    await employeeAgent
      .post('/api/attendance/check-in')
      .set('X-Teamora-Portal', 'staff')
      .set('X-CSRF-Token', 'forged')
      .send({})
      .expect(403);
  });
  it('handles DST/local-date boundaries and refuses ambiguous correction times', () => {
    expect(localDate(new Date('2026-10-25T20:30:00Z'), 'Asia/Karachi')).toBe('2026-10-26');
    expect(() => localInstant('2026-03-08', '02:30', 'America/New_York')).toThrow(
      'invalid or ambiguous',
    );
    expect(() => localInstant('2026-11-01', '01:30', 'America/New_York')).toThrow(
      'invalid or ambiguous',
    );
    expect(workingDates('2026-10-30', '2026-11-03', [0, 6], [{ date: '2026-11-02' }])).toEqual([
      '2026-10-30',
      '2026-11-03',
    ]);
  });
});
