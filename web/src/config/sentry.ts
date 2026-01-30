/**
 * Sentry Error Tracking Configuration
 *
 * Setup instructions:
 * 1. Create a Sentry account at https://sentry.io
 * 2. Create a new React project
 * 3. Copy your DSN to .env as VITE_SENTRY_DSN
 *
 * Features enabled:
 * - Automatic error capturing
 * - Performance monitoring (10% sample rate)
 * - Session replay for errors (10% sample rate)
 * - User context from auth
 */
import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const IS_PRODUCTION = import.meta.env.PROD;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

/**
 * Initialize Sentry - call this in main.jsx before ReactDOM.render
 */
export function initSentry() {
  // Only initialize if DSN is configured
  if (!SENTRY_DSN) {
    if (IS_PRODUCTION) {
      console.warn('Sentry DSN not configured. Error tracking disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: IS_PRODUCTION ? 'production' : 'development',
    release: `ecologistics@${APP_VERSION}`,

    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Sample rates
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // 10% in prod, 100% in dev
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Filter out known non-issues
    ignoreErrors: [
      // Network errors (usually user connectivity issues)
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      // Browser extension errors
      /^chrome-extension:/,
      /^moz-extension:/,
      // ResizeObserver (known benign error)
      'ResizeObserver loop',
      // Auth errors (expected behavior)
      'Invalid login credentials',
      'User not found',
    ],

    // Don't send errors in development unless testing Sentry
    enabled: IS_PRODUCTION || import.meta.env.VITE_SENTRY_DEBUG === 'true',

    // Before sending, you can modify or filter events
    beforeSend(event, hint) {
      // Don't send if user opted out (GDPR)
      if (localStorage.getItem('sentry-opted-out') === 'true') {
        return null;
      }

      // Add extra context
      const error = hint.originalException;
      if (error instanceof Error) {
        event.tags = {
          ...event.tags,
          errorType: error.name,
        };
      }

      return event;
    },
  });
}

/**
 * Set user context for error tracking
 * Call this after successful login
 */
export function setSentryUser(user: {
  id: string;
  name?: string;
  role?: string;
  company_code?: string;
}) {
  Sentry.setUser({
    id: user.id,
    username: user.name,
    // Don't send email/phone for privacy
  });

  Sentry.setTag('user_role', user.role || 'unknown');
  Sentry.setTag('company_code', user.company_code || 'unknown');
}

/**
 * Clear user context on logout
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Manually capture an error with extra context
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>
) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

// Re-export Sentry for direct usage
export { Sentry };
