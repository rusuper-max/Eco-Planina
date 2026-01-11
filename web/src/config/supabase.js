import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vmsfsstxxndpxbsdylog.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_IvJ2RkPfu_4HC2qffHi4bA_118ZZatm';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
