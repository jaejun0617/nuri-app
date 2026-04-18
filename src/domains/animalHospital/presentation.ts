import type { AnimalHospitalPublicHospital } from './types';

export type AnimalHospitalTrustTone = 'calm' | 'caution' | 'neutral';

export type AnimalHospitalCardViewModel = {
  title: string;
  trustLabel: string;
  trustTone: AnimalHospitalTrustTone;
  distanceLabel: string;
  address: string;
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

function resolveTrustTone(publicLabel: AnimalHospitalPublicHospital['publicTrust']['publicLabel']): AnimalHospitalTrustTone {
  if (publicLabel === 'trust_reviewed') {
    return 'calm';
  }

  if (publicLabel === 'needs_verification') {
    return 'caution';
  }

  return 'neutral';
}

export function buildAnimalHospitalCardViewModel(
  item: AnimalHospitalPublicHospital,
): AnimalHospitalCardViewModel {
  return {
    title: item.name,
    trustLabel: item.publicTrust.label,
    trustTone: resolveTrustTone(item.publicTrust.publicLabel),
    distanceLabel: item.distanceLabel,
    address: item.address,
    statusSummary: item.statusSummary,
    phoneLabel: item.officialPhone ?? '공식 전화 확인 중',
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
    address: item.address,
    phoneLabel: item.officialPhone ?? '공식 전화 확인 중',
    trustDescription: item.publicTrust.description,
    trustGuidance: item.publicTrust.guidance,
    basisDateLabel: item.publicTrust.basisDateLabel,
    hasCallAction: Boolean(item.links.callUri),
    hasDirectionsAction: Boolean(item.links.externalMapUrl),
    hasProviderLink: Boolean(item.links.providerPlaceUrl),
  };
}
