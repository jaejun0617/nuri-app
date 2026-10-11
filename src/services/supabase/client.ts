// 파일: src/services/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import { validateSupabaseRuntimeConfig } from './runtimeConfig';
import { secureSessionStorage } from '../auth/secureSessionStorage';

const config = validateSupabaseRuntimeConfig(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabase = createClient(config.url, config.clientKey, {
  auth: {
    flowType: 'pkce',
    storage: secureSessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
