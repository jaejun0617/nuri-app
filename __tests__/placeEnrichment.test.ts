import type { AnimalHospitalPublicHospital } from '../src/domains/animalHospital/types';
import type { LocationDiscoveryItem } from '../src/services/locationDiscovery/types';
import {
  buildAnimalHospitalPlaceEnrichmentTarget,
  buildLocationDiscoveryPlaceEnrichmentTarget,
  mergeAnimalHospitalPlaceEnrichment,
  mergeLocationDiscoveryPlaceEnrichment,
  type PlaceEnrichmentResult,
} from '../src/services/placeEnrichment/service';

function createAnimalHospital(): AnimalHospitalPublicHospital {
  return {
    id: 'animal-hospital:1',
    name: '누리동물병원',
    address: '서울특별시 강남구 테헤란로 10',
    roadAddress: null,
    latitude: null,
    longitude: null,
    distanceMeters: 120,
    distanceLabel: '도보 2분',
    statusSummary: '운영 중',
    operatingBadge: null,
    officialPhone: null,
    thumbnailUrl: null,
    publicTrust: {
      publicLabel: 'needs_verification',
      label: '기본 확인',
      shortReason: '기본 정보는 확인됐어요.',
      description: '기본 정보만 공개해요.',
      guidance: '민감한 운영 정보는 숨겨 둬요.',
      tone: 'caution',
      sourceLabel: 'official',
      basisDate: '2026-04-24T00:00:00.000Z',
      basisDateLabel: '기준일 2026-04-24',
      isStale: false,
      hasConflict: false,
      layers: ['trust'],
    },
    links: {
      externalMapUrl: null,
      providerPlaceUrl: null,
      callUri: null,
    },
  };
}

function createWalkItem(): LocationDiscoveryItem {
  return {
    id: 'walk:1',
    domain: 'walk',
    kind: 'walk-spot',
    name: '누리 산책로',
    description: '반려동물과 산책하기 좋아요.',
    categoryLabel: '산책 장소',
    address: '경기도 고양시 일산동구 중앙로 10',
    roadAddress: null,
    distanceMeters: 330,
    distanceLabel: '도보 5분',
    estimatedMinutes: 5,
    latitude: 37.661,
    longitude: 126.768,
    placeUrl: null,
    phone: null,
    operatingStatusLabel: null,
    source: {
      provider: 'kakao',
      providerLabel: 'Kakao Local',
      type: 'external-api',
      externalPlaceId: 'kakao-place-1',
    },
    verification: {
      status: 'unknown',
      label: '확인 필요',
      description: '외부 후보예요.',
      tone: 'neutral',
      sourceLabel: 'Kakao Local',
      requiresConfirmation: true,
    },
    publicTrust: {
      publicLabel: 'candidate',
      label: '후보',
      shortReason: '후보 결과예요.',
      description: '후보 결과만 보여줘요.',
      guidance: '현장 확인이 필요해요.',
      tone: 'neutral',
      sourceLabel: 'kakao',
      basisDate: null,
      basisDateLabel: null,
      isStale: false,
      hasConflict: false,
      layers: ['candidate'],
    },
    userLayer: {
      targetId: null,
      supportsBookmark: false,
      supportsReport: false,
    },
    petPolicy: {
      summaryLabel: null,
      detail: null,
    },
    thumbnailUrl: null,
    coordinateLabel: '37.6610, 126.7680',
    mapPreviewUrl: 'https://staticmap.openstreetmap.de/staticmap.php?center=37.661000,126.768000',
  };
}

