import type { DeviceCoordinates } from '../location/currentPosition';
import { kakaoLocalSearchProvider } from '../locationDiscovery/kakaoLocal';
import type { LocationSearchProvider } from '../locationDiscovery/provider';
import type { KakaoPlaceDocument } from '../locationDiscovery/types';
import {
  ANIMAL_HOSPITAL_DEFAULT_NEARBY_QUERY,
  ANIMAL_HOSPITAL_DEFAULT_PAGE_SIZE,
  ANIMAL_HOSPITAL_DEFAULT_RADIUS_METERS,
} from '../../domains/animalHospital/constants';
import {
  projectAnimalHospitalInternal,
  projectAnimalHospitalPublic,
} from '../../domains/animalHospital/projections';
import type {
  AnimalHospitalCanonicalHospital,
  AnimalHospitalSearchResult,
  AnimalHospitalSearchScope,
} from '../../domains/animalHospital/types';
import { linkAnimalHospitalRuntimeCandidates } from './matching';
import {
  buildAnimalHospitalCanonicalId,
  normalizeWhitespace,
  parseNullableNumber,
} from './normalization';
import {
  buildAnimalHospitalSearchTokens,
  buildAnimalHospitalSourceProvenance,
  createHiddenAnimalHospitalDetail,
  mapOfficialAnimalHospitalSourceToCanonical,
} from './mapper';
import { animalHospitalSupabaseRepository } from '../supabase/animalHospitals';

const CANONICAL_SEARCH_TIMEOUT_MS = 2500;
const RUNTIME_PROVIDER_SEARCH_TIMEOUT_MS = 7000;

class AnimalHospitalSearchTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnimalHospitalSearchTimeoutError';
  }
}

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

function withTimeout<T>(params: {
  task: Promise<T>;
  timeoutMs: number;
}): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AnimalHospitalSearchTimeoutError('animal hospital search timeout'));
    }, params.timeoutMs);

    params.task
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function isAnimalHospitalSearchTimeout(
  error: unknown,
): error is AnimalHospitalSearchTimeoutError {
  return error instanceof AnimalHospitalSearchTimeoutError;
}

function buildRuntimeCandidateCanonical(params: {
  document: KakaoPlaceDocument;
  ingestedAt: string;
}): AnimalHospitalCanonicalHospital | null {
  const { document, ingestedAt } = params;
  const name = normalizeWhitespace(document.place_name);
  if (!name) {
    return null;
  }

  const latitude = parseNullableNumber(document.y);
  const longitude = parseNullableNumber(document.x);
  const providerRecordId =
    normalizeWhitespace(document.id) ??
    `${name}:${normalizeWhitespace(document.address_name) ?? 'unknown'}`;
  const provenance = buildAnimalHospitalSourceProvenance({
    provider: 'kakao-place',
    sourceKind: 'runtime-linkage',
    providerRecordId,
    sourceUpdatedAt: ingestedAt,
    ingestedAt,
    metadata: {
      placeUrl: normalizeWhitespace(document.place_url),
    },
    rawPayload: document as unknown as Record<string, unknown>,
  });
  const primaryAddress =
    normalizeWhitespace(document.road_address_name) ??
    normalizeWhitespace(document.address_name) ??
    '주소 확인 필요';
  const searchTokens = buildAnimalHospitalSearchTokens({
    name,
    address: primaryAddress,
    phone: document.phone ?? null,
  });

  return {
    id: buildAnimalHospitalCanonicalId({
      provider: 'kakao-place',
      providerRecordId,
    }),
    domain: 'animalHospital',
    canonicalName: name,
    normalizedName: searchTokens.normalizedName,
    address: {
      primary: primaryAddress,
      roadAddress: normalizeWhitespace(document.road_address_name),
      lotAddress: normalizeWhitespace(document.address_name),
      normalizedPrimary: searchTokens.normalizedAddress,
    },
    coordinates: {
      latitude,
      longitude,
      source:
        latitude !== null && longitude !== null ? 'external-fallback' : 'unknown',
      normalizationStatus:
        latitude !== null && longitude !== null ? 'fallback' : 'missing',
    },
    primarySource: {
      sourceId: provenance.sourceId,
      sourceKey: provenance.sourceKey,
      officialSourceKey: null,
      provider: 'kakao-place',
      providerRecordId,
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
      candidatePhones: normalizeWhitespace(document.phone)
        ? [
            {
              value: normalizeWhitespace(document.phone)!,
              verificationStatus: 'candidate',
              sourceId: provenance.sourceId,
              verifiedAt: ingestedAt,
            },
          ]
        : [],
    },
    links: {
      providerPlaceUrl: normalizeWhitespace(document.place_url),
      providerPlaceId: normalizeWhitespace(document.id),
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
    lifecycle: {
      status: 'active',
      isActive: true,
      isHidden: false,
      conflictStatus: 'none',
      statusReason: null,
    },
    searchTokens,
    sensitiveDetails: {
      operatingHours: createHiddenAnimalHospitalDetail<string>(
        '운영시간은 확인 후 방문해 주세요.',
      ),
      open24Hours: createHiddenAnimalHospitalDetail<boolean>(
        '24시간 여부는 전화 확인이 필요해요.',
      ),
      nightService: createHiddenAnimalHospitalDetail<boolean>(
        '야간 진료 여부는 확인이 필요해요.',
      ),
      weekendService: createHiddenAnimalHospitalDetail<boolean>(
        '주말 진료 여부는 방문 전 확인해 주세요.',
      ),
      exoticAnimalCare: createHiddenAnimalHospitalDetail<boolean>(
        '특수동물 진료는 직접 확인이 필요해요.',
      ),
      emergencyCare: createHiddenAnimalHospitalDetail<boolean>(
        '응급 대응 가능 여부는 바로 전화 확인해 주세요.',
      ),
      parking: createHiddenAnimalHospitalDetail<boolean>(
        '주차 정보는 확인이 필요해요.',
      ),
      equipmentSummary: createHiddenAnimalHospitalDetail<string>(
        '진료과목은 병원에 확인해 주세요.',
      ),
      homepageUrl: createHiddenAnimalHospitalDetail<string>(
        '홈페이지 정보는 아직 공개하지 않아요.',
      ),
      socialUrl: createHiddenAnimalHospitalDetail<string>(
        'SNS 정보는 아직 공개하지 않아요.',
      ),
    },
    sourceProvenance: [provenance],
  };
}

function buildRuntimeKeyword(query: string | null) {
  const normalized = normalizeWhitespace(query);
  if (!normalized) {
    return ANIMAL_HOSPITAL_DEFAULT_NEARBY_QUERY;
  }

  return normalized.includes('동물병원') ? normalized : `${normalized} 동물병원`;
}

function dedupeCanonicals(
  items: ReadonlyArray<AnimalHospitalCanonicalHospital>,
): AnimalHospitalCanonicalHospital[] {
  const byId = new Map<string, AnimalHospitalCanonicalHospital>();

  items.forEach(item => {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      return;
    }

    if (
      existing.trust.publicStatus === 'candidate' &&
      item.trust.publicStatus !== 'candidate'
    ) {
      byId.set(item.id, item);
    }
  });

  return [...byId.values()];
}

