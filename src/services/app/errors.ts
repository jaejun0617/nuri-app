// 파일: src/services/app/errors.ts
// 역할:
// - 네트워크/일반 에러를 사용자 메시지로 정규화
// - 화면마다 다른 문구로 흩어진 실패 UX를 공용 규칙으로 통일
// - 영어/백엔드 원문 에러를 차분한 한국어 안내 문구로 변환

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const maybeMessage = 'message' in error ? error.message : null;
    if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
      return maybeMessage.trim();
    }
  }
  return '다시 시도해 주세요.';
}

export type BrandedErrorContext =
  | 'signup'
  | 'signin'
  | 'nickname'
  | 'pet-create'
  | 'pet-update'
  | 'record-create'
  | 'record-update'
  | 'record-delete'
  | 'schedule-create'
  | 'schedule-update'
  | 'schedule-fetch'
  | 'password-change'
  | 'logout'
  | 'account-delete'
  | 'image-upload'
  | 'image-pick'
  | 'generic';

function hasKorean(text: string) {
  return /[가-힣]/.test(text);
}

function getContextTitle(context: BrandedErrorContext) {
  switch (context) {
    case 'signup':
      return '회원가입을 마치지 못했어요';
    case 'signin':
      return '로그인을 마치지 못했어요';
    case 'nickname':
      return '닉네임 저장이 잠시 멈췄어요';
    case 'pet-create':
      return '아이 프로필 등록이 잠시 멈췄어요';
    case 'pet-update':
      return '아이 프로필 수정을 반영하지 못했어요';
    case 'record-create':
      return '기록 저장이 잠시 멈췄어요';
    case 'record-update':
      return '기록 수정을 반영하지 못했어요';
    case 'record-delete':
      return '기록 삭제를 완료하지 못했어요';
    case 'schedule-create':
      return '일정 저장이 잠시 멈췄어요';
    case 'schedule-update':
      return '일정 수정을 반영하지 못했어요';
    case 'schedule-fetch':
      return '일정을 불러오지 못했어요';
    case 'password-change':
      return '비밀번호 변경을 마치지 못했어요';
    case 'logout':
      return '로그아웃을 마치지 못했어요';
    case 'account-delete':
      return '회원 정리를 마치지 못했어요';
    case 'image-upload':
      return '사진 업로드가 잠시 멈췄어요';
    case 'image-pick':
      return '사진을 불러오지 못했어요';
    case 'generic':
    default:
      return '요청을 처리하지 못했어요';
  }
}

function getContextFallbackMessage(context: BrandedErrorContext) {
  switch (context) {
    case 'signup':
      return '가입 절차를 마무리하지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'signin':
      return '입력하신 계정 정보를 다시 확인한 뒤 천천히 시도해 주세요.';
    case 'nickname':
      return '닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'pet-create':
      return '아이 프로필을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'pet-update':
      return '아이 프로필 변경을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'record-create':
      return '기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'record-update':
      return '수정한 기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'record-delete':
      return '기록 삭제를 마치지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'schedule-create':
      return '일정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'schedule-update':
      return '일정 수정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'schedule-fetch':
      return '일정을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.';
    case 'password-change':
      return '비밀번호를 변경하지 못했어요. 입력하신 정보를 다시 확인해 주세요.';
    case 'logout':
      return '로그아웃을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'account-delete':
      return '회원 정리를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.';
    case 'image-upload':
      return '사진을 올리는 중 잠시 멈췄어요. 같은 사진으로 다시 시도해 주세요.';
    case 'image-pick':
      return '사진을 가져오지 못했어요. 다른 사진으로 다시 시도해 주세요.';
    case 'generic':
    default:
      return '잠시 후 다시 시도해 주세요.';
  }
}

export function isLikelyNetworkError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return [
    'network request failed',
    'network error',
    'timeout',
    'timed out',
    'fetch failed',
    'failed to fetch',
    'connection',
    'offline',
    'internet',
    'socket',
  ].some(keyword => message.includes(keyword));
}

