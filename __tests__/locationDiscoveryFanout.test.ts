import type {
  KakaoAddressDocument,
  KakaoPlaceDocument,
  LocationDiscoveryItem,
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
    Promise<ReadonlyArray<LocationDiscoveryItem>>,
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
const METRO_INCHEON_SONGDO_CENTRAL_PARK_COVERAGE_COORDINATES = {
  latitude: 37.3925,
  longitude: 126.6375,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const METRO_BUCHEON_SANGDONG_LAKE_COVERAGE_COORDINATES = {
  latitude: 37.5037,
  longitude: 126.7446,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const METRO_ANYANG_HAGUI_ANYANGCHEON_COVERAGE_COORDINATES = {
  latitude: 37.394,
  longitude: 126.955,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const METRO_NAMYANGJU_DASAN_WANGSUKCHEON_COVERAGE_COORDINATES = {
  latitude: 37.612,
  longitude: 127.159,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_BUSAN_HAEUNDAE_DONGBAEK_COVERAGE_COORDINATES = {
  latitude: 35.1587,
  longitude: 129.158,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_DAEGU_SUSEONG_LAKE_COVERAGE_COORDINATES = {
  latitude: 35.828,
  longitude: 128.614,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_DAEJEON_GAPCHEON_EXPO_COVERAGE_COORDINATES = {
  latitude: 36.374,
  longitude: 127.387,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_ULSAN_TAEHWAGANG_GARDEN_COVERAGE_COORDINATES = {
  latitude: 35.548,
  longitude: 129.298,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_GWANGJU_STREAM_YEONGSAN_COVERAGE_COORDINATES = {
  latitude: 35.154,
  longitude: 126.852,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_SEJONG_LAKE_GEUMGANG_COVERAGE_COORDINATES = {
  latitude: 36.4975,
  longitude: 127.2597,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_CHEONGJU_MUSIMCHEON_COVERAGE_COORDINATES = {
  latitude: 36.642,
  longitude: 127.489,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_CHEONAN_CHEONHOJI_BULDANG_COVERAGE_COORDINATES = {
  latitude: 36.815,
  longitude: 127.154,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_CHUNCHEON_GONGJICHEON_UIAM_COVERAGE_COORDINATES = {
  latitude: 37.873,
  longitude: 127.713,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_GANGNEUNG_GYEONGPO_NAMDAECHEON_COVERAGE_COORDINATES = {
  latitude: 37.797,
  longitude: 128.896,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_JEJU_IHOTEU_TAPDONG_COVERAGE_COORDINATES = {
  latitude: 33.512,
  longitude: 126.522,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const METRO_YONGIN_GIHEUNG_LAKE_COVERAGE_COORDINATES = {
  latitude: 37.235,
  longitude: 127.105,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const METRO_GUNPO_CHOMAKGOL_COVERAGE_COORDINATES = {
  latitude: 37.344,
  longitude: 126.928,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const METRO_SIHEUNG_GAETGOL_COVERAGE_COORDINATES = {
  latitude: 37.389,
  longitude: 126.779,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const METRO_GIMPO_HANGANG_LAKE_COVERAGE_COORDINATES = {
  latitude: 37.644,
  longitude: 126.68,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_JEONJU_CHEON_HANOK_COVERAGE_COORDINATES = {
  latitude: 35.816,
  longitude: 127.153,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_CHANGWON_YONGJI_CHANGWONCHEON_COVERAGE_COORDINATES = {
  latitude: 35.228,
  longitude: 128.681,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_POHANG_YEONGILDAE_HYEONGSAN_COVERAGE_COORDINATES = {
  latitude: 36.055,
  longitude: 129.378,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_GIMHAE_YEONJI_HAEBANCHEON_COVERAGE_COORDINATES = {
  latitude: 35.236,
  longitude: 128.889,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_YEOSU_UNGCHEON_SEASIDE_COVERAGE_COORDINATES = {
  latitude: 34.744,
  longitude: 127.676,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_SUNCHEON_DONGCHEON_GARDEN_COVERAGE_COORDINATES = {
  latitude: 34.95,
  longitude: 127.487,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_MOKPO_PEACE_GATBAWI_COVERAGE_COORDINATES = {
  latitude: 34.8,
  longitude: 126.433,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_GUMI_DONGNAK_NAKDONG_COVERAGE_COORDINATES = {
  latitude: 36.107,
  longitude: 128.419,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_JINJU_NAMGANG_JINJUSEONG_COVERAGE_COORDINATES = {
  latitude: 35.19,
  longitude: 128.083,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_BUSAN_ONCHEON_SUYEONG_COVERAGE_COORDINATES = {
  latitude: 35.185,
  longitude: 129.105,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_DAEGU_SINCHEON_GEUMHOGANG_COVERAGE_COORDINATES = {
  latitude: 35.872,
  longitude: 128.603,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_DAEJEON_YURIM_ARBORETUM_COVERAGE_COORDINATES = {
  latitude: 36.365,
  longitude: 127.382,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_ULSAN_SEONAM_GRANDPARK_COVERAGE_COORDINATES = {
  latitude: 35.528,
  longitude: 129.315,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_GYEONGJU_BOMUN_LAKE_COVERAGE_COORDINATES = {
  latitude: 35.845,
  longitude: 129.289,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_GUNSAN_EUNPA_GEUMGANG_COVERAGE_COORDINATES = {
  latitude: 35.964,
  longitude: 126.708,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_MASAN_JINHAE_WATERFRONT_COVERAGE_COORDINATES = {
  latitude: 35.183,
  longitude: 128.565,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_TONGYEONG_GANGGUAN_MIREUK_COVERAGE_COORDINATES = {
  latitude: 34.842,
  longitude: 128.423,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_GEOJE_GOHYEON_JANGSEUNGPO_COVERAGE_COORDINATES = {
  latitude: 34.88,
  longitude: 128.623,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_ANDONG_NAKDONG_WORYEONG_COVERAGE_COORDINATES = {
  latitude: 36.568,
  longitude: 128.731,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_IKSAN_BAESAN_SEODONG_COVERAGE_COORDINATES = {
  latitude: 35.951,
  longitude: 126.975,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_NAJU_YEONGSAN_RIVERSIDE_COVERAGE_COORDINATES = {
  latitude: 35.015,
  longitude: 126.71,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_SACHEON_SAMCHEONPO_SEASIDE_COVERAGE_COORDINATES = {
  latitude: 34.932,
  longitude: 128.077,
  accuracy: 20,
  capturedAt: 1_776_000_000_000,
  source: 'gps' as const,
};
const NATIONAL_YANGSAN_YANGSANCHEON_HWANGSAN_COVERAGE_COORDINATES = {
  latitude: 35.338,
  longitude: 129.037,
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

function createWalkPoiItem(input: {
  id: string;
  name: string;
  distanceMeters: number;
}): LocationDiscoveryItem {
  return {
    id: input.id,
    domain: 'walk',
    kind: 'walk-spot',
    name: input.name,
    description: `${input.name} 운영 검수 산책 장소`,
    categoryLabel: '산책 장소',
    address: '광주광역시 서구 치평동',
    roadAddress: '광주광역시 서구 상무대로',
    distanceMeters: input.distanceMeters,
    distanceLabel: `${input.distanceMeters}m`,
    estimatedMinutes: 15,
    latitude: NATIONAL_GWANGJU_STREAM_YEONGSAN_COVERAGE_COORDINATES.latitude,
    longitude: NATIONAL_GWANGJU_STREAM_YEONGSAN_COVERAGE_COORDINATES.longitude,
    placeUrl: null,
    phone: null,
    operatingStatusLabel: null,
    source: {
      provider: 'walk_poi',
      providerLabel: 'NURI 자체 POI',
      type: 'canonical-poi',
      externalPlaceId: null,
    },
    verification: {
      status: 'admin-verified',
      label: '운영 검수 반영',
      description: 'NURI 자체 POI 기준으로 공개된 산책 장소예요.',
      tone: 'positive',
      sourceLabel: 'NURI 운영 검수',
      requiresConfirmation: false,
    },
    publicTrust: {
      publicLabel: 'trust_reviewed',
      label: '검수 반영',
      shortReason: '운영 검수로 공개 중인 자체 산책 POI예요.',
      description: '앱 공개용 projection에서 승인된 산책 장소만 표시해요.',
      guidance: '현장 상황은 바뀔 수 있으니 방문 전 주변 환경을 확인해 주세요.',
      tone: 'positive',
      sourceLabel: 'NURI 운영 검수',
      basisDate: null,
      basisDateLabel: null,
      isStale: false,
      hasConflict: false,
      layers: ['trust'],
    },
    userLayer: {
      targetId: input.id,
      supportsBookmark: false,
      supportsReport: false,
    },
    petPolicy: {
      summaryLabel: null,
      detail: null,
    },
    thumbnailUrl: null,
    coordinateLabel: `${NATIONAL_GWANGJU_STREAM_YEONGSAN_COVERAGE_COORDINATES.latitude.toFixed(
      5,
    )}, ${NATIONAL_GWANGJU_STREAM_YEONGSAN_COVERAGE_COORDINATES.longitude.toFixed(
      5,
    )}`,
    mapPreviewUrl: `https://static-maps.example.test/?lat=${NATIONAL_GWANGJU_STREAM_YEONGSAN_COVERAGE_COORDINATES.latitude}&lng=${NATIONAL_GWANGJU_STREAM_YEONGSAN_COVERAGE_COORDINATES.longitude}`,
    qualityScore: 0.95,
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

  it('Ready 권역에서 POI 결과가 있으면 Kakao runtime을 호출하지 않는다', async () => {
    const poiItem = createWalkPoiItem({
      id: 'walk-poi:gwangju-ready',
      name: '광주천 산책로',
      distanceMeters: 180,
    });
    searchWalkPoiLocations.mockResolvedValueOnce([poiItem]);

    const result = await searchLocationDiscovery(
      'walk',
      createSearchInput(
        '광주 산책',
        NATIONAL_GWANGJU_STREAM_YEONGSAN_COVERAGE_COORDINATES,
      ),
    );

    expect(result.source).toBe('walk_poi');
    expect(result.items).toEqual([poiItem]);
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

  it('수도권 3차와 전국 1차 coverage region은 POI 0건 fallback을 제한한다', async () => {
    const coverageCoordinates = [
      METRO_INCHEON_SONGDO_CENTRAL_PARK_COVERAGE_COORDINATES,
      METRO_BUCHEON_SANGDONG_LAKE_COVERAGE_COORDINATES,
      METRO_ANYANG_HAGUI_ANYANGCHEON_COVERAGE_COORDINATES,
      METRO_NAMYANGJU_DASAN_WANGSUKCHEON_COVERAGE_COORDINATES,
      NATIONAL_BUSAN_HAEUNDAE_DONGBAEK_COVERAGE_COORDINATES,
      NATIONAL_DAEGU_SUSEONG_LAKE_COVERAGE_COORDINATES,
      NATIONAL_DAEJEON_GAPCHEON_EXPO_COVERAGE_COORDINATES,
      NATIONAL_ULSAN_TAEHWAGANG_GARDEN_COVERAGE_COORDINATES,
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

  it('전국 2차와 수도권 잔여 coverage region은 POI 0건 fallback을 제한한다', async () => {
    const coverageCoordinates = [
      NATIONAL_GWANGJU_STREAM_YEONGSAN_COVERAGE_COORDINATES,
      NATIONAL_SEJONG_LAKE_GEUMGANG_COVERAGE_COORDINATES,
      NATIONAL_CHEONGJU_MUSIMCHEON_COVERAGE_COORDINATES,
      NATIONAL_CHEONAN_CHEONHOJI_BULDANG_COVERAGE_COORDINATES,
      NATIONAL_CHUNCHEON_GONGJICHEON_UIAM_COVERAGE_COORDINATES,
      NATIONAL_GANGNEUNG_GYEONGPO_NAMDAECHEON_COVERAGE_COORDINATES,
      NATIONAL_JEJU_IHOTEU_TAPDONG_COVERAGE_COORDINATES,
      METRO_YONGIN_GIHEUNG_LAKE_COVERAGE_COORDINATES,
      METRO_GUNPO_CHOMAKGOL_COVERAGE_COORDINATES,
      METRO_SIHEUNG_GAETGOL_COVERAGE_COORDINATES,
      METRO_GIMPO_HANGANG_LAKE_COVERAGE_COORDINATES,
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

  it('전국 3차와 4차 coverage region은 POI 0건 fallback을 제한한다', async () => {
    const coverageCoordinates = [
      NATIONAL_JEONJU_CHEON_HANOK_COVERAGE_COORDINATES,
      NATIONAL_CHANGWON_YONGJI_CHANGWONCHEON_COVERAGE_COORDINATES,
      NATIONAL_POHANG_YEONGILDAE_HYEONGSAN_COVERAGE_COORDINATES,
      NATIONAL_GIMHAE_YEONJI_HAEBANCHEON_COVERAGE_COORDINATES,
      NATIONAL_YEOSU_UNGCHEON_SEASIDE_COVERAGE_COORDINATES,
      NATIONAL_SUNCHEON_DONGCHEON_GARDEN_COVERAGE_COORDINATES,
      NATIONAL_MOKPO_PEACE_GATBAWI_COVERAGE_COORDINATES,
      NATIONAL_GUMI_DONGNAK_NAKDONG_COVERAGE_COORDINATES,
      NATIONAL_JINJU_NAMGANG_JINJUSEONG_COVERAGE_COORDINATES,
      NATIONAL_BUSAN_ONCHEON_SUYEONG_COVERAGE_COORDINATES,
      NATIONAL_DAEGU_SINCHEON_GEUMHOGANG_COVERAGE_COORDINATES,
      NATIONAL_DAEJEON_YURIM_ARBORETUM_COVERAGE_COORDINATES,
      NATIONAL_ULSAN_SEONAM_GRANDPARK_COVERAGE_COORDINATES,
      NATIONAL_GYEONGJU_BOMUN_LAKE_COVERAGE_COORDINATES,
      NATIONAL_GUNSAN_EUNPA_GEUMGANG_COVERAGE_COORDINATES,
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

  it('전국 5차 coverage region은 POI 0건 fallback을 제한한다', async () => {
    const coverageCoordinates = [
      NATIONAL_MASAN_JINHAE_WATERFRONT_COVERAGE_COORDINATES,
      NATIONAL_TONGYEONG_GANGGUAN_MIREUK_COVERAGE_COORDINATES,
      NATIONAL_GEOJE_GOHYEON_JANGSEUNGPO_COVERAGE_COORDINATES,
      NATIONAL_ANDONG_NAKDONG_WORYEONG_COVERAGE_COORDINATES,
      NATIONAL_IKSAN_BAESAN_SEODONG_COVERAGE_COORDINATES,
      NATIONAL_NAJU_YEONGSAN_RIVERSIDE_COVERAGE_COORDINATES,
      NATIONAL_SACHEON_SAMCHEONPO_SEASIDE_COVERAGE_COORDINATES,
      NATIONAL_YANGSAN_YANGSANCHEON_HWANGSAN_COVERAGE_COORDINATES,
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

  it('좌표 없는 nearby 진입은 coordinate_missing fallback을 유지한다', async () => {
    const result = await searchLocationDiscovery(
      'walk',
      createSearchInput(null, null),
    );

    expect(result.source).toBe('kakao');
    expect(result.items).toHaveLength(0);
    expect(searchWalkPoiLocations).not.toHaveBeenCalled();
    expect(kakaoLocalSearchProvider.searchKeyword).not.toHaveBeenCalled();
  });
});

describe('location discovery walk POI feature flag kill-switch', () => {
  it('POI RPC feature flag가 off이면 기존 Kakao fallback을 유지한다', async () => {
    jest.resetModules();
    jest.doMock('../src/services/locationDiscovery/kakaoLocal', () => ({
      kakaoLocalSearchProvider: {
        searchKeyword: jest.fn(async () => [
          createWalkDocument({
            id: 'fallback:poi-disabled',
            name: 'feature flag off fallback 산책공원',
            distanceMeters: 640,
          }),
        ]),
        searchAddress: jest.fn(),
      },
    }));
    jest.doMock('../src/services/locationDiscovery/walkPoiRpc', () => ({
      ENABLE_WALK_POI_RPC: false,
      searchWalkPoiLocations: jest.fn(async () => []),
      fetchWalkPoiDetailItem: jest.fn(),
    }));

    let isolatedService:
      | typeof import('../src/services/locationDiscovery/service')
      | undefined;
    let isolatedKakao:
      | {
          kakaoLocalSearchProvider: {
            searchKeyword: jest.Mock<
              Promise<ReadonlyArray<KakaoPlaceDocument>>,
              [LocationSearchProviderInput]
            >;
          };
        }
      | undefined;
    let isolatedWalkPoiRpc:
      | {
          searchWalkPoiLocations: jest.Mock<
            Promise<ReadonlyArray<LocationDiscoveryItem>>,
            [LocationDiscoverySearchInput]
          >;
        }
      | undefined;
    jest.isolateModules(() => {
      isolatedService = require('../src/services/locationDiscovery/service');
      isolatedKakao = require('../src/services/locationDiscovery/kakaoLocal');
      isolatedWalkPoiRpc = require('../src/services/locationDiscovery/walkPoiRpc');
    });

    if (!isolatedService || !isolatedKakao || !isolatedWalkPoiRpc) {
      throw new Error('isolated modules were not loaded');
    }

    const result = await isolatedService.searchLocationDiscovery(
      'walk',
      createSearchInput(
        '광주 산책',
        NATIONAL_GWANGJU_STREAM_YEONGSAN_COVERAGE_COORDINATES,
      ),
    );

    expect(result.source).toBe('kakao');
    expect(result.items).toHaveLength(1);
    expect(isolatedWalkPoiRpc.searchWalkPoiLocations).not.toHaveBeenCalled();
    expect(
      isolatedKakao.kakaoLocalSearchProvider.searchKeyword,
    ).toHaveBeenCalled();
  });
});
