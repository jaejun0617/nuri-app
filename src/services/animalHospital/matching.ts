import type {
  AnimalHospitalCandidateMatch,
  AnimalHospitalCanonicalHospital,
} from '../../domains/animalHospital/types';
import { getAnimalHospitalDistanceMeters } from '../../domains/animalHospital/trust';
import {
  normalizeAnimalHospitalAddress,
  normalizeAnimalHospitalMatchName,
  normalizeAnimalHospitalPhone,
} from './normalization';

const MATCH_COORDINATE_THRESHOLD_METERS = 30;

function isExactNameMatch(
  left: AnimalHospitalCanonicalHospital,
  right: AnimalHospitalCanonicalHospital,
): boolean {
  return left.searchTokens.normalizedName === right.searchTokens.normalizedName;
}

function isHighNameMatch(
  left: AnimalHospitalCanonicalHospital,
  right: AnimalHospitalCanonicalHospital,
): boolean {
  const leftKey = normalizeAnimalHospitalMatchName(left.canonicalName);
  const rightKey = normalizeAnimalHospitalMatchName(right.canonicalName);

  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

function getNormalizedAddress(
  hospital: AnimalHospitalCanonicalHospital,
): string | null {
  return (
    hospital.searchTokens.normalizedAddress ??
    normalizeAnimalHospitalAddress(hospital.address.primary)
  );
}

function getNormalizedPhone(
  hospital: AnimalHospitalCanonicalHospital,
): string | null {
  return (
    hospital.searchTokens.normalizedPhone ??
    normalizeAnimalHospitalPhone(hospital.contact.publicPhone?.value ?? null) ??
    normalizeAnimalHospitalPhone(hospital.contact.candidatePhones[0]?.value ?? null)
  );
}

export function matchAnimalHospitalCandidate(params: {
  canonical: AnimalHospitalCanonicalHospital;
  candidate: AnimalHospitalCanonicalHospital;
}): AnimalHospitalCandidateMatch | null {
  const { canonical, candidate } = params;

  if (
    canonical.primarySource.officialSourceKey &&
    candidate.primarySource.officialSourceKey &&
    canonical.primarySource.officialSourceKey ===
      candidate.primarySource.officialSourceKey
  ) {
    return {
      canonicalId: canonical.id,
      candidateId: candidate.id,
      rule: 'official-source-key',
      score: 1,
    };
  }

  const exactNameMatch = isExactNameMatch(canonical, candidate);
  const highNameMatch = exactNameMatch || isHighNameMatch(canonical, candidate);

  if (!highNameMatch) {
    return null;
  }

  const canonicalAddress = getNormalizedAddress(canonical);
  const candidateAddress = getNormalizedAddress(candidate);
  if (exactNameMatch && canonicalAddress && candidateAddress) {
    if (canonicalAddress === candidateAddress) {
      return {
        canonicalId: canonical.id,
        candidateId: candidate.id,
        rule: 'name-address-exact',
        score: 0.98,
      };
    }
  }

  const canonicalPhone = getNormalizedPhone(canonical);
  const candidatePhone = getNormalizedPhone(candidate);
  if (exactNameMatch && canonicalPhone && candidatePhone) {
    if (canonicalPhone === candidatePhone) {
      return {
        canonicalId: canonical.id,
        candidateId: candidate.id,
        rule: 'name-phone-exact',
        score: 0.97,
      };
    }
  }

  const coordinateDistance = getAnimalHospitalDistanceMeters({
    coordinates:
      canonical.coordinates.latitude !== null &&
      canonical.coordinates.longitude !== null
        ? {
            latitude: canonical.coordinates.latitude,
            longitude: canonical.coordinates.longitude,
          }
        : null,
    latitude: candidate.coordinates.latitude,
    longitude: candidate.coordinates.longitude,
  });

  if (
    highNameMatch &&
    coordinateDistance !== null &&
    coordinateDistance <= MATCH_COORDINATE_THRESHOLD_METERS
  ) {
    return {
      canonicalId: canonical.id,
      candidateId: candidate.id,
      rule: 'name-coordinate-near',
      score: 0.92,
    };
  }

  return null;
}

export function linkAnimalHospitalRuntimeCandidates(params: {
  canonicals: ReadonlyArray<AnimalHospitalCanonicalHospital>;
  candidates: ReadonlyArray<AnimalHospitalCanonicalHospital>;
}): {
  linkedCanonicals: AnimalHospitalCanonicalHospital[];
  providerOnlyCandidates: AnimalHospitalCanonicalHospital[];
  matches: AnimalHospitalCandidateMatch[];
} {
  const canonicalById = new Map(
    params.canonicals.map(canonical => [canonical.id, canonical]),
  );
  const matches: AnimalHospitalCandidateMatch[] = [];
  const consumedCandidateIds = new Set<string>();

  params.candidates.forEach(candidate => {
    const candidateMatches = params.canonicals
      .map(canonical => matchAnimalHospitalCandidate({ canonical, candidate }))
      .filter((match): match is AnimalHospitalCandidateMatch => Boolean(match))
      .sort((left, right) => right.score - left.score);

    if (candidateMatches.length !== 1) {
      return;
    }

    const match = candidateMatches[0]!;
    const canonical = canonicalById.get(match.canonicalId);
    if (!canonical) {
      return;
    }

    consumedCandidateIds.add(candidate.id);
    matches.push(match);
    canonicalById.set(canonical.id, {
      ...canonical,
      coordinates:
        canonical.coordinates.latitude !== null &&
        canonical.coordinates.longitude !== null
          ? canonical.coordinates
          : candidate.coordinates,
      contact:
        canonical.contact.publicPhone || !candidate.contact.candidatePhones.length
          ? canonical.contact
          : {
              ...canonical.contact,
              candidatePhones: candidate.contact.candidatePhones,
            },
      links: {
        providerPlaceId:
          canonical.links.providerPlaceId ?? candidate.links.providerPlaceId,
        providerPlaceUrl:
          canonical.links.providerPlaceUrl ?? candidate.links.providerPlaceUrl,
        externalMapLabel: canonical.links.externalMapLabel,
      },
      sourceProvenance: [
        ...canonical.sourceProvenance,
        ...candidate.sourceProvenance.filter(
          provenance =>
            !canonical.sourceProvenance.some(
              existing => existing.sourceId === provenance.sourceId,
            ),
        ),
      ],
    });
  });

  return {
    linkedCanonicals: [...canonicalById.values()],
    providerOnlyCandidates: params.candidates.filter(
      candidate => !consumedCandidateIds.has(candidate.id),
    ),
    matches,
  };
}
