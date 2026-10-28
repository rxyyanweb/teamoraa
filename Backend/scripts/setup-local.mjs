import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const envPath = `${root}Backend/.env`;
if (!existsSync(envPath)) {
  const template = readFileSync(`${root}Backend/.env.example`, 'utf8');
  writeFileSync(
    envPath,
    template.replace('JWT_SECRET=\n', `JWT_SECRET=${randomBytes(48).toString('hex')}\n`),
    { flag: 'wx' },
  );
  console.log(
    'Created Backend/.env with a secure JWT secret. Add MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD locally.',
  );
} else {
  console.log('Preserved existing Backend/.env.');
}
for (const app of ['Frontend', 'Admin Panel']) {
  const path = `${root}${app}/.env.local`;
  if (!existsSync(path))
    writeFileSync(path, readFileSync(`${root}${app}/.env.example`, 'utf8'), { flag: 'wx' });
}
