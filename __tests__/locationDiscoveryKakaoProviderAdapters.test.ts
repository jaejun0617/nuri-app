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

import { petFriendlyKakaoSearchProvider } from '../src/services/locationDiscovery/kakaoProviderAdapters';

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

  it('펫동반 장소 adapter는 shared Kakao Local provider 의존성을 유지한다', async () => {
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
