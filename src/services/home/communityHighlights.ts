// 파일: src/services/home/communityHighlights.ts
// 목적:
// - 로그인 홈에서 사용할 커뮤니티 category preview의 서버 상태와 freshness를 분리한다.
// - Community 전체 목록 store의 filter/category/page 상태를 오염시키지 않는다.
// - 서버가 정한 filter/category 결과 순서를 그대로 유지하고 Home 노출 수만 제한한다.

import { fetchCommunityPosts } from '../supabase/community';
import type {
  CommunityCategory,
  CommunityListFilter,
  CommunityPost,
} from '../../types/community';
import { DEFAULT_COMMUNITY_PAGE_SIZE } from '../../types/community';

export const HOME_COMMUNITY_HIGHLIGHTS_LIMIT = 3;
export const HOME_COMMUNITY_HIGHLIGHTS_STALE_MS = 5 * 60 * 1000;

export const HOME_COMMUNITY_TAB_OPTIONS = [
  { key: 'popular', label: '인기', filter: 'popular', category: 'all' },
  { key: 'question', label: '질문', filter: 'all', category: 'question' },
  { key: 'info', label: '정보', filter: 'all', category: 'info' },
  { key: 'daily', label: '일상', filter: 'all', category: 'daily' },
  { key: 'free', label: '자유', filter: 'all', category: 'free' },
] as const satisfies ReadonlyArray<{
  key: 'popular' | 'question' | 'info' | 'daily' | 'free';
  label: string;
  filter: CommunityListFilter;
  category: CommunityCategory;
}>;

export type HomeCommunityTab = (typeof HOME_COMMUNITY_TAB_OPTIONS)[number]['key'];

export const HOME_COMMUNITY_CACHE_KEYS: Record<HomeCommunityTab, string> = {
  popular: 'home-community:popular:all',
  question: 'home-community:all:question',
  info: 'home-community:all:info',
  daily: 'home-community:all:daily',
  free: 'home-community:all:free',
};

type HomeCommunityTabConfig = {
  filter: CommunityListFilter;
  category: CommunityCategory;
};

const HOME_COMMUNITY_TAB_CONFIG: Record<
  HomeCommunityTab,
  HomeCommunityTabConfig
> = {
  popular: { filter: 'popular', category: 'all' },
  question: { filter: 'all', category: 'question' },
  info: { filter: 'all', category: 'info' },
  daily: { filter: 'all', category: 'daily' },
  free: { filter: 'all', category: 'free' },
};

export type HomeCommunityHighlightsCache = {
  items: CommunityPost[];
  fetchedAt: number;
};

const cacheByKey: Record<string, HomeCommunityHighlightsCache | undefined> = {};
const inFlightByKey: Record<string, Promise<CommunityPost[]> | undefined> = {};

export function getHomeCommunityHighlightsCache(
  tab: HomeCommunityTab = 'popular',
  now = Date.now(),
): {
  items: CommunityPost[];
  fetchedAt: number;
  isFresh: boolean;
} | null {
  const cache = cacheByKey[HOME_COMMUNITY_CACHE_KEYS[tab]];
  if (!cache) return null;

  return {
    ...cache,
    isFresh: now - cache.fetchedAt < HOME_COMMUNITY_HIGHLIGHTS_STALE_MS,
  };
}

export async function fetchHomeCommunityHighlights(
  tab: HomeCommunityTab = 'popular',
  options: { force?: boolean } = {},
): Promise<CommunityPost[]> {
  const cacheKey = HOME_COMMUNITY_CACHE_KEYS[tab];
  const cached = getHomeCommunityHighlightsCache(tab);
  if (!options.force && cached?.isFresh) {
    return cached.items;
  }

  const inFlight = inFlightByKey[cacheKey];
  if (inFlight) return inFlight;

  const query = HOME_COMMUNITY_TAB_CONFIG[tab];

  const request = fetchCommunityPosts({
    filter: query.filter,
    category: query.category,
    // The v2 RPC accepts bounded page sizes only. Home renders at most three
    // rows while retaining the established minimum server page contract.
    limit: DEFAULT_COMMUNITY_PAGE_SIZE,
  })
    .then(result => {
      // Do not sort or re-evaluate popularity on the client. The RPC owns the
      // popular threshold and every tab's result ordering.
      const nextItems = result.items.slice(0, HOME_COMMUNITY_HIGHLIGHTS_LIMIT);
      cacheByKey[cacheKey] = {
        items: nextItems,
        fetchedAt: Date.now(),
      };
      return nextItems;
    })
    .finally(() => {
      delete inFlightByKey[cacheKey];
    });

  inFlightByKey[cacheKey] = request;
  return request;
}

export function clearHomeCommunityHighlightsCache() {
  Object.keys(cacheByKey).forEach(key => {
    delete cacheByKey[key];
  });
  Object.keys(inFlightByKey).forEach(key => {
    delete inFlightByKey[key];
  });
}