export function getRetryableErrorMessage(
  error: unknown,
  fallback = '다시 시도해 주세요.',
): string {
  if (isLikelyNetworkError(error)) {
    return '네트워크가 불안정합니다. 연결을 확인한 뒤 다시 시도해 주세요.';
  }

  return getErrorMessage(error) || fallback;
}

export function getBrandedErrorMeta(
  error: unknown,
  context: BrandedErrorContext = 'generic',
): { title: string; message: string } {
  const raw = getErrorMessage(error).trim();
  const normalized = raw.toLowerCase();
  const title = getContextTitle(context);

  if (isLikelyNetworkError(error)) {
    return {
      title,
      message:
        '연결 상태가 잠시 흔들렸어요. 안정적인 네트워크에서 다시 시도해 주세요.',
    };
  }

  if (
    normalized.includes('user already registered') ||
    normalized.includes('already registered')
  ) {
    return {
      title: '이미 함께하고 있는 계정이에요',
      message: '같은 이메일로 가입된 계정이 있어요. 로그인 화면에서 이어서 진행해 주세요.',
    };
  }

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid credentials')
  ) {
    return {
      title,
      message: '이메일 또는 비밀번호가 맞지 않아요. 입력하신 내용을 다시 확인해 주세요.',
    };
  }

  if (normalized.includes('email not confirmed')) {
    return {
      title: '이메일 확인이 필요해요',
      message: '받은 편지함의 인증 메일을 먼저 확인한 뒤 다시 로그인해 주세요.',
    };
  }

  if (normalized.includes('email rate limit exceeded')) {
    return {
      title: '요청이 잠시 몰렸어요',
      message: '안내 메일 발송이 잠시 지연되고 있어요. 조금 후 다시 시도해 주세요.',
    };
  }

  if (normalized.includes('database error saving new user')) {
    return {
      title,
      message: '가입 준비를 마무리하는 중 잠시 멈췄어요. 잠시 후 다시 시도해 주세요.',
    };
  }

  if (
    normalized.includes('not authenticated') ||
    normalized.includes('로그인 정보가 없습니다') ||
    normalized.includes('로그인 세션이 없습니다') ||
    normalized.includes('jwt') ||
    normalized.includes('auth session missing')
  ) {
    return {
      title: '로그인이 잠시 끊어졌어요',
      message: '보안을 위해 다시 로그인한 뒤 이어서 진행해 주세요.',
    };
  }

  if (
    normalized.includes('row-level security') ||
    normalized.includes('permission denied') ||
    normalized.includes('forbidden')
  ) {
    return {
      title: '권한을 확인하지 못했어요',
      message: '이 작업을 진행할 권한을 확인하지 못했어요. 다시 로그인한 뒤 시도해 주세요.',
    };
  }

  if (
    normalized.includes('duplicate key') ||
    normalized.includes('already exists') ||
    normalized.includes('conflict')
  ) {
    return {
      title,
      message: '이미 같은 정보가 등록되어 있어요. 내용을 한 번 더 확인해 주세요.',
    };
  }

  if (
    normalized.includes('storage') ||
    normalized.includes('object') ||
    normalized.includes('upload')
  ) {
    return {
      title: context === 'image-upload' ? title : getContextTitle('image-upload'),
      message: '사진을 올리는 중 잠시 멈췄어요. 같은 사진으로 다시 시도해 주세요.',
    };
  }

  if (
    normalized.includes('password should') ||
    normalized.includes('weak password') ||
    normalized.includes('password')
  ) {
    return {
      title:
        context === 'signin'
          ? title
          : context === 'password-change'
            ? title
            : '비밀번호를 다시 확인해 주세요',
      message: hasKorean(raw)
        ? raw
        : '비밀번호 조건을 다시 확인해 주세요. 영문, 숫자, 특수문자를 포함한 8자 이상을 권장해요.',
    };
  }

  if (!raw) {
    return { title, message: getContextFallbackMessage(context) };
  }

  if (!hasKorean(raw)) {
    return { title, message: getContextFallbackMessage(context) };
  }

  return { title, message: raw };
}
