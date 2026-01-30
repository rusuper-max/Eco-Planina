/**
 * Central export for all TypeScript types
 *
 * Usage:
 * import type { User, PickupRequest, UserRole } from '@/types';
 * // or
 * import type { User, PickupRequest } from '../types';
 */

// Re-export everything from generated database types
export type { Database, Json } from './database';

// Re-export all custom types
export * from './supabase';
