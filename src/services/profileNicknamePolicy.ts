// 파일 목적:
// - 닉네임 길이/문자 정책을 앱 전역에서 한 번만 정의한다.
// - 클라이언트 validation, RPC 결과 매핑, DB 에러 메시지 정렬에 같은 문구를 재사용한다.

export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 10;
export const NICKNAME_ALLOWED_REGEX = /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]+$/;

export type NicknamePolicyCode =
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'blocked'
  | 'taken'
  | 'not_authenticated'
  | 'ok';

export function normalizeNicknameInput(value: string): string {
  return value.trim();
}

export function getNicknameLengthRangeMessage(): string {
  return `닉네임은 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자 사이로 입력해주세요`;
}

export function getNicknameErrorMessageByCode(
  code: NicknamePolicyCode,
): string | null {
  switch (code) {
    case 'ok':
      return '사용 가능한 닉네임입니다';
    case 'taken':
      return '이미 사용중인 닉네임 입니다.';
    case 'blocked':
      return '사용할 수 없는 닉네임입니다';
    case 'too_short':
    case 'too_long':
      return getNicknameLengthRangeMessage();
    case 'invalid_chars':
      return '한글, 영문, 숫자만 사용할 수 있어요.';
    case 'not_authenticated':
      return '로그인 정보가 없습니다.';
    case 'empty':
    default:
      return null;
  }
}

export function validateNicknameInput(value: string): {
  trimmed: string;
  code: NicknamePolicyCode;
  message: string | null;
} {
  const trimmed = normalizeNicknameInput(value);

  if (!trimmed) {
    return { trimmed, code: 'empty', message: null };
  }

  if (trimmed.length < NICKNAME_MIN_LENGTH) {
    return {
      trimmed,
      code: 'too_short',
      message: getNicknameErrorMessageByCode('too_short'),
    };
  }

  if (trimmed.length > NICKNAME_MAX_LENGTH) {
    return {
      trimmed,
      code: 'too_long',
      message: getNicknameErrorMessageByCode('too_long'),
    };
  }

  if (!NICKNAME_ALLOWED_REGEX.test(trimmed)) {
    return {
      trimmed,
      code: 'invalid_chars',
      message: getNicknameErrorMessageByCode('invalid_chars'),
    };
  }

  return { trimmed, code: 'ok', message: null };
}
