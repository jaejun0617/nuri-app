import { getAgeInMonthsFromBirthDate, matchesGuideAgePolicy } from './agePolicy';
import { getGuideSeasonalityScore } from './seasonality';
import type { GuidePersonalizationContext, PetCareGuide } from './types';
import {
  deriveCanonicalPetSpeciesKey,
  getPetSpeciesSearchKeywords,
} from '../pets/species';

function normalizeKeyword(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, ' ');
}

function buildKeywordVariants(value: string | null | undefined): string[] {
  const normalized = normalizeKeyword(value);
  if (!normalized) return [];

  const condensed = normalized.replace(/\s+/g, '');
  return condensed === normalized ? [normalized] : [normalized, condensed];
}

function buildNormalizedKeywordSet(values: ReadonlyArray<string>): Set<string> {
  const keywords = new Set<string>();

  values.forEach(value => {
    buildKeywordVariants(value).forEach(keyword => keywords.add(keyword));
  });

  return keywords;
}

function countKeywordMatches(
  guideKeywords: Set<string>,
  targetKeywords: ReadonlyArray<string>,
): number {
  let matches = 0;

  targetKeywords.forEach(keyword => {
    const variants = buildKeywordVariants(keyword);
    if (variants.some(variant => guideKeywords.has(variant))) {
      matches += 1;
    }
  });

  return matches;
}

export function getGuideSpeciesScore(
  guide: PetCareGuide,
  context: Pick<
    GuidePersonalizationContext,
    'species' | 'speciesKey' | 'speciesDetailKey' | 'speciesDisplayName'
  >,
): number {
  const canonicalSpecies = deriveCanonicalPetSpeciesKey({
    speciesKey: context.speciesKey,
    species: context.species,
    speciesDetailKey: context.speciesDetailKey,
    speciesDisplayName: context.speciesDisplayName,
  });
  const exactSpeciesMatch = guide.targetSpecies.includes(canonicalSpecies);
  const commonSpeciesMatch = guide.targetSpecies.includes('COMMON');
  const guideSpeciesKeywords = buildNormalizedKeywordSet(guide.speciesKeywords);
  const guideTagKeywords = buildNormalizedKeywordSet(guide.tags);
  const petKeywords = getPetSpeciesSearchKeywords({
    speciesKey: context.speciesKey,
    species: context.species,
    speciesDetailKey: context.speciesDetailKey,
    speciesDisplayName: context.speciesDisplayName,
  });
  const detailKeywords = [
    context.speciesDetailKey ?? '',
    context.speciesDisplayName ?? '',
  ].filter(Boolean);
  const representativeKeywords =
    canonicalSpecies !== 'DOG' && canonicalSpecies !== 'CAT'
      ? [canonicalSpecies]
      : [];

  const detailKeywordMatches = countKeywordMatches(guideSpeciesKeywords, detailKeywords);
  const representativeKeywordMatches = countKeywordMatches(
    guideSpeciesKeywords,
    representativeKeywords,
  );
  const broadKeywordMatches =
    countKeywordMatches(guideSpeciesKeywords, petKeywords) +
    countKeywordMatches(guideTagKeywords, petKeywords);

  return (
    (exactSpeciesMatch ? 320 : 0) +
    (commonSpeciesMatch ? 130 : 0) +
    detailKeywordMatches * 260 +
    representativeKeywordMatches * 220 +
    broadKeywordMatches * 45
  );
}

export function getGuidePersonalizationScore(
  guide: PetCareGuide,
  context: Pick<
    GuidePersonalizationContext,
    | 'species'
    | 'speciesKey'
    | 'speciesDetailKey'
    | 'speciesDisplayName'
    | 'birthDate'
    | 'now'
  >,
): number {
  const ageInMonths = getAgeInMonthsFromBirthDate(context.birthDate, context.now);
  const ageMatch = matchesGuideAgePolicy(guide.agePolicy, ageInMonths);
  const seasonalityScore = getGuideSeasonalityScore(guide, context.now);
  const operationalScore =
    guide.priority * 4 + guide.rotationWeight * 18 - guide.sortOrder * 1.5;

  return (
    getGuideSpeciesScore(guide, context) +
    (ageMatch ? 180 : 0) +
    seasonalityScore +
    operationalScore
  );
}
