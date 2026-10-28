import mongoose from 'mongoose';
import { setServers } from 'node:dns/promises';

export async function connectDatabase(uri: string, dnsServers: string[] = []) {
  // Optional process-local resolver override for Windows setups whose configured
  // DNS stub refuses Node's SRV queries. This never changes the OS DNS settings.
  if (dnsServers.length) setServers(dnsServers);
  await mongoose.connect(uri, {
    dbName: 'teamora',
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 60000,
    waitQueueTimeoutMS: 10000,
    autoIndex: false,
  });
  await mongoose.connection.db!.admin().ping();
}
