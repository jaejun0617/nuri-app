// 파일: src/services/supabase/client.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import { validateSupabaseRuntimeConfig } from './runtimeConfig';

const config = validateSupabaseRuntimeConfig(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabase = createClient(config.url, config.clientKey, {
  auth: {
    // ✅ RN에서 세션 영구 유지 핵심
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
