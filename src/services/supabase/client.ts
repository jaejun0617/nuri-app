// 파일: src/services/supabase/client.ts
// -------------------------------------------------------------
// 역할:
// - Supabase JS Client 단일 인스턴스 생성
// - "가장 빠른 테스트" 목적: AsyncStorage 없이도 빌드되게
//   persistSession / autoRefreshToken을 꺼서 의존성 제거
// -------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // ✅ AsyncStorage 없이 테스트
    autoRefreshToken: false, // ✅ 테스트 단계에서는 꺼도 OK
    detectSessionInUrl: false,
  },
});
