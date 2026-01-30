/**
 * Authentication helpers for E2E tests
 * Uses Supabase Auth for login via phone number
 */

/**
 * Login as a specific user role using phone number
 * @param {import('@playwright/test').Page} page
 * @param {string} phone - Phone number without country code (e.g., "601234567")
 * @param {string} password
 * @param {string} countryCode - Country code (default: '+381')
 */
export async function login(page, phone, password, countryCode = '+381') {
  await page.goto('/login');

  // Wait for login form to be ready
  await page.waitForSelector('input[type="tel"]');

  // Select country code if different from default
  if (countryCode !== '+381') {
    await page.click('button:has-text("+381")'); // Open dropdown
    await page.click(`button:has-text("${countryCode}")`);
  }

  // Fill in credentials
  await page.fill('input[type="tel"]', phone);
  await page.fill('input[type="password"]', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect based on role
  await page.waitForURL(/\/(admin|manager|driver|client)?$/);
}

/**
 * Logout current user
 * @param {import('@playwright/test').Page} page
 */
export async function logout(page) {
  // Click user menu or logout button
  const logoutBtn = page.locator('button:has-text("Odjava"), button:has-text("Logout")');
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
  }

  // Wait for redirect to login
  await page.waitForURL(/\/login/);
}

/**
 * Check if user is logged in
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn(page) {
  const url = page.url();
  return !url.includes('/login');
}
