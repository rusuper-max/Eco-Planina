import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';
import { TEST_USERS } from './helpers/test-data.js';

/**
 * Authentication flow tests
 * Note: These tests require valid test user credentials in TEST_USERS
 */

test.describe('Authentication', () => {
  test.describe('Login Flow', () => {
    test('country code dropdown works', async ({ page }) => {
      await page.goto('/login');

      // Default should be Serbia (+381)
      await expect(page.locator('button:has-text("+381")')).toBeVisible();

      // Open dropdown
      await page.click('button:has-text("+381")');

      // Check other countries are visible
      await expect(page.locator('button:has-text("+387")')).toBeVisible(); // BiH
      await expect(page.locator('button:has-text("+385")')).toBeVisible(); // Croatia

      // Select BiH
      await page.click('button:has-text("+387")');

      // Dropdown should close and +387 should be selected
      await expect(page.locator('button:has-text("+387")')).toBeVisible();
    });

    test('password visibility toggle works', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeVisible();

      // Fill password
      await page.fill('input[type="password"]', 'testpassword');

      // Click eye icon to show password
      await page.click('button:has([class*="lucide-eye"])');

      // Input should now be type="text"
      await expect(page.locator('input[name="password"], input[placeholder="••••••••"]').first()).toHaveAttribute('type', 'text');
    });

    test('register link navigates to registration page', async ({ page }) => {
      await page.goto('/login');

      // Click register link
      await page.click('text=Registrujte se');

      // Should be on register page
      await expect(page).toHaveURL(/\/register/);
    });

    // Skip this test if no real credentials configured
    test.skip('manager can login and access dashboard', async ({ page }) => {
      const { phone, password, countryCode } = TEST_USERS.manager;

      await login(page, phone, password, countryCode);

      // Should be redirected to manager dashboard
      await expect(page).toHaveURL(/\/manager/);

      // Dashboard should load
      await expect(page.locator('text=Aktivni zahtevi')).toBeVisible({ timeout: 10000 });
    });

    // Skip this test if no real credentials configured
    test.skip('client can login and see their requests', async ({ page }) => {
      const { phone, password, countryCode } = TEST_USERS.client;

      await login(page, phone, password, countryCode);

      // Should be redirected to client area
      await expect(page).toHaveURL(/\/client/);
    });
  });

  test.describe('Logout Flow', () => {
    test.skip('user can logout', async ({ page }) => {
      const { phone, password, countryCode } = TEST_USERS.manager;

      // Login first
      await login(page, phone, password, countryCode);
      await expect(page).toHaveURL(/\/manager/);

      // Find and click logout button
      const logoutBtn = page.locator('button:has-text("Odjava")');
      await logoutBtn.click();

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
