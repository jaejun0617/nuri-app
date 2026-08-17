// 파일: src/services/home/communityHighlights.ts
// 목적:
// - 로그인 홈 전용 Community highlights RPC와 cache 경계를 관리한다.
// - Community 목록의 filter/category/page 상태와 Home preview 상태를 분리한다.
// - ranking과 threshold는 서버 응답을 source of truth로 사용한다.

import type {
  CommunityCategory,
  CommunityPost,
} from '../../types/community';
import { getErrorMessage, getStableAppErrorCode } from '../app/errors';
import { supabase } from '../supabase/client';

export const HOME_COMMUNITY_HIGHLIGHTS_LIMIT = 3 as const;
export const HOME_COMMUNITY_HIGHLIGHTS_STALE_MS = 5 * 60 * 1000;

type HomeCommunityTab = 'popular' | 'question' | 'info' | 'daily' | 'free';

export const HOME_COMMUNITY_TAB_OPTIONS = [
  { key: 'popular', label: '인기', category: 'all' },
  { key: 'question', label: '질문', category: 'question' },
  { key: 'info', label: '정보', category: 'info' },
  { key: 'daily', label: '일상', category: 'daily' },
  { key: 'free', label: '자유', category: 'free' },
] as const satisfies ReadonlyArray<{
  key: HomeCommunityTab;
  label: string;
  category: CommunityCategory;
}>;

export type { HomeCommunityTab };

export const HOME_COMMUNITY_CACHE_KEYS: Record<HomeCommunityTab, string> = {
  popular: 'home-community:popular:all',
  question: 'home-community:popular:question',
  info: 'home-community:popular:info',
  daily: 'home-community:popular:daily',
  free: 'home-community:popular:free',
};

type HomeCommunityTabConfig = {
  category: CommunityCategory;
};

const HOME_COMMUNITY_TAB_CONFIG: Record<
  HomeCommunityTab,
  HomeCommunityTabConfig
> = {
  popular: { category: 'all' },
  question: { category: 'question' },
  info: { category: 'info' },
  daily: { category: 'daily' },
  free: { category: 'free' },
};

export type HomeCommunityHighlightsCursor = {
  version: 1;
  category: CommunityCategory;
  pageSize: typeof HOME_COMMUNITY_HIGHLIGHTS_LIMIT;
  likeCount: number;
  createdAt: string;
  id: string;
};

export type HomeCommunityHighlightsPage = {
  items: CommunityPost[];
  nextCursor: HomeCommunityHighlightsCursor | null;
  hasMore: boolean;
};

export type HomeCommunityHighlightsCache = {
  items: CommunityPost[];
  fetchedAt: number;
};

type HomeHighlightsRpcResponse = {
  scope: 'home_highlights';
  items: unknown[];
  hasMore: boolean;
  nextCursor: unknown;
  pageSize: typeof HOME_COMMUNITY_HIGHLIGHTS_LIMIT;
  category: CommunityCategory;
  cursorVersion: 1;
};

const cacheByKey: Record<
  string,
  HomeCommunityHighlightsCache | undefined
> = {};
const inFlightByKey: Record<string, Promise<CommunityPost[]> | undefined> = {};
const requestGenerationByKey: Record<string, number> = {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCommunityCategory(value: unknown): value is CommunityCategory {
  return (
    value === 'all' ||
    value === 'question' ||
    value === 'info' ||
    value === 'daily' ||
    value === 'free'
  );
}

function normalizeCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(Math.trunc(value), 0);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(parsed, 0);
  }
  return 0;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRemoteImageUrl(value: string | null): boolean {
  return (
    value?.startsWith('https://') === true ||
    value?.startsWith('http://') === true
  );
}

