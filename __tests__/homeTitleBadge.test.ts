import {
  pickHomePetTitleBadge,
  type HomeTitleBadgeRow,
} from '../src/services/activity/homeTitleBadge';

function title(input: Partial<HomeTitleBadgeRow> & Pick<HomeTitleBadgeRow, 'titleName' | 'petId'>): HomeTitleBadgeRow {
  return {
    titleKey: input.titleName,
    earnedAt: input.earnedAt ?? '2026-07-11T00:00:00.000Z',
    ...input,
  };
}

describe('home title badge policy', () => {
  it('현재 펫에 귀속된 최신 칭호만 홈 badge로 선택한다', () => {
    expect(
      pickHomePetTitleBadge({
        petId: 'pet-1',
        titles: [
          title({
            titleName: '첫 산책 친구',
            petId: 'pet-1',
            earnedAt: '2026-07-01T00:00:00.000Z',
          }),
          title({
            titleName: '추억 수집가',
            petId: 'pet-1',
            earnedAt: '2026-07-10T00:00:00.000Z',
          }),
        ],
      }),
    ).toBe('추억 수집가');
  });

  it('user-level 공통 칭호를 pet 칭호처럼 오표시하지 않는다', () => {
    expect(
      pickHomePetTitleBadge({
        petId: 'pet-1',
        titles: [
          title({ titleName: '댓글 요정', petId: null }),
          title({ titleName: '첫 산책 친구', petId: 'pet-2' }),
        ],
      }),
    ).toBeNull();
  });
});
