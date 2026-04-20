import type {
  AnimalHospitalCanonicalHospital,
  AnimalHospitalVerificationRecord,
} from './types';
import {
  normalizeAnimalHospitalPhone,
  normalizeWhitespace,
} from '../../services/animalHospital/normalization';
import { isValidWgs84Coordinate } from '../../services/animalHospital/coordinates';

const PUBLIC_VERIFICATION_FIELDS = new Set([
  'phone',
  'coordinates',
  'thumbnail',
]);

export function isPublicAnimalHospitalVerification(
  verification: AnimalHospitalVerificationRecord,
  now = Date.now(),
): boolean {
  if (!PUBLIC_VERIFICATION_FIELDS.has(verification.fieldKey)) {
    return false;
  }

  if (verification.status !== 'approved') {
    return false;
  }

  if (!verification.expiresAt) {
    return true;
  }

  const expiresAt = Date.parse(verification.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

export function applyAnimalHospitalApprovedVerifications(params: {
  canonical: AnimalHospitalCanonicalHospital;
  verifications: ReadonlyArray<AnimalHospitalVerificationRecord>;
  now?: number;
}): AnimalHospitalCanonicalHospital {
  const { canonical, now = Date.now() } = params;
  const verifications = params.verifications
    .filter(verification =>
      isPublicAnimalHospitalVerification(verification, now),
    )
    .sort(compareVerificationRecency);

  if (verifications.length === 0) {
    return canonical;
  }

  return verifications.reduce(applyPublicVerification, canonical);
}

function applyPublicVerification(
  canonical: AnimalHospitalCanonicalHospital,
  verification: AnimalHospitalVerificationRecord,
): AnimalHospitalCanonicalHospital {
  if (verification.fieldKey === 'phone') {
    return applyPhoneVerification(canonical, verification);
  }

  if (verification.fieldKey === 'coordinates') {
    return applyCoordinateVerification(canonical, verification);
  }

  if (verification.fieldKey === 'thumbnail') {
    return applyThumbnailVerification(canonical, verification);
  }

  return canonical;
}

function applyPhoneVerification(
  canonical: AnimalHospitalCanonicalHospital,
  verification: AnimalHospitalVerificationRecord,
): AnimalHospitalCanonicalHospital {
  const phone = readStringValue(verification.verifiedValue.phone);
  if (!phone) {
    return canonical;
  }

  return {
    ...canonical,
    contact: {
      ...canonical.contact,
      publicPhone: {
        value: phone,
        verificationStatus: 'reviewed',
        sourceId: `verification:${verification.id}`,
        verifiedAt: verification.reviewedAt ?? verification.updatedAt,
      },
    },
    trust: {
      ...canonical.trust,
      reviewedAt: verification.reviewedAt ?? canonical.trust.reviewedAt,
    },
    searchTokens: {
      ...canonical.searchTokens,
      normalizedPhone:
        normalizeAnimalHospitalPhone(phone) ??
        canonical.searchTokens.normalizedPhone,
    },
  };
}

function applyCoordinateVerification(
  canonical: AnimalHospitalCanonicalHospital,
  verification: AnimalHospitalVerificationRecord,
): AnimalHospitalCanonicalHospital {
  const latitude = readNumberValue(verification.verifiedValue.latitude);
  const longitude = readNumberValue(verification.verifiedValue.longitude);
  const coordinates =
    latitude !== null && longitude !== null ? { latitude, longitude } : null;

  if (!isValidWgs84Coordinate(coordinates)) {
    return canonical;
  }

  return {
    ...canonical,
    coordinates: {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      source: 'reviewed',
      normalizationStatus: 'exact',
    },
    trust: {
      ...canonical.trust,
      hasSourceConflict: false,
      reviewedAt: verification.reviewedAt ?? canonical.trust.reviewedAt,
    },
    lifecycle: {
      ...canonical.lifecycle,
      conflictStatus:
        canonical.lifecycle.conflictStatus === 'unresolved'
          ? 'none'
          : canonical.lifecycle.conflictStatus,
    },
  };
}

function applyThumbnailVerification(
  canonical: AnimalHospitalCanonicalHospital,
  verification: AnimalHospitalVerificationRecord,
): AnimalHospitalCanonicalHospital {
  const thumbnailUrl =
    readHttpUrlValue(verification.verifiedValue.thumbnailUrl) ??
    readHttpUrlValue(verification.verifiedValue.url);
  if (!thumbnailUrl) {
    return canonical;
  }

  return {
    ...canonical,
    media: {
      thumbnailUrl,
      sourceId: `verification:${verification.id}`,
      verifiedAt: verification.reviewedAt ?? verification.updatedAt,
    },
    trust: {
      ...canonical.trust,
      reviewedAt: verification.reviewedAt ?? canonical.trust.reviewedAt,
    },
  };
}

function compareVerificationRecency(
  left: AnimalHospitalVerificationRecord,
  right: AnimalHospitalVerificationRecord,
): number {
  return getVerificationTime(right) - getVerificationTime(left);
}

function getVerificationTime(
  verification: AnimalHospitalVerificationRecord,
): number {
  const reviewedAt = Date.parse(verification.reviewedAt ?? '');
  if (Number.isFinite(reviewedAt)) {
    return reviewedAt;
  }

  const updatedAt = Date.parse(verification.updatedAt);
  return Number.isFinite(updatedAt) ? updatedAt : 0;
}

function readNumberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readStringValue(value: unknown): string | null {
  return typeof value === 'string' ? normalizeWhitespace(value) : null;
}

function readHttpUrlValue(value: unknown): string | null {
  const normalized = readStringValue(value);
  return normalized && /^https?:\/\//i.test(normalized) ? normalized : null;
}
