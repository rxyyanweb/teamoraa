import type { ClientSession } from 'mongoose';
import type { AuthenticatedUser } from '../../types/auth.js';
import { Audit } from './audit.model.js';
export async function writeAudit(
  actor: AuthenticatedUser,
  action: string,
  entity: string,
  targetId: string,
  before: unknown,
  after: unknown,
  session: ClientSession,
) {
  // Callers provide explicit business-field snapshots, never entire user documents.
  await Audit.create(
    [{ companyId: actor.companyId, actorId: actor.id, action, entity, targetId, before, after }],
    { session },
  );
}
