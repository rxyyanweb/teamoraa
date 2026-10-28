import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import type { AuthenticatedUser, Role } from '../../types/auth.js';
import { ApiError } from '../../utils/api-error.js';
import { Company } from '../organization/company.model.js';
import { Audit } from '../audit/audit.model.js';
import { User, publicUser } from './user.model.js';
import { createUserSchema, updateUserSchema } from './user.validation.js';

async function validateOrganization(
  companyId: string,
  input: { department?: string; designation?: string },
) {
  const company = await Company.findById(companyId);
  if (!company) throw new ApiError(404, 'NOT_FOUND', 'Company not found.');
  if (input.department && !company.departments.includes(input.department))
    throw new ApiError(400, 'INVALID_DEPARTMENT', 'Choose a department from company settings.');
  if (input.designation && !company.designations.includes(input.designation))
    throw new ApiError(400, 'INVALID_DESIGNATION', 'Choose a designation from company settings.');
}
export async function createUser(
  actor: AuthenticatedUser,
  input: z.infer<typeof createUserSchema>,
  role: 'hr' | 'employee',
) {
  await validateOrganization(actor.companyId, input);
  const temporaryPassword = `T!${randomBytes(18).toString('base64url')}`;
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const session = await mongoose.startSession();
  try {
    const user = await session.withTransaction(async () => {
      const [created] = await User.create(
        [
          {
            ...input,
            joinedAt: input.joinedAt ? new Date(input.joinedAt) : new Date(),
            companyId: actor.companyId,
            role,
            passwordHash,
            employeeCode: `${role === 'hr' ? 'HR' : 'EMP'}-${randomBytes(4).toString('hex').toUpperCase()}`,
          },
        ],
        { session },
      );
      await Audit.create(
        [
          {
            companyId: actor.companyId,
            actorId: actor.id,
            action: `${role}.created`,
            targetId: created!._id.toString(),
          },
        ],
        { session },
      );
      return created!;
    });
    return { user: publicUser(user!), temporaryPassword };
  } finally {
    await session.endSession();
  }
}
export async function listUsers(
  companyId: string,
  role: Role,
  page = 1,
  search = '',
  options: { department?: string; designation?: string; active?: string } = {},
) {
  // Escape user text; never accept raw MongoDB filters or regex patterns.
  const literal = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = {
    companyId,
    role,
    ...(options.department ? { department: options.department } : {}),
    ...(options.designation ? { designation: options.designation } : {}),
    ...(options.active ? { active: options.active === 'true' } : {}),
    ...(search
      ? {
          $or: [
            { name: { $regex: literal, $options: 'i' } },
            { email: { $regex: literal, $options: 'i' } },
            { employeeCode: { $regex: literal, $options: 'i' } },
            { department: { $regex: literal, $options: 'i' } },
            { designation: { $regex: literal, $options: 'i' } },
          ],
        }
      : {}),
  };
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * 20)
      .limit(20),
    User.countDocuments(filter),
  ]);
  return { users: users.map(publicUser), page, pageSize: 20, total };
}
export async function updateManagedUser(
  actor: AuthenticatedUser,
  id: string,
  role: Role,
  input: z.infer<typeof updateUserSchema>,
) {
  await validateOrganization(actor.companyId, input);
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const user = await User.findOneAndUpdate(
        { _id: id, companyId: actor.companyId, role },
        { $set: input },
        { new: true, runValidators: true, session },
      );
      if (!user) throw new ApiError(404, 'NOT_FOUND', 'Account not found.');
      await Audit.create(
        [
          {
            companyId: actor.companyId,
            actorId: actor.id,
            action: `${role}.updated`,
            targetId: id,
          },
        ],
        { session },
      );
      return { user: publicUser(user) };
    });
  } finally {
    await session.endSession();
  }
}
export async function resetManagedPassword(actor: AuthenticatedUser, id: string, role: Role) {
  const temporaryPassword = `T!${randomBytes(18).toString('base64url')}`;
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const user = await User.findOneAndUpdate(
        { _id: id, companyId: actor.companyId, role },
        {
          $set: { passwordHash, mustChangePassword: true },
          $inc: { sessionVersion: 1 },
        },
        { new: true, session },
      );
      if (!user) throw new ApiError(404, 'NOT_FOUND', 'Account not found.');
      await Audit.create(
        [
          {
            companyId: actor.companyId,
            actorId: actor.id,
            action: `${role}.password_reset`,
            targetId: id,
          },
        ],
        { session },
      );
    });
    return { temporaryPassword };
  } finally {
    await session.endSession();
  }
}
