import type { DeviceCoordinates } from '../location/currentPosition';
import { buildExternalMapUrl } from '../locationDiscovery/maps';
import { kakaoLocalSearchProvider } from '../locationDiscovery/kakaoLocal';
import type { KakaoPlaceDocument } from '../locationDiscovery/types';
import type { LocationSearchProvider } from '../locationDiscovery/provider';
import {
  ANIMAL_HOSPITAL_DEFAULT_NEARBY_QUERY,
  ANIMAL_HOSPITAL_DEFAULT_PAGE_SIZE,
  ANIMAL_HOSPITAL_DEFAULT_RADIUS_METERS,
} from '../../domains/animalHospital/constants';
import { projectAnimalHospitalInternal, projectAnimalHospitalPublic } from '../../domains/animalHospital/projections';
import {
  resolveAnimalHospitalFreshness,
  resolveCoordinateNormalizationStatus,
} from '../../domains/animalHospital/trust';
import type {
  AnimalHospitalCanonicalHospital,
  AnimalHospitalCanonicalUpsertContract,
  AnimalHospitalOfficialSourceIngestInput,
  AnimalHospitalSearchResult,
  AnimalHospitalSearchScope,
  AnimalHospitalSourceProvenance,
  AnimalHospitalSourceRecord,
} from '../../domains/animalHospital/types';

export type AnimalHospitalCanonicalRepository = {
  search: (input: {
    query: string | null;
    coordinates: DeviceCoordinates | null;
    radiusMeters: number;
  }) => Promise<ReadonlyArray<AnimalHospitalCanonicalHospital>>;
};

const emptyAnimalHospitalRepository: AnimalHospitalCanonicalRepository = {
  search: async () => [],
};

