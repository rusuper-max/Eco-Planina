import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vmsfsstxxndpxbsdylog.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtc2Zzc3R4eG5kcHhic2R5bG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDcyMzQsImV4cCI6MjA4MzQ4MzIzNH0.pivFU5_iCsiG0VlV__5LOl6pgCj7Uc6R-xJcTn5c4ds';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
