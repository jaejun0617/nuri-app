import type {
  KakaoAddressDocument,
  KakaoPlaceDocument,
  LocationDiscoverySearchInput,
} from '../src/services/locationDiscovery/types';
import type { LocationSearchProviderInput } from '../src/services/locationDiscovery/provider';

jest.mock('../src/services/locationDiscovery/kakaoLocal', () => ({
  kakaoLocalSearchProvider: {
    searchKeyword: jest.fn(),
    searchAddress: jest.fn(),
  },
}));

jest.mock('../src/services/locationDiscovery/walkPoiRpc', () => ({
  ENABLE_WALK_POI_RPC: true,
  searchWalkPoiLocations: jest.fn(async () => []),
  fetchWalkPoiDetailItem: jest.fn(),
}));

import { searchLocationDiscovery } from '../src/services/locationDiscovery/service';

const { kakaoLocalSearchProvider } = jest.requireMock(
  '../src/services/locationDiscovery/kakaoLocal',
) as {
  kakaoLocalSearchProvider: {
    searchKeyword: jest.Mock<
      Promise<ReadonlyArray<KakaoPlaceDocument>>,
      [LocationSearchProviderInput]
    >;
    searchAddress: jest.Mock<
      Promise<ReadonlyArray<KakaoAddressDocument>>,
      [string]
    >;
  };
};
const { searchWalkPoiLocations } = jest.requireMock(
  '../src/services/locationDiscovery/walkPoiRpc',
) as {
  searchWalkPoiLocations: jest.Mock<
    Promise<ReadonlyArray<never>>,
    [LocationDiscoverySearchInput]
  >;
};

const WALK_BASE_KEYWORDS = [
  '공원',
  '문화공원',
  '호수공원',
  '근린공원',
  '생태공원',
  '수변공원',
  '어린이공원',
  '산책로',
  '둘레길',
  '숲길',
] as const;

