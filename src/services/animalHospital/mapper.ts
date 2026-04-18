import {
  resolveAnimalHospitalFreshness,
  resolveCoordinateNormalizationStatus,
} from '../../domains/animalHospital/trust';
import type {
  AnimalHospitalCanonicalHospital,
  AnimalHospitalCanonicalUpsertContract,
  AnimalHospitalOfficialSourceIngestInput,
  AnimalHospitalSourceProvenance,
} from '../../domains/animalHospital/types';
import {
  buildAnimalHospitalCanonicalId,
  buildAnimalHospitalOfficialSourceKey,
  buildAnimalHospitalSourceKey,
  normalizeAnimalHospitalAddress,
  normalizeAnimalHospitalName,
  normalizeAnimalHospitalPhone,
  normalizeWhitespace,
  parseNullableNumber,
} from './normalization';

export function inferAnimalHospitalStatusCode(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value);
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

export function createHiddenAnimalHospitalDetail<T>(fallbackText: string) {
  return {
    value: null as T | null,
    visibility: 'hidden' as const,
    verificationStatus: 'unknown' as const,
    sourceId: null,
    verifiedAt: null,
    fallbackText,
  };
}

export function buildAnimalHospitalSourceProvenance(input: {
  provider: AnimalHospitalSourceProvenance['provider'];
  sourceKind: AnimalHospitalSourceProvenance['sourceKind'];
  providerRecordId: string;
  sourceUpdatedAt: string | null;
  ingestedAt: string;
  snapshotId?: string | null;
  snapshotFetchedAt?: string | null;
  ingestMode?: AnimalHospitalSourceProvenance['ingestMode'];
  rowChecksum?: string | null;
  metadata?: Record<string, unknown> | null;
  rawPayload?: Record<string, unknown> | null;
}): AnimalHospitalSourceProvenance {
  const sourceKey = buildAnimalHospitalSourceKey({
    provider: input.provider,
    providerRecordId: input.providerRecordId,
  });

  return {
    sourceId: sourceKey,
    sourceKey,
    officialSourceKey:
      input.sourceKind === 'official-registry'
        ? buildAnimalHospitalOfficialSourceKey({
            provider: input.provider as AnimalHospitalOfficialSourceIngestInput['provider'],
            providerRecordId: input.providerRecordId,
          })
        : null,
    provider: input.provider,
    sourceKind: input.sourceKind,
    providerRecordId: input.providerRecordId,
    sourceUpdatedAt: input.sourceUpdatedAt,
    ingestedAt: input.ingestedAt,
    snapshotId: input.snapshotId ?? null,
    snapshotFetchedAt: input.snapshotFetchedAt ?? null,
    ingestMode: input.ingestMode ?? 'snapshot',
    rowChecksum: input.rowChecksum ?? null,
    metadata: input.metadata ?? null,
    rawPayload: input.rawPayload ?? null,
  };
}

