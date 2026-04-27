import {
  emptyAnimalHospitalRepository,
  mapOfficialAnimalHospitalSourceToCanonical,
  searchAnimalHospitals,
} from '../src/services/animalHospital/service';
import type { AnimalHospitalCanonicalRepository } from '../src/services/animalHospital/service';
import type { AnimalHospitalVerificationRecord } from '../src/domains/animalHospital/types';
import type { LocationSearchProvider } from '../src/services/locationDiscovery/provider';

describe('animalHospital runtime query service', () => {
  it('provider-only runtime candidate도 provider 전화번호와 좌표를 public으로 노출한다', async () => {
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
    expect(result.items[0]?.officialPhone).toBe('02-9999-0000');
    expect(result.items[0]?.latitude).toBe(37.5012);
    expect(result.items[0]?.longitude).toBe(127.0123);
    expect(result.items[0]?.links.callUri).toBe('tel:0299990000');
    expect(result.items[0]?.links.externalMapUrl).toContain('37.5012');
    expect(result.items[0]?.links.providerPlaceUrl).toBe(
      'https://place.map.kakao.com/1',
    );
    expect(result.items[0]?.publicTrust.publicLabel).toBe('candidate');
    expect(result.items[0]?.statusSummary).toBe(
      '인허가·운영상태 확인이 필요한 병원이에요.',
    );
    expect(result.internalItems[0]?.withheldFields).toContain('operatingHours');
    expect(result.internalItems[0]?.withheldFields).toContain('homepageUrl');
  });

  it('명시 검색어는 현재 위치 반경으로 결과를 제한하지 않는다', async () => {
    const canonical = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: '2610000:261000001020240001',
      sourceUpdatedAt: '2026-04-18T00:00:00.000Z',
      ingestedAt: '2026-04-18T08:00:00.000Z',
      snapshotId: 'localdata-nationwide-search',
      snapshotFetchedAt: '2026-04-18T08:00:00.000Z',
      ingestMode: 'snapshot',
      name: '부산누리동물병원',
      roadAddress: '부산광역시 중구 중앙대로 1',
      lotAddress: '부산광역시 중구 중앙동 1',
      operationStatusText: '영업/정상',
      licenseStatusText: '정상',
      officialPhone: null,
      coordinates: {
        latitude: 35.1796,
        longitude: 129.0756,
        crs: 'WGS84',
      },
      metadata: {},
      rowChecksum: 'ah_test_nationwide',
      rawPayload: {},
    }).canonicalHospital;
    const searchCalls: Array<{
      query: string | null;
      coordinates: unknown | null;
    }> = [];
    const providerCalls: Array<
      Parameters<LocationSearchProvider['searchKeyword']>[0]
    > = [];
    const repository: AnimalHospitalCanonicalRepository = {
      search: async input => {
        searchCalls.push(input);
        return input.query === '부산누리동물병원' ? [canonical] : [];
      },
    };
    const provider: LocationSearchProvider = {
      searchKeyword: async input => {
        providerCalls.push(input);
        return [];
      },
      searchAddress: async () => [],
    };

    const result = await searchAnimalHospitals({
      query: '부산누리동물병원',
      scope: {
        displayLabel: '전국 검색',
        queryLabel: '서울 강남구',
        anchorCoordinates: {
          latitude: 37.5,
          longitude: 127.01,
          accuracy: 30,
          capturedAt: Date.now(),
          source: 'gps',
        },
        distanceLabel: '거리는 현재 위치 기준',
      },
      useNearbySearch: false,
      repository,
      provider,
    });

    expect(searchCalls[0]).toMatchObject({
      query: '부산누리동물병원',
      coordinates: null,
    });
    expect(providerCalls[0]).toMatchObject({
      coordinates: null,
    });
    expect(result.items[0]?.id).toBe(canonical.id);
  });

  it('가까운순은 public 좌표 노출 없이도 canonical 좌표 기준 정렬을 유지한다', async () => {
    const farCanonical = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: '4110000:411000001020240201',
      sourceUpdatedAt: '2026-04-18T00:00:00.000Z',
      ingestedAt: '2026-04-18T08:00:00.000Z',
      snapshotId: 'localdata-distance-sort',
      snapshotFetchedAt: '2026-04-18T08:00:00.000Z',
      ingestMode: 'snapshot',
      name: '먼동물병원',
      roadAddress: '경기 고양시 일산서구 중앙로 201',
      lotAddress: '경기 고양시 일산서구 대화동 201',
      operationStatusText: '영업/정상',
      licenseStatusText: '정상',
      officialPhone: null,
      coordinates: {
        latitude: 37.72,
        longitude: 126.8,
        crs: 'WGS84',
      },
      metadata: {},
      rowChecksum: 'ah_test_far',
      rawPayload: {},
    }).canonicalHospital;
    const nearCanonical = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: '4110000:411000001020240202',
      sourceUpdatedAt: '2026-04-18T00:00:00.000Z',
      ingestedAt: '2026-04-18T08:00:00.000Z',
      snapshotId: 'localdata-distance-sort',
      snapshotFetchedAt: '2026-04-18T08:00:00.000Z',
      ingestMode: 'snapshot',
      name: '가까운동물병원',
      roadAddress: '경기 고양시 일산서구 중앙로 202',
      lotAddress: '경기 고양시 일산서구 대화동 202',
      operationStatusText: '영업/정상',
      licenseStatusText: '정상',
      officialPhone: null,
      coordinates: {
        latitude: 37.6801,
        longitude: 126.7701,
        crs: 'WGS84',
      },
      metadata: {},
      rowChecksum: 'ah_test_near',
      rawPayload: {},
    }).canonicalHospital;
    const repository: AnimalHospitalCanonicalRepository = {
      search: async () => [farCanonical, nearCanonical],
    };
    const provider: LocationSearchProvider = {
      searchKeyword: async () => [],
      searchAddress: async () => [],
    };

    const result = await searchAnimalHospitals({
      query: null,
      scope: {
        displayLabel: '현재 위치',
        queryLabel: '경기 고양시',
        anchorCoordinates: {
          latitude: 37.68,
          longitude: 126.77,
          accuracy: 20,
          capturedAt: Date.now(),
          source: 'gps',
        },
        distanceLabel: '현재 위치 기준',
      },
      useNearbySearch: true,
      repository,
      provider,
    });

    expect(result.items.map(item => item.id)).toEqual([
      nearCanonical.id,
      farCanonical.id,
    ]);
    expect(result.items[0]?.latitude).toBe(37.6801);
    expect(result.items[0]?.longitude).toBe(126.7701);
    expect(result.items[0]?.distanceMeters).not.toBeNull();
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

  it('approved phone verification은 public phone으로 쓰지만 민감 필드는 노출하지 않는다', async () => {
    const canonical = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: '4110000:411000001020240777',
      sourceUpdatedAt: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
      snapshotId: 'verification-smoke',
      snapshotFetchedAt: new Date().toISOString(),
      ingestMode: 'snapshot',
      name: '검수동물병원',
      roadAddress: '경기 고양시 일산서구 중앙로 777',
      lotAddress: '경기 고양시 일산서구 대화동 777',
      operationStatusText: '영업/정상',
      licenseStatusText: '정상',
      officialPhone: null,
      coordinates: {
        latitude: 37.68,
        longitude: 126.77,
        crs: 'WGS84',
      },
      metadata: {},
      rowChecksum: 'ah_test_verified',
      rawPayload: {},
    }).canonicalHospital;
    const now = new Date().toISOString();
    const verifications: AnimalHospitalVerificationRecord[] = [
      {
        id: 'verification-phone-1',
        animalHospitalId: canonical.id,
        fieldKey: 'phone',
        status: 'approved',
        verifiedValue: { phone: '031-777-0000' },
        verificationSource: 'operator-call',
        reviewerId: 'reviewer-1',
        reviewedAt: now,
        expiresAt: null,
        note: null,
        evidence: {},
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'verification-homepage-1',
        animalHospitalId: canonical.id,
        fieldKey: 'homepageUrl',
        status: 'approved',
        verifiedValue: { url: 'https://example.com' },
        verificationSource: 'operator-call',
        reviewerId: 'reviewer-1',
        reviewedAt: now,
        expiresAt: null,
        note: null,
        evidence: {},
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'verification-coordinates-1',
        animalHospitalId: canonical.id,
        fieldKey: 'coordinates',
        status: 'approved',
        verifiedValue: { latitude: 37.681, longitude: 126.771 },
        verificationSource: 'operator-visit',
        reviewerId: 'reviewer-1',
        reviewedAt: now,
        expiresAt: null,
        note: null,
        evidence: {},
        createdAt: now,
        updatedAt: now,
      },
    ];
    const repository: AnimalHospitalCanonicalRepository = {
      search: async () => [canonical],
      getApprovedVerifications: async () => verifications,
    };
    const provider: LocationSearchProvider = {
      searchKeyword: async () => [],
      searchAddress: async () => [],
    };

    const result = await searchAnimalHospitals({
      query: null,
      scope: {
        displayLabel: '일산서구',
        queryLabel: '경기 고양시 일산서구',
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
    expect(result.items[0]?.officialPhone).toBe('031-777-0000');
    expect(result.items[0]?.latitude).toBe(37.681);
    expect(result.items[0]?.longitude).toBe(126.771);
    expect(result.items[0]?.links.externalMapUrl).toContain('37.681');
    expect(result.items[0]?.links.callUri).toBe('tel:0317770000');
    expect(result.items[0]).not.toHaveProperty('homepageUrl');
    expect(result.internalItems[0]?.withheldFields).toContain('homepageUrl');
  });

  it('24시 운영 필터는 approved open24Hours verification이 있는 병원만 남긴다', async () => {
    const open24Canonical = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: '4060000:406000001020250003',
      sourceUpdatedAt: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
      snapshotId: 'open24-filter-smoke',
      snapshotFetchedAt: new Date().toISOString(),
      ingestMode: 'snapshot',
      name: '24시 마이동물의료센터',
      roadAddress: '경기도 파주시 청석로 122',
      lotAddress: '경기도 파주시 동패동 1',
      operationStatusText: '영업/정상',
      licenseStatusText: '정상',
      officialPhone: null,
      coordinates: {
        latitude: 37.713595,
        longitude: 126.720972,
        crs: 'WGS84',
      },
      metadata: {},
      rowChecksum: 'ah_test_open24',
      rawPayload: {},
    }).canonicalHospital;
    const normalCanonical = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: '4060000:406000001020250099',
      sourceUpdatedAt: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
      snapshotId: 'open24-filter-smoke',
      snapshotFetchedAt: new Date().toISOString(),
      ingestMode: 'snapshot',
      name: '일반동물병원',
      roadAddress: '경기도 파주시 청석로 200',
      lotAddress: '경기도 파주시 동패동 2',
      operationStatusText: '영업/정상',
      licenseStatusText: '정상',
      officialPhone: null,
      coordinates: {
        latitude: 37.71,
        longitude: 126.72,
        crs: 'WGS84',
      },
      metadata: {},
      rowChecksum: 'ah_test_normal',
      rawPayload: {},
    }).canonicalHospital;
    const now = new Date().toISOString();
    const repository: AnimalHospitalCanonicalRepository = {
      search: async () => [open24Canonical, normalCanonical],
      getApprovedVerifications: async hospitalIds =>
        hospitalIds.includes(open24Canonical.id)
          ? [
              {
                id: 'verification-open24-1',
                animalHospitalId: open24Canonical.id,
                fieldKey: 'open24Hours',
                status: 'approved',
                verifiedValue: { open24Hours: true },
                verificationSource: 'official-source',
                reviewerId: 'reviewer-1',
                reviewedAt: now,
                expiresAt: null,
                note: 'official homepage',
                evidence: { sourceUrl: 'https://24myamc.com/' },
                createdAt: now,
                updatedAt: now,
              },
            ]
          : [],
    };
    const provider: LocationSearchProvider = {
      searchKeyword: async () => [],
      searchAddress: async () => [],
    };

    const result = await searchAnimalHospitals({
      query: null,
      scope: {
        displayLabel: '현재 위치',
        queryLabel: '경기 파주시',
        anchorCoordinates: {
          latitude: 37.713,
          longitude: 126.721,
          accuracy: 30,
          capturedAt: Date.now(),
          source: 'gps',
        },
        distanceLabel: '현재 위치 기준',
      },
      useNearbySearch: true,
      open24HoursOnly: true,
      repository,
      provider,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe(open24Canonical.id);
    expect(result.items[0]).not.toHaveProperty('open24Hours');
    expect(result.internalItems[0]?.sensitiveDetails.open24Hours.value).toBe(
      true,
    );
  });

  it('특수동물병원 필터는 approved exoticAnimalCare verification이 있는 병원만 남긴다', async () => {
    const exoticCanonical = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: '4110000:411000001020240801',
      sourceUpdatedAt: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
      snapshotId: 'exotic-filter-smoke',
      snapshotFetchedAt: new Date().toISOString(),
      ingestMode: 'snapshot',
      name: '특수동물진료병원',
      roadAddress: '경기 고양시 일산서구 중앙로 801',
      lotAddress: '경기 고양시 일산서구 대화동 801',
      operationStatusText: '영업/정상',
      licenseStatusText: '정상',
      officialPhone: null,
      coordinates: {
        latitude: 37.681,
        longitude: 126.771,
        crs: 'WGS84',
      },
      metadata: {},
      rowChecksum: 'ah_test_exotic',
      rawPayload: {},
    }).canonicalHospital;
    const normalCanonical = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: '4110000:411000001020240802',
      sourceUpdatedAt: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
      snapshotId: 'exotic-filter-smoke',
      snapshotFetchedAt: new Date().toISOString(),
      ingestMode: 'snapshot',
      name: '일반진료병원',
      roadAddress: '경기 고양시 일산서구 중앙로 802',
      lotAddress: '경기 고양시 일산서구 대화동 802',
      operationStatusText: '영업/정상',
      licenseStatusText: '정상',
      officialPhone: null,
      coordinates: {
        latitude: 37.682,
        longitude: 126.772,
        crs: 'WGS84',
      },
      metadata: {},
      rowChecksum: 'ah_test_normal_exotic',
      rawPayload: {},
    }).canonicalHospital;
    const now = new Date().toISOString();
    const repository: AnimalHospitalCanonicalRepository = {
      search: async () => [normalCanonical, exoticCanonical],
      getApprovedVerifications: async hospitalIds =>
        hospitalIds.includes(exoticCanonical.id)
          ? [
              {
                id: 'verification-exotic-1',
                animalHospitalId: exoticCanonical.id,
                fieldKey: 'exoticAnimalCare',
                status: 'approved',
                verifiedValue: { exoticAnimalCare: true },
                verificationSource: 'operator-call',
                reviewerId: 'reviewer-1',
                reviewedAt: now,
                expiresAt: null,
                note: 'operator confirmed',
                evidence: { source: 'operator-call' },
                createdAt: now,
                updatedAt: now,
              },
            ]
          : [],
    };
    const provider: LocationSearchProvider = {
      searchKeyword: async () => [],
      searchAddress: async () => [],
    };

    const result = await searchAnimalHospitals({
      query: null,
      scope: {
        displayLabel: '현재 위치',
        queryLabel: '경기 고양시',
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
      exoticAnimalCareOnly: true,
      repository,
      provider,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe(exoticCanonical.id);
    expect(result.items[0]).not.toHaveProperty('exoticAnimalCare');
    expect(
      result.internalItems[0]?.sensitiveDetails.exoticAnimalCare.value,
    ).toBe(true);
  });

  it('thumbnail은 pending/approved verification 중 최신 public 값을 우선 반영한다', async () => {
    const canonical = mapOfficialAnimalHospitalSourceToCanonical({
      provider: 'official-localdata',
      providerRecordId: '4110000:411000001020240778',
      sourceUpdatedAt: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
      snapshotId: 'thumbnail-verification-smoke',
      snapshotFetchedAt: new Date().toISOString(),
      ingestMode: 'snapshot',
      name: '썸네일동물병원',
      roadAddress: '경기 고양시 일산서구 중앙로 778',
      lotAddress: '경기 고양시 일산서구 대화동 778',
      operationStatusText: '영업/정상',
      licenseStatusText: '정상',
      officialPhone: null,
      coordinates: {
        latitude: 37.68,
        longitude: 126.77,
        crs: 'WGS84',
      },
      metadata: {},
      rowChecksum: 'ah_test_thumbnail_verified',
      rawPayload: {},
    }).canonicalHospital;
    const now = new Date().toISOString();
    const repository: AnimalHospitalCanonicalRepository = {
      search: async () => [canonical],
      getApprovedVerifications: async () => [
        {
          id: 'verification-thumbnail-pending',
          animalHospitalId: canonical.id,
          fieldKey: 'thumbnail',
          status: 'pending',
          verifiedValue: {
            thumbnailUrl: 'https://official.example.test/pending.jpg',
          },
          verificationSource: 'official-source',
          reviewerId: null,
          reviewedAt: null,
          expiresAt: null,
          note: null,
          evidence: {},
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'verification-thumbnail-approved',
          animalHospitalId: canonical.id,
          fieldKey: 'thumbnail',
          status: 'approved',
          verifiedValue: {
            thumbnailUrl: 'https://official.example.test/approved.jpg',
          },
          verificationSource: 'official-source',
          reviewerId: 'reviewer-1',
          reviewedAt: now,
          expiresAt: null,
          note: null,
          evidence: {},
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
    const provider: LocationSearchProvider = {
      searchKeyword: async () => [],
      searchAddress: async () => [],
    };

    const result = await searchAnimalHospitals({
      query: null,
      scope: {
        displayLabel: '일산서구',
        queryLabel: '경기 고양시 일산서구',
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
    expect(result.items[0]?.thumbnailUrl).toBe(
      'https://official.example.test/approved.jpg',
    );
  });
});
