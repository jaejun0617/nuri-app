import {
  PET_DELETE_CONFIRMATION_TEXT,
  isPetDeleteConfirmationReady,
} from '../src/components/pets/PetDeleteConfirmDialog';

describe('pet deletion confirmation', () => {
  it('requires both consent and the exact Korean confirmation text', () => {
    expect(
      isPetDeleteConfirmationReady(false, PET_DELETE_CONFIRMATION_TEXT),
    ).toBe(false);
    expect(isPetDeleteConfirmationReady(true, '')).toBe(false);
    expect(isPetDeleteConfirmationReady(true, '삭제')).toBe(false);
    expect(isPetDeleteConfirmationReady(true, '삭제 하기')).toBe(false);
    expect(isPetDeleteConfirmationReady(true, ' 삭제하기')).toBe(false);
    expect(isPetDeleteConfirmationReady(true, '삭제하기 ')).toBe(false);
    expect(isPetDeleteConfirmationReady(true, 'DELETE')).toBe(false);
    expect(
      isPetDeleteConfirmationReady(true, PET_DELETE_CONFIRMATION_TEXT),
    ).toBe(true);
  });
});
