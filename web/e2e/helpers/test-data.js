/**
 * Test data and constants for E2E tests
 *
 * IMPORTANT: Create these test users in your Supabase project
 * or update with existing test credentials
 */

// Test user credentials - UPDATE THESE with real test accounts
// Phone numbers should be without country code (e.g., "601234567")
export const TEST_USERS = {
  client: {
    phone: process.env.TEST_CLIENT_PHONE || '601234567',
    password: process.env.TEST_CLIENT_PASSWORD || 'test123456',
    countryCode: '+381',
  },
  manager: {
    phone: process.env.TEST_MANAGER_PHONE || '602345678',
    password: process.env.TEST_MANAGER_PASSWORD || 'test123456',
    countryCode: '+381',
  },
  driver: {
    phone: process.env.TEST_DRIVER_PHONE || '603456789',
    password: process.env.TEST_DRIVER_PASSWORD || 'test123456',
    countryCode: '+381',
  },
  admin: {
    phone: process.env.TEST_ADMIN_PHONE || '604567890',
    password: process.env.TEST_ADMIN_PASSWORD || 'test123456',
    countryCode: '+381',
  },
};

// Common selectors used across tests
export const SELECTORS = {
  // Navigation
  navRequests: '[data-testid="nav-requests"], a[href*="requests"]',
  navHistory: '[data-testid="nav-history"], a[href*="history"]',
  navClients: '[data-testid="nav-clients"], a[href*="clients"]',

  // Buttons
  newRequestBtn: 'button:has-text("Novi zahtev"), button:has-text("New request")',
  submitBtn: 'button[type="submit"]',
  cancelBtn: 'button:has-text("Otkaži"), button:has-text("Cancel")',
  saveBtn: 'button:has-text("Sačuvaj"), button:has-text("Save")',

  // Modals
  modal: '[role="dialog"], .modal',
  modalClose: '[data-testid="modal-close"], button[aria-label="Close"]',

  // Tables
  tableRow: 'tr, [data-testid="table-row"]',

  // Toast notifications
  toastSuccess: '.toast-success, [data-testid="toast-success"]',
  toastError: '.toast-error, [data-testid="toast-error"]',
};

// Wait timeouts
export const TIMEOUTS = {
  short: 5000,
  medium: 10000,
  long: 30000,
  navigation: 15000,
};
