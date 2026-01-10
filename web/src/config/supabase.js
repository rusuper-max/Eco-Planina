import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vmsfsstxxndpxbsdylog.supabase.co';
const supabaseAnonKey = 'sb_publishable_IvJ2RkPfu_4HC2qffHi4bA_118ZZatm';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
