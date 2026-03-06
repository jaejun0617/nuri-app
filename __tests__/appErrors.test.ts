import {
  getRetryableErrorMessage,
  isLikelyNetworkError,
} from '../src/services/app/errors';

describe('app error helpers', () => {
  it('네트워크 에러를 재시도 문구로 바꾼다', () => {
    const error = new Error('Network request failed');

    expect(isLikelyNetworkError(error)).toBe(true);
    expect(getRetryableErrorMessage(error)).toContain('네트워크');
  });

  it('일반 에러는 원문 메시지를 유지한다', () => {
    const error = new Error('이미 사용중인 닉네임 입니다.');

    expect(isLikelyNetworkError(error)).toBe(false);
    expect(getRetryableErrorMessage(error)).toBe(
      '이미 사용중인 닉네임 입니다.',
    );
  });
});
