import { safeYmd } from '../../utils/date';

export type PetAgeSnapshot = {
  ageInMonths: number | null;
  years: number | null;
  remainingMonths: number | null;
  label: string | null;
};

function parseBirthDateToUtcDate(
  birthDate: string | null | undefined,
): Date | null {
  const normalized = safeYmd(birthDate);
  if (!normalized) return null;

  const [year, month, day] = normalized.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  return Number.isNaN(next.getTime()) ? null : next;
}

export function getPetAgeInMonthsFromBirthDate(
  birthDate: string | null | undefined,
  now = new Date(),
): number | null {
  const birth = parseBirthDateToUtcDate(birthDate);
  if (!birth) return null;

  const today = new Date(now.getTime());
  const yearDiff = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
  let months = yearDiff * 12 + monthDiff;

  if (today.getUTCDate() < birth.getUTCDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

export function formatPetAgeLabelFromMonths(
  ageInMonths: number | null | undefined,
): string | null {
  if (ageInMonths === null || ageInMonths === undefined) return null;
  if (!Number.isFinite(ageInMonths)) return null;

  const normalizedMonths = Math.max(0, Math.floor(ageInMonths));
  if (normalizedMonths < 12) {
    return `생후 ${normalizedMonths}개월`;
  }

  const years = Math.floor(normalizedMonths / 12);
  const remainingMonths = normalizedMonths % 12;

  if (remainingMonths === 0) {
    return `${years}살`;
  }

  return `${years}살 ${remainingMonths}개월`;
}

export function buildPetAgeSnapshot(
  birthDate: string | null | undefined,
  now = new Date(),
): PetAgeSnapshot {
  const ageInMonths = getPetAgeInMonthsFromBirthDate(birthDate, now);
  if (ageInMonths === null) {
    return {
      ageInMonths: null,
      years: null,
      remainingMonths: null,
      label: null,
    };
  }

  const years = Math.floor(ageInMonths / 12);
  const remainingMonths = ageInMonths % 12;

  return {
    ageInMonths,
    years,
    remainingMonths,
    label: formatPetAgeLabelFromMonths(ageInMonths),
  };
}

export function formatPetAgeLabelFromBirthDate(
  birthDate: string | null | undefined,
  now = new Date(),
): string | null {
  return buildPetAgeSnapshot(birthDate, now).label;
}
