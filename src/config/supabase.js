import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Read from environment or use defaults
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ||
                    Constants.expoConfig?.extra?.supabaseUrl ||
                    'https://vmsfsstxxndpxbsdylog.supabase.co';

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
                        Constants.expoConfig?.extra?.supabaseAnonKey ||
                        'sb_publishable_IvJ2RkPfu_4HC2qffHi4bA_118ZZatm';

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
});
