# Teamora — AI-Powered Human Capital Management (Unified Frontend)

Teamora is a modern, enterprise-grade Human Capital Management (HCM) platform built with Next.js 16 (App Router), React 19, Tailwind CSS v4, Motion, and Three.js.

This repository contains the **unified frontend application**, serving all three role-based portals (**Admin**, **HR**, and **Employee**) from a single high-performance codebase on port 3000.

---

## 🌟 Architecture & Features

- **Next.js 16 App Router**: Server and client component composition with strict TypeScript typing.
- **Unified 3-in-1 Role Engine**:
  - **Admin Workspace (`/admin/*`)**: Executive dashboard, company profile & policies, HR account provisioning, employee management, company-wide attendance & leave approvals, monthly payroll finalization, and security audit log streams.
  - **HR Workspace (`/hr/*`)**: Operational dashboard, employee onboarding, team attendance logging, leave request reviews, draft payroll preparation, and PDF payslip distribution.
  - **Employee Workspace (`/employee/*`)**: Self-service portal, check-in/out attendance logging, smart leave assistant, leave balance tracking, interactive PDF payslip viewer, and notification center.
- **Gemini AI Assistant**: Embedded multimodal copilot for policy Q&A, Roman Urdu & English smart leave requests, and workforce analytics insights.
- **3D Spatial Aesthetics**: Three.js WebGL canvas and dark/light adaptive theme engine.
- **Accessibility & Motion**: WCAG AA accessible components with micro-interactions powered by `motion`.

---

## 🧭 Application Routes

| Route Pattern | Role / Access | Purpose |
| :--- | :--- | :--- |
| `/` | Public | Landing page with role selector and quick sign-in triggers |
| `/login` | Public | Role-aware credentials login (`?role=admin\|hr\|employee`) |
| `/setup` & `/admin/setup` | Public / Admin | Initial company bootstrap & super-admin onboarding |
| `/admin/dashboard` | Admin | Executive HCM metrics, attendance breakdowns, payroll status |
| `/admin/employees` | Admin | Directory, role assignment, salary structures |
| `/admin/hr-accounts` | Admin | HR account creation, credential provisioning |
| `/admin/attendance` | Admin | Company-wide daily/monthly attendance logs & shifts |
| `/admin/leave` | Admin | Leave approvals, company quota oversight |
| `/admin/leave-settings` | Admin | Annual quota customization, carry-forward rules |
| `/admin/organization` | Admin | Company metadata, address, contact, tax identifier |
| `/admin/payroll` | Admin | Monthly payroll generation, review & immutable finalization |
| `/admin/audit` | Admin | Tamper-evident audit trail & security activity logs |
| `/admin/profile` | Admin | Personal administrator credentials & profile |
| `/hr/dashboard` | HR | Daily workforce headcount, pending leave actions |
| `/hr/employees` | HR | Employee directory & employee profile details |
| `/hr/attendance` | HR | Team attendance records & anomaly tracking |
| `/hr/leave` | HR | Leave application queue & approval workflows |
| `/hr/payroll` | HR | Monthly draft payroll review & PDF payslip verification |
| `/hr/profile` | HR | HR manager profile & settings |
| `/employee/dashboard` | Employee | Personal dashboard, leave balances, recent announcements |
| `/employee/attendance` | Employee | Daily self-service check-in / check-out tracker |
| `/employee/leave` | Employee | Apply for leave, smart Roman Urdu leave assistant |
| `/employee/payroll` | Employee | Personal payslip history & instant PDF downloads |
| `/employee/profile` | Employee | Personal profile & contact details |

---

## 🛠️ Getting Started Locally

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10.x` or higher
- **Backend API**: Running at `http://localhost:5000`

### Installation
```bash
# Clone the repository
git clone <repo-url> teamora-frontend
cd teamora-frontend

# Install dependencies cleanly
npm ci
```

### Environment Setup
Create a `.env.local` file from the example:
```bash
cp .env.example .env.local
```
Configure your backend endpoint:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Scripts
- `npm run dev`: Starts Next.js development server on port 3000 with Webpack.
- `npm run build`: Compiles production build with strict type checking.
- `npm run start`: Starts production Next.js server on port 3000.
- `npm run typecheck`: Runs TypeScript compiler (`tsc --noEmit`) to verify zero type errors.
- `npm run lint`: Runs ESLint across `src/`.
- `npm run test:e2e`: Executes Playwright end-to-end test suite.

---

## 🚀 Deploying to Vercel

The frontend is fully optimized for **Vercel** serverless deployment.

1. **Push to GitHub**: Push this repository to your GitHub account.
2. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Select your `teamora-frontend` repository.
   - Framework Preset: **Next.js** (automatically detected).
   - Root Directory: `./` (or `Frontend` if deploying from a monorepo).
3. **Environment Variables**:
   Add the following environment variable in the Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend API URL (e.g., `https://teamora-backend.onrender.com/api`).
4. **Deploy**:
   Click **Deploy**. Vercel will build and deploy your application with instant global edge caching.

---

## 🔒 Authentication & Portal Security

- **Dual-Cookie Architecture**: The frontend communicates with the backend using HttpOnly secure cookies:
  - `teamora_admin_session`: Used exclusively for the `/admin/*` workspace.
  - `teamora_staff_session`: Used for the `/hr/*` and `/employee/*` workspaces.
- **Automatic Portal Detection**: The frontend automatically passes the `X-Teamora-Portal: admin | staff` header based on active route and user role.
- **Role Guards**: Next.js client guards protect routes to ensure unauthorized users are cleanly redirected to the login screen.
