import { createApp } from '../src/app.js';
import { readEnvironment } from '../src/config/environment.js';
import { connectDatabase } from '../src/config/database.js';
import { ensureModelIndexes } from '../src/config/model-indexes.js';

let appInstance: ReturnType<typeof createApp> | null = null;
let initPromise: Promise<ReturnType<typeof createApp>> | null = null;

async function initializeApp() {
  const env = readEnvironment();
  await connectDatabase(env.MONGODB_URI, env.DNS_SERVERS);
  await ensureModelIndexes();
  return createApp(env);
}

export default async function handler(req: unknown, res: unknown) {
  if (!appInstance) {
    if (!initPromise) {
      initPromise = initializeApp();
    }
    appInstance = await initPromise;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (appInstance as any)(req, res);
}
