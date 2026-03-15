import {
  deriveRepresentativeSpeciesKey,
  getRepresentativeSpeciesLabel,
} from '../pets/species';
import type { GuideEventContext, GuidePersonalizationContext, PetCareGuide } from './types';

type GuideAnalyticsSource = 'home-recommendation' | 'guide-list' | 'guide-search' | 'guide-detail';

export const GUIDE_RECOMMENDATION_STRATEGY_VERSION = 'guide-personalization-v3';

function getSeasonBucket(now = new Date()): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = now.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function buildGuideEventMetadata(input: {
  guide: PetCareGuide;
  source: GuideAnalyticsSource;
  context: Pick<
    GuidePersonalizationContext,
    | 'species'
    | 'speciesDetailKey'
    | 'speciesDisplayName'
    | 'deathDate'
    | 'birthDate'
    | 'now'
  >;
  searchSource?: 'rpc' | 'fallback' | null;
  searchQuery?: string | null;
  resultRank?: number | null;
}): NonNullable<GuideEventContext['metadata']> {
  const representativeSpecies = deriveRepresentativeSpeciesKey({
    species: input.context.species,
    speciesDetailKey: input.context.speciesDetailKey,
    speciesDisplayName: input.context.speciesDisplayName,
  });

  return {
    strategyVersion: GUIDE_RECOMMENDATION_STRATEGY_VERSION,
    source: input.source,
    searchSource: input.searchSource ?? null,
    resultRank: input.resultRank ?? null,
    queryLength: input.searchQuery?.trim().length ?? 0,
    guideCategory: input.guide.category,
    guideTargetSpecies: [...input.guide.targetSpecies],
    guideAgePolicyType: input.guide.agePolicy.type,
    guideAgePolicyLifeStage:
      input.guide.agePolicy.type === 'lifeStage' ? input.guide.agePolicy.lifeStage : null,
    guidePriority: input.guide.priority,
    guideSortOrder: input.guide.sortOrder,
    guideRotationWeight: input.guide.rotationWeight,
    petRepresentativeSpecies: representativeSpecies,
    petRepresentativeLabel: getRepresentativeSpeciesLabel(representativeSpecies),
    petSpeciesDisplayName: input.context.speciesDisplayName ?? null,
    isMemorialPet: Boolean(input.context.deathDate),
    hasBirthDate: Boolean(input.context.birthDate),
    seasonBucket: getSeasonBucket(input.context.now),
  };
}
