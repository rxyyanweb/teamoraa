import { test, expect } from '@playwright/test';

test.describe('Initial Company Setup Onboarding Flow', () => {
  test('Complete company onboarding on unified Frontend (port 3000)', async ({ page }) => {
    await page.goto('/setup');
    
    // Check if setup is needed or already completed
    const isSetupForm = await page.getByLabel('Company name').isVisible({ timeout: 4000 }).catch(() => false);
    
    if (isSetupForm) {
      // Step 1: Company Profile
      await page.getByLabel('Company name').fill('Teamora Global Enterprises');
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      
      // Step 2: Administrator Account
      await page.getByLabel('Your full name').fill('Admin Setup');
      await page.getByLabel('Admin email').fill('admin@gmail.com');
      await page.getByLabel('Initial Admin password').fill('TmR7!qV9#Lx2@Bp6Nc4');
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      
      // Step 3: Work Hours & Timezone
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      
      // Step 4: Confirm and Launch
      await page.getByRole('button', { name: 'Create company workspace' }).click();
      
      // Redirects to /admin/dashboard
      await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });
      await expect(page.getByText(/Super Admin|Teamora Global/i)).toBeVisible();
    } else {
      // Already initialized; verify redirect to login
      await expect(page).toHaveURL(/\/(login|admin\/dashboard)/);
    }
  });
});