describe('place enrichment service', () => {
  it('animalHospital target은 비어 있는 phone/coordinates/thumbnail만 요청한다', () => {
    const target = buildAnimalHospitalPlaceEnrichmentTarget(createAnimalHospital());

    expect(target.requestedFields).toEqual(['phone', 'coordinates', 'thumbnail']);
  });

  it('animalHospital 상세 target만 hours와 website를 요청한다', () => {
    const target = buildAnimalHospitalPlaceEnrichmentTarget(
      createAnimalHospital(),
      { includeDetails: true },
    );

    expect(target.requestedFields).toEqual([
      'phone',
      'coordinates',
      'thumbnail',
      'hours',
      'website',
    ]);
  });

  it('walk target은 기본적으로 thumbnail과 phone만 요청한다', () => {
    const target = buildLocationDiscoveryPlaceEnrichmentTarget(createWalkItem());

    expect(target.requestedFields).toEqual(['thumbnail']);
  });

  it('walk_poi target은 provider thumbnail 보강을 요청하지 않는다', () => {
    const item: LocationDiscoveryItem = {
      ...createWalkItem(),
      id: 'walk-poi:1',
      source: {
        provider: 'walk_poi',
        providerLabel: 'NURI 자체 POI',
        type: 'canonical-poi',
        externalPlaceId: null,
      },
      verification: {
        status: 'admin-verified',
        label: '운영 검수 반영',
        description: 'NURI 자체 POI예요.',
        tone: 'positive',
        sourceLabel: 'NURI 운영 검수',
        requiresConfirmation: false,
      },
      publicTrust: {
        ...createWalkItem().publicTrust,
        publicLabel: 'trust_reviewed',
        label: '검수 반영',
        layers: ['trust'],
      },
    };
    const target = buildLocationDiscoveryPlaceEnrichmentTarget(item);

    expect(target.requestedFields).toEqual([]);
    expect(target.externalPlaceId).toBeNull();
    expect(target.providerPlaceUrl).toBeNull();
  });

  it('animalHospital enrichment overlay는 전화와 좌표와 썸네일을 병합한다', () => {
    const item = createAnimalHospital();
    const enrichment: PlaceEnrichmentResult = {
      businessStatus: null,
      cacheExpiresAt: '2026-05-24T00:00:00.000Z',
      currentOpeningHours: null,
      domain: 'animalHospital',
      dynamicStatusExpiresAt: null,
      errorCode: null,
      externalMapUrl: 'geo:37.5,127.03?q=37.5,127.03(%EB%88%84%EB%A6%AC%EB%8F%99%EB%AC%BC%EB%B3%91%EC%9B%90)',
      hoursExpiresAt: null,
      hoursFetchedAt: null,
      latitude: 37.5,
      longitude: 127.03,
      phone: '0319455000',
      placeId: item.id,
      photoAttributionLabel: '누리동물병원',
      providerPlaceId: 'google-place-1',
      providerPlaceUrl: 'https://maps.google.com/?cid=1',
      regularOpeningHours: null,
      retryAfterMs: null,
      source: 'provider',
      status: 'enriched',
      thumbnailUrl: 'https://lh3.googleusercontent.com/photo-1',
      websiteUri: null,
    };

    const merged = mergeAnimalHospitalPlaceEnrichment(item, enrichment);

    expect(merged.officialPhone).toBe('0319455000');
    expect(merged.latitude).toBe(37.5);
    expect(merged.longitude).toBe(127.03);
    expect(merged.thumbnailUrl).toBe('https://lh3.googleusercontent.com/photo-1');
    expect(merged.links.callUri).toBe('tel:0319455000');
    expect(merged.links.providerPlaceUrl).toBe('https://maps.google.com/?cid=1');
  });

  it('walk enrichment overlay는 thumbnail과 전화와 링크를 병합한다', () => {
    const item = createWalkItem();
    const enrichment: PlaceEnrichmentResult = {
      businessStatus: null,
      cacheExpiresAt: '2026-05-24T00:00:00.000Z',
      currentOpeningHours: null,
      domain: 'walk',
      dynamicStatusExpiresAt: null,
      errorCode: null,
      externalMapUrl: 'https://maps.google.com/?cid=2',
      hoursExpiresAt: null,
      hoursFetchedAt: null,
      latitude: item.latitude,
      longitude: item.longitude,
      phone: '0212345678',
      placeId: item.id,
      photoAttributionLabel: '서울숲공원',
      providerPlaceId: 'google-place-2',
      providerPlaceUrl: 'https://maps.google.com/?cid=2',
      regularOpeningHours: null,
      retryAfterMs: null,
      source: 'provider',
      status: 'enriched',
      thumbnailUrl: 'https://lh3.googleusercontent.com/photo-2',
      websiteUri: null,
    };

    const merged = mergeLocationDiscoveryPlaceEnrichment(item, enrichment);

    expect(merged.phone).toBe('0212345678');
    expect(merged.placeUrl).toBe('https://maps.google.com/?cid=2');
    expect(merged.thumbnailUrl).toBe('https://lh3.googleusercontent.com/photo-2');
    expect(merged.mapPreviewUrl).toContain('37.661000');
  });
});
