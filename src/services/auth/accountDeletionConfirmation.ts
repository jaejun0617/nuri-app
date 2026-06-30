// 파일: src/services/auth/accountDeletionConfirmation.ts
// 역할:
// - 회원탈퇴 확인 입력값을 화면과 테스트가 같은 기준으로 판정하게 한다.
// - 서버의 7일 유예 정책은 건드리지 않고, 실수 탈퇴 방지 UI 조건만 담당한다.

export const ACCOUNT_DELETION_CONFIRMATION_TEXT = '회원탈퇴';

export function isAccountDeletionConfirmationValid(value: string): boolean {
  return value.trim() === ACCOUNT_DELETION_CONFIRMATION_TEXT;
}