function normalizeQuery(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function parseNumber(value: number | string | null | undefined): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function createCanonicalId(parts: ReadonlyArray<string | null | undefined>): string {
  return parts
    .map(value => (value ?? '').trim().toLowerCase())
    .filter(Boolean)
    .join(':');
}

function inferStatusCode(value: string | null | undefined) {
  const normalized = (value ?? '').trim();
  if (!normalized) {
    return 'verification-required' as const;
  }

  if (/(폐업|휴업|말소|취소)/.test(normalized)) {
    return 'closed' as const;
  }

  if (/(정지|중지)/.test(normalized)) {
    return 'suspended' as const;
  }

  if (/(영업|운영|정상|개설)/.test(normalized)) {
    return 'operating' as const;
  }

  return 'verification-required' as const;
}

function createHiddenDetail<T>(fallbackText: string) {
  return {
    value: null as T | null,
    visibility: 'hidden' as const,
    verificationStatus: 'unknown' as const,
    sourceId: null,
    verifiedAt: null,
    fallbackText,
  };
}

function buildSourceProvenance(input: {
  provider: AnimalHospitalSourceProvenance['provider'];
  sourceKind: AnimalHospitalSourceProvenance['sourceKind'];
  providerRecordId: string;
  sourceUpdatedAt: string | null;
  ingestedAt: string;
  rawPayload?: Record<string, unknown> | null;
}): AnimalHospitalSourceProvenance {
  return {
    sourceId: createCanonicalId([
      input.provider,
      input.providerRecordId,
      input.ingestedAt,
    ]),
    provider: input.provider,
    sourceKind: input.sourceKind,
    providerRecordId: input.providerRecordId,
    sourceUpdatedAt: input.sourceUpdatedAt,
    ingestedAt: input.ingestedAt,
    rawPayload: input.rawPayload ?? null,
  };
}

function normalizeOfficialCoordinates(input: AnimalHospitalOfficialSourceIngestInput) {
  const latitude = parseNumber(input.coordinates.latitude);
  const longitude = parseNumber(input.coordinates.longitude);
  const fallbackLatitude = parseNumber(input.coordinates.fallbackLatitude);
  const fallbackLongitude = parseNumber(input.coordinates.fallbackLongitude);
  const source =
    latitude !== null && longitude !== null
      ? 'official-wgs84'
      : input.coordinates.crs === 'EPSG:5174'
        ? 'epsg5174-pending'
        : fallbackLatitude !== null && fallbackLongitude !== null
          ? 'external-fallback'
          : 'unknown';
  const normalizationStatus = resolveCoordinateNormalizationStatus({
    latitude,
    longitude,
    fallbackLatitude,
    fallbackLongitude,
    crs: source,
  });

  return {
    latitude: latitude ?? fallbackLatitude,
    longitude: longitude ?? fallbackLongitude,
    source,
    normalizationStatus,
  } as const;
}

export function mapOfficialAnimalHospitalSourceToCanonical(
  input: AnimalHospitalOfficialSourceIngestInput,
): AnimalHospitalCanonicalUpsertContract {
  const ingestedAt = input.ingestedAt ?? new Date().toISOString();
  const normalizedCoordinates = normalizeOfficialCoordinates(input);
  const provenance = buildSourceProvenance({
    provider: input.provider,
    sourceKind: 'official-registry',
    providerRecordId: input.providerRecordId,
    sourceUpdatedAt: input.sourceUpdatedAt,
    ingestedAt,
    rawPayload: input.rawPayload ?? null,
  });
  const sourceRecord: AnimalHospitalSourceRecord = {
    sourceId: provenance.sourceId,
    provider: input.provider,
    sourceKind: 'official-registry',
    providerRecordId: input.providerRecordId,
    name: input.name,
    lotAddress: input.lotAddress ?? null,
    roadAddress: input.roadAddress ?? null,
    licenseStatusText: input.licenseStatusText ?? null,
    operationStatusText: input.operationStatusText ?? null,
    officialPhone: input.officialPhone?.trim() || null,
    rawCoordinates: {
      latitude: parseNumber(input.coordinates.latitude),
      longitude: parseNumber(input.coordinates.longitude),
      x5174: parseNumber(input.coordinates.x5174),
      y5174: parseNumber(input.coordinates.y5174),
      crs: input.coordinates.crs,
    },
    normalizedCoordinates,
    sourceUpdatedAt: input.sourceUpdatedAt,
    ingestedAt,
    rawPayload: input.rawPayload ?? null,
  };

  const canonicalId = createCanonicalId([
    'animal-hospital',
    input.provider,
    input.providerRecordId,
  ]);
  const canonicalUpdatedAt = new Date().toISOString();
  const trustFreshness = resolveAnimalHospitalFreshness({
    sourceUpdatedAt: input.sourceUpdatedAt,
    staleAfterDays: 7,
  });
  const canonicalHospital: AnimalHospitalCanonicalHospital = {
    id: canonicalId,
    domain: 'animalHospital',
    canonicalName: input.name.trim(),
    address: {
      primary: input.roadAddress?.trim() || input.lotAddress?.trim() || '주소 확인 필요',
      roadAddress: input.roadAddress?.trim() || null,
      lotAddress: input.lotAddress?.trim() || null,
    },
    coordinates: normalizedCoordinates,
    status: {
      code: inferStatusCode(
        input.operationStatusText ?? input.licenseStatusText ?? null,
      ),
      summary: input.operationStatusText?.trim() || input.licenseStatusText?.trim() || '인허가 상태 확인 필요',
      licenseStatusText: input.licenseStatusText?.trim() || null,
      operationStatusText: input.operationStatusText?.trim() || null,
      sourceId: provenance.sourceId,
    },
    contact: {
      publicPhone: input.officialPhone?.trim()
        ? {
            value: input.officialPhone.trim(),
            verificationStatus: 'official',
            sourceId: provenance.sourceId,
            verifiedAt: input.sourceUpdatedAt,
          }
        : null,
      candidatePhones: [],
    },
    links: {
      providerPlaceUrl:
        normalizedCoordinates.latitude !== null &&
        normalizedCoordinates.longitude !== null
          ? buildExternalMapUrl({
              latitude: normalizedCoordinates.latitude,
              longitude: normalizedCoordinates.longitude,
              label: input.name,
            })
          : null,
      providerPlaceId: null,
      externalMapLabel: input.name,
    },
    trust: {
      publicStatus:
        input.officialPhone?.trim() && trustFreshness === 'fresh'
          ? 'needs_verification'
          : 'candidate',
      freshness: trustFreshness,
      requiresVerification: true,
      hasSourceConflict: normalizedCoordinates.normalizationStatus === 'conversion-required',
      sourceUpdatedAt: input.sourceUpdatedAt,
      canonicalUpdatedAt,
      reviewedAt: null,
    },
    sensitiveDetails: {
      operatingHours: createHiddenDetail<string>('운영시간은 확인 후 방문해 주세요.'),
      open24Hours: createHiddenDetail<boolean>('24시간 여부는 전화 확인이 필요해요.'),
      nightService: createHiddenDetail<boolean>('야간 진료 여부는 확인이 필요해요.'),
      weekendService: createHiddenDetail<boolean>('주말 진료 여부는 방문 전 확인해 주세요.'),
      exoticAnimalCare: createHiddenDetail<boolean>('특수동물 진료는 직접 확인이 필요해요.'),
      emergencyCare: createHiddenDetail<boolean>('응급 대응 가능 여부는 바로 전화 확인해 주세요.'),
      parking: createHiddenDetail<boolean>('주차 정보는 확인이 필요해요.'),
      equipmentSummary: createHiddenDetail<string>('진료과목은 병원에 확인해 주세요.'),
      homepageUrl: createHiddenDetail<string>('홈페이지 정보는 아직 공개하지 않아요.'),
      socialUrl: createHiddenDetail<string>('SNS 정보는 아직 공개하지 않아요.'),
    },
    sourceProvenance: [provenance],
  };

  return {
    canonicalId,
    canonicalHospital,
    sourceRecord,
    sourceUpdatedAt: input.sourceUpdatedAt,
    canonicalUpdatedAt,
  };
}

function buildRuntimeCandidateCanonical(params: {
  document: KakaoPlaceDocument;
  ingestedAt: string;
}): AnimalHospitalCanonicalHospital | null {
  const { document, ingestedAt } = params;
  const name = document.place_name?.trim();
  if (!name) {
    return null;
  }

  const latitude = parseNumber(document.y);
  const longitude = parseNumber(document.x);
  const providerRecordId = document.id?.trim() || createCanonicalId([name, document.address_name]);
  const provenance = buildSourceProvenance({
    provider: 'kakao-place',
    sourceKind: 'runtime-linkage',
    providerRecordId,
    sourceUpdatedAt: ingestedAt,
    ingestedAt,
    rawPayload: document as unknown as Record<string, unknown>,
  });

  return {
    id: createCanonicalId(['animal-hospital', 'runtime', providerRecordId]),
    domain: 'animalHospital',
    canonicalName: name,
    address: {
      primary:
        document.road_address_name?.trim() ||
        document.address_name?.trim() ||
        '주소 확인 필요',
      roadAddress: document.road_address_name?.trim() || null,
      lotAddress: document.address_name?.trim() || null,
    },
    coordinates: {
      latitude,
      longitude,
      source:
        latitude !== null && longitude !== null ? 'external-fallback' : 'unknown',
      normalizationStatus:
        latitude !== null && longitude !== null ? 'fallback' : 'missing',
    },
    status: {
      code: 'verification-required',
      summary: '인허가·운영상태 확인 필요',
      licenseStatusText: null,
      operationStatusText: null,
      sourceId: provenance.sourceId,
    },
    contact: {
      publicPhone: null,
      candidatePhones: document.phone?.trim()
        ? [
            {
              value: document.phone.trim(),
              verificationStatus: 'candidate',
              sourceId: provenance.sourceId,
              verifiedAt: ingestedAt,
            },
          ]
        : [],
    },
    links: {
      providerPlaceUrl: document.place_url?.trim() || null,
      providerPlaceId: document.id?.trim() || null,
      externalMapLabel: name,
    },
    trust: {
      publicStatus: 'candidate',
      freshness: 'fresh',
      requiresVerification: true,
      hasSourceConflict: false,
      sourceUpdatedAt: ingestedAt,
      canonicalUpdatedAt: ingestedAt,
      reviewedAt: null,
    },
    sensitiveDetails: {
      operatingHours: createHiddenDetail<string>('운영시간은 확인 후 방문해 주세요.'),
      open24Hours: createHiddenDetail<boolean>('24시간 여부는 전화 확인이 필요해요.'),
      nightService: createHiddenDetail<boolean>('야간 진료 여부는 확인이 필요해요.'),
      weekendService: createHiddenDetail<boolean>('주말 진료 여부는 방문 전 확인해 주세요.'),
      exoticAnimalCare: createHiddenDetail<boolean>('특수동물 진료는 직접 확인이 필요해요.'),
      emergencyCare: createHiddenDetail<boolean>('응급 대응 가능 여부는 바로 전화 확인해 주세요.'),
      parking: createHiddenDetail<boolean>('주차 정보는 확인이 필요해요.'),
      equipmentSummary: createHiddenDetail<string>('진료과목은 병원에 확인해 주세요.'),
      homepageUrl: createHiddenDetail<string>('홈페이지 정보는 아직 공개하지 않아요.'),
      socialUrl: createHiddenDetail<string>('SNS 정보는 아직 공개하지 않아요.'),
    },
    sourceProvenance: [provenance],
  };
}

function buildRuntimeKeyword(query: string | null) {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return ANIMAL_HOSPITAL_DEFAULT_NEARBY_QUERY;
  }

  return normalized.includes('동물병원') ? normalized : `${normalized} 동물병원`;
}

