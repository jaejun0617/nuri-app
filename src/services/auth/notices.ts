import { getErrorMessage } from '../app/errors';

export type RouteSignInNotice =
  | 'password-reset-success'
  | 'logout-success'
  | 'account-deletion-success';

export type SignInNotice = RouteSignInNotice | 'account-invite';

export type PremiumNoticeConfig = {
  eyebrow: string;
  iconName: 'check' | 'shield' | 'user-plus';
  titleLines: [string, ...string[]];
  bodyLines: [string, ...string[]];
  confirmLabel: string;
};

export function resolveSignInNotice(
  notice: SignInNotice,
): PremiumNoticeConfig {
  switch (notice) {
    case 'logout-success':
      return {
        eyebrow: 'SIGNED OUT',
        iconName: 'shield',
        titleLines: ['안전하게', '로그아웃 되었습니다.'],
        bodyLines: [
          '로그인 홈에서 다시 이어갈 수 있어요.',
          '필요한 순간에 언제든 돌아오세요.',
        ],
        confirmLabel: '확인',
      };
    case 'account-deletion-success':
      return {
        eyebrow: 'ACCOUNT REMOVED',
        iconName: 'shield',
        titleLines: ['계정 삭제가 안전하게', '처리되었습니다.'],
        bodyLines: [
          '그동안 NURI와 함께해주셔서',
          '감사합니다.',
        ],
        confirmLabel: '확인',
      };
    case 'account-invite':
      return {
        eyebrow: 'WELCOME TO NURI',
        iconName: 'user-plus',
        titleLines: ['가입되지 않은', '이메일입니다.'],
        bodyLines: [
          'NURI의 회원이 되어',
          '특별한 경험을 시작해 보세요.',
        ],
        confirmLabel: '회원가입 살펴보기',
      };
    case 'password-reset-success':
    default:
      return {
        eyebrow: 'PASSWORD UPDATED',
        iconName: 'check',
        titleLines: ['비밀번호가 변경되었습니다.'],
        bodyLines: [
          '보안을 위해 임시 세션을 종료했어요.',
          '새 비밀번호로 다시 로그인해 주세요.',
        ],
        confirmLabel: '확인',
      };
  }
}

export function isInvalidCredentialSignInError(error: unknown): boolean {
  const normalized = getErrorMessage(error).trim().toLowerCase();

  return (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid credentials')
  );
}
