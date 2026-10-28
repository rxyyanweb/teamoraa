import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page, port: number, email: string, password: string) {
  await page.goto(`http://localhost:${port}/login`);
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in to your workspace' }).click();
}

test('Phase 2 E2E: Attendance Check-in/out, Corrections, Leave Management & Admin Overview', async ({
  page: adminPage,
}) => {
  // Independent contexts so HR, Employee, and Admin cookies never collide
  const browser = adminPage.context().browser()!;
  const hrContext = await browser.newContext();
  const empContext = await browser.newContext();

  const hrPage = await hrContext.newPage();
  const empPage = await empContext.newPage();

  // 1. Admin signs in and accesses Leave Policy Settings
  await adminPage.goto('http://localhost:3001/login');
  await signIn(adminPage, 3001, 'admin@teamora.test', 'Initial-Admin-Password!');
  await expect(adminPage).toHaveURL('http://localhost:3001/dashboard');

  // Verify Leave Policy page
  await adminPage.goto('http://localhost:3001/leave-settings');
  await expect(
    adminPage.getByRole('heading', { name: 'Leave policy & public holidays' }),
  ).toBeVisible();
  await expect(adminPage.getByText('Annual leave')).toBeVisible();
  await expect(adminPage.getByText('Sick leave')).toBeVisible();
  await expect(adminPage.getByText('Casual leave')).toBeVisible();

  // Add a test public holiday
  await adminPage.getByLabel('Holiday date').fill('2026-12-25');
  await adminPage.getByLabel('Holiday name').fill('Quaid-e-Azam Day');
  await adminPage.getByRole('button', { name: 'Add holiday' }).click();
  await expect(adminPage.getByText('Quaid-e-Azam Day')).toBeVisible();

  // 2. Employee checks in and checks out on Staff workspace
  await signIn(empPage, 3000, 'employee@teamora.test', 'Browser-Employee-Password!');
  await expect(empPage).toHaveURL('http://localhost:3000/employee/dashboard');

  // Open Attendance page
  await empPage.goto('http://localhost:3000/employee/attendance');
  await expect(empPage.getByRole('heading', { name: 'My attendance' })).toBeVisible();

  // Check In
  const checkInBtn = empPage.getByRole('button', { name: /Check in/i });
  await expect(checkInBtn).toBeVisible();
  await checkInBtn.click();
  await expect(empPage.getByText(/checked in/i)).toBeVisible();
  await expect(empPage.getByRole('heading', { name: /You’re on the clock/i })).toBeVisible();

  // Check Out
  const checkOutBtn = empPage.getByRole('button', { name: /Check out/i });
  await expect(checkOutBtn).toBeVisible();
  await checkOutBtn.click();
  await expect(empPage.getByRole('status').filter({ hasText: /Shift completed/i })).toBeVisible();

  // 3. Employee applies for leave
  await empPage.goto('http://localhost:3000/employee/leave');
  await expect(empPage.getByRole('heading', { name: 'My leave' })).toBeVisible();
  await expect(empPage.getByText('Annual leave')).toBeVisible();

  await empPage.getByRole('button', { name: 'Apply leave' }).click();
  await expect(empPage.getByRole('heading', { name: 'Apply for leave' })).toBeVisible();

  await empPage.getByLabel('Start date').fill('2026-11-16');
  await empPage.getByLabel('End date').fill('2026-11-17');
  await empPage.getByLabel('Reason').fill('Annual family vacation and rest');

  await expect(empPage.getByText(/2 working days/i)).toBeVisible({ timeout: 10000 });
  await empPage.getByRole('button', { name: 'Submit leave request' }).click();
  await expect(empPage.getByText(/Leave request submitted/i)).toBeVisible();

  // 4. HR signs in and reviews the leave request
  await signIn(hrPage, 3000, 'hr@teamora.test', 'Browser-HR-Password!');
  await expect(hrPage).toHaveURL('http://localhost:3000/hr/dashboard');

  await hrPage.goto('http://localhost:3000/hr/leave');
  await expect(hrPage.getByRole('heading', { name: 'Leave approvals' })).toBeVisible();
  await expect(hrPage.getByText('Employee Tester')).toBeVisible();

  await hrPage.getByRole('button', { name: 'View request' }).first().click();
  await expect(hrPage.getByText('Annual family vacation and rest')).toBeVisible();
  await hrPage.getByLabel('Decision comment').fill('Approved. Have a great vacation!');
  await hrPage.getByRole('button', { name: 'Approve request' }).click();
  await expect(hrPage.getByText(/Decision saved/i)).toBeVisible();

  // 5. Employee verifies leave is approved, then requests an attendance correction
  await empPage.bringToFront();
  await empPage.reload();
  await expect(empPage.locator('.data-table').getByText('Approved')).toBeVisible();

  // Request Attendance Correction
  await empPage.goto('http://localhost:3000/employee/attendance');
  await expect(empPage.getByRole('heading', { name: 'My attendance' })).toBeVisible();
  await empPage.getByRole('button', { name: 'Request correction' }).click();
  await empPage.getByLabel('Requested check in').fill('00:30');
  await empPage.getByLabel('Requested check out').fill('01:30');
  await empPage.getByLabel('Reason').fill('Forgot to clock out properly at reception.');
  await empPage.getByRole('button', { name: 'Submit correction request' }).click();
  await expect(empPage.getByText(/Correction sent to HR/i)).toBeVisible();

  // 6. HR reviews and approves the attendance correction
  await hrPage.bringToFront();
  await hrPage.goto('http://localhost:3000/hr/attendance');
  await expect(
    hrPage.getByRole('heading', { name: 'Attendance', exact: true }),
  ).toBeVisible();
  await hrPage.getByRole('tab', { name: 'Corrections' }).click();
  await expect(hrPage.getByText('Employee Tester')).toBeVisible();

  await hrPage.getByRole('button', { name: 'View correction' }).first().click();
  await hrPage.getByLabel('Decision comment').fill('Correction verified and approved.');
  await hrPage.getByRole('button', { name: 'Approve request' }).click();
  await expect(hrPage.getByText(/Correction decision saved/i)).toBeVisible();

  // 7. Admin views company-wide attendance board and leave overview
  await adminPage.bringToFront();
  await adminPage.goto('http://localhost:3001/attendance');
  await expect(
    adminPage.getByRole('heading', { name: 'Attendance', exact: true }),
  ).toBeVisible();
  await expect(adminPage.locator('.data-table').getByText('Employee Tester')).toBeVisible();

  await adminPage.goto('http://localhost:3001/leave');
  await expect(adminPage.getByRole('heading', { name: 'Leave overview' })).toBeVisible();
  await expect(adminPage.locator('.data-table').getByText('Employee Tester')).toBeVisible();

  // Cleanup contexts
  await hrContext.close();
  await empContext.close();
});
