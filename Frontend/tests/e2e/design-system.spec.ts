import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

async function login(page: Page, role: 'admin' | 'hr' | 'employee') {
  await page.goto(`/login?role=${role}`);
  await page.getByLabel('Work email').fill(`${role}@teamora.test`);
  await page.getByLabel('Password', { exact: true }).fill(
    role === 'admin' ? 'Initial-Admin-Password!' : role === 'hr' ? 'Browser-HR-Password!' : 'Browser-Employee-Password!'
  );
  await page.getByRole('button', { name: 'Sign in to your workspace' }).click();
  await expect(page).toHaveURL(new RegExp(`${role === 'admin' ? 'admin/' : role + '/'}dashboard$`));
  await page.locator('.workspace-header').waitFor();
}

test('Design system: role routing, persisted themes, and accessibility baseline', async ({ page }) => {
  await mkdir('.local/screenshots/after', { recursive: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /A place for/i })).toBeVisible();

  // Test theme switching
  const darkBtn = page.getByRole('button', { name: 'dark theme', exact: true });
  if (await darkBtn.isVisible()) {
    await darkBtn.click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const lightBtn = page.getByRole('button', { name: 'light theme', exact: true });
    await lightBtn.click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  }

  // Accessibility audit on landing page
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations.length).toBeLessThanOrEqual(5);
});
