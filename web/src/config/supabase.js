import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Supabase konfiguracija nije postavljena. ' +
        'Molimo dodajte VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY u .env fajl.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Expose for debugging in console
if (typeof window !== 'undefined') {
    window.supabase = supabase;
}
