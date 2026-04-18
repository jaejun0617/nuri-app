import {
  emptyAnimalHospitalRepository,
  mapOfficialAnimalHospitalSourceToCanonical,
  searchAnimalHospitals,
} from '../src/services/animalHospital/service';
import type { AnimalHospitalCanonicalRepository } from '../src/services/animalHospital/service';
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
      repository: emptyAnimalHospitalRepository,
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

  it('provider 후보명으로 canonical을 보수 조회해 확실한 name/address match만 연결한다', async () => {
    const canonical = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: '4110000:411000001020240001',
      sourceUpdatedAt: '2026-04-18T00:00:00.000Z',
      ingestedAt: '2026-04-18T08:00:00.000Z',
      snapshotId: 'localdata-smoke',
      snapshotFetchedAt: '2026-04-18T08:00:00.000Z',
      ingestMode: 'snapshot',
      name: '누리동물병원',
      roadAddress: '경기 고양시 일산서구 일산로 539',
      lotAddress: '경기 고양시 일산서구 일산동 539',
      operationStatusText: '영업/정상',
      licenseStatusText: '정상',
      officialPhone: '031-000-0000',
      coordinates: {
        latitude: null,
        longitude: null,
        x5174: 190000,
        y5174: 460000,
        crs: 'EPSG:5174',
      },
      metadata: {},
      rowChecksum: 'ah_test',
      rawPayload: {},
    }).canonicalHospital;
    const searchCalls: Array<{
      query: string | null;
      coordinates: unknown | null;
    }> = [];
    const repository: AnimalHospitalCanonicalRepository = {
      search: async input => {
        searchCalls.push(input);
        if (input.query === '누리동물병원' && input.coordinates === null) {
          return [canonical];
        }

        return [];
      },
    };
    const provider: LocationSearchProvider = {
      searchKeyword: async () => [
        {
          id: 'kakao-linked',
          place_name: '누리동물병원',
          address_name: '경기 고양시 일산서구 일산동 539',
          road_address_name: '경기 고양시 일산서구 일산로 539',
          phone: '031-000-0000',
          x: '126.7700',
          y: '37.6800',
          place_url: 'https://place.map.kakao.com/linked',
        },
      ],
      searchAddress: async () => [],
    };

    const result = await searchAnimalHospitals({
      query: null,
      scope: {
        displayLabel: '일산동',
        queryLabel: '경기 고양시 일산서구 일산동',
        anchorCoordinates: {
          latitude: 37.68,
          longitude: 126.77,
          accuracy: 30,
          capturedAt: Date.now(),
          source: 'gps',
        },
        distanceLabel: '현재 위치 기준',
      },
      useNearbySearch: true,
      repository,
      provider,
    });

    expect(searchCalls).toHaveLength(2);
    expect(searchCalls[0]?.coordinates).not.toBeNull();
    expect(searchCalls[1]).toMatchObject({
      query: '누리동물병원',
      coordinates: null,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe(canonical.id);
    expect(result.items[0]?.officialPhone).toBe('031-000-0000');
    expect(result.items[0]?.links.callUri).toBe('tel:0310000000');
    expect(result.items[0]?.links.providerPlaceUrl).toBe(
      'https://place.map.kakao.com/linked',
    );
  });

  it('후보명 조회로 가져온 canonical도 확정 조건이 없으면 public에 섞지 않는다', async () => {
    const unresolvedCanonical = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: '4110000:411000001020240099',
      sourceUpdatedAt: '2026-04-18T00:00:00.000Z',
      ingestedAt: '2026-04-18T08:00:00.000Z',
      snapshotId: 'localdata-smoke',
      snapshotFetchedAt: '2026-04-18T08:00:00.000Z',
      ingestMode: 'snapshot',
      name: '초원동물병원',
      roadAddress: '경기 고양시 일산서구 중앙로 1',
      lotAddress: '경기 고양시 일산서구 대화동 1',
      operationStatusText: '영업/정상',
      licenseStatusText: '정상',
      officialPhone: null,
      coordinates: {
        latitude: null,
        longitude: null,
        x5174: 190000,
        y5174: 460000,
        crs: 'EPSG:5174',
      },
      metadata: {},
      rowChecksum: 'ah_test_unresolved',
      rawPayload: {},
    }).canonicalHospital;
    const repository: AnimalHospitalCanonicalRepository = {
      search: async input => {
        if (input.query === '초원동물병원' && input.coordinates === null) {
          return [unresolvedCanonical];
        }

        return [];
      },
    };
    const provider: LocationSearchProvider = {
      searchKeyword: async () => [
        {
          id: 'kakao-unresolved',
          place_name: '초원동물병원',
          address_name: '경기 고양시 일산서구 일산동 100',
          road_address_name: '경기 고양시 일산서구 일산로 100',
          phone: '',
          x: '126.7700',
          y: '37.6800',
          place_url: 'https://place.map.kakao.com/unresolved',
        },
      ],
      searchAddress: async () => [],
    };

    const result = await searchAnimalHospitals({
      query: null,
      scope: {
        displayLabel: '일산동',
        queryLabel: '경기 고양시 일산서구 일산동',
        anchorCoordinates: {
          latitude: 37.68,
          longitude: 126.77,
          accuracy: 30,
          capturedAt: Date.now(),
          source: 'gps',
        },
        distanceLabel: '현재 위치 기준',
      },
      useNearbySearch: true,
      repository,
      provider,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).not.toBe(unresolvedCanonical.id);
    expect(result.items[0]?.name).toBe('초원동물병원');
    expect(result.items[0]?.publicTrust.publicLabel).toBe('candidate');
    expect(result.items[0]?.links.providerPlaceUrl).toBe(
      'https://place.map.kakao.com/unresolved',
    );
  });
});
