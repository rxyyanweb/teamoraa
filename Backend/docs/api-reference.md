# Phase 1 REST API

Base URL: `http://localhost:5000/api`. JSON requests and responses. No REST endpoints exist inside either Next.js app.

Except health and CORS preflight, every request requires `X-Teamora-Portal: admin` or `staff`. Browser `Origin` must match `ADMIN_PANEL_URL` or `FRONTEND_URL` respectively. Cookies are HTTP-only and must be sent with credentials. For every POST/PATCH, first GET `/auth/csrf` with the same cookie jar and portal, then submit its `data.csrfToken` as `X-CSRF-Token`.

| Method | Path                                 | Authorization / behavior                                            |
| ------ | ------------------------------------ | ------------------------------------------------------------------- |
| GET    | `/health`                            | Public; 200 only after real DB ping, otherwise 503                  |
| GET    | `/auth/csrf`                         | Public, portal-scoped signed CSRF token                             |
| GET    | `/auth/setup-status`                 | Public; returns only `setupRequired`                                |
| POST   | `/auth/setup`                        | Admin portal, matching env bootstrap email/password, first run only |
| POST   | `/auth/login`                        | Portal-appropriate account, bcrypt verification, JWT cookie         |
| GET    | `/auth/me`                           | Current authenticated user, including temporary-password status     |
| POST   | `/auth/change-password`              | Authenticated; current/new password; revokes other sessions         |
| POST   | `/auth/logout`                       | Authenticated; revokes all sessions for this user                   |
| GET    | `/dashboard`                         | Role-scoped database counts or own profile                          |
| GET    | `/organization`                      | Admin/HR; own company settings                                      |
| PATCH  | `/organization`                      | Admin only; validated settings                                      |
| GET    | `/users/hr?page=1&search=`           | Admin only; paginated HR accounts                                   |
| POST   | `/users/hr`                          | Admin only; creates HR and returns one-time temporary password      |
| PATCH  | `/users/hr/:id`                      | Admin only; edits an HR profile                                     |
| POST   | `/users/hr/:id/reset-password`       | Admin only; resets HR password                                      |
| PATCH  | `/users/accounts/:id/status`         | Admin only; HR or Employee activation/deactivation                  |
| POST   | `/users/accounts/:id/reset-password` | Admin only; HR or Employee reset + session revocation               |
| GET    | `/employees?page=1&search=`          | Admin/HR, company-scoped, max 20 per page                           |
| POST   | `/employees`                         | HR only; creates Employee login and job profile                     |
| GET    | `/employees/:id`                     | Admin/HR company-scoped; Employee own ID only                       |
| PATCH  | `/employees/:id`                     | HR only; edits company Employee job/profile data                    |
| GET    | `/profile`                           | Authenticated own profile                                           |
| PATCH  | `/profile`                           | Own phone/address only                                              |
| GET    | `/audit?page=1`                      | Admin only; company-scoped, newest first, max 25 per page           |

All protected data endpoints require the first password change. Current-user, change-password and logout endpoints are available before it.

## Payloads

Setup: `{ companyName, name, email, password }`. The email/password must match the server's bootstrap values. The admin password must be 12+ characters and at most 72 UTF-8 bytes.

Create HR/Employee: `{ name, email, department?, designation?, phone?, address?, joinedAt?, basicSalary? }`. `basicSalary` is **required and positive for Employee registration**. `joinedAt` is an ISO date (`YYYY-MM-DD`). Provided department and designation must exist in company settings. Server generates the employee code and temporary password. Request-provided role, company ID, active status, password hash and other extra keys are rejected. Successful creation returns `{ user, temporaryPassword }`.

HR/Employee profile edits accept a strict subset of the creation fields excluding email; HR cannot change login activation. Self profile update is exactly `{ phone, address }`. Login status update is `{ active: boolean }`. Password change is `{ currentPassword, newPassword }`.

Organization update is a full settings payload: `{ name, address, timezone, officeStart, officeEnd, graceMinutes, halfDayHours, weekend, officeLatitude, officeLongitude, officeRadius, departments, designations }`. Weekdays use JS numbering (`0=Sunday, 6=Saturday`). Coordinates must both be null or both valid numbers. Hours use `HH:mm`. Department/designation arrays contain unique labels. Leave quotas/holidays are Phase 2.

## Status codes

- 400: invalid input, unknown fields/IDs, invalid organization references or current password.
- 401: wrong credentials, absent/expired/revoked session, inactive account.
- 403: wrong role/origin/CSRF, another employee's ID, mandatory password change.
- 404: unknown endpoint or company-scoped resource does not exist.
- 409: duplicate email/code or company already configured.
- 429: rate limit; retry later.
- 503: database unavailable on health check.

Errors never include raw database errors or secret configuration values. Basic salary is returned only in privileged employee-detail reads, not in the public authentication user object.
