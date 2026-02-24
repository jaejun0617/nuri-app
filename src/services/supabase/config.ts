// 파일: src/services/supabase/config.ts
// -------------------------------------------------------------
// 역할:
// - Supabase 프로젝트 연결 정보(URL / anon key) 관리
// - 실무에서는 .env로 분리하는 게 정석이지만,
//   지금은 "가장 빠른 테스트" 목적이라 파일로 고정.
// -------------------------------------------------------------

export const SUPABASE_URL = 'https://grmekesqoydylqmyvfke.supabase.co';
export const SUPABASE_ANON_KEY =
  'sb_publishable_ceMGT_CVGdA1NbfBOj8EUw_Ggg7PtTP';
