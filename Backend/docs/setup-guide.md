# Setup and operations

## Windows local setup

1. Open PowerShell at `E:\SMIT Hacathon\Project`.
2. Run `npm install` and `npm run setup:local`.
3. Edit `Backend\.env`: add the existing `teamora-cluster` URI, first Admin email and a 12+ character initial password. Do not paste secrets into either Next.js app. Quote environment values containing `#`, because dotenv otherwise treats the rest as a comment. URI passwords must be URL encoded when necessary.
4. In Atlas Network Access allow this machine's IP. In Database Access configure a database user authorized for the `teamora` database, transactions and initial indexes.
5. Run `npm run check:db`; require PASS, then `npm run dev`.
6. Open Admin port 3001 `/setup`. Supply company name, your name and the exact `.env` Admin credentials. Setup creates exactly one company and Admin transactionally.
7. Save departments/designations and office settings under Organization. Create HR under HR accounts. Copy/share the temporary password securely before dismissing it.
8. HR signs into port 3000, changes the password and registers employees with job details and a positive basic salary. Each employee follows the same first-password-change flow.

`npm run setup:local` never overwrites an existing environment file. If an environment file already exists but lacks a value, fill that value manually. `JWT_SECRET` should be a securely random 64+ character secret; changing it invalidates all sessions. No default Admin credentials are created or printed by setup.

## Troubleshooting

- **API exits before listening:** inspect the configuration field names reported, fix `.env`, then check Atlas IP allowlist and database permissions. The server intentionally does not run with a fake database fallback.
- **Node SRV DNS queries fail with ECONNREFUSED:** this PC's Node resolver initially pointed to an unavailable `127.0.0.1` DNS stub. The local backend now uses `DNS_SERVERS=1.1.1.1,8.8.8.8`. This changes DNS only inside the backend process. `.env.example` leaves it blank; omit it on hosts with working system DNS.
- **Cannot reach Teamora:** confirm the API is on 5000 and Next.js public env values are `http://localhost:5000/api`. Use `localhost` consistently in browsers; do not mix it with `127.0.0.1` origins.
- **Company already configured:** use Login. `.env` bootstrap credentials are only for the initial setup; after changing the Admin password, use the stored new password.
- **First login redirects to password change:** expected for HR/Employee temporary passwords. Other data APIs remain blocked until a new password is saved.
- **HR cannot deactivate/reset an employee:** expected by the PDF access matrix. Use Admin → People directory → View details.
- **Invalid department/designation:** create it in Admin organization settings before assigning it.
- **Browser tests fail because a port is busy:** stop the development servers. Tests start their own isolated API on 5000 and web apps on 3000/3001.
- **MongoDB test binary download fails:** retry with internet access; tests do not substitute a mock connection or touch Atlas. Playwright also requires its Chromium installation.

## Production configuration (Phase 5 deployment)

Build with `npm run build`. Start workspaces separately with `npm run start -w @teamora/backend`, `npm run start -w @teamora/frontend`, `npm run start -w @teamora/admin`. Provide the appropriate actual API address in each web app's public env **at build time**. Backend startup loads its `.env` relative to the Backend workspace or deployment-provided process environment.

Use HTTPS origins in `FRONTEND_URL`/`ADMIN_PANEL_URL` and `NODE_ENV=production`, `COOKIE_SECURE=true`. Use a same-site API domain where possible. Set `COOKIE_SAME_SITE=none` only if cross-site requests require it and the browser permits third-party cookies. Leave `COOKIE_DOMAIN` empty for host-only API cookies unless a verified deployment needs a shared parent domain. Configure `TRUST_PROXY` for the actual trusted reverse-proxy hop count, never arbitrarily trust forwarded IPs. Shared rate-limit storage is needed for multiple API replicas. Apply insert/find-only collection permissions to the audit collection. No hosted deployment is included in Phase 1.

## Secrets and generated output

Only `.env.example` files belong in version control. The root ignore file excludes `.env`, `.env.local`, dependencies, Next.js builds, API compilation, screenshots, browser traces and test reports. The Gemini key stays in `Backend/.env` for the future backend AI service. There is no secret-bearing browser runtime configuration.
