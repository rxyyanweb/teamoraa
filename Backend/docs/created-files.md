# Created files

All three application folders were confirmed empty before implementation. No unrelated existing source file was replaced. Paths below are relative to the exact root `E:\SMIT Hacathon\Project`.

## Source, configuration and documentation (146 files)

```text
.gitignore
.prettierignore
.prettierrc.json
Admin Panel/.env.example
Admin Panel/AGENTS.md
Admin Panel/components.json
Admin Panel/eslint.config.mjs
Admin Panel/next-env.d.ts
Admin Panel/next.config.ts
Admin Panel/package.json
Admin Panel/postcss.config.mjs
Admin Panel/src/app/(auth)/change-password/page.tsx
Admin Panel/src/app/(auth)/login/page.tsx
Admin Panel/src/app/(dashboard)/audit/page.tsx
Admin Panel/src/app/(dashboard)/dashboard/page.tsx
Admin Panel/src/app/(dashboard)/employees/page.tsx
Admin Panel/src/app/(dashboard)/hr-accounts/page.tsx
Admin Panel/src/app/(dashboard)/layout.tsx
Admin Panel/src/app/(dashboard)/organization/page.tsx
Admin Panel/src/app/(dashboard)/profile/page.tsx
Admin Panel/src/app/(setup)/setup/page.tsx
Admin Panel/src/app/layout.tsx
Admin Panel/src/app/not-found.tsx
Admin Panel/src/app/page.tsx
Admin Panel/src/components/forms/field.tsx
Admin Panel/src/components/layout/workspace-shell.tsx
Admin Panel/src/components/navigation/sidebar.tsx
Admin Panel/src/components/shared/brand.tsx
Admin Panel/src/components/shared/feedback.tsx
Admin Panel/src/components/shared/getting-started.tsx
Admin Panel/src/components/shared/welcome-banner.tsx
Admin Panel/src/components/ui/badge.tsx
Admin Panel/src/components/ui/button.tsx
Admin Panel/src/components/ui/card.tsx
Admin Panel/src/components/ui/input.tsx
Admin Panel/src/features/analytics/dashboard-view.tsx
Admin Panel/src/features/analytics/people-metrics.tsx
Admin Panel/src/features/audit/audit-history.tsx
Admin Panel/src/features/auth/auth-provider.tsx
Admin Panel/src/features/auth/change-password-form.tsx
Admin Panel/src/features/auth/login-form.tsx
Admin Panel/src/features/auth/profile-view.tsx
Admin Panel/src/features/employees/people-directory.tsx
Admin Panel/src/features/employees/person-details.tsx
Admin Panel/src/features/employees/person-form.tsx
Admin Panel/src/features/employees/recent-employees.tsx
Admin Panel/src/features/organization/organization-settings.tsx
Admin Panel/src/features/organization/setup-form.tsx
Admin Panel/src/hooks/use-resource.ts
Admin Panel/src/lib/portal.ts
Admin Panel/src/lib/utils.ts
Admin Panel/src/services/api.ts
Admin Panel/src/styles/globals.css
Admin Panel/src/types/api.ts
Admin Panel/tsconfig.json
Backend/.env.example
Backend/package.json
Backend/scripts/browser-test-server.ts
Backend/scripts/check-database.ts
Backend/scripts/setup-local.mjs
Backend/src/app.ts
Backend/src/config/cors.ts
Backend/src/config/database.ts
Backend/src/config/environment.ts
Backend/src/middleware/error-handler.ts
Backend/src/middleware/security.ts
Backend/src/modules/analytics/dashboard.routes.ts
Backend/src/modules/audit/audit.model.ts
Backend/src/modules/audit/audit.routes.ts
Backend/src/modules/auth/auth.routes.ts
Backend/src/modules/auth/auth.validation.ts
Backend/src/modules/employees/employee.routes.ts
Backend/src/modules/organization/company.model.ts
Backend/src/modules/organization/organization.routes.ts
Backend/src/modules/users/user.model.ts
Backend/src/modules/users/user.routes.ts
Backend/src/modules/users/user.service.ts
Backend/src/modules/users/user.validation.ts
Backend/src/server.ts
Backend/src/tests/auth-access.test.ts
Backend/src/tests/browser/phase-one.spec.ts
Backend/src/tests/environment.test.ts
Backend/src/tests/test-database.ts
Backend/src/types/auth.ts
Backend/src/utils/api-error.ts
Backend/tsconfig.build.json
Backend/tsconfig.json
Backend/vitest.config.ts
docs/api-reference.md
docs/architecture.md
docs/created-files.md
docs/module-checklist.md
docs/setup-guide.md
docs/verification.md
Frontend/.env.example
Frontend/AGENTS.md
Frontend/components.json
Frontend/eslint.config.mjs
Frontend/next-env.d.ts
Frontend/next.config.ts
Frontend/package.json
Frontend/postcss.config.mjs
Frontend/src/app/(auth)/change-password/page.tsx
Frontend/src/app/(auth)/login/page.tsx
Frontend/src/app/(employee)/employee/dashboard/page.tsx
Frontend/src/app/(employee)/employee/layout.tsx
Frontend/src/app/(employee)/employee/profile/page.tsx
Frontend/src/app/(hr)/hr/dashboard/page.tsx
Frontend/src/app/(hr)/hr/employees/page.tsx
Frontend/src/app/(hr)/hr/layout.tsx
Frontend/src/app/(hr)/hr/profile/page.tsx
Frontend/src/app/layout.tsx
Frontend/src/app/not-found.tsx
Frontend/src/app/page.tsx
Frontend/src/components/forms/field.tsx
Frontend/src/components/layout/workspace-shell.tsx
Frontend/src/components/navigation/sidebar.tsx
Frontend/src/components/shared/brand.tsx
Frontend/src/components/shared/feedback.tsx
Frontend/src/components/shared/getting-started.tsx
Frontend/src/components/shared/welcome-banner.tsx
Frontend/src/components/ui/badge.tsx
Frontend/src/components/ui/button.tsx
Frontend/src/components/ui/card.tsx
Frontend/src/components/ui/input.tsx
Frontend/src/features/analytics/dashboard-view.tsx
Frontend/src/features/analytics/people-metrics.tsx
Frontend/src/features/auth/auth-provider.tsx
Frontend/src/features/auth/change-password-form.tsx
Frontend/src/features/auth/login-form.tsx
Frontend/src/features/auth/profile-view.tsx
Frontend/src/features/employees/people-directory.tsx
Frontend/src/features/employees/person-details.tsx
Frontend/src/features/employees/person-form.tsx
Frontend/src/features/employees/recent-employees.tsx
Frontend/src/hooks/use-resource.ts
Frontend/src/lib/portal.ts
Frontend/src/lib/utils.ts
Frontend/src/services/api.ts
Frontend/src/styles/globals.css
Frontend/src/types/api.ts
Frontend/tsconfig.json
package-lock.json
package.json
playwright.config.ts
README.md
```

The two `AGENTS.md` files were generated by Next.js during development and retained. The `next-env.d.ts` files are generated declarations and ignored by Git.

## Local environment files (ignored, contents never included)

```text
Admin Panel/.env.local
Backend/.env
Frontend/.env.local
```

## Generated local output (ignored)

- `node_modules/`: installed dependencies and download cache.
- `Backend/dist/`: compiled API.
- `Frontend/.next/` and `Admin Panel/.next/`: Next.js builds.
- `test-results/`: browser test state and failure diagnostics when a run fails.
- `.local/prepare-test-mongodb.py`: one-time local utility that fetches only the official MongoDB server and license files using ZIP HTTP ranges.
- `.local/mongodb/`: official MongoDB 7.0.24 server binary and license/readme files for disposable tests.
- `.local/pdf-role-matrix-3.png`: rendered PDF access-matrix page used for verification.
- `.local/screenshots/admin-login.png`, `admin-dashboard.png`, `hr-dashboard.png`, `employee-mobile.png`: browser-test captures using disposable fixture data, never Atlas records.
- TypeScript incremental metadata (`*.tsbuildinfo`).

No wrapper directory, second backend, seed-data file or empty placeholder module was created.
