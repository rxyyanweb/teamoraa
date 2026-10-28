import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

export function startTestDatabase() {
  // Reuse a locally prepared official server when available, otherwise use the
  // package's normal versioned download cache. Neither path ever connects to Atlas.
  const localBinary = fileURLToPath(new URL('../../../.local/mongodb/mongod.exe', import.meta.url));
  return MongoMemoryReplSet.create({
    binary: existsSync(localBinary) ? { systemBinary: localBinary, version: '7.0.24' } : undefined,
    replSet: { count: 1 },
  });
}
