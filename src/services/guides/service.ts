import { GUIDE_POPULAR_SEARCH_LIMIT, GUIDE_SEARCH_RESULT_LIMIT } from './config';
import { PET_CARE_GUIDES } from './data';
import { getGuidePersonalizationScore, getGuideSpeciesScore } from './personalization';
import { getGuideCategoryLabel } from './presentation';
import { pickHomeGuideRecommendations } from './rotation';
import { searchPetCareGuides } from './search';
import type {
  GuideContentStatus,
  GuidePersonalizationContext,
  GuideSearchContext,
  GuideSearchKeyword,
  GuideSearchResponse,
  PetCareGuide,
  PetCareGuideAdminUpsertInput,
} from './types';
import { isMemorialPet } from '../pets/memorial';
import {
  fetchManagedPetCareGuideCatalog,
  fetchManagedPetCareGuideDetail,
  fetchPopularPetCareGuideSearchesRpc,
  fetchPublishedPetCareGuideCatalog,
  fetchPublishedPetCareGuideDetail,
  insertPetCareGuideEvents,
  searchPublishedPetCareGuidesRpc,
  upsertManagedPetCareGuide,
} from '../supabase/guides';

export type GuideListContext = Partial<
  Pick<
    GuidePersonalizationContext,
    'species' | 'speciesDetailKey' | 'speciesDisplayName' | 'birthDate' | 'now'
  >
>;

