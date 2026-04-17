import {
  buildTrustBasisDateLabel,
  getPublicTrustLabelText,
  type PublicTrustInfo,
} from '../../services/trust/publicTrust';
import {
  ANIMAL_HOSPITAL_ADDRESS_STALE_DAYS,
  ANIMAL_HOSPITAL_COORDINATES_STALE_DAYS,
  ANIMAL_HOSPITAL_PUBLIC_PHONE_STALE_DAYS,
  ANIMAL_HOSPITAL_STATUS_STALE_DAYS,
} from './constants';
import type {
  AnimalHospitalCanonicalHospital,
  AnimalHospitalCoordinateNormalizationStatus,
  AnimalHospitalFreshnessStatus,
  AnimalHospitalPhoneVerificationStatus,
  AnimalHospitalSensitiveFieldVisibility,
} from './types';

function isParsableDate(value: string | null | undefined): boolean {
  return Boolean(value) && Number.isFinite(Date.parse(value ?? ''));
}

function isDateStale(
  value: string | null | undefined,
  staleAfterDays: number,
  now = Date.now(),
): boolean {
  if (!isParsableDate(value)) {
    return false;
  }

  return now - Date.parse(value!) > staleAfterDays * 24 * 60 * 60 * 1000;
}

export function resolveAnimalHospitalFreshness(params: {
  sourceUpdatedAt: string | null;
  staleAfterDays: number;
  now?: number;
}): AnimalHospitalFreshnessStatus {
  const { sourceUpdatedAt, staleAfterDays, now = Date.now() } = params;
  if (!isParsableDate(sourceUpdatedAt)) {
    return 'unknown';
  }

  return isDateStale(sourceUpdatedAt, staleAfterDays, now) ? 'stale' : 'fresh';
}

export function buildAnimalHospitalTrustInfo(
  canonical: AnimalHospitalCanonicalHospital,
): PublicTrustInfo {
  const status = canonical.trust.publicStatus;
  const sourceLabel = canonical.sourceProvenance[0]?.provider ?? 'source-unknown';
  const sourceUpdatedAt = canonical.trust.sourceUpdatedAt;
  const hasConflict = canonical.trust.hasSourceConflict;
  const isStale = canonical.trust.freshness === 'stale';

  const shortReason =
    status === 'trust_reviewed'
      ? '최근 검수 또는 공식 근거가 있어 공개 가능한 병원 정보예요.'
      : status === 'needs_verification'
        ? '기본 정보는 있지만 최신 확인이 더 필요해요.'
        : '주변 병원 후보이며 방문 전 다시 확인이 필요해요.';

  const description =
    status === 'trust_reviewed'
      ? '공식 또는 최근 검수 기준으로 이름, 주소, 상태, 전화 정보를 공개해요.'
      : status === 'needs_verification'
        ? '공개 가능한 기본 정보만 보여주고, 민감한 운영 정보는 숨겨 둬요.'
        : '외부 검색 후보를 안전한 public subset으로만 보여줘요.';

  const guidance =
    status === 'candidate'
      ? '운영시간, 24시간, 특수동물, 응급 여부는 전화 또는 현장 확인이 필요해요.'
      : '민감한 운영 정보는 아직 public에 열지 않았어요.';

  return {
    publicLabel: status,
    label: getPublicTrustLabelText(status),
    shortReason,
    description,
    guidance,
    tone:
      status === 'trust_reviewed'
        ? 'positive'
        : status === 'needs_verification'
          ? 'caution'
          : 'neutral',
    sourceLabel,
    basisDate: sourceUpdatedAt,
    basisDateLabel: buildTrustBasisDateLabel(sourceUpdatedAt, '기준일'),
    isStale,
    hasConflict,
    layers: status === 'candidate' ? ['candidate'] : ['trust'],
  };
}

export function canExposeAnimalHospitalPhone(
  canonical: AnimalHospitalCanonicalHospital,
): boolean {
  const phone = canonical.contact.publicPhone;
  if (!phone) {
    return false;
  }

  if (
    phone.verificationStatus !== 'official' &&
    phone.verificationStatus !== 'reviewed'
  ) {
    return false;
  }

  return !isDateStale(
    phone.verifiedAt ?? canonical.trust.sourceUpdatedAt,
    ANIMAL_HOSPITAL_PUBLIC_PHONE_STALE_DAYS,
  );
}