function sortCanonicalPriority(item: AnimalHospitalCanonicalHospital): number {
  if (
    item.primarySource.provider === 'official-localdata' ||
    item.primarySource.provider === 'municipal-open-data'
  ) {
    return 0;
  }

  return 1;
}

export async function searchAnimalHospitals(input: {
  query: string | null;
  scope: AnimalHospitalSearchScope;
  useNearbySearch?: boolean;
  repository?: AnimalHospitalCanonicalRepository;
  provider?: LocationSearchProvider;
}): Promise<AnimalHospitalSearchResult> {
  const repository = input.repository ?? animalHospitalSupabaseRepository;
  const provider = input.provider ?? kakaoLocalSearchProvider;
  const normalizedQuery = normalizeWhitespace(input.query);
  const radiusMeters = input.useNearbySearch
    ? ANIMAL_HOSPITAL_DEFAULT_RADIUS_METERS
    : ANIMAL_HOSPITAL_DEFAULT_RADIUS_METERS * 2;
  const officialCanonicals = (await withTimeout({
    task: repository.search({
      query: normalizedQuery,
      coordinates: input.scope.anchorCoordinates,
      radiusMeters,
    }),
    timeoutMs: CANONICAL_SEARCH_TIMEOUT_MS,
  }).catch(() => [])).filter(item => item.lifecycle.isActive && !item.lifecycle.isHidden);
  const ingestedAt = new Date().toISOString();
  const documents = await withTimeout({
    task: provider.searchKeyword({
      query: buildRuntimeKeyword(normalizedQuery),
      coordinates: input.scope.anchorCoordinates,
      radiusMeters,
      size: ANIMAL_HOSPITAL_DEFAULT_PAGE_SIZE,
    }),
    timeoutMs: RUNTIME_PROVIDER_SEARCH_TIMEOUT_MS,
  }).catch(error => {
    if (isAnimalHospitalSearchTimeout(error)) {
      return [];
    }

    throw error;
  });
  const runtimeCandidates = documents
    .map(document =>
      buildRuntimeCandidateCanonical({
        document,
        ingestedAt,
      }),
    )
    .filter((item): item is AnimalHospitalCanonicalHospital => item !== null);

  const { linkedCanonicals, providerOnlyCandidates } =
    linkAnimalHospitalRuntimeCandidates({
      canonicals: officialCanonicals,
      candidates: runtimeCandidates,
    });
  const merged = dedupeCanonicals([
    ...linkedCanonicals,
    ...providerOnlyCandidates,
  ]);
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
      const leftCanonical = merged.find(item => item.id === left.id) ?? null;
      const rightCanonical = merged.find(item => item.id === right.id) ?? null;
      const priorityLeft = leftCanonical ? sortCanonicalPriority(leftCanonical) : 1;
      const priorityRight = rightCanonical ? sortCanonicalPriority(rightCanonical) : 1;
      if (priorityLeft !== priorityRight) {
        return priorityLeft - priorityRight;
      }

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

export { emptyAnimalHospitalRepository };
export { mapOfficialAnimalHospitalSourceToCanonical };
