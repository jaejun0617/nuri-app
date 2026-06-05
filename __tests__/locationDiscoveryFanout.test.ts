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
  latitude: 37.5,
  longitude: 127.03,
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
    jest.clearAllMocks();
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
});