const ANCHOR_COORDINATES = {
  latitude: 36.421,
  longitude: 127.108,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const ILSAN_COVERAGE_COORDINATES = {
  latitude: 37.676492,
  longitude: 126.767888,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const BAEKSEOK_COVERAGE_COORDINATES = {
  latitude: 37.622,
  longitude: 126.801,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const SEOUL_WORLDCUP_COVERAGE_COORDINATES = {
  latitude: 37.5647,
  longitude: 126.8872,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const SEOUL_BANPO_COVERAGE_COORDINATES = {
  latitude: 37.5146,
  longitude: 126.9919,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const SEOUL_TTUKSEOM_COVERAGE_COORDINATES = {
  latitude: 37.5392,
  longitude: 127.0479,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const SEOUL_SONGPA_COVERAGE_COORDINATES = {
  latitude: 37.5165,
  longitude: 127.116,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const SEOUL_YANGJAE_COVERAGE_COORDINATES = {
  latitude: 37.4805,
  longitude: 127.0405,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const SEOUL_JUNGNANG_COVERAGE_COORDINATES = {
  latitude: 37.608,
  longitude: 127.067,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const SEOUL_ANYANGCHEON_COVERAGE_COORDINATES = {
  latitude: 37.5185,
  longitude: 126.881,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const SEOUL_BORAMAE_COVERAGE_COORDINATES = {
  latitude: 37.492,
  longitude: 126.919,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const SEOUL_DREAMFOREST_COVERAGE_COORDINATES = {
  latitude: 37.6226,
  longitude: 127.0427,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const METRO_BUNDANG_PANGYO_TANCHEON_COVERAGE_COORDINATES = {
  latitude: 37.382,
  longitude: 127.118,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const METRO_HANAM_MISA_HANGANG_COVERAGE_COORDINATES = {
  latitude: 37.5665,
  longitude: 127.19,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const METRO_SUWON_GWANGGYO_LAKE_COVERAGE_COORDINATES = {
  latitude: 37.285,
  longitude: 127.066,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const METRO_GWACHEON_SEOUL_GRAND_PARK_COVERAGE_COORDINATES = {
  latitude: 37.435,
  longitude: 127.014,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};

function createSearchInput(
  query: string | null,
  anchorCoordinates: LocationDiscoverySearchInput['scope']['anchorCoordinates'],
): LocationDiscoverySearchInput {
  return {
    query,
    scope: {
      displayLabel: anchorCoordinates ? '현재 위치' : '전국 검색',
      queryLabel: null,
      anchorCoordinates,
      distanceLabel: anchorCoordinates ? '현재 위치 기준' : '거리 확인 중',
    },
    useNearbySearch: query === null,
  };
}

function createWalkDocument(input: {
  id: string;
  name: string;
  distanceMeters: number;
}): KakaoPlaceDocument {
  const coordinateOffset = input.distanceMeters / 1_000_000;

  return {
    id: input.id,
    place_name: input.name,
    category_name: '여행 > 관광,명소 > 공원',
    category_group_name: '공원',
    address_name: '서울특별시 강남구 역삼동',
    road_address_name: '서울특별시 강남구 테헤란로 1',
    x: (127.03 + coordinateOffset).toFixed(6),
    y: (37.5 + coordinateOffset).toFixed(6),
    place_url: `https://place.map.kakao.com/${input.id}`,
    distance: String(input.distanceMeters),
  };
}

function getKeywordCalls(): LocationSearchProviderInput[] {
  return kakaoLocalSearchProvider.searchKeyword.mock.calls.map(
    ([input]) => input,
  );
}

describe('location discovery walk Kakao fan-out guard', () => {
  beforeEach(() => {
    kakaoLocalSearchProvider.searchKeyword.mockReset();
    kakaoLocalSearchProvider.searchAddress.mockReset();
    searchWalkPoiLocations.mockReset();
    searchWalkPoiLocations.mockResolvedValue([]);
  });

  it('nearby 기본 진입은 1차 결과가 충분하면 10개 keyword page 1만 호출한다', async () => {
    kakaoLocalSearchProvider.searchKeyword.mockImplementation(async input => [
      createWalkDocument({
        id: `walk:${input.query}:${input.page ?? 1}`,
        name: `${input.query} 산책공원`,
        distanceMeters: 120 + (input.page ?? 1),
      }),
    ]);

    const result = await searchLocationDiscovery(
      'walk',
      createSearchInput(null, ANCHOR_COORDINATES),
    );
    const calls = getKeywordCalls();

    expect(result.items).toHaveLength(8);
    expect(calls).toHaveLength(10);
    expect(calls.map(call => call.query)).toEqual([...WALK_BASE_KEYWORDS]);
    expect(calls.every(call => call.page === 1)).toBe(true);
    expect(calls.some(call => call.page === 2)).toBe(false);
    expect(calls.some(call => call.page === 3)).toBe(false);
  });

  it('nearby 기본 진입은 1차 결과가 부족할 때만 상위 2개 keyword page 2를 추가 호출한다', async () => {
    kakaoLocalSearchProvider.searchKeyword.mockImplementation(async input => {
      if (input.query === '공원' && input.page === 1) {
        return [
          createWalkDocument({
            id: 'walk:only-result',
            name: '공원 산책공원',
            distanceMeters: 140,
          }),
        ];
      }

      return [];
    });

    const result = await searchLocationDiscovery(
      'walk',
      createSearchInput(null, ANCHOR_COORDINATES),
    );
    const calls = getKeywordCalls();
    const pageTwoCalls = calls.filter(call => call.page === 2);

    expect(result.items).toHaveLength(1);
    expect(calls).toHaveLength(12);
    expect(calls.filter(call => call.page === 1)).toHaveLength(10);
    expect(pageTwoCalls.map(call => call.query)).toEqual(['공원', '문화공원']);
    expect(calls.some(call => call.page === 3)).toBe(false);
  });

  it('명시 검색어는 기존 좌표 유무별 maxPages 정책을 유지한다', async () => {
    kakaoLocalSearchProvider.searchKeyword.mockResolvedValue([]);

    await searchLocationDiscovery(
      'walk',
      createSearchInput('한강공원', ANCHOR_COORDINATES),
    );
    expect(getKeywordCalls().map(call => call.page)).toEqual([1, 2, 3]);
    expect(getKeywordCalls().map(call => call.query)).toEqual([
      '한강공원',
      '한강공원',
      '한강공원',
    ]);

    kakaoLocalSearchProvider.searchKeyword.mockClear();

    await searchLocationDiscovery('walk', createSearchInput('한강공원', null));
    expect(getKeywordCalls().map(call => call.page)).toEqual([1, 2]);
    expect(getKeywordCalls().map(call => call.query)).toEqual([
      '한강공원',
      '한강공원',
    ]);
  });

  it('coverage region 안에서 POI 0건이면 Kakao fallback을 제한한다', async () => {
    const result = await searchLocationDiscovery(
      'walk',
      createSearchInput('zzzwalkpoi', ILSAN_COVERAGE_COORDINATES),
    );

    expect(result.items).toHaveLength(0);
    expect(result.source).toBe('walk_poi');
    expect(searchWalkPoiLocations).toHaveBeenCalledTimes(1);
    expect(kakaoLocalSearchProvider.searchKeyword).not.toHaveBeenCalled();
  });

  it('coverage region 밖에서는 POI 0건이어도 Kakao fallback을 유지한다', async () => {
    kakaoLocalSearchProvider.searchKeyword.mockResolvedValue([
      createWalkDocument({
        id: 'fallback:outside-gate',
        name: 'coverage 밖 fallback 산책공원',
        distanceMeters: 520,
      }),
    ]);

    const result = await searchLocationDiscovery(
      'walk',
      createSearchInput('zzzwalkpoi', ANCHOR_COORDINATES),
    );

    expect(result.source).toBe('kakao');
    expect(result.items).toHaveLength(1);
    expect(searchWalkPoiLocations).toHaveBeenCalledTimes(1);
    expect(kakaoLocalSearchProvider.searchKeyword).toHaveBeenCalled();
  });

  it('백석/마두/정발산 coverage region 안에서도 POI 0건 fallback을 제한한다', async () => {
    const result = await searchLocationDiscovery(
      'walk',
      createSearchInput('zzzwalkpoi', BAEKSEOK_COVERAGE_COORDINATES),
    );

    expect(result.items).toHaveLength(0);
    expect(result.source).toBe('walk_poi');
    expect(searchWalkPoiLocations).toHaveBeenCalledTimes(1);
    expect(kakaoLocalSearchProvider.searchKeyword).not.toHaveBeenCalled();
  });

  it('서울 2차 coverage region 안에서는 POI 0건 fallback을 권역별로 제한한다', async () => {
    const coverageCoordinates = [
      SEOUL_WORLDCUP_COVERAGE_COORDINATES,
      SEOUL_BANPO_COVERAGE_COORDINATES,
      SEOUL_TTUKSEOM_COVERAGE_COORDINATES,
    ] as const;

    for (const coordinates of coverageCoordinates) {
      jest.clearAllMocks();
      searchWalkPoiLocations.mockResolvedValue([]);

      const result = await searchLocationDiscovery(
        'walk',
        createSearchInput('zzzwalkpoi', coordinates),
      );

      expect(result.items).toHaveLength(0);
      expect(result.source).toBe('walk_poi');
      expect(searchWalkPoiLocations).toHaveBeenCalledTimes(1);
      expect(kakaoLocalSearchProvider.searchKeyword).not.toHaveBeenCalled();
    }
  });

  it('서울 보류 권역 보강 후 gate 기준 충족 region은 POI 0건 fallback을 제한한다', async () => {
    const coverageCoordinates = [
      SEOUL_SONGPA_COVERAGE_COORDINATES,
      SEOUL_YANGJAE_COVERAGE_COORDINATES,
      SEOUL_JUNGNANG_COVERAGE_COORDINATES,
      SEOUL_ANYANGCHEON_COVERAGE_COORDINATES,
      SEOUL_BORAMAE_COVERAGE_COORDINATES,
    ] as const;

    for (const coordinates of coverageCoordinates) {
      jest.clearAllMocks();
      searchWalkPoiLocations.mockResolvedValue([]);

      const result = await searchLocationDiscovery(
        'walk',
        createSearchInput('zzzwalkpoi', coordinates),
      );

      expect(result.items).toHaveLength(0);
      expect(result.source).toBe('walk_poi');
      expect(searchWalkPoiLocations).toHaveBeenCalledTimes(1);
      expect(kakaoLocalSearchProvider.searchKeyword).not.toHaveBeenCalled();
    }
  });

  it('북서울꿈의숲과 수도권 1차 coverage region은 POI 0건 fallback을 제한한다', async () => {
    const coverageCoordinates = [
      SEOUL_DREAMFOREST_COVERAGE_COORDINATES,
      METRO_BUNDANG_PANGYO_TANCHEON_COVERAGE_COORDINATES,
    ] as const;

    for (const coordinates of coverageCoordinates) {
      jest.clearAllMocks();
      searchWalkPoiLocations.mockResolvedValue([]);

      const result = await searchLocationDiscovery(
        'walk',
        createSearchInput('zzzwalkpoi', coordinates),
      );

      expect(result.items).toHaveLength(0);
      expect(result.source).toBe('walk_poi');
      expect(searchWalkPoiLocations).toHaveBeenCalledTimes(1);
      expect(kakaoLocalSearchProvider.searchKeyword).not.toHaveBeenCalled();
    }
  });

  it('수도권 2차 coverage region은 POI 0건 fallback을 제한한다', async () => {
    const coverageCoordinates = [
      METRO_HANAM_MISA_HANGANG_COVERAGE_COORDINATES,
      METRO_SUWON_GWANGGYO_LAKE_COVERAGE_COORDINATES,
      METRO_GWACHEON_SEOUL_GRAND_PARK_COVERAGE_COORDINATES,
    ] as const;

    for (const coordinates of coverageCoordinates) {
      jest.clearAllMocks();
      searchWalkPoiLocations.mockResolvedValue([]);

      const result = await searchLocationDiscovery(
        'walk',
        createSearchInput('zzzwalkpoi', coordinates),
      );

      expect(result.items).toHaveLength(0);
      expect(result.source).toBe('walk_poi');
      expect(searchWalkPoiLocations).toHaveBeenCalledTimes(1);
      expect(kakaoLocalSearchProvider.searchKeyword).not.toHaveBeenCalled();
    }
  });

  it('coverage region 안에서도 POI RPC error는 Kakao fallback을 유지한다', async () => {
    searchWalkPoiLocations.mockRejectedValueOnce(new Error('rpc timeout'));
    kakaoLocalSearchProvider.searchKeyword.mockResolvedValue([
      createWalkDocument({
        id: 'fallback:hanam',
        name: '하남 fallback 산책공원',
        distanceMeters: 420,
      }),
    ]);

    const result = await searchLocationDiscovery(
      'walk',
      createSearchInput(
        '하남 산책',
        METRO_HANAM_MISA_HANGANG_COVERAGE_COORDINATES,
      ),
    );

    expect(result.source).toBe('kakao');
    expect(result.items).toHaveLength(1);
    expect(searchWalkPoiLocations).toHaveBeenCalledTimes(1);
    expect(kakaoLocalSearchProvider.searchKeyword).toHaveBeenCalled();
  });
});
