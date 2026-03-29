// supabase.js - Supabase Client Configuration
// Import polyfills for React Native compatibility
import 'react-native-url-polyfill/auto';
import 'text-encoding-polyfill';

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://frcbiyxewkumgawpfsgo.supabase.co';
const supabaseAnonKey = 'sb_publishable_Zr2cDjHGalkdXoAdaXbTHw_S_fyxX0r';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: AsyncStorage,
  },
});
