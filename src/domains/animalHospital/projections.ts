import { buildExternalMapUrl } from '../../services/locationDiscovery/maps';
import { formatDistanceLabel } from '../../services/locationDiscovery/service';
import {
  ANIMAL_HOSPITAL_BOOLEAN_SIGNAL_STALE_DAYS,
  ANIMAL_HOSPITAL_HIDDEN_PUBLIC_FIELDS,
  ANIMAL_HOSPITAL_OPERATING_HOURS_STALE_DAYS,
} from './constants';
import {
  buildAnimalHospitalStatusSummary,
  buildAnimalHospitalTrustInfo,
  canExposeAnimalHospitalPhone,
  hasAnimalHospitalPublicCoordinates,
  hasUsableAnimalHospitalCoordinates,
  getAnimalHospitalDistanceMeters,
  resolveAnimalHospitalPublicPhone,
  sanitizeAnimalHospitalDialUri,
} from './trust';
import type {
  AnimalHospitalCanonicalHospital,
  AnimalHospitalInternalHospital,
  AnimalHospitalOperatingBadge,
  AnimalHospitalPublicHospital,
  AnimalHospitalSensitiveFieldVisibility,
} from './types';

function getWithheldFields(
  canonical: AnimalHospitalCanonicalHospital,
): ReadonlyArray<keyof AnimalHospitalCanonicalHospital['sensitiveDetails']> {
  return ANIMAL_HOSPITAL_HIDDEN_PUBLIC_FIELDS.filter(field => {
    const detail = canonical.sensitiveDetails[field];
    return detail.visibility !== 'visible';
  });
}

function resolveSensitiveVisibility(
  visibility: AnimalHospitalSensitiveFieldVisibility,
  verifiedAt: string | null,
  staleAfterDays: number,
): AnimalHospitalSensitiveFieldVisibility {
  if (visibility !== 'visible') {
    return visibility;
  }

  if (!verifiedAt) {
    return 'requires_verification';
  }

  const threshold = staleAfterDays * 24 * 60 * 60 * 1000;
  return Date.now() - Date.parse(verifiedAt) > threshold
    ? 'requires_verification'
    : 'visible';
}

function resolveApprovedOperatingBadge(
  canonical: AnimalHospitalCanonicalHospital,
): AnimalHospitalOperatingBadge | null {
  const open24 = canonical.sensitiveDetails.open24Hours;
  if (open24.value === true && open24.visibility === 'visible') {
    return {
      expiresAt: null,
      kind: 'open24',
      label: '24시간 진료',
      source: 'nuri-approved',
    };
  }

  return null;
}

export function projectAnimalHospitalPublic(params: {
  canonical: AnimalHospitalCanonicalHospital;
  anchorCoordinates: {
    latitude: number;
    longitude: number;
  } | null;
}): AnimalHospitalPublicHospital {
  const { canonical, anchorCoordinates } = params;
  const hasPublicCoordinates = hasAnimalHospitalPublicCoordinates(canonical);
  const latitude = hasPublicCoordinates
    ? canonical.coordinates.latitude
    : null;
  const longitude = hasPublicCoordinates
    ? canonical.coordinates.longitude
    : null;
  const distanceMeters = getAnimalHospitalDistanceMeters({
    coordinates: anchorCoordinates,
    latitude,
    longitude,
  });
  const publicPhone = canExposeAnimalHospitalPhone(canonical)
    ? resolveAnimalHospitalPublicPhone(canonical)
    : null;

  return {
    id: canonical.id,
    name: canonical.canonicalName,
    address: canonical.address.primary,
    roadAddress: canonical.address.roadAddress,
    latitude,
    longitude,
    distanceMeters,
    distanceLabel: formatDistanceLabel(distanceMeters),
    statusSummary: buildAnimalHospitalStatusSummary(canonical),
    operatingBadge: resolveApprovedOperatingBadge(canonical),
    officialPhone: publicPhone,
    thumbnailUrl: canonical.media.thumbnailUrl,
    publicTrust: buildAnimalHospitalTrustInfo(canonical),
    links: {
      externalMapUrl:
        latitude !== null && longitude !== null
          ? buildExternalMapUrl({
              latitude,
              longitude,
              label: canonical.links.externalMapLabel,
            })
          : null,
      providerPlaceUrl: canonical.links.providerPlaceUrl,
      callUri: sanitizeAnimalHospitalDialUri(publicPhone),
    },
  };
}

export function projectAnimalHospitalInternal(params: {
  canonical: AnimalHospitalCanonicalHospital;
  anchorCoordinates: {
    latitude: number;
    longitude: number;
  } | null;
}): AnimalHospitalInternalHospital {
  const { canonical, anchorCoordinates } = params;
  const hasCoordinates = hasUsableAnimalHospitalCoordinates(
    canonical.coordinates.latitude,
    canonical.coordinates.longitude,
  );
  const distanceMeters = getAnimalHospitalDistanceMeters({
    coordinates: anchorCoordinates,
    latitude: hasCoordinates ? canonical.coordinates.latitude : null,
    longitude: hasCoordinates ? canonical.coordinates.longitude : null,
  });

  const normalizedSensitiveDetails = {
    ...canonical.sensitiveDetails,
    operatingHours: {
      ...canonical.sensitiveDetails.operatingHours,
      visibility: resolveSensitiveVisibility(
        canonical.sensitiveDetails.operatingHours.visibility,
        canonical.sensitiveDetails.operatingHours.verifiedAt,
        ANIMAL_HOSPITAL_OPERATING_HOURS_STALE_DAYS,
      ),
    },
    open24Hours: {
      ...canonical.sensitiveDetails.open24Hours,
      visibility: resolveSensitiveVisibility(
        canonical.sensitiveDetails.open24Hours.visibility,
        canonical.sensitiveDetails.open24Hours.verifiedAt,
        ANIMAL_HOSPITAL_BOOLEAN_SIGNAL_STALE_DAYS,
      ),
    },
    nightService: {
      ...canonical.sensitiveDetails.nightService,
      visibility: resolveSensitiveVisibility(
        canonical.sensitiveDetails.nightService.visibility,
        canonical.sensitiveDetails.nightService.verifiedAt,
        ANIMAL_HOSPITAL_BOOLEAN_SIGNAL_STALE_DAYS,
      ),
    },
    weekendService: {
      ...canonical.sensitiveDetails.weekendService,
      visibility: resolveSensitiveVisibility(
        canonical.sensitiveDetails.weekendService.visibility,
        canonical.sensitiveDetails.weekendService.verifiedAt,
        ANIMAL_HOSPITAL_BOOLEAN_SIGNAL_STALE_DAYS,
      ),
    },
    exoticAnimalCare: {
      ...canonical.sensitiveDetails.exoticAnimalCare,
      visibility: resolveSensitiveVisibility(
        canonical.sensitiveDetails.exoticAnimalCare.visibility,
        canonical.sensitiveDetails.exoticAnimalCare.verifiedAt,
        ANIMAL_HOSPITAL_BOOLEAN_SIGNAL_STALE_DAYS,
      ),
    },
  };

  return {
    id: canonical.id,
    canonicalName: canonical.canonicalName,
    address: canonical.address,
    coordinates: canonical.coordinates,
    distanceMeters,
    primarySource: canonical.primarySource,
    status: canonical.status,
    trust: canonical.trust,
    lifecycle: canonical.lifecycle,
    contact: canonical.contact,
    links: canonical.links,
    sensitiveDetails: normalizedSensitiveDetails,
    sourceProvenance: canonical.sourceProvenance,
    withheldFields: getWithheldFields(canonical),
  };
}
