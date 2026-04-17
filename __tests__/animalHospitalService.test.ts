import { searchAnimalHospitals } from '../src/services/animalHospital/service';
import type { LocationSearchProvider } from '../src/services/locationDiscovery/provider';

describe('animalHospital runtime query service', () => {
  it('provider-only runtime candidate는 전화번호와 민감 필드를 public으로 올리지 않는다', async () => {
    const provider: LocationSearchProvider = {
      searchKeyword: async () => [
        {
          id: 'kakao-1',
          place_name: '근처동물병원',
          address_name: '서울특별시 서초구 반포대로 20',
          road_address_name: '서울특별시 서초구 반포대로 20',
          phone: '02-9999-0000',
          x: '127.0123',
          y: '37.5012',
          place_url: 'https://place.map.kakao.com/1',
        },
      ],
      searchAddress: async () => [],
    };

    const result = await searchAnimalHospitals({
      query: null,
      scope: {
        displayLabel: '강남구',
        queryLabel: '서울 강남구',
        anchorCoordinates: {
          latitude: 37.5,
          longitude: 127.01,
          accuracy: 30,
          capturedAt: Date.now(),
          source: 'gps',
        },
        distanceLabel: '현재 위치 기준',
      },
      useNearbySearch: true,
      provider,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe('근처동물병원');
    expect(result.items[0]?.officialPhone).toBeNull();
    expect(result.items[0]?.links.callUri).toBeNull();
    expect(result.items[0]?.links.providerPlaceUrl).toBe(
      'https://place.map.kakao.com/1',
    );
    expect(result.items[0]?.publicTrust.publicLabel).toBe('candidate');
    expect(result.items[0]?.statusSummary).toBe('인허가·운영상태 확인이 필요한 병원이에요.');
    expect(result.internalItems[0]?.withheldFields).toContain('operatingHours');
    expect(result.internalItems[0]?.withheldFields).toContain('homepageUrl');
  });
});
