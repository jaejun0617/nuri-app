import {
  resolvePetTravelRegionIntent,
  resolvePetTravelRegionFromKeyword,
} from '../src/services/petTravel/catalog';
import { fetchPetTravelList } from '../src/services/petTravel/api';

function buildTourApiListResponse(itemOverrides: Record<string, unknown> = {}) {
  return {
    response: {
      header: {
        resultCode: '0000',
        resultMsg: 'OK',
      },
      body: {
        totalCount: 1,
        items: {
          item: {
            contentid: '123',
            contenttypeid: '12',
            title: '제주 반려동물 여행지',
            mapx: '126.5312',
            mapy: '33.4996',
            addr1: '제주특별자치도 제주시 애월읍',
            tel: '064-000-0000',
            modifiedtime: '20260320120000',
            acmpyPsblCpam: '반려동물 동반 가능',
            ...itemOverrides,
          },
        },
      },
    },
  };
}

describe('petTravel catalog', () => {
  it('전국 공통 지역 intent로 광역/기초/생활권 별칭을 해석한다', () => {
    expect(resolvePetTravelRegionFromKeyword('강원도')?.areaCode).toBe('32');
    expect(resolvePetTravelRegionFromKeyword('강릉')?.label).toBe('강원 강릉');
    expect(resolvePetTravelRegionFromKeyword('일산')?.label).toBe('경기 고양');
    expect(resolvePetTravelRegionFromKeyword('서귀포')?.label).toBe('제주 서귀포');
  });

  it('구체 장소 검색은 region-only query로 오인하지 않는다', () => {
    expect(resolvePetTravelRegionIntent('일산호수공원')?.isRegionOnlyQuery).toBe(false);
    expect(resolvePetTravelRegionIntent('제주도')?.isRegionOnlyQuery).toBe(true);
  });
});

describe('fetchPetTravelList', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('TourAPI raw 문구만으로는 confirmed로 올리지 않는다', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => buildTourApiListResponse(),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchPetTravelList({
      searchKeyword: '제주도',
      categoryId: 'all',
      size: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.petAllowed).toBe('possible');
    expect(result.items[0]?.petPolicy.status).toBe('tour-api-positive');
    expect(result.items[0]?.aggregation.score.travelScore).toBeGreaterThan(0);
    expect(result.items[0]?.aggregation.score.petScore).toBeLessThan(
      result.items[0]?.aggregation.score.travelScore ?? 1,
    );
    expect(fetchMock).toHaveBeenCalled();
    const requestCall = (fetchMock.mock.calls as unknown[][])[0];
    const requestUrl = String(requestCall?.[0] ?? '');
    expect(requestUrl).not.toContain('petTourInfo=1');
  });
});