export function normalizeAnimalHospitalOfficialCoordinates(
  input: AnimalHospitalOfficialSourceIngestInput,
) {
  const latitude = parseNullableNumber(input.coordinates.latitude);
  const longitude = parseNullableNumber(input.coordinates.longitude);
  const fallbackLatitude = parseNullableNumber(input.coordinates.fallbackLatitude);
  const fallbackLongitude = parseNullableNumber(input.coordinates.fallbackLongitude);
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

export function buildAnimalHospitalLifecycle(params: {
  statusCode: ReturnType<typeof inferAnimalHospitalStatusCode>;
  hasSourceConflict: boolean;
}) {
  const isInactive =
    params.statusCode === 'closed' || params.statusCode === 'suspended';

  return {
    status: isInactive ? ('inactive' as const) : ('active' as const),
    isActive: !isInactive,
    isHidden: false,
    conflictStatus: params.hasSourceConflict
      ? ('unresolved' as const)
      : ('none' as const),
    statusReason: isInactive ? '공식 source 기준 운영 상태 비활성' : null,
  };
}

export function buildAnimalHospitalSearchTokens(params: {
  name: string;
  address: string | null;
  phone: string | null;
}) {
  return {
    normalizedName: normalizeAnimalHospitalName(params.name) ?? '',
    normalizedAddress: normalizeAnimalHospitalAddress(params.address),
    normalizedPhone: normalizeAnimalHospitalPhone(params.phone),
  };
}

export function mapOfficialAnimalHospitalSourceToCanonical(
  input: AnimalHospitalOfficialSourceIngestInput,
): AnimalHospitalCanonicalUpsertContract {
  const ingestedAt = input.ingestedAt ?? new Date().toISOString();
  const normalizedCoordinates = normalizeAnimalHospitalOfficialCoordinates(input);
  const provenance = buildAnimalHospitalSourceProvenance({
    provider: input.provider,
    sourceKind: 'official-registry',
    providerRecordId: input.providerRecordId,
    sourceUpdatedAt: input.sourceUpdatedAt,
    ingestedAt,
    snapshotId: input.snapshotId ?? null,
    snapshotFetchedAt: input.snapshotFetchedAt ?? input.ingestedAt ?? null,
    ingestMode: input.ingestMode ?? 'snapshot',
    rowChecksum: input.rowChecksum ?? null,
    metadata: input.metadata ?? null,
    rawPayload: input.rawPayload ?? null,
  });
  const primaryAddress =
    normalizeWhitespace(input.roadAddress) ??
    normalizeWhitespace(input.lotAddress) ??
    '주소 확인 필요';
  const statusCode = inferAnimalHospitalStatusCode(
    input.operationStatusText ?? input.licenseStatusText ?? null,
  );
  const lifecycle = buildAnimalHospitalLifecycle({
    statusCode,
    hasSourceConflict:
      normalizedCoordinates.normalizationStatus === 'conversion-required',
  });
  const sourceRecord = {
    sourceId: provenance.sourceId,
    sourceKey: provenance.sourceKey,
    officialSourceKey: provenance.officialSourceKey,
    provider: input.provider,
    sourceKind: 'official-registry' as const,
    providerRecordId: input.providerRecordId,
    name: normalizeWhitespace(input.name),
    normalizedName: normalizeAnimalHospitalName(input.name),
    lotAddress: normalizeWhitespace(input.lotAddress),
    roadAddress: normalizeWhitespace(input.roadAddress),
    normalizedPrimaryAddress: normalizeAnimalHospitalAddress(primaryAddress),
    licenseStatusText: normalizeWhitespace(input.licenseStatusText),
    operationStatusText: normalizeWhitespace(input.operationStatusText),
    officialPhone: normalizeWhitespace(input.officialPhone),
    normalizedPhone: normalizeAnimalHospitalPhone(input.officialPhone),
    rawCoordinates: {
      latitude: parseNullableNumber(input.coordinates.latitude),
      longitude: parseNullableNumber(input.coordinates.longitude),
      x5174: parseNullableNumber(input.coordinates.x5174),
      y5174: parseNullableNumber(input.coordinates.y5174),
      crs: input.coordinates.crs,
    },
    normalizedCoordinates,
    sourceUpdatedAt: input.sourceUpdatedAt,
    ingestedAt,
    snapshotId: input.snapshotId ?? null,
    snapshotFetchedAt: input.snapshotFetchedAt ?? input.ingestedAt ?? null,
    ingestMode: input.ingestMode ?? 'snapshot',
    rowChecksum: input.rowChecksum ?? null,
    metadata: input.metadata ?? null,
    canonicalHospitalId: null,
    rawPayload: input.rawPayload ?? null,
  };
  const canonicalId = buildAnimalHospitalCanonicalId({
    provider: input.provider,
    providerRecordId: input.providerRecordId,
  });
  const canonicalUpdatedAt = new Date().toISOString();
  const trustFreshness = resolveAnimalHospitalFreshness({
    sourceUpdatedAt: input.sourceUpdatedAt,
    staleAfterDays: 7,
  });

  const canonicalHospital: AnimalHospitalCanonicalHospital = {
    id: canonicalId,
    domain: 'animalHospital',
    canonicalName: normalizeWhitespace(input.name) ?? input.name,
    normalizedName: normalizeAnimalHospitalName(input.name) ?? input.name,
    address: {
      primary: primaryAddress,
      roadAddress: normalizeWhitespace(input.roadAddress),
      lotAddress: normalizeWhitespace(input.lotAddress),
      normalizedPrimary: normalizeAnimalHospitalAddress(primaryAddress),
    },
    coordinates: normalizedCoordinates,
    primarySource: {
      sourceId: provenance.sourceId,
      sourceKey: provenance.sourceKey,
      officialSourceKey: provenance.officialSourceKey,
      provider: input.provider,
      providerRecordId: input.providerRecordId,
    },
    status: {
      code: statusCode,
      summary:
        normalizeWhitespace(input.operationStatusText) ??
        normalizeWhitespace(input.licenseStatusText) ??
        '인허가 상태 확인 필요',
      licenseStatusText: normalizeWhitespace(input.licenseStatusText),
      operationStatusText: normalizeWhitespace(input.operationStatusText),
      sourceId: provenance.sourceId,
    },
    contact: {
      publicPhone: normalizeWhitespace(input.officialPhone)
        ? {
            value: normalizeWhitespace(input.officialPhone)!,
            verificationStatus: 'official',
            sourceId: provenance.sourceId,
            verifiedAt: input.sourceUpdatedAt,
          }
        : null,
      candidatePhones: [],
    },
    links: {
      providerPlaceUrl: null,
      providerPlaceId: null,
      externalMapLabel: normalizeWhitespace(input.name) ?? input.name,
    },
    trust: {
      publicStatus:
        normalizeWhitespace(input.officialPhone) && trustFreshness === 'fresh'
          ? 'needs_verification'
          : 'candidate',
      freshness: trustFreshness,
      requiresVerification: true,
      hasSourceConflict:
        normalizedCoordinates.normalizationStatus === 'conversion-required',
      sourceUpdatedAt: input.sourceUpdatedAt,
      canonicalUpdatedAt,
      reviewedAt: null,
    },
    lifecycle,
    searchTokens: buildAnimalHospitalSearchTokens({
      name: input.name,
      address: primaryAddress,
      phone: input.officialPhone ?? null,
    }),
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

  return {
    canonicalId,
    officialSourceKey:
      provenance.officialSourceKey ??
      buildAnimalHospitalOfficialSourceKey({
        provider: input.provider,
        providerRecordId: input.providerRecordId,
      }),
    sourceKey: provenance.sourceKey,
    rowChecksum: input.rowChecksum ?? null,
    canonicalHospital,
    sourceRecord,
    sourceUpdatedAt: input.sourceUpdatedAt,
    canonicalUpdatedAt,
  };
}
