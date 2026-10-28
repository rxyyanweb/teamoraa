import { test, expect } from '@playwright/test';

test.describe('Admin Workspace Full Traversal (Unified Port 3000)', () => {
  test('Admin logs in and accesses all executive management views', async ({ page }) => {
    // 1. Log in as Admin
    await page.goto('/login?role=admin');
    await page.getByLabel('Work email').fill('admin@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill('TmR7!qV9#Lx2@Bp6Nc4');
    await page.getByRole('button', { name: 'Sign in to your workspace' }).click();

    // 2. Dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Executive dashboard|Welcome back/i })).toBeVisible();

    // 3. Organization Settings
    await page.goto('/admin/organization');
    await expect(page.getByRole('heading', { name: /Organization details|Company profile/i })).toBeVisible();

    // 4. Leave Policy Settings
    await page.goto('/admin/leave-settings');
    await expect(page.getByRole('heading', { name: /Leave policy & public holidays/i })).toBeVisible();

    // 5. Employees Management
    await page.goto('/admin/employees');
    await expect(page.getByRole('heading', { name: /Employees|Directory/i })).toBeVisible();

    // 6. HR Accounts Provisioning
    await page.goto('/admin/hr-accounts');
    await expect(page.getByRole('heading', { name: /HR accounts/i })).toBeVisible();

    // 7. Attendance Oversight
    await page.goto('/admin/attendance');
    await expect(page.getByRole('heading', { name: 'Attendance', exact: true }).first()).toBeVisible();

    // 8. Leave Overview
    await page.goto('/admin/leave');
    await expect(page.getByRole('heading', { name: /Leave/i }).first()).toBeVisible();

    // 9. Payroll Lite Workspace
    await page.goto('/admin/payroll');
    await expect(page.getByRole('heading', { name: /Payroll/i }).first()).toBeVisible();

    // 10. Audit History Log Stream
    await page.goto('/admin/audit');
    await expect(page.getByRole('heading', { name: /Audit/i }).first()).toBeVisible();
  });
});
