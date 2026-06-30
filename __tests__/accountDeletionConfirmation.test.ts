import {
  ACCOUNT_DELETION_CONFIRMATION_TEXT,
  isAccountDeletionConfirmationValid,
} from '../src/services/auth/accountDeletionConfirmation';

describe('account deletion confirmation', () => {
  it('회원탈퇴를 정확히 입력하고 앞뒤 공백만 허용한다', () => {
    expect(isAccountDeletionConfirmationValid('')).toBe(false);
    expect(isAccountDeletionConfirmationValid('회원 탈퇴')).toBe(false);
    expect(isAccountDeletionConfirmationValid('탈퇴')).toBe(false);
    expect(isAccountDeletionConfirmationValid(ACCOUNT_DELETION_CONFIRMATION_TEXT)).toBe(
      true,
    );
    expect(
      isAccountDeletionConfirmationValid(
        `  ${ACCOUNT_DELETION_CONFIRMATION_TEXT}  `,
      ),
    ).toBe(true);
  });
});
