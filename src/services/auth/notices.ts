export type RouteSignInNotice =
  | 'password-reset-success'
  | 'logout-success'
  | 'account-deletion-success';

export type PremiumNoticeConfig = {
  eyebrow: string;
  iconName: 'check' | 'shield' | 'user-plus';
  titleLines: [string, ...string[]];
  bodyLines: [string, ...string[]];
  confirmLabel: string;
};

export function resolveSignInNotice(
  notice: RouteSignInNotice,
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
        eyebrow: 'ACCOUNT DELETION',
        iconName: 'shield',
        titleLines: ['탈퇴 요청이 접수되었어요.'],
        bodyLines: [
          '모든 정보가 안전하게 숨김 처리되었어요 🔒',
          '(7일 후 영구 삭제되며, 그 전까지 언제든 복구할 수 있습니다)',
        ],
        confirmLabel: '확인',
      };
    case 'password-reset-success':
    default:
      return {
        eyebrow: 'PASSWORD UPDATED',
        iconName: 'check',
        titleLines: ['비밀번호가 변경되었습니다.'],
        bodyLines: [
          '보안을 위해 임시 세션을 종료했어요.',
          '로그인 홈에서 연결된 소셜 계정으로 계속할 수 있어요.',
        ],
        confirmLabel: '확인',
      };
  }
}
