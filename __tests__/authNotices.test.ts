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

  it('invalid credentials는 중립 로그인 실패 모달과 보조 액션을 반환한다', () => {
    expect(resolveSignInNotice('invalid-credentials')).toEqual({
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