function normalizeHomeHighlightItem(value: unknown): CommunityPost | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.user_id !== 'string' ||
    typeof value.content !== 'string' ||
    typeof value.created_at !== 'string' ||
    typeof value.updated_at !== 'string'
  ) {
    return null;
  }

  const imagePaths = Array.isArray(value.image_urls)
    ? value.image_urls.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : stringOrNull(value.image_url)
      ? [stringOrNull(value.image_url) as string]
      : [];
  const firstImagePath = imagePaths[0] ?? null;
  const imageUrl = isRemoteImageUrl(firstImagePath) ? firstImagePath : null;
  const status =
    value.status === 'hidden' ||
    value.status === 'auto_hidden' ||
    value.status === 'banned' ||
    value.status === 'deleted'
      ? value.status
      : 'active';
  const category =
    isCommunityCategory(value.category) && value.category !== 'all'
      ? value.category
      : null;
  const snapshotAuthorNickname = stringOrNull(value.author_snapshot_nickname);
  const snapshotPetName = stringOrNull(value.pet_snapshot_name);
  const snapshotPetSpecies = stringOrNull(value.pet_snapshot_species);
  const snapshotPetBreed = stringOrNull(value.pet_snapshot_breed);
  const snapshotPetAge = stringOrNull(value.pet_snapshot_age_label);
  const snapshotPetAvatar = stringOrNull(value.pet_snapshot_avatar_path);
  const showPetAge = value.show_pet_age !== false;

  return {
    id: value.id,
    authorId: value.user_id,
    authorNickname: snapshotAuthorNickname ?? '알 수 없는 사용자',
    authorAvatarUrl: null,
    petId: typeof value.pet_id === 'string' ? value.pet_id : null,
    petName: snapshotPetName,
    petBreed: snapshotPetBreed,
    petSpecies: snapshotPetSpecies,
    petAgeLabel: showPetAge ? snapshotPetAge : null,
    petAvatarUrl: snapshotPetAvatar,
    showPetAge,
    title: stringOrNull(value.title),
    content: value.content,
    imagePath: firstImagePath,
    imageUrl,
    imagePaths,
    imageUrls: imageUrl ? [imageUrl] : [],
    hasImage:
      status === 'active' && value.deleted_at === null && firstImagePath !== null,
    status,
    category,
    likeCount: normalizeCount(value.like_count),
    commentCount: normalizeCount(value.comment_count),
    viewCount: normalizeCount(value.view_count),
    isNotice: value.is_notice === true,
    noticePublishedAt: stringOrNull(value.notice_published_at),
    // Home highlights are read-only preview rows. The full detail screen
    // resolves the viewer's like state through the Community service.
    isLikedByMe: false,
    deletedAt: stringOrNull(value.deleted_at),
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

function parseHomeHighlightsResponse(
  value: unknown,
  category: CommunityCategory,
): HomeHighlightsRpcResponse {
  if (!isRecord(value)) {
    throw new Error('community_home_highlights_response_invalid');
  }
  if (
    value.scope !== 'home_highlights' ||
    value.cursorVersion !== 1 ||
    value.pageSize !== HOME_COMMUNITY_HIGHLIGHTS_LIMIT ||
    value.category !== category ||
    !Array.isArray(value.items) ||
    typeof value.hasMore !== 'boolean'
  ) {
    throw new Error('community_home_highlights_response_invalid');
  }

  return value as unknown as HomeHighlightsRpcResponse;
}

function decodeHomeCommunityHighlightsCursor(
  value: unknown,
  category: CommunityCategory,
): HomeCommunityHighlightsCursor | null {
  if (value === null || value === undefined) return null;
  const cursor =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return null;
          }
        })()
      : value;
  if (!isRecord(cursor)) return null;
  if (
    cursor.version !== 1 ||
    cursor.category !== category ||
    cursor.pageSize !== HOME_COMMUNITY_HIGHLIGHTS_LIMIT ||
    typeof cursor.likeCount !== 'number' ||
    !Number.isInteger(cursor.likeCount) ||
    typeof cursor.createdAt !== 'string' ||
    cursor.createdAt.length === 0 ||
    typeof cursor.id !== 'string' ||
    cursor.id.length === 0
  ) {
    return null;
  }
  return cursor as unknown as HomeCommunityHighlightsCursor;
}

