import { getErrorMessage } from '../app/errors';

export type RouteSignInNotice =
  | 'password-reset-success'
  | 'logout-success'
  | 'account-deletion-success';

export type SignInNotice = RouteSignInNotice | 'invalid-credentials';

export type PremiumNoticeActionKind = 'password-reset' | 'signup';

export type PremiumNoticeSecondaryAction = {
  label: string;
  kind: PremiumNoticeActionKind;
};

export type PremiumNoticeConfig = {
  eyebrow: string;
  iconName: 'check' | 'shield' | 'user-plus';
  titleLines: [string, ...string[]];
  bodyLines: [string, ...string[]];
  confirmLabel: string;
  secondaryActions?: readonly PremiumNoticeSecondaryAction[];
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
    case 'invalid-credentials':
      return {
        eyebrow: 'SIGN IN',
        iconName: 'shield',
        titleLines: ['로그인 정보를 다시 확인해 주세요'],
        bodyLines: [
          '입력하신 이메일 또는 비밀번호가 일치하지 않습니다.',
          'NURI가 처음이시라면 회원가입 후 특별한 여정을 시작해 보세요.',
        ],
        confirmLabel: '다시 입력하기',
        secondaryActions: [
          { label: '비밀번호 재설정', kind: 'password-reset' },
          { label: '회원가입', kind: 'signup' },
        ],
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