function normalizeSearchKeyword(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function shouldUseLocalGuideSeedFallback(guides: ReadonlyArray<PetCareGuide>): boolean {
  return __DEV__ && guides.length === 0;
}

function isMeaningfulSearchKeyword(value: string): boolean {
  const normalized = normalizeSearchKeyword(value);
  return normalized.length >= 2 && normalized.length <= 32;
}

function supportsSpecies(
  guide: PetCareGuide,
  context: Pick<
    GuidePersonalizationContext,
    'species' | 'speciesDetailKey' | 'speciesDisplayName'
  >,
): boolean {
  return getGuideSpeciesScore(guide, context) > 0;
}

function normalizeGuideListContext(
  context: GuideListContext,
): Pick<
  GuidePersonalizationContext,
  'species' | 'speciesDetailKey' | 'speciesDisplayName' | 'birthDate' | 'now'
> {
  return {
    species: context.species ?? null,
    speciesDetailKey: context.speciesDetailKey ?? null,
    speciesDisplayName: context.speciesDisplayName ?? null,
    birthDate: context.birthDate ?? null,
    now: context.now,
  };
}

function rankGuideForList(
  guide: PetCareGuide,
  context: GuideListContext,
): number {
  return getGuidePersonalizationScore(guide, normalizeGuideListContext(context));
}

function sortGuidesForList(
  guides: ReadonlyArray<PetCareGuide>,
  context: GuideListContext,
): PetCareGuide[] {
  return [...guides].sort((left, right) => {
    const scoreDiff =
      rankGuideForList(right, context) - rankGuideForList(left, context);
    if (scoreDiff !== 0) return scoreDiff;

    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export async function fetchPetCareGuideCatalog(): Promise<PetCareGuide[]> {
  try {
    const guides = await fetchPublishedPetCareGuideCatalog();
    if (guides.length > 0) return guides;
    if (shouldUseLocalGuideSeedFallback(guides)) {
      return [...PET_CARE_GUIDES];
    }
    return [];
  } catch {
    return [...PET_CARE_GUIDES];
  }
}

export async function getHomePetCareGuideRecommendations(
  context: GuidePersonalizationContext,
  options?: {
    catalog?: ReadonlyArray<PetCareGuide>;
  },
): Promise<PetCareGuide[]> {
  if (isMemorialPet(context.deathDate)) {
    return [];
  }

  const catalog = options?.catalog ? [...options.catalog] : await fetchPetCareGuideCatalog();
  return pickHomeGuideRecommendations(catalog, context);
}

export function rankPetCareGuidesForList(
  guides: ReadonlyArray<PetCareGuide>,
  context: GuideListContext = {},
): PetCareGuide[] {
  const normalizedContext = normalizeGuideListContext(context);
  const preferred = guides.filter(guide => supportsSpecies(guide, normalizedContext));
  const remainder = guides.filter(guide => !preferred.includes(guide));

  return [
    ...sortGuidesForList(preferred, normalizedContext),
    ...sortGuidesForList(remainder, normalizedContext),
  ];
}

export function filterPetCareGuidesBySearch(
  guides: ReadonlyArray<PetCareGuide>,
  query: string,
): PetCareGuide[] {
  return searchPetCareGuides(guides, query);
}

function buildFallbackPopularGuideSearches(
  guides: ReadonlyArray<PetCareGuide>,
  input: {
    species: GuideSearchContext['species'];
    limit?: number;
  },
): GuideSearchKeyword[] {
  const scores = new Map<string, GuideSearchKeyword>();
  const filteredGuides = guides.filter(guide =>
    supportsSpecies(guide, {
      species: input.species ?? null,
      speciesDetailKey: null,
      speciesDisplayName: null,
    }),
  );

  filteredGuides.forEach(guide => {
    const perGuideKeywords = new Set<string>();
    const pushKeyword = (keyword: string, weight: number) => {
      const normalized = normalizeSearchKeyword(keyword);
      if (!isMeaningfulSearchKeyword(normalized)) return;
      if (perGuideKeywords.has(normalized)) return;
      perGuideKeywords.add(normalized);

      const score = weight + guide.priority * 0.8 + guide.rotationWeight * 0.2;
      const existing = scores.get(normalized);
      if (!existing) {
        scores.set(normalized, {
          keyword: normalized,
          score,
          source: 'catalog',
        });
        return;
      }

      existing.score += score;
    };

    guide.searchKeywords.forEach(keyword => pushKeyword(keyword, 8));
    guide.tags.forEach(keyword => pushKeyword(keyword, 6));
    guide.speciesKeywords.forEach(keyword => pushKeyword(keyword, 4));
    pushKeyword(getGuideCategoryLabel(guide.category), 3);
  });

  return [...scores.values()]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.keyword.length !== right.keyword.length) {
        return left.keyword.length - right.keyword.length;
      }
      return left.keyword.localeCompare(right.keyword, 'ko');
    })
    .slice(0, input.limit ?? GUIDE_POPULAR_SEARCH_LIMIT);
}

export async function searchPublishedPetCareGuides(
  input: GuideSearchContext,
  options?: {
    fallbackCatalog?: ReadonlyArray<PetCareGuide>;
  },
): Promise<GuideSearchResponse> {
  const normalizedQuery = normalizeSearchKeyword(input.query);
  const limit = input.limit ?? GUIDE_SEARCH_RESULT_LIMIT;
  const fallbackCatalog =
    options?.fallbackCatalog ?? (await fetchPetCareGuideCatalog());

  if (!normalizedQuery) {
    return {
      guides: [...fallbackCatalog],
      source: 'fallback',
    };
  }

  try {
    const guides = await searchPublishedPetCareGuidesRpc({
      query: normalizedQuery,
      species: input.species,
      ageInMonths: input.ageInMonths,
      limit,
    });
    return {
      guides,
      source: 'rpc',
    };
  } catch {
    return {
      guides: searchPetCareGuides(fallbackCatalog, normalizedQuery),
      source: 'fallback',
    };
  }
}

export async function fetchPopularPetCareGuideSearches(
  input: {
    species: GuideSearchContext['species'];
    limit?: number;
  },
  options?: {
    fallbackCatalog?: ReadonlyArray<PetCareGuide>;
  },
): Promise<GuideSearchKeyword[]> {
  const limit = input.limit ?? GUIDE_POPULAR_SEARCH_LIMIT;
  const fallbackCatalog =
    options?.fallbackCatalog ?? (await fetchPetCareGuideCatalog());

  try {
    const keywords = await fetchPopularPetCareGuideSearchesRpc({
      species: input.species,
      limit,
    });
    if (keywords.length > 0) {
      return keywords.slice(0, limit);
    }
  } catch {
    // fallback below
  }

  return buildFallbackPopularGuideSearches(fallbackCatalog, {
    species: input.species,
    limit,
  });
}

export async function fetchManagedPetCareGuideCatalogForAdmin(): Promise<PetCareGuide[]> {
  return fetchManagedPetCareGuideCatalog();
}

export async function getManagedPetCareGuideById(
  id: string,
): Promise<PetCareGuide | null> {
  const normalizedId = id.trim();
  if (!normalizedId) return null;
  return fetchManagedPetCareGuideDetail(normalizedId);
}

export async function saveManagedPetCareGuide(
  input: PetCareGuideAdminUpsertInput,
): Promise<PetCareGuide> {
  return upsertManagedPetCareGuide(input);
}

export function filterManagedPetCareGuidesByStatus(
  guides: ReadonlyArray<PetCareGuide>,
  status: GuideContentStatus | 'all',
): PetCareGuide[] {
  if (status === 'all') return [...guides];
  return guides.filter(guide => guide.status === status);
}

export async function getPetCareGuideById(id: string): Promise<PetCareGuide | null> {
  const normalizedId = id.trim();
  if (!normalizedId) return null;

  try {
    const remote = await fetchPublishedPetCareGuideDetail(normalizedId);
    if (remote) return remote;
  } catch {
    // fallback below
  }

  return PET_CARE_GUIDES.find(guide => guide.id === normalizedId && guide.isActive) ?? null;
}

export async function recordPetCareGuideEvents(
  events: Parameters<typeof insertPetCareGuideEvents>[0],
): Promise<void> {
  try {
    await insertPetCareGuideEvents(events);
  } catch {
    // analytics failures should not break UX
  }
}
