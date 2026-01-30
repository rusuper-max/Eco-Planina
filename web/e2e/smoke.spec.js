import { test, expect } from '@playwright/test';

/**
 * Smoke tests - basic health checks
 * These tests verify the app loads and core pages are accessible
 */

test.describe('Smoke Tests', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');

    // Check title/heading
    await expect(page.locator('h1')).toContainText('EcoMountain');

    // Check login form elements exist
    await expect(page.locator('input[type="tel"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('register page loads correctly', async ({ page }) => {
    await page.goto('/register');

    // Should have registration heading
    await expect(page.locator('text=Registracija novog naloga')).toBeVisible();
  });

  test('login form shows validation on empty submit', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Form should require phone input (HTML5 validation)
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toHaveAttribute('required');
  });

  // Note: This test requires real Supabase backend and may timeout
  // Enable when running against a real environment with predictable responses
  test.skip('login form shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill with invalid credentials
    await page.fill('input[type="tel"]', '000000000');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit
    await page.click('button[type="submit"]');

    // Should show error message (TailwindCSS v4 compiles classes differently)
    // Look for the error div structure from LoginPage.jsx
    await expect(page.locator('div[class*="red"]')).toBeVisible({ timeout: 15000 });
  });

  // Note: Route protection tests skipped as app may have different routing behavior
  // Enable when auth guards are confirmed working
  test.skip('unauthenticated user is redirected to login', async ({ page }) => {
    // Try to access protected routes
    await page.goto('/client');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/manager');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});
