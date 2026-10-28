import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function signIn(page: Page, port: number, email: string, password: string) {
  await page.goto(`http://localhost:${port}/login`);
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in to your workspace' }).click();
}
async function changeTemporaryPassword(page: Page, temporary: string, password: string) {
  await expect(page).toHaveURL(/change-password/);
  await page.getByLabel('Current password').fill(temporary);
  await page.getByLabel('New password', { exact: true }).fill(password);
  await page.getByLabel('Confirm new password').fill(password);
  await page.getByRole('button', { name: 'Save password & continue' }).click();
}
test('Admin setup → HR onboarding → employee onboarding → scoped dashboards and logout', async ({
  page,
  context,
}) => {
  await mkdir('.local/screenshots', { recursive: true });
  await page.goto('http://localhost:3001/login');
  await expect(page.getByRole('heading', { name: 'Good to see you again.' })).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/admin-login.png', fullPage: true });
  await page.getByRole('link', { name: 'Set up your company' }).click();
  await page.getByLabel('Company name').fill('Teamora Browser Test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your full name').fill('Admin Tester');
  await page.getByLabel('Admin email').fill('admin@teamora.test');
  await page.getByLabel('Initial Admin password').fill('Initial-Admin-Password!');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Create company workspace' }).click();
  await expect(page).toHaveURL('http://localhost:3001/dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome back, Admin' })).toBeVisible();
  await page.getByRole('link', { name: 'Organization', exact: true }).click();
  await page.getByLabel('Departments', { exact: true }).fill('Engineering, People');
  await page.getByLabel('Designations', { exact: true }).fill('Developer, HR Manager');
  await page.getByRole('button', { name: 'Save organization settings' }).click();
  await expect(page.getByRole('status')).toContainText('Organization settings saved.');
  await page.getByRole('link', { name: 'HR accounts', exact: true }).click();
  await page.getByRole('button', { name: 'Add HR account' }).click();
  await page.getByLabel('Full name').fill('HR Tester');
  await page.getByLabel('Work email').fill('hr@teamora.test');
  await page.getByLabel('Joining date').fill('2026-10-25');
  await page.getByLabel('Department', { exact: true }).selectOption('People');
  await page.getByLabel('Designation', { exact: true }).selectOption('HR Manager');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Account created' })).toBeVisible();
  const hrTemporary = await page.locator('code').innerText();
  const staff = await context.newPage();
  await signIn(staff, 3000, 'hr@teamora.test', hrTemporary);
  await changeTemporaryPassword(staff, hrTemporary, 'Browser-HR-Password!');
  await expect(staff).toHaveURL('http://localhost:3000/hr/dashboard');
  await expect(staff.getByRole('heading', { name: 'Welcome back, HR' })).toBeVisible();
  await expect(staff.getByRole('link', { name: 'Audit history' })).toHaveCount(0);
  await staff.getByRole('link', { name: 'People directory', exact: true }).first().click();
  await staff.getByRole('button', { name: 'Add employee' }).click();
  await staff.getByLabel('Full name').fill('Employee Tester');
  await staff.getByLabel('Work email').fill('employee@teamora.test');
  await staff.getByLabel('Joining date').fill('2026-10-25');
  await staff.getByLabel('Department', { exact: true }).selectOption('Engineering');
  await staff.getByLabel('Designation', { exact: true }).selectOption('Developer');
  await staff.getByLabel('Monthly basic salary (PKR)').fill('100000');
  await staff.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(staff.getByRole('status').filter({ hasText: 'Account created' })).toBeVisible();
  const employeeTemporary = await staff.locator('code').innerText();
  await staff.getByRole('button', { name: 'Dismiss credentials' }).click();
  await staff.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(staff.getByRole('cell', { name: /Employee Tester/ })).toBeVisible();
  await staff.screenshot({ path: '.local/screenshots/hr-dashboard.png', fullPage: true });
  await staff.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(staff).toHaveURL(/login/);
  await signIn(staff, 3000, 'employee@teamora.test', employeeTemporary);
  await changeTemporaryPassword(staff, employeeTemporary, 'Browser-Employee-Password!');
  await expect(staff).toHaveURL('http://localhost:3000/employee/dashboard');
  await expect(staff.getByRole('heading', { name: 'Welcome back, Employee' })).toBeVisible();
  await expect(staff.getByRole('link', { name: 'People directory' })).toHaveCount(0);
  const denied = await staff.evaluate(
    async () =>
      (
        await fetch('http://localhost:5000/api/users/hr', {
          credentials: 'include',
          headers: { 'X-Teamora-Portal': 'staff' },
        })
      ).status,
  );
  expect(denied).toBe(403);
  await staff.goto('http://localhost:3000/hr/dashboard');
  await expect(staff).toHaveURL('http://localhost:3000/employee/dashboard');
  await staff.getByRole('link', { name: 'My profile', exact: true }).click();
  await staff.getByLabel('Phone number').fill('+923001234567');
  await staff.getByLabel('Address', { exact: true }).fill('Karachi');
  await staff.getByRole('button', { name: 'Save changes' }).click();
  await expect(staff.getByRole('status')).toContainText('Your profile has been updated.');
  await staff.getByRole('link', { name: 'Overview', exact: true }).click();
  await staff.setViewportSize({ width: 390, height: 844 });
  await staff.getByRole('button', { name: 'Open navigation' }).click();
  await expect(staff.getByRole('link', { name: 'My profile', exact: true })).toBeVisible();
  await staff.getByRole('button', { name: 'Close navigation' }).click();
  expect(
    await staff.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await staff.screenshot({ path: '.local/screenshots/employee-mobile.png', fullPage: true });
  await page.goto('http://localhost:3001/dashboard');
  await expect(page.getByRole('cell', { name: /Employee Tester/ })).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/admin-dashboard.png', fullPage: true });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await signIn(page, 3001, 'admin@teamora.test', 'Initial-Admin-Password!');
  await expect(page).toHaveURL('http://localhost:3001/dashboard');
  await staff.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(staff).toHaveURL(/login/);
  await staff.goto('http://localhost:3000/employee/dashboard');
  await expect(staff).toHaveURL('http://localhost:3000/login');
});