function dedupeCanonicals(
  items: ReadonlyArray<AnimalHospitalCanonicalHospital>,
): AnimalHospitalCanonicalHospital[] {
  const byKey = new Map<string, AnimalHospitalCanonicalHospital>();

  items.forEach(item => {
    const key = createCanonicalId([
      item.canonicalName,
      item.address.primary,
      item.coordinates.latitude?.toFixed(4) ?? null,
      item.coordinates.longitude?.toFixed(4) ?? null,
    ]);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      return;
    }

    if (
      existing.trust.publicStatus === 'candidate' &&
      item.trust.publicStatus !== 'candidate'
    ) {
      byKey.set(key, item);
    }
  });

  return [...byKey.values()];
}

export async function searchAnimalHospitals(input: {
  query: string | null;
  scope: AnimalHospitalSearchScope;
  useNearbySearch?: boolean;
  repository?: AnimalHospitalCanonicalRepository;
  provider?: LocationSearchProvider;
}): Promise<AnimalHospitalSearchResult> {
  const repository = input.repository ?? emptyAnimalHospitalRepository;
  const provider = input.provider ?? kakaoLocalSearchProvider;
  const normalizedQuery = normalizeQuery(input.query);
  const radiusMeters = input.useNearbySearch
    ? ANIMAL_HOSPITAL_DEFAULT_RADIUS_METERS
    : ANIMAL_HOSPITAL_DEFAULT_RADIUS_METERS * 2;
  const officialCanonicals = await repository.search({
    query: normalizedQuery,
    coordinates: input.scope.anchorCoordinates,
    radiusMeters,
  });
  const ingestedAt = new Date().toISOString();
  const documents = await provider.searchKeyword({
    query: buildRuntimeKeyword(normalizedQuery),
    coordinates: input.scope.anchorCoordinates,
    radiusMeters,
    size: ANIMAL_HOSPITAL_DEFAULT_PAGE_SIZE,
  });
  const runtimeCanonicals = documents
    .map(document =>
      buildRuntimeCandidateCanonical({
        document,
        ingestedAt,
      }),
    )
    .filter(
      (item): item is AnimalHospitalCanonicalHospital => item !== null,
    );

  const merged = dedupeCanonicals([...officialCanonicals, ...runtimeCanonicals]);
  const publicItems = merged
    .map(canonical =>
      projectAnimalHospitalPublic({
        canonical,
        anchorCoordinates: input.scope.anchorCoordinates
          ? {
              latitude: input.scope.anchorCoordinates.latitude,
              longitude: input.scope.anchorCoordinates.longitude,
            }
          : null,
      }),
    )
    .sort((left, right) => {
      const distanceLeft = left.distanceMeters ?? Number.MAX_SAFE_INTEGER;
      const distanceRight = right.distanceMeters ?? Number.MAX_SAFE_INTEGER;
      if (distanceLeft !== distanceRight) {
        return distanceLeft - distanceRight;
      }

      return left.name.localeCompare(right.name, 'ko');
    });
  const internalItems = merged.map(canonical =>
    projectAnimalHospitalInternal({
      canonical,
      anchorCoordinates: input.scope.anchorCoordinates
        ? {
            latitude: input.scope.anchorCoordinates.latitude,
            longitude: input.scope.anchorCoordinates.longitude,
          }
        : null,
    }),
  );

  return {
    items: publicItems,
    internalItems,
    query: normalizedQuery,
    scope: input.scope,
  };
}
