import { resolveSignInNotice } from '../src/services/auth/notices';

describe('auth notices', () => {
  it('logout success modal 문구를 premium line config로 반환한다', () => {
    expect(resolveSignInNotice('logout-success')).toEqual({
      eyebrow: 'SIGNED OUT',
      iconName: 'shield',
      titleLines: ['안전하게', '로그아웃 되었습니다.'],
      bodyLines: [
        '로그인 홈에서 다시 이어갈 수 있어요.',
        '필요한 순간에 언제든 돌아오세요.',
      ],
      confirmLabel: '확인',
    });
  });

  it('account deletion success는 두 줄 제목으로 반환한다', () => {
    expect(resolveSignInNotice('account-deletion-success')).toEqual({
      eyebrow: 'ACCOUNT DELETION',
      iconName: 'shield',
      titleLines: ['탈퇴 요청이 접수되었어요.'],
      bodyLines: [
        '모든 정보가 안전하게 숨김 처리되었어요 🔒',
        '(7일 후 영구 삭제되며, 그 전까지 언제든 복구할 수 있습니다)',
      ],
      confirmLabel: '확인',
    });
  });

  it('keeps recovery completion without offering a removed credential form', () => {
    expect(resolveSignInNotice('password-reset-success')).toEqual({
      eyebrow: 'PASSWORD UPDATED',
      iconName: 'check',
      titleLines: ['비밀번호가 변경되었습니다.'],
      bodyLines: [
        '보안을 위해 임시 세션을 종료했어요.',
        '로그인 홈에서 연결된 소셜 계정으로 계속할 수 있어요.',
      ],
      confirmLabel: '확인',
    });
  });
});
