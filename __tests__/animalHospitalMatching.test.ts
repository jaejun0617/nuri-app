import { searchAnimalHospitals } from '../src/services/animalHospital/service';
import { mapOfficialAnimalHospitalSourceToCanonical } from '../src/services/animalHospital/service';
import type { LocationSearchProvider } from '../src/services/locationDiscovery/provider';
import type { AnimalHospitalCanonicalHospital } from '../src/domains/animalHospital/types';

function createOfficialCanonical(input: {
  providerRecordId: string;
  name: string;
  roadAddress: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
}): AnimalHospitalCanonicalHospital {
  return mapOfficialAnimalHospitalSourceToCanonical({
    provider: 'official-localdata',
    providerRecordId: input.providerRecordId,
    sourceUpdatedAt: '2026-04-16T00:00:00.000Z',
    ingestedAt: '2026-04-17T00:00:00.000Z',
    name: input.name,
    roadAddress: input.roadAddress,
    operationStatusText: '영업/정상',
    officialPhone: input.phone ?? null,
    coordinates: {
      latitude: input.latitude,
      longitude: input.longitude,
      crs: 'WGS84',
    },
  }).canonicalHospital;
}

const scope = {
  displayLabel: '강남구',
  queryLabel: '서울 강남구',
  anchorCoordinates: {
    latitude: 37.5,
    longitude: 127.03,
    accuracy: 30,
    capturedAt: Date.now(),
    source: 'gps' as const,
  },
  distanceLabel: '현재 위치 기준',
};

describe('animalHospital matching and query priority', () => {
  it('확실한 매칭은 canonical linked 병원으로 묶고 provider-only를 줄인다', async () => {
    const repository = {
      search: async () => [
        createOfficialCanonical({
          providerRecordId: 'official-101',
          name: '누리동물병원',
          roadAddress: '서울특별시 강남구 테헤란로 10',
          latitude: 37.4999,
          longitude: 127.0333,
        }),
      ],
    };
    const provider: LocationSearchProvider = {
      searchKeyword: async () => [
        {
          id: 'kakao-101',
          place_name: '누리 동물메디컬센터',
          address_name: '서울특별시 강남구 테헤란로 10',
          road_address_name: '서울특별시 강남구 테헤란로 10',
          phone: '02-9999-0000',
          x: '127.03331',
          y: '37.49991',
          place_url: 'https://place.map.kakao.com/101',
        },
      ],
      searchAddress: async () => [],
    };

    const result = await searchAnimalHospitals({
      query: null,
      scope,
      useNearbySearch: true,
      repository,
      provider,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe('누리동물병원');
    expect(result.items[0]?.links.providerPlaceUrl).toBe(
      'https://place.map.kakao.com/101',
    );
  });

  it('애매한 후보는 자동 병합하지 않고 provider-only candidate로 남긴다', async () => {
    const repository = {
      search: async () => [
        createOfficialCanonical({
          providerRecordId: 'official-201',
          name: '누리동물병원',
          roadAddress: '서울특별시 강남구 테헤란로 10',
          latitude: 37.4999,
          longitude: 127.0333,
        }),
        createOfficialCanonical({
          providerRecordId: 'official-202',
          name: '누리동물의료센터',
          roadAddress: '서울특별시 강남구 테헤란로 11',
          latitude: 37.5000,
          longitude: 127.0334,
        }),
      ],
    };
    const provider: LocationSearchProvider = {
      searchKeyword: async () => [
        {
          id: 'kakao-201',
          place_name: '누리 동물메디컬센터',
          address_name: '서울특별시 강남구 테헤란로 10',
          road_address_name: '서울특별시 강남구 테헤란로 10',
          phone: '',
          x: '127.03332',
          y: '37.49995',
          place_url: 'https://place.map.kakao.com/201',
        },
      ],
      searchAddress: async () => [],
    };

    const result = await searchAnimalHospitals({
      query: null,
      scope,
      useNearbySearch: true,
      repository,
      provider,
    });

    expect(result.items).toHaveLength(3);
    expect(
      result.items.some(
        item => item.links.providerPlaceUrl === 'https://place.map.kakao.com/201',
      ),
    ).toBe(true);
  });

  it('canonical linked 병원을 provider-only 후보보다 먼저 노출한다', async () => {
    const repository = {
      search: async () => [
        createOfficialCanonical({
          providerRecordId: 'official-301',
          name: '가까운동물병원',
          roadAddress: '서울특별시 강남구 역삼로 1',
          latitude: 37.5001,
          longitude: 127.0301,
          phone: '02-1000-1000',
        }),
      ],
    };
    const provider: LocationSearchProvider = {
      searchKeyword: async () => [
        {
          id: 'kakao-302',
          place_name: '멀리있는동물병원',
          address_name: '서울특별시 강남구 선릉로 90',
          road_address_name: '서울특별시 강남구 선릉로 90',
          phone: '02-9999-0000',
          x: '127.0500',
          y: '37.5100',
          place_url: 'https://place.map.kakao.com/302',
        },
      ],
      searchAddress: async () => [],
    };

    const result = await searchAnimalHospitals({
      query: null,
      scope,
      useNearbySearch: true,
      repository,
      provider,
    });

    expect(result.items[0]?.name).toBe('가까운동물병원');
    expect(result.items[0]?.publicTrust.publicLabel).toBe('needs_verification');
    expect(result.items[1]?.publicTrust.publicLabel).toBe('candidate');
  });
});
