// 파일: src/services/home/communityHighlights.ts
// 목적:
// - 로그인 홈에서 사용할 커뮤니티 인기글 preview의 서버 상태와 freshness를 분리한다.
// - Community 전체 목록 store의 filter/category/page 상태를 오염시키지 않는다.
// - 서버가 정한 popular 정렬을 그대로 유지하고 Home 노출 수만 제한한다.

import { fetchCommunityPosts } from '../supabase/community';
import type { CommunityPost } from '../../types/community';
import { DEFAULT_COMMUNITY_PAGE_SIZE } from '../../types/community';

export const HOME_COMMUNITY_HIGHLIGHTS_LIMIT = 3;
export const HOME_COMMUNITY_HIGHLIGHTS_STALE_MS = 5 * 60 * 1000;

export type HomeCommunityHighlightsCache = {
  items: CommunityPost[];
  fetchedAt: number;
};

let cache: HomeCommunityHighlightsCache | null = null;
let inFlight: Promise<CommunityPost[]> | null = null;

export function getHomeCommunityHighlightsCache(
  now = Date.now(),
): {
  items: CommunityPost[];
  fetchedAt: number;
  isFresh: boolean;
} | null {
  if (!cache) return null;

  return {
    ...cache,
    isFresh: now - cache.fetchedAt < HOME_COMMUNITY_HIGHLIGHTS_STALE_MS,
  };
}

export async function fetchHomeCommunityHighlights(options: {
  force?: boolean;
} = {}): Promise<CommunityPost[]> {
  const cached = getHomeCommunityHighlightsCache();
  if (!options.force && cached?.isFresh) {
    return cached.items;
  }

  if (inFlight) return inFlight;

  inFlight = fetchCommunityPosts({
    filter: 'popular',
    category: 'all',
    // The v2 RPC accepts bounded page sizes only. Home renders at most three
    // rows while retaining the established minimum server page contract.
    limit: DEFAULT_COMMUNITY_PAGE_SIZE,
  })
    .then(result => {
      // Do not sort or re-evaluate popularity on the client. The RPC owns both
      // the like_count >= 10 gate and the deterministic result ordering.
      const nextItems = result.items.slice(0, HOME_COMMUNITY_HIGHLIGHTS_LIMIT);
      cache = {
        items: nextItems,
        fetchedAt: Date.now(),
      };
      return nextItems;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function clearHomeCommunityHighlightsCache() {
  cache = null;
  inFlight = null;
}
