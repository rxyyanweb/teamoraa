# Teamora: current Deno Deploy deployment guide

Prepared and locally verified on 2026-10-27. No commit, push or cloud deployment was performed.

## Root cause and audit

The original production TypeScript build already passed. `tsconfig.build.json` sets `rootDir` to `src`, so the real output is **`dist/server.js`**, not `dist/src/server.js`. ESM (`type: module`, NodeNext and explicit `.js` relative imports) works under both Node and Deno. All 224 compiled relative imports were checked for existence and path case.

Confirmed issues fixed:

- No Deno Deploy configuration was present. `deno.json` now supplies the complete current-platform build/runtime configuration.
- Omitted `ADMIN_PANEL_URL` defaulted to HTTP localhost and failed production HTTPS validation. It is now optional; both portals can use `FRONTEND_URL`.
- CORS did not allow `PUT`, although payroll salary updates use it.
- Listening errors were not handled by the async startup catch. Startup now catches bind errors, binds to `0.0.0.0`, uses `PORT`, and has bounded shutdown handling.
- Local npm detected the parent workspace. A separate temporary copy was used to verify that the backend builds independently. Backend typechecking no longer includes browser tests that require the separate frontend Playwright installation.
- The existing `check:db` and `check:ai` scripts referenced missing files; those checks now exist.
- `.env.example` contained duplicate entries, a JWT placeholder shorter than validation requires, and a default DNS override. It now documents the actual settings.

The install command deliberately skips lifecycle scripts: deployment does not need esbuild's development-time installation hook or mongodb-memory-server's MongoDB binary download. Runtime dependencies and PDFKit were tested after this installation. This is preventive hardening, not a claim that a particular lifecycle script caused the previous cloud failure.

The signed-in `rxyyanweb` Deno organization showed **No applications yet / No recent builds** during the audit. Therefore no historical cloud error could be established from logs. Do not confuse local compatibility verification with a successful cloud deployment.

## Exact entrypoint and settings

**`dist/server.js`** exists after compilation and was executed successfully under Node and Deno.

| Deno Deploy setting | Exact value |
| --- | --- |
| GitHub repository | `rxyyanweb/teamora-backend` |
| Branch | `main` |
| App Directory | `.` (repository root; leave the subdirectory field empty if the UI represents root that way) |
| Framework Preset | `No Preset` |
| Install Command | `npm ci --include=dev --ignore-scripts` |
| Build Command | `deno run -A node_modules/typescript/bin/tsc -p tsconfig.build.json` |
| Runtime Mode | `Dynamic` |
| Entrypoint | `dist/server.js` |
| Working Directory | `.` |
| Runtime Arguments | Empty |
| Pre-deploy Command | Empty |
| Required runtime configuration names | `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FRONTEND_URL`, `COOKIE_SECURE`; `GEMINI_API_KEY` for AI |
| Liveness URL Path | `/health` |
| Database readiness URL Path | `/api/health` |

The source configuration overrides dashboard build settings. `nodeModulesDir: manual` uses the npm-installed dependencies. Production does not run tsx, watch mode, nodemon, or a TypeScript source entrypoint. Keep `dist/` ignored: the builder generates it.