export function encodeHomeCommunityHighlightsCursor(
  value: unknown,
  category: CommunityCategory,
): HomeCommunityHighlightsCursor | null {
  return decodeHomeCommunityHighlightsCursor(value, category);
}

function isHomeCursorError(error: unknown): boolean {
  const directCode = isRecord(error) && typeof error.code === 'string'
    ? error.code
    : null;
  if (
    directCode === 'community_cursor_invalid' ||
    directCode === 'community_cursor_version_unsupported'
  ) {
    return true;
  }
  const stableCode = getStableAppErrorCode(error);
  if (
    stableCode === 'community_cursor_invalid' ||
    stableCode === 'community_cursor_version_unsupported'
  ) {
    return true;
  }
  const message = getErrorMessage(error);
  return (
    message.includes('community_cursor_invalid') ||
    message.includes('community_cursor_version_unsupported')
  );
}

async function requestHomeHighlightsPage(
  category: CommunityCategory,
  cursor: HomeCommunityHighlightsCursor | null,
): Promise<HomeCommunityHighlightsPage> {
  const request = async (requestCursor: HomeCommunityHighlightsCursor | null) =>
    supabase.rpc('community_home_highlights_v1', {
      p_category: category,
      p_limit: HOME_COMMUNITY_HIGHLIGHTS_LIMIT,
      p_cursor: requestCursor,
    });

  let response = await request(cursor);
  if (response.error && cursor && isHomeCursorError(response.error)) {
    // A stale Home cursor must restart the Home scope only. It must never
    // fall back to the Community v3 popular list or another category.
    response = await request(null);
  }
  if (response.error) throw response.error;

  const parsed = parseHomeHighlightsResponse(response.data, category);
  const nextCursor = encodeHomeCommunityHighlightsCursor(
    parsed.nextCursor,
    category,
  );
  if (parsed.hasMore && nextCursor === null) {
    throw new Error('community_cursor_invalid');
  }

  return {
    items: parsed.items
      .map(normalizeHomeHighlightItem)
      .filter((item): item is CommunityPost => item !== null),
    nextCursor,
    hasMore: parsed.hasMore,
  };
}

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

export async function fetchHomeCommunityHighlightsPage(
  category: CommunityCategory = 'all',
  cursor?: unknown,
): Promise<HomeCommunityHighlightsPage> {
  const safeCursor = encodeHomeCommunityHighlightsCursor(cursor, category);
  return requestHomeHighlightsPage(category, safeCursor);
}

export async function fetchHomeCommunityHighlights(
  tab: HomeCommunityTab = 'popular',
  options: { force?: boolean } = {},
): Promise<CommunityPost[]> {
  const cacheKey = HOME_COMMUNITY_CACHE_KEYS[tab];
  const cached = getHomeCommunityHighlightsCache(tab);
  if (!options.force && cached?.isFresh) return cached.items;

  const inFlight = inFlightByKey[cacheKey];
  if (inFlight) return inFlight;

  const query = HOME_COMMUNITY_TAB_CONFIG[tab];
  const nextGeneration = (requestGenerationByKey[cacheKey] ?? 0) + 1;
  requestGenerationByKey[cacheKey] = nextGeneration;

  const request = fetchHomeCommunityHighlightsPage(query.category)
    .then(result => {
      if (requestGenerationByKey[cacheKey] === nextGeneration) {
        cacheByKey[cacheKey] = {
          items: result.items,
          fetchedAt: Date.now(),
        };
      }
      return result.items;
    })
    .finally(() => {
      if (inFlightByKey[cacheKey] === request) delete inFlightByKey[cacheKey];
    });

  inFlightByKey[cacheKey] = request;
  return request;
}

export function clearHomeCommunityHighlightsCache() {
  const keys = new Set([
    ...Object.keys(cacheByKey),
    ...Object.keys(inFlightByKey),
    ...Object.keys(requestGenerationByKey),
  ]);
  keys.forEach(key => {
    requestGenerationByKey[key] = (requestGenerationByKey[key] ?? 0) + 1;
    delete cacheByKey[key];
    delete inFlightByKey[key];
  });
}
