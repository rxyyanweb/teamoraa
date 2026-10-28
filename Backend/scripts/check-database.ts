import mongoose from 'mongoose';
import { readEnvironment } from '../src/config/environment.js';
import { connectDatabase } from '../src/config/database.js';

try {
  const env = readEnvironment();
  await connectDatabase(env.MONGODB_URI, env.DNS_SERVERS);
  console.log('MongoDB teamora: connected and ping verified (no writes).');
} catch {
  console.error('MongoDB check failed. Check configuration, SRV DNS, TLS, credentials and Atlas Network Access.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
