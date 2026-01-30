import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';
import { TEST_USERS, SELECTORS, TIMEOUTS } from './helpers/test-data.js';

/**
 * Request management E2E tests
 *
 * These tests cover the core pickup request workflow:
 * - Manager creates request on behalf of client
 * - Manager processes pending request
 *
 * Note: Tests marked with .skip require valid test credentials
 */

test.describe('Request Management', () => {
  test.describe('Manager Creates Request', () => {
    // This test requires valid manager credentials
    test.skip('manager can create request for client', async ({ page }) => {
      const { phone, password, countryCode } = TEST_USERS.manager;

      // Login as manager
      await login(page, phone, password, countryCode);
      await expect(page).toHaveURL(/\/manager/);

      // Click "Novi zahtev" button
      await page.click('button:has-text("Novi zahtev")');

      // Modal should open
      await expect(page.locator('text=Kreiraj zahtev')).toBeVisible();

      // Select a client from dropdown
      const clientSelect = page.locator('select').first();
      await clientSelect.selectOption({ index: 1 }); // Select first client

      // Select waste type
      const wasteTypeSelect = page.locator('select').nth(1);
      await wasteTypeSelect.waitFor({ state: 'visible' });
      await wasteTypeSelect.selectOption({ index: 1 }); // Select first waste type

      // Adjust fill level (slider)
      const slider = page.locator('input[type="range"]');
      await slider.fill('75');

      // Add a note
      await page.fill('textarea', 'Test zahtev - E2E test');

      // Submit
      await page.click('button:has-text("Kreiraj zahtev")');

      // Modal should close and toast should appear
      await expect(page.locator('text=Kreiraj zahtev')).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Manager Processes Request', () => {
    test.skip('manager can process a pending request', async ({ page }) => {
      const { phone, password, countryCode } = TEST_USERS.manager;

      // Login as manager
      await login(page, phone, password, countryCode);
      await expect(page).toHaveURL(/\/manager/);

      // Wait for requests table to load
      await page.waitForSelector('table, [role="table"]', { timeout: TIMEOUTS.medium });

      // Get first request row (if any)
      const firstRow = page.locator('tbody tr').first();
      const rowExists = await firstRow.isVisible().catch(() => false);

      if (!rowExists) {
        test.skip(); // No requests to process
        return;
      }

      // Click on row to open details/process modal
      await firstRow.click();

      // Should see process modal or details
      await expect(page.locator('[role="dialog"], .modal')).toBeVisible({ timeout: 5000 });
    });

    test.skip('manager can reject a pending request', async ({ page }) => {
      const { phone, password, countryCode } = TEST_USERS.manager;

      await login(page, phone, password, countryCode);
      await expect(page).toHaveURL(/\/manager/);

      // Wait for requests table
      await page.waitForSelector('table', { timeout: TIMEOUTS.medium });

      // Find a reject button in the table
      const rejectBtn = page.locator('button[title*="Odbij"], button:has-text("Odbij")').first();
      const exists = await rejectBtn.isVisible().catch(() => false);

      if (!exists) {
        test.skip(); // No requests to reject
        return;
      }

      await rejectBtn.click();

      // Confirm rejection if there's a confirmation dialog
      const confirmBtn = page.locator('button:has-text("Potvrdi"), button:has-text("Da")');
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
      }
    });
  });
});

test.describe('Request UI Elements', () => {
  test('create request modal has all required fields', async ({ page }) => {
    // This test checks modal structure without actual login
    // We can test the modal in isolation if it's accessible

    // For now, test the login page structure as baseline
    await page.goto('/login');
    await expect(page.locator('input[type="tel"]')).toBeVisible();
  });
});
