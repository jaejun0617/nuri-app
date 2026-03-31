// 파일: src/services/guides/service.ts
// 파일 목적:
// - 가이드 도메인의 사용자용/관리자용 읽기 모델과 fallback 정책을 한곳에서 제공한다.
// 어디서 쓰이는지:
// - GuideList/Detail 화면, 홈 추천 훅, 관리자 가이드 훅에서 공통으로 사용된다.
// 핵심 역할:
// - 공개 가이드 목록/상세 조회, 검색, 인기 검색어, 홈 추천, 관리자 목록/상세 저장 흐름을 래핑한다.
// - 원격 fetch 실패 시 로컬 seed fallback을 사용해 가이드 화면의 최소 가용성을 유지한다.
// 데이터·상태 흐름:
// - 실제 원본은 Supabase guides/RPC이고, 이 파일은 화면이 쓰기 쉬운 정렬/검색/개인화 결과로 가공한다.
// - 종/세부종/연령 기반 personal score를 계산해 홈과 목록 정렬에 반영한다.
// 수정 시 주의:
// - fallback seed는 운영 콘텐츠를 대체하는 구조가 아니라 비상용 가용성 장치이므로, 원격/로컬 source 구분을 흐리면 안 된다.
// - 사용자용 공개 데이터와 관리자용 비공개 편집 데이터를 같은 규칙으로 섞지 않도록 주의해야 한다.
import { GUIDE_POPULAR_SEARCH_LIMIT, GUIDE_SEARCH_RESULT_LIMIT } from './config';
import { PET_CARE_GUIDES } from './data';
import { getGuidePersonalizationScore, getGuideSpeciesScore } from './personalization';
import { getGuideCategoryLabel } from './presentation';
import { pickHomeGuideRecommendations } from './rotation';
import { searchPetCareGuides } from './search';
import type {
  GuideContentStatus,
  GuideDataSource,
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

export type PetCareGuideCatalogResult = {
  guides: PetCareGuide[];
  source: GuideDataSource;
  reason: 'published' | 'empty-success' | 'remote-error';
};

const GUIDE_LOCAL_SEED_ALLOWED = __DEV__;

function normalizeSearchKeyword(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function shouldUseLocalGuideSeedFallback(guides: ReadonlyArray<PetCareGuide>): boolean {
  return GUIDE_LOCAL_SEED_ALLOWED && guides.length === 0;
}

function buildRemoteGuideEmptyResult(
  reason: PetCareGuideCatalogResult['reason'],
): PetCareGuideCatalogResult {
  return {
    guides: [],
    source: 'remote-empty',
    reason,
  };
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
  const result = await fetchPetCareGuideCatalogResult();
  return result.guides;
}

export async function fetchPetCareGuideCatalogResult(): Promise<PetCareGuideCatalogResult> {
  try {
    const guides = await fetchPublishedPetCareGuideCatalog();
    if (guides.length > 0) {
      return {
        guides,
        source: 'remote',
        reason: 'published',
      };
    }
    if (shouldUseLocalGuideSeedFallback(guides)) {
      return {
        guides: [...PET_CARE_GUIDES],
        source: 'local-seed',
        reason: 'empty-success',
      };
    }
    return buildRemoteGuideEmptyResult('empty-success');
  } catch {
    if (GUIDE_LOCAL_SEED_ALLOWED) {
      return {
        guides: [...PET_CARE_GUIDES],
        source: 'local-seed',
        reason: 'remote-error',
      };
    }

    return buildRemoteGuideEmptyResult('remote-error');
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

export function filterPetCareGuidesForListAudience(
  guides: ReadonlyArray<PetCareGuide>,
  context: GuideListContext = {},
): PetCareGuide[] {
  const normalizedContext = normalizeGuideListContext(context);

  if (!normalizedContext.species) {
    return [...guides];
  }

  return guides.filter(guide => supportsSpecies(guide, normalizedContext));
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

  if (!GUIDE_LOCAL_SEED_ALLOWED) {
    return null;
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
