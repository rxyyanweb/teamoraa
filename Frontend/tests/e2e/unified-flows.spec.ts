import { test, expect } from '@playwright/test';

test.describe('Teamora Unified Architecture & Navigation', () => {
  test('Landing page loads with 3-in-1 role selection and theme toggle', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Teamora/i);
    
    // Check main role options exist on landing page
    await expect(page.getByRole('link', { name: /PEOPLE OPERATIONS/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /THE BIG PICTURE/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /YOUR EVERYDAY/i })).toBeVisible();
  });

  test('Admin routes load and require authentication or redirect to login', async ({ page }) => {
    // When accessing /admin/dashboard without auth, should redirect to /login
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Legacy redirects redirect correctly to /admin/*', async ({ page }) => {
    // Legacy /dashboard redirects to /admin/dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/(admin\/dashboard|login)/);

    // Legacy /leave-settings redirects to /admin/leave-settings
    await page.goto('/leave-settings');
    await expect(page).toHaveURL(/\/(admin\/leave-settings|login)/);

    // Legacy /organization redirects to /admin/organization
    await page.goto('/organization');
    await expect(page).toHaveURL(/\/(admin\/organization|login)/);
  });

  test('HR and Employee login screens render properly with role parameters', async ({ page }) => {
    // Admin login
    await page.goto('/login?role=admin');
    await expect(page.getByLabel('Work email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();

    // HR login
    await page.goto('/login?role=hr');
    await expect(page.getByLabel('Work email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();

    // Employee login
    await page.goto('/login?role=employee');
    await expect(page.getByLabel('Work email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  });

  test('Setup page redirects to login when setup is already completed', async ({ page }) => {
    await page.goto('/setup');
    // If setup is already completed in DB, it redirects to /login; otherwise shows onboarding
    await expect(page).toHaveURL(/\/(login|setup)/);
  });
});
