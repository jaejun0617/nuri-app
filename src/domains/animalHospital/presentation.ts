import type { AnimalHospitalPublicHospital } from './types';

export type AnimalHospitalTrustTone = 'calm' | 'caution' | 'neutral';
export type AnimalHospitalListMode = 'nearby' | 'open24' | 'exotic';

export type AnimalHospitalCardViewModel = {
  title: string;
  trustLabel: string;
  trustTone: AnimalHospitalTrustTone;
  distanceLabel: string;
  statusSummary: string;
  phoneLabel: string;
  hasCallAction: boolean;
  hasDirectionsAction: boolean;
};

export type AnimalHospitalDetailViewModel = {
  title: string;
  trustLabel: string;
  trustTone: AnimalHospitalTrustTone;
  statusSummary: string;
  distanceLabel: string;
  address: string;
  phoneLabel: string;
  trustDescription: string;
  trustGuidance: string;
  basisDateLabel: string | null;
  hasCallAction: boolean;
  hasDirectionsAction: boolean;
  hasProviderLink: boolean;
};

function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('82') && digits.length >= 10) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

export function formatAnimalHospitalPhoneLabel(
  phone: string | null,
): string | null {
  if (!phone) {
    return null;
  }

  const trimmed = phone.trim();
  const digits = normalizePhoneDigits(trimmed);

  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  if (digits.startsWith('02')) {
    if (digits.length === 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }

    if (digits.length === 10) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  return trimmed || null;
}

function sortByNearbyAndName(
  left: AnimalHospitalPublicHospital,
  right: AnimalHospitalPublicHospital,
): number {
  if (left.distanceMeters === null && right.distanceMeters === null) {
    return 0;
  }

  const leftDistance = left.distanceMeters ?? Number.MAX_SAFE_INTEGER;
  const rightDistance = right.distanceMeters ?? Number.MAX_SAFE_INTEGER;

  if (leftDistance !== rightDistance) {
    return leftDistance - rightDistance;
  }

  return left.name.localeCompare(right.name, 'ko');
}

export function selectAnimalHospitalListItems(
  items: ReadonlyArray<AnimalHospitalPublicHospital>,
  _mode: AnimalHospitalListMode,
): AnimalHospitalPublicHospital[] {
  return [...items].sort(sortByNearbyAndName);
}

function resolveTrustTone(
  publicLabel: AnimalHospitalPublicHospital['publicTrust']['publicLabel'],
): AnimalHospitalTrustTone {
  if (publicLabel === 'trust_reviewed') {
    return 'calm';
  }

  if (publicLabel === 'needs_verification') {
    return 'caution';
  }

  return 'neutral';
}

function buildPublicLocationDisclosureLabel(
  item: AnimalHospitalPublicHospital,
): string {
  if (item.links.externalMapUrl || item.links.providerPlaceUrl) {
    return '정확한 주소는 길찾기에서 확인해 주세요.';
  }

  return '정확한 위치 정보는 확인 중이에요.';
}

export function buildAnimalHospitalCardViewModel(
  item: AnimalHospitalPublicHospital,
): AnimalHospitalCardViewModel {
  return {
    title: item.name,
    trustLabel: item.publicTrust.label,
    trustTone: resolveTrustTone(item.publicTrust.publicLabel),
    distanceLabel: item.distanceLabel,
    statusSummary: item.statusSummary,
    phoneLabel:
      formatAnimalHospitalPhoneLabel(item.officialPhone) ?? '전화번호 확인 중',
    hasCallAction: Boolean(item.links.callUri),
    hasDirectionsAction: Boolean(item.links.externalMapUrl),
  };
}

export function buildAnimalHospitalDetailViewModel(
  item: AnimalHospitalPublicHospital,
): AnimalHospitalDetailViewModel {
  return {
    title: item.name,
    trustLabel: item.publicTrust.label,
    trustTone: resolveTrustTone(item.publicTrust.publicLabel),
    statusSummary: item.statusSummary,
    distanceLabel: item.distanceLabel,
    address: buildPublicLocationDisclosureLabel(item),
    phoneLabel:
      formatAnimalHospitalPhoneLabel(item.officialPhone) ?? '전화번호 확인 중',
    trustDescription: item.publicTrust.description,
    trustGuidance: item.publicTrust.guidance,
    basisDateLabel: item.publicTrust.basisDateLabel,
    hasCallAction: Boolean(item.links.callUri),
    hasDirectionsAction: Boolean(item.links.externalMapUrl),
    hasProviderLink: Boolean(item.links.providerPlaceUrl),
  };
}
