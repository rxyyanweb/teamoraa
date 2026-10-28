import mongoose from 'mongoose';
import { createServer } from 'node:http';
import { readEnvironment } from './config/environment.js';
import { connectDatabase } from './config/database.js';
import { createApp } from './app.js';
import { ensureModelIndexes } from './config/model-indexes.js';

async function start() {
  const env = readEnvironment();
  await connectDatabase(env.MONGODB_URI, env.DNS_SERVERS);
  // Unique indexes must exist before accepting first-run setup or account creation.
  await ensureModelIndexes();
  const server = createServer(createApp(env));
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(env.PORT, '0.0.0.0', () => {
      server.off('error', reject);
      resolve();
    });
  });
  console.log(`Teamora API listening on port ${env.PORT}; MongoDB ping verified.`);
  let stopping = false;
  const stop = (exitCode = 0) => {
    if (stopping) return;
    stopping = true;
    // Deploy allows five seconds after SIGINT. Bound draining to four seconds.
    const deadline = setTimeout(() => process.exit(1), 4000);
    deadline.unref();
    server.close(() => {
      void mongoose.disconnect().then(
        () => process.exit(exitCode),
        () => process.exit(1),
      );
    });
    server.closeIdleConnections();
  };
  server.on('error', () => {
    console.error('HTTP server failed; shutting down.');
    stop(1);
  });
  process.on('SIGINT', () => stop());
  process.on('SIGTERM', () => stop());
}
start().catch(async (error) => {
  // Validation errors are authored here; database errors can include credentials, so redact.
  console.error(
    error instanceof Error && error.message.startsWith('Invalid backend configuration:')
      ? error.message
      : 'Backend startup failed. Verify the listening port, MongoDB credentials, DNS, Atlas network access and index permissions. No server was started.',
  );
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