export function sanitizeAnimalHospitalDialUri(phone: string | null): string | null {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/[^0-9+]/g, '');
  return digits ? `tel:${digits}` : null;
}

export function resolveAnimalHospitalSensitiveVisibility(params: {
  visibility: AnimalHospitalSensitiveFieldVisibility;
  verificationStatus: AnimalHospitalPhoneVerificationStatus | 'official' | 'reviewed' | 'candidate' | 'unknown';
  verifiedAt: string | null;
  staleAfterDays: number;
}): AnimalHospitalSensitiveFieldVisibility {
  const { visibility, verificationStatus, verifiedAt, staleAfterDays } = params;

  if (visibility !== 'visible') {
    return visibility;
  }

  if (verificationStatus !== 'official' && verificationStatus !== 'reviewed') {
    return 'hidden';
  }

  if (isDateStale(verifiedAt, staleAfterDays)) {
    return 'requires_verification';
  }

  return 'visible';
}

export function buildAnimalHospitalStatusSummary(
  canonical: AnimalHospitalCanonicalHospital,
): string {
  const freshness = resolveAnimalHospitalFreshness({
    sourceUpdatedAt: canonical.trust.sourceUpdatedAt,
    staleAfterDays: ANIMAL_HOSPITAL_STATUS_STALE_DAYS,
  });

  if (canonical.status.code === 'closed') {
    return freshness === 'stale'
      ? '운영상태 정보가 오래돼 재확인이 필요해요.'
      : '휴업 또는 폐업 가능성이 있어 먼저 확인이 필요해요.';
  }

  if (canonical.status.code === 'suspended') {
    return '영업 상태 재확인이 필요한 병원이에요.';
  }

  if (canonical.status.code === 'operating') {
    return freshness === 'stale'
      ? '인허가 기준 운영 병원이지만 최신 상태는 다시 확인해 주세요.'
      : '인허가 기준 운영 병원으로 확인됐어요.';
  }

  return '인허가·운영상태 확인이 필요한 병원이에요.';
}

export function hasAnimalHospitalPublicCoordinates(
  canonical: AnimalHospitalCanonicalHospital,
): boolean {
  if (
    canonical.coordinates.latitude === null ||
    canonical.coordinates.longitude === null
  ) {
    return false;
  }

  return canonical.coordinates.normalizationStatus !== 'missing';
}

export function getAnimalHospitalDistanceMeters(params: {
  coordinates:
    | {
        latitude: number;
        longitude: number;
      }
    | null;
  latitude: number | null;
  longitude: number | null;
}): number | null {
  const { coordinates, latitude, longitude } = params;
  if (!coordinates || latitude === null || longitude === null) {
    return null;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDiff = toRadians(latitude - coordinates.latitude);
  const lngDiff = toRadians(longitude - coordinates.longitude);
  const originLat = toRadians(coordinates.latitude);
  const targetLat = toRadians(latitude);
  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(lngDiff / 2) ** 2;
  const distance = 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(distance);
}

export function getAnimalHospitalCoordinateFreshness(
  canonical: AnimalHospitalCanonicalHospital,
): AnimalHospitalFreshnessStatus {
  const days =
    canonical.coordinates.normalizationStatus === 'exact'
      ? ANIMAL_HOSPITAL_COORDINATES_STALE_DAYS
      : ANIMAL_HOSPITAL_ADDRESS_STALE_DAYS;

  return resolveAnimalHospitalFreshness({
    sourceUpdatedAt: canonical.trust.sourceUpdatedAt,
    staleAfterDays: days,
  });
}

export function resolveCoordinateNormalizationStatus(params: {
  latitude: number | null;
  longitude: number | null;
  fallbackLatitude: number | null;
  fallbackLongitude: number | null;
  crs: AnimalHospitalCanonicalHospital['coordinates']['source'] | 'official-wgs84' | 'epsg5174-pending' | 'unknown';
}): AnimalHospitalCoordinateNormalizationStatus {
  if (params.latitude !== null && params.longitude !== null) {
    return 'exact';
  }

  if (params.fallbackLatitude !== null && params.fallbackLongitude !== null) {
    return 'fallback';
  }

  if (params.crs === 'epsg5174-pending') {
    return 'conversion-required';
  }

  return 'missing';
}
