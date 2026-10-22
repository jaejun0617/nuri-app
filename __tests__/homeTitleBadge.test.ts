import {
  loadCachedHomePetTitleBadge,
  pickHomePetTitleBadge,
  saveCachedHomePetTitleBadge,
  type HomeTitleBadgeRow,
  pickHomePetTitleBadgeIdentity,
  loadCachedHomePetTitleBadgeIdentity,
} from '../src/services/activity/homeTitleBadge';
import { SERVER_TITLE_ART, getServerTitleArtwork } from '../src/services/activity/titleArtwork';
import { TITLE_POLICIES } from '../src/services/activity/progressPolicy';
import AsyncStorage from '@react-native-async-storage/async-storage';

function title(input: Partial<HomeTitleBadgeRow> & Pick<HomeTitleBadgeRow, 'titleName' | 'petId'>): HomeTitleBadgeRow {
  return {
    titleKey: input.titleName,
    earnedAt: input.earnedAt ?? '2026-07-11T00:00:00.000Z',
    ...input,
  };
}

describe('home title badge policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('user/pet scoped cache로 홈 첫 렌더에 표시할 칭호를 복원한다', async () => {
    await saveCachedHomePetTitleBadge({
      userId: 'user-1',
      petId: 'pet-1',
      title: '추억 수집가',
      now: 1_000,
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@nuri/home-title-badge/v1:user-1:pet-1',
      JSON.stringify({ savedAt: 1_000, title: '추억 수집가' }),
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ savedAt: 1_000, title: '추억 수집가' }),
    );

    await expect(
      loadCachedHomePetTitleBadge({
        userId: 'user-1',
        petId: 'pet-1',
        now: 2_000,
      }),
    ).resolves.toBe('추억 수집가');
  });

  it('오래된 홈 badge cache는 사용자에게 표시하지 않는다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ savedAt: 1_000, title: '오래된 칭호' }),
    );

    await expect(
      loadCachedHomePetTitleBadge({
        userId: 'user-1',
        petId: 'pet-1',
        now: 8 * 24 * 60 * 60 * 1000 + 1_000,
      }),
    ).resolves.toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      '@nuri/home-title-badge/v1:user-1:pet-1',
    );
  });
  it('keeps the stable title key without inferring artwork from its localized name', () => {
    const value = pickHomePetTitleBadgeIdentity({ petId: 'pet-1', titles: [title({ titleKey: 'walk_sprout', titleName: '이름이 바뀌어도 같은 칭호', petId: 'pet-1' })] });
    expect(value).toEqual({ titleKey: 'walk_sprout', titleName: '이름이 바뀌어도 같은 칭호' });
    expect(getServerTitleArtwork(value?.titleKey)).toBe(SERVER_TITLE_ART.walk_sprout);
    expect(getServerTitleArtwork('산책 새싹')).toBeUndefined();
    expect(getServerTitleArtwork('unrecognized_future_title')).toBeUndefined();
  });
  it('reads old name-only caches safely and roundtrips optional identity in the same scoped cache', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({savedAt: 1000, title: '산책 새싹'}));
    await expect(loadCachedHomePetTitleBadgeIdentity({userId:'u',petId:'p',now:2000})).resolves.toEqual({titleName:'산책 새싹',titleKey:null});
    await saveCachedHomePetTitleBadge({userId:'u',petId:'p',title:'산책 새싹',titleKey:'walk_sprout',now:1000});
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@nuri/home-title-badge/v1:u:p',JSON.stringify({savedAt:1000,title:'산책 새싹',titleKey:'walk_sprout'}));
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({savedAt:1000,title:'산책 새싹',titleKey:'walk_sprout'}));
    await expect(loadCachedHomePetTitleBadgeIdentity({userId:'u',petId:'p',now:2000})).resolves.toEqual({titleName:'산책 새싹',titleKey:'walk_sprout'});
  });
  it('explicitly maps every current server title policy while preserving all 11 original IDs', () => {
    expect(TITLE_POLICIES).toHaveLength(11);
    expect(Object.keys(SERVER_TITLE_ART).sort()).toEqual(TITLE_POLICIES.map(p=>p.key).sort());
    for (const item of TITLE_POLICIES) expect(getServerTitleArtwork(item.key)).toBeDefined();
  });
});
