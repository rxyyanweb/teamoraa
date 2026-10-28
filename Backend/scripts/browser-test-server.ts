import mongoose from 'mongoose';
import { startTestDatabase } from '../src/tests/test-database.js';
import { createApp } from '../src/app.js';
import { readEnvironment } from '../src/config/environment.js';
import { connectDatabase } from '../src/config/database.js';
import { ensureModelIndexes } from '../src/config/model-indexes.js';

const database = await startTestDatabase();
await connectDatabase(database.getUri());
await ensureModelIndexes();
const env = readEnvironment({
  NODE_ENV: 'test',
  MONGODB_URI: database.getUri(),
  JWT_SECRET: 'browser-test-only-'.repeat(5),
  ADMIN_EMAIL: 'admin@teamora.test',
  ADMIN_PASSWORD: 'Initial-Admin-Password!',
});
const server = createApp(env).listen(5000, '127.0.0.1', () =>
  console.log('Disposable browser-test API ready on port 5000. No Atlas connection.'),
);
async function stop() {
  server.close();
  await mongoose.disconnect();
  await database.stop();
  process.exit(0);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
