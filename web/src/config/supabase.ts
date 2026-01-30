/**
 * Typed Supabase Client
 *
 * This file provides a typed Supabase client with full TypeScript support.
 * The original supabase.js is kept for backward compatibility.
 *
 * Usage:
 * import { supabase } from '@/config/supabase';
 * // or for typed version:
 * import { typedSupabase } from '@/config/supabase';
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase konfiguracija nije postavljena. ' +
    'Molimo dodajte VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY u .env fajl.'
  );
}

/**
 * Typed Supabase client with full Database type support
 * Provides autocomplete for table names, columns, and types
 */
export const typedSupabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'ecologistics-auth',
    },
  }
);

/**
 * Untyped client for backward compatibility
 * Gradually migrate to typedSupabase
 */
export const supabase = typedSupabase;

// Expose for debugging in console
if (typeof window !== 'undefined') {
  (window as unknown as { supabase: SupabaseClient<Database> }).supabase = supabase;
}

// =============================================================================
// Type-safe query helpers
// =============================================================================

/**
 * Helper for typed select queries
 * @example
 * const { data } = await selectFrom('users').select('*').eq('role', 'driver');
 */
export const selectFrom = <T extends keyof Database['public']['Tables']>(
  table: T
) => typedSupabase.from(table);

/**
 * Helper for typed RPC calls
 * @example
 * const { data } = await rpc('get_user_info', { user_id: '...' });
 */
export const rpc = typedSupabase.rpc.bind(typedSupabase);

// =============================================================================
// Realtime helpers
// =============================================================================

export type RealtimeChannel = ReturnType<typeof typedSupabase.channel>;

/**
 * Subscribe to table changes
 * Use typedSupabase.channel() directly for full type safety
 * @example
 * const channel = typedSupabase
 *   .channel('pickup-changes')
 *   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pickup_requests' }, callback)
 *   .subscribe();
 */
export const createChannel = (name: string) => typedSupabase.channel(name);
