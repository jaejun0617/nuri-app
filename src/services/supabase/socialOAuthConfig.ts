// 파일: src/services/supabase/socialOAuthConfig.ts
// 목적:
// - Social OAuth provider activation flag를 public build config로 관리한다.
// - provider client secret은 앱에 넣지 않고 Supabase Dashboard에만 둔다.

function parsePublicBooleanFlag(
  rawValue: string | undefined,
  fallback: boolean,
): boolean {
  const normalizedValue = rawValue?.trim().toLowerCase();

  if (!normalizedValue) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalizedValue)) return false;

  return fallback;
}

export const ENABLE_GOOGLE_OAUTH = parsePublicBooleanFlag(
  process.env.EXPO_PUBLIC_ENABLE_GOOGLE_OAUTH,
  true,
);
export const ENABLE_KAKAO_OAUTH = parsePublicBooleanFlag(
  process.env.EXPO_PUBLIC_ENABLE_KAKAO_OAUTH,
  true,
);
