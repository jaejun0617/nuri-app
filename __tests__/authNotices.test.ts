import {
  isInvalidCredentialSignInError,
  resolveSignInNotice,
} from '../src/services/auth/notices';

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
      eyebrow: 'ACCOUNT REMOVED',
      iconName: 'shield',
      titleLines: ['계정 삭제가 안전하게', '처리되었습니다.'],
      bodyLines: ['그동안 NURI와 함께해주셔서', '감사합니다.'],
      confirmLabel: '확인',
    });
  });

  it('invalid credential helper는 Supabase 기본 메시지를 잡아낸다', () => {
    expect(
      isInvalidCredentialSignInError(new Error('Invalid login credentials')),
    ).toBe(true);
    expect(
      isInvalidCredentialSignInError(new Error('Email rate limit exceeded')),
    ).toBe(false);
  });
});
