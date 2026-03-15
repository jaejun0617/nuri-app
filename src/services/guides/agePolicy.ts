import { safeYmd } from '../../utils/date';
import type { GuideAgePolicy, GuideLifeStage } from './types';

const SENIOR_MONTHS = 84;
const ADULT_MONTHS = 12;

function parseBirthDateToUtcDate(birthDate: string | null | undefined): Date | null {
  const normalized = safeYmd(birthDate);
  if (!normalized) return null;

  const [year, month, day] = normalized.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  return Number.isNaN(next.getTime()) ? null : next;
}

export function getAgeInMonthsFromBirthDate(
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

export function resolveLifeStage(
  ageInMonths: number | null,
): GuideLifeStage | null {
  if (ageInMonths === null) return null;
  if (ageInMonths < ADULT_MONTHS) return 'baby';
  if (ageInMonths >= SENIOR_MONTHS) return 'senior';
  return 'adult';
}

export function matchesGuideAgePolicy(
  agePolicy: GuideAgePolicy,
  ageInMonths: number | null,
): boolean {
  if (agePolicy.type === 'all') return true;
  if (ageInMonths === null) return false;

  if (agePolicy.type === 'lifeStage') {
    return resolveLifeStage(ageInMonths) === agePolicy.lifeStage;
  }

  const minMonths = agePolicy.minMonths ?? Number.NEGATIVE_INFINITY;
  const maxMonths = agePolicy.maxMonths ?? Number.POSITIVE_INFINITY;
  return ageInMonths >= minMonths && ageInMonths <= maxMonths;
}

