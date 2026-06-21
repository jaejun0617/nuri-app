import type {
  KakaoAddressDocument,
  KakaoPlaceDocument,
} from '../src/services/locationDiscovery/types';
import type { LocationSearchProviderInput } from '../src/services/locationDiscovery/provider';

jest.mock('../src/services/locationDiscovery/kakaoLocal', () => ({
  kakaoLocalSearchProvider: {
    searchKeyword: jest.fn(),
    searchAddress: jest.fn(),
  },
}));

import {
  petFriendlyKakaoSearchProvider,
  walkKakaoFallbackProvider,
} from '../src/services/locationDiscovery/kakaoProviderAdapters';

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

describe('location discovery Kakao provider adapters', () => {
  beforeEach(() => {
    kakaoLocalSearchProvider.searchKeyword.mockReset();
    kakaoLocalSearchProvider.searchAddress.mockReset();
  });

  it('산책 fallback adapter는 shared Kakao Local provider에만 위임한다', async () => {
    const keywordResult: KakaoPlaceDocument = {
      id: 'walk-adapter',
      place_name: '산책공원',
    };
    const addressResult: KakaoAddressDocument = {
      address_name: '서울특별시 강남구',
      x: '127.0',
      y: '37.5',
    };
    const input: LocationSearchProviderInput = {
      query: '산책공원',
      coordinates: null,
      radiusMeters: 5000,
      size: 10,
      page: 1,
    };

    kakaoLocalSearchProvider.searchKeyword.mockResolvedValue([keywordResult]);
    kakaoLocalSearchProvider.searchAddress.mockResolvedValue([addressResult]);

    await expect(walkKakaoFallbackProvider.searchKeyword(input)).resolves.toEqual([
      keywordResult,
    ]);
    await expect(
      walkKakaoFallbackProvider.searchAddress('서울특별시 강남구'),
    ).resolves.toEqual([addressResult]);

    expect(kakaoLocalSearchProvider.searchKeyword).toHaveBeenCalledWith(input);
    expect(kakaoLocalSearchProvider.searchAddress).toHaveBeenCalledWith(
      '서울특별시 강남구',
    );
  });

  it('펫동반 장소 adapter는 산책 adapter와 분리된 이름으로 provider 의존성을 유지한다', async () => {
    const input: LocationSearchProviderInput = {
      query: '애견동반 카페',
      coordinates: null,
      radiusMeters: 4000,
      size: 10,
      page: 1,
    };

    kakaoLocalSearchProvider.searchKeyword.mockResolvedValue([]);
    kakaoLocalSearchProvider.searchAddress.mockResolvedValue([]);

    await petFriendlyKakaoSearchProvider.searchKeyword(input);
    await petFriendlyKakaoSearchProvider.searchAddress('경기도 고양시');

    expect(kakaoLocalSearchProvider.searchKeyword).toHaveBeenCalledWith(input);
    expect(kakaoLocalSearchProvider.searchAddress).toHaveBeenCalledWith(
      '경기도 고양시',
    );
  });
});
