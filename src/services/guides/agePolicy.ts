import { getPetAgeInMonthsFromBirthDate } from '../pets/age';
import type { GuideAgePolicy, GuideLifeStage } from './types';

const SENIOR_MONTHS = 84;
const ADULT_MONTHS = 12;

export function getAgeInMonthsFromBirthDate(
  birthDate: string | null | undefined,
  now = new Date(),
): number | null {
  return getPetAgeInMonthsFromBirthDate(birthDate, now);
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
