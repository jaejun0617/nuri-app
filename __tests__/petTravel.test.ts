import {
  resolvePetTravelRegionIntent,
  resolvePetTravelRegionFromKeyword,
} from '../src/services/petTravel/catalog';
import { fetchPetTravelList } from '../src/services/petTravel/api';
import { loadPetTravelTrustSnapshotsBySourceIds } from '../src/services/supabase/petTravelTrust';

jest.mock('../src/services/supabase/petTravelTrust', () => ({
  loadPetTravelTrustSnapshotsBySourceIds: jest.fn(async () => new Map()),
}));

const mockedLoadPetTravelTrustSnapshotsBySourceIds = jest.mocked(
  loadPetTravelTrustSnapshotsBySourceIds,
);

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

function buildTourApiPagedResponse(
  items: ReadonlyArray<Record<string, unknown>>,
  totalCount = items.length,
) {
  return {
    response: {
      header: {
        resultCode: '0000',
        resultMsg: 'OK',
      },
      body: {
        totalCount,
        items: {
          item: items,
        },
      },
    },
  };
}

function buildRegionTravelItems(params: {
  count: number;
  regionAddress: string;
  titlePrefix: string;
}) {
  return Array.from({ length: params.count }, (_, index) => {
    const sequence = String(index + 1).padStart(3, '0');
    return {
      contentid: `content-${params.titlePrefix}-${sequence}`,
      contenttypeid: '12',
      title: `${params.titlePrefix} 반려동물 여행지 ${sequence}`,
      mapx: `${126.3 + index * 0.001}`,
      mapy: `${33.2 + index * 0.001}`,
      addr1: `${params.regionAddress} ${index + 1}`,
      tel: '064-000-0000',
      modifiedtime: '20260320120000',
      acmpyPsblCpam: '반려동물 동반 가능',
    };
  });
}

function buildTrustReviewedSnapshotMap(sourceIds: ReadonlyArray<string>) {
  return new Map(
    sourceIds.map(sourceId => [
      sourceId,
      {
        placeId: `place-${sourceId}`,
        canonicalName: sourceId,
        primarySourcePlaceId: sourceId,
        updatedAt: '2026-03-20T12:00:00.000Z',
        activePolicies: [
          {
            id: `policy-${sourceId}`,
            sourceType: 'admin-review' as const,
            policyStatus: 'allowed' as const,
            policyNote: '운영 검수 완료',
            confidence: 0.95,
            requiresOnsiteCheck: false,
            evidenceSummary: '운영 검수 증적',
            evidencePayload: { reviewState: 'approved' },
            createdAt: '2026-03-20T12:00:00.000Z',
            updatedAt: '2026-03-20T12:00:00.000Z',
          },
        ],
      },
    ]),
  );
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
    jest.clearAllMocks();
    mockedLoadPetTravelTrustSnapshotsBySourceIds.mockResolvedValue(new Map());
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
    expect(result.items[0]?.publicTrust.publicLabel).toBe('needs_verification');
    expect(result.items[0]?.aggregation.score.travelScore).toBeGreaterThan(0);
    expect(result.items[0]?.aggregation.score.petScore).toBeLessThan(
      result.items[0]?.aggregation.score.travelScore ?? 1,
    );
    expect(fetchMock).toHaveBeenCalled();
    const requestCall = (fetchMock.mock.calls as unknown[][])[0];
    const requestUrl = String(requestCall?.[0] ?? '');
    expect(requestUrl).not.toContain('petTourInfo=1');
  });

  it.each([
    {
      keyword: '제주도',
      regionAddress: '제주특별자치도 제주시 애월읍',
      titlePrefix: '제주',
      totalCount: 65,
    },
    {
      keyword: '강원도',
      regionAddress: '강원특별자치도 강릉시 주문진읍',
      titlePrefix: '강원',
      totalCount: 73,
    },
  ])(
    'region-only 검색은 $keyword page slice를 기준으로 중복 없이 append된다',
    async ({ keyword, regionAddress, titlePrefix, totalCount }) => {
      const dataset = buildRegionTravelItems({
        count: totalCount,
        regionAddress,
        titlePrefix,
      });
      mockedLoadPetTravelTrustSnapshotsBySourceIds.mockImplementation(
        async sourceIds => buildTrustReviewedSnapshotMap(sourceIds),
      );
      const fetchMock = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => buildTourApiPagedResponse(dataset, totalCount),
      }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const firstPage = await fetchPetTravelList({
        searchKeyword: keyword,
        categoryId: 'all',
        page: 1,
        size: 20,
      });
      const secondPage = await fetchPetTravelList({
        searchKeyword: keyword,
        categoryId: 'all',
        page: 2,
        size: 20,
      });

      const firstPageIds = firstPage.items.map(item => item.id);
      const secondPageIds = secondPage.items.map(item => item.id);
      const mergedIds = new Set([...firstPageIds, ...secondPageIds]);

      expect(firstPage.items).toHaveLength(20);
      expect(secondPage.items).toHaveLength(20);
      expect(firstPage.apiTotalCount).toBe(totalCount);
      expect(secondPage.apiTotalCount).toBe(totalCount);
      expect(firstPage.totalCount).toBe(20);
      expect(secondPage.totalCount).toBe(20);
      expect(mergedIds.size).toBe(40);
      expect(firstPageIds.every(id => !secondPageIds.includes(id))).toBe(true);
    },
  );
});
