import type {
  AnimalHospitalOfficialSourceIngestInput,
  AnimalHospitalSourceProvider,
} from '../../domains/animalHospital/types';

const GENERIC_MEDICAL_SUFFIXES = [
  '동물병원',
  '동물메디컬센터',
  '동물의료센터',
  '동물의료원',
  '동물클리닉',
  '메디컬센터',
  '의료센터',
  '클리닉',
] as const;

export function normalizeWhitespace(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim().replace(/\s+/g, ' ');
  return normalized || null;
}

export function parseNullableNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string' && normalizeWhitespace(value) === null) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeAnimalHospitalName(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return null;
  }

  return normalized.toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
}

export function normalizeAnimalHospitalMatchName(
  value: string | null | undefined,
): string | null {
  let normalized = normalizeAnimalHospitalName(value);
  if (!normalized) {
    return null;
  }

  GENERIC_MEDICAL_SUFFIXES.forEach(token => {
    normalized = normalized?.replace(token, '') ?? null;
  });

  return normalized || normalizeAnimalHospitalName(value);
}

export function normalizeAnimalHospitalAddress(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeAnimalHospitalPhone(
  value: string | null | undefined,
): string | null {
  const digits = (value ?? '').replace(/[^0-9+]/g, '');
  return digits || null;
}

export function buildAnimalHospitalSourceKey(input: {
  provider: AnimalHospitalSourceProvider;
  providerRecordId: string;
}): string {
  return `${input.provider}:${input.providerRecordId.trim().toLowerCase()}`;
}

export function buildAnimalHospitalCanonicalId(input: {
  provider: AnimalHospitalSourceProvider;
  providerRecordId: string;
}): string {
  return `animal-hospital:${buildAnimalHospitalSourceKey(input)}`;
}

export function buildAnimalHospitalOfficialSourceKey(input: {
  provider: Extract<
    AnimalHospitalOfficialSourceIngestInput['provider'],
    'official-localdata' | 'municipal-open-data'
  >;
  providerRecordId: string;
}): string {
  return buildAnimalHospitalSourceKey(input);
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
}

export function createStableChecksum(value: unknown): string {
  const normalized = JSON.stringify(sortObjectKeys(value));
  let hash = 5381;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 33 + normalized.charCodeAt(index)) % 2147483647;
  }

  return `ah_${Math.abs(hash).toString(16)}`;
}

export function escapeIlikeQuery(value: string): string {
  return value.replace(/[%_,]/g, match => `\\${match}`);
}