References: [current build configuration](https://docs.deno.com/deploy/reference/builds/), [getting started](https://docs.deno.com/deploy/getting_started/), [runtime](https://docs.deno.com/deploy/reference/runtime/).

## Environment variables

Set these in Deno's **Production** runtime context. Configure **Development** separately too: preview warmup needs valid runtime configuration and database access. Use a separate test cluster for Development, still containing a database named `teamora`; the application explicitly selects that database name. Do not use a different URI database name as an isolation mechanism.

Secrets:

- `MONGODB_URI`: retain the existing Atlas connection and database. Do not reset or reseed data.
- `JWT_SECRET`: random secret of at least 64 characters. Retain the existing secret when preserving sessions is desired.
- `ADMIN_PASSWORD`: existing bootstrap credential, 12–72 characters. This does not reset an existing administrator password.
- `GEMINI_API_KEY`: the Gemini Developer API key, not an OAuth access token.

Other required production configuration:

```env
NODE_ENV=production
ADMIN_EMAIL=YOUR_EXISTING_BOOTSTRAP_ADMIN_EMAIL
FRONTEND_URL=https://teamora-seven.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
GEMINI_MODEL=gemini-3.1-flash-lite
AI_TIMEOUT_MS=60000
AI_RATE_LIMIT_PER_HOUR=20
```

Optional names: `PORT`, `DNS_SERVERS`, `ADMIN_PANEL_URL`, `COOKIE_DOMAIN`, `TRUST_PROXY`, `COOKIE_SAME_SITE`, `GEMINI_MODEL`, `AI_TIMEOUT_MS`, `AI_RATE_LIMIT_PER_HOUR`.

- Leave `PORT` unset unless the platform supplies/requires it; the code honors it and defaults to 5000 locally.
- Leave `DNS_SERVERS` unset. Deno connected to Atlas successfully using the default resolver in the local test.
- Omit `ADMIN_PANEL_URL` for the unified frontend. If retained from an old configuration, set it to the same HTTPS frontend origin.
- Omit `COOKIE_DOMAIN` for host-only cookies and the frontend proxy.
- `TRUST_PROXY` defaults to `0`. Before increasing it, verify the actual deployed proxy chain and which forwarded headers the ingress sanitizes. The default is conservative but can group clients behind a proxy into one rate-limit bucket. Existing in-memory rate limits are per instance, not globally coordinated.
- Build needs no secrets. `--include=dev` ensures TypeScript remains installed even if the build environment sets `NODE_ENV=production`.

See [Deno environment contexts](https://docs.deno.com/deploy/reference/env_vars_and_contexts/). Runtime Production/Development values are not automatically available in Build.

## Frontend connection

Only deployment configuration was changed in the separate frontend repository: `next.config.ts` and `.env.example`. No frontend UI was changed.

The prepared Next.js rewrite forwards `/api/:path*` to `${BACKEND_URL}/api/:path*`. In Vercel, set:

```env
NEXT_PUBLIC_API_URL=/api
BACKEND_URL=https://YOUR-ACTUAL-DENO-BACKEND-HOST
```

Use the exact HTTPS origin shown after deployment, without `/api`, credentials, query parameters or fragments. Redeploy the frontend after changing these variables: the API base and rewrite are resolved during the build. The existing frontend fetch client already includes credentials, the portal header and CSRF token.

Keep backend cookies `Secure`, `HttpOnly`, `SameSite=Lax`, and without a Domain attribute. The browser calls the frontend origin, and Vercel forwards to Deno. Existing 8-hour JWT expiry, audience/issuer checks, revocation, role checks and signed CSRF tokens are preserved. Do not put tokens in localStorage. Direct cross-site cookie mode would need `SameSite=None; Secure` and is subject to third-party-cookie blocking; the proxy is preferred.

The frontend production build passed and its generated routes manifest contains the expected external rewrite. The actual hosted browser flow still needs verification after both applications are deployed. [Vercel rewrite documentation](https://vercel.com/docs/routing/rewrites).

## MongoDB Atlas

Local Node and Deno both connected and pinged the existing `teamora` database. Live checks performed no database writes. All mutation tests used disposable local MongoDB replica sets. No schemas, salary formulas, leave workflows or production records were changed.

The server waits for a real connection, ping and the existing required indexes before listening. Pool size is bounded at 10 connections per instance, with no minimum pool. Readiness performs a real ping with a 3-second operation timeout; disconnected readiness returns 503. Liveness is independent of database availability once the server is running.

Deno says it does not publish stable outbound IP addresses. If Atlas accepts only your local IP, cloud connections will still fail. Atlas Network Access must allow Deno's egress; with the public managed service this may require `0.0.0.0/0`, which allows connection attempts from any IPv4 address. Retain TLS, strong credentials and a least-privilege database user; if broad public network access is unacceptable, use infrastructure with controlled egress. No Atlas network settings were changed. A local success does not prove cloud Network Access is correct.

References: [Deno database networking](https://docs.deno.com/deploy/reference/databases/), [Atlas access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/).

## Gemini and PDF

The existing official `@google/genai` SDK already explicitly uses API-key authentication against the Developer API, with Vertex/Enterprise routing disabled. It was retained. The configured key succeeded in real Node and Deno requests for synthetic Roman Urdu leave extraction. The previous 401 was not reproduced. Deploy must receive the same intended key in the runtime context. The model supports function calling and structured outputs: [official model reference](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite).

Tool permissions remain bound to the authenticated server actor. Unit/integration tests cover role denial and provider failures without exposing provider response details. Live AI tests send only synthetic text, not employee data.

PDFKit generates payslips in memory as Buffers and needs no browser binary or persistent storage. Node and Deno generated valid PDF files from a synthetic payroll fixture, including the expected PKR 73,750 net salary calculation.

## Verification commands

Actual results:

| Check | Result |
| --- | --- |
| npm install from lockfile | Passed; 0 reported vulnerabilities |
| Clean standalone install with npm executed by Deno | Passed with lifecycle scripts disabled |
| Node TypeScript production build and typecheck | Passed in the checkout and isolated standalone copy |
| TypeScript compiler executed by Deno 2.5.0 | Passed |
| Unit/integration suite | 6 files, 90 tests passed; repeated successfully in isolated copy |
| Compiled production server, Node and Deno | Passed, including occupied-port failure/redaction |
| Health/readiness | 200 when connected; liveness 200 and readiness 503 after disconnect |
| Authentication | Login, session, logout, CSRF, origin checks and secure cookie attributes passed |
| Role isolation and business logic | Existing Admin/HR/Employee, workforce, payroll and AI permission tests passed |
| Real Atlas, Node and Deno | Connected and ping verified; no live database writes |
| Real Gemini, Node and Deno | Synthetic Roman Urdu leave extraction passed |
| PDFKit, Node and Deno | Valid PDF buffer and expected salary fixture passed |
| Frontend build | Passed; generated same-origin API rewrite verified |
| Cloud deployment and hosted browser login | Not performed; user will deploy |

Important modified files: `deno.json`, `src/server.ts`, `src/app.ts`, `src/config/environment.ts`, `src/config/database.ts`, `src/config/cors.ts`, `.env.example`, `.gitignore`, `tsconfig.json`, authentication/environment tests, the four diagnostic/smoke scripts, `README.md`, and this guide. In the separate frontend, only `next.config.ts` and `.env.example` changed. `package.json` and its lockfile did not need dependency changes.

For this checkout nested beneath the existing parent workspace, use `--prefix . --workspaces=false` to force the standalone backend install. In a normal independent clone, plain `npm ci` targets the backend repository.

```powershell
Set-Location 'E:\SMIT Hacathon\Project\Backend'
npm.cmd ci --prefix . --workspaces=false --include=dev --ignore-scripts
npm.cmd run build
Test-Path .\dist\server.js
npm.cmd run typecheck
npm.cmd test
node scripts/smoke-production.mjs
node scripts/check-pdf.mjs
npm.cmd run check:db
npm.cmd run check:ai
```

The smoke test starts its own disposable MongoDB; it never uses Atlas. MongoDB-memory-server may download a test binary. If an official local test binary is already available, set `MONGOMS_SYSTEM_BINARY` to its absolute path to reuse it. The live `check:db` is read-only; `check:ai` makes one real provider request.

With Deno installed:

```powershell
deno run -A node_modules/typescript/bin/tsc -p tsconfig.build.json
node scripts/smoke-production.mjs (Get-Command deno).Source
deno run -A scripts/check-pdf.mjs
```

Testing used Node 24.16.0 and a temporary Deno 2.5.0 executable on Windows, matching the version listed by the current runtime documentation at audit time. No global Deno installation was added. The exact Linux cloud builder remains a separate verification step.

## GitHub update and deployment

The existing branch is `main` and origin is `https://github.com/rxyyanweb/teamora-backend.git`.

```powershell
Set-Location 'E:\SMIT Hacathon\Project\Backend'
git status --short
git branch --show-current
git diff --check
git ls-files -- .env
git check-ignore .env
# The ls-files command must print nothing; check-ignore must print .env.
git add -- .env.example .gitignore deno.json tsconfig.json README.md docs/deno-deploy.md src scripts/check-ai.ts scripts/check-database.ts scripts/check-pdf.mjs scripts/smoke-production.mjs
git diff --cached --stat
git diff --cached --name-only
# Review the staged diff locally; no real environment files should be staged.
git commit -m "Prepare Teamora backend for current Deno Deploy"
git push origin main
```

If push is rejected because the remote changed, fetch and inspect the divergence; do not force-push. The frontend changes are in its own repository and need a separate reviewed commit/push:

```powershell
Set-Location 'E:\SMIT Hacathon\Project\Frontend'
git status --short
git add -- next.config.ts .env.example
git diff --cached --stat
git commit -m "Configure same-origin Teamora backend proxy"
git push
```

Then open console.deno.com, choose the correct organization, create/select the app, connect `rxyyanweb/teamora-backend`, choose repository root, and use the settings above. Add Production and Development runtime variables before starting deployment. Do not copy the backend's old `vercel.json` to the frontend; it belongs to the alternative backend Vercel adapter and is not used by Deno.

After the build, verify:

1. `GET https://YOUR-DENO-HOST/health` -> 200 with `status: ok`.
2. `GET https://YOUR-DENO-HOST/api/health` -> 200 with `data.status: ready`; 503 truthfully indicates database unavailability.
3. Configure/redeploy Vercel as above; `GET https://teamora-seven.vercel.app/api/health` should reach the same backend.
4. Test existing Admin, HR and Employee login, reload/session persistence, logout and protected routes in the browser. Do not repeat first-run setup on the existing production database.
5. Verify an authorized payslip download and AI request, and inspect runtime logs for errors without exposing secrets.

## Remaining cloud verification

Local production build, Deno runtime, live Atlas and real Gemini checks passed. No cloud app was created or deployed, no code was pushed, and no dashboard settings were changed. The user will deploy. Remaining work is the manual GitHub update, Deno runtime variables/Atlas cloud access, frontend Vercel variables/redeployment, and hosted browser verification. Windows process termination in the smoke harness does not prove Linux signal draining; the server implements a four-second shutdown deadline for Deno's five-second SIGINT window.
