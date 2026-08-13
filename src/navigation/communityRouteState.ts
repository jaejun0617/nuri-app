import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  CommunityListFilter,
  CommunityPageSize,
} from '../types/community';
import { COMMUNITY_PAGE_SIZE_OPTIONS } from '../types/community';

export const COMMUNITY_ROUTE_STATE_STORAGE_KEY =
  'nuri.navigation.communityRoute.v1';
export const COMMUNITY_ROUTE_STATE_VERSION = 1 as const;
export const COMMUNITY_ROUTE_STATE_SCHEMA = 'nuri.community-route.v1' as const;
export const COMMUNITY_ROUTE_STATE_TTL_MS = 24 * 60 * 60 * 1000;

const MAX_ID_LENGTH = 160;
const MAX_CURSOR_LENGTH = 2048;
const MAX_PAGE = 1000;

export type CommunityRouteSnapshotRoute =
  | { name: 'list' }
  | { name: 'detail'; postId: string; commentId?: string };

export type CommunityRouteListSnapshot = {
  activeFilter: CommunityListFilter;
  pageSize: CommunityPageSize;
  currentPage: number;
  cursor: string | null;
  hasMore: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  cursorHistory: Record<number, string | null>;
};

export type CommunityRouteStateSnapshot = {
  version: typeof COMMUNITY_ROUTE_STATE_VERSION;
  schema: typeof COMMUNITY_ROUTE_STATE_SCHEMA;
  userId: string;
  savedAt: number;
  route: CommunityRouteSnapshotRoute;
  list: CommunityRouteListSnapshot;
};

type CommunityRouteInput = {
  name: string;
  params?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isCommunityListFilter(value: unknown): value is CommunityListFilter {
  return value === 'all' || value === 'popular' || value === 'notice';
}

function isCommunityPageSize(value: unknown): value is CommunityPageSize {
  return (
    value === COMMUNITY_PAGE_SIZE_OPTIONS[0] ||
    value === COMMUNITY_PAGE_SIZE_OPTIONS[1] ||
    value === COMMUNITY_PAGE_SIZE_OPTIONS[2] ||
    value === COMMUNITY_PAGE_SIZE_OPTIONS[3] ||
    value === COMMUNITY_PAGE_SIZE_OPTIONS[4]
  );
}

function normalizeCursor(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > MAX_CURSOR_LENGTH) {
    return undefined;
  }
  return value;
}

function normalizeCursorHistory(value: unknown) {
  if (!isRecord(value)) return null;

  const history: Record<number, string | null> = {};
  for (const [rawPage, rawCursor] of Object.entries(value)) {
    const page = Number(rawPage);
    if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
      return null;
    }

    const cursor = normalizeCursor(rawCursor);
    if (cursor === undefined) return null;
    history[page] = cursor;
  }

  if (history[1] !== null) return null;
  return history;
}

function normalizeListSnapshot(
  value: unknown,
): CommunityRouteListSnapshot | null {
  if (!isRecord(value)) return null;
  if (!isCommunityListFilter(value.activeFilter)) return null;
  if (!isCommunityPageSize(value.pageSize)) return null;

  const currentPage = value.currentPage;
  if (
    typeof currentPage !== 'number' ||
    !Number.isInteger(currentPage) ||
    currentPage < 1 ||
    currentPage > MAX_PAGE
  ) {
    return null;
  }

  const cursor = normalizeCursor(value.cursor);
  const cursorHistory = normalizeCursorHistory(value.cursorHistory);
  if (cursor === undefined || !cursorHistory) return null;

  if (currentPage > 1 && typeof cursorHistory[currentPage] !== 'string') {
    return null;
  }

  if (
    !Object.prototype.hasOwnProperty.call(cursorHistory, 1) ||
    typeof value.hasMore !== 'boolean' ||
    typeof value.hasNextPage !== 'boolean' ||
    typeof value.hasPreviousPage !== 'boolean'
  ) {
    return null;
  }

  return {
    activeFilter: value.activeFilter,
    pageSize: value.pageSize,
    currentPage,
    cursor,
    hasMore: value.hasMore,
    hasNextPage: value.hasNextPage,
    hasPreviousPage: value.hasPreviousPage,
    cursorHistory,
  };
}

export function parseCommunityRouteStateSnapshot(
  value: unknown,
  expectedUserId: string,
  now = Date.now(),
): CommunityRouteStateSnapshot | null {
  if (!isRecord(value)) return null;
  if (value.version !== COMMUNITY_ROUTE_STATE_VERSION) return null;
  if (value.schema !== COMMUNITY_ROUTE_STATE_SCHEMA) return null;
  if (value.userId !== expectedUserId) return null;
  if (!isNonEmptyString(value.userId, MAX_ID_LENGTH)) return null;
  if (
    typeof value.savedAt !== 'number' ||
    !Number.isFinite(value.savedAt) ||
    value.savedAt <= 0 ||
    now - value.savedAt < 0 ||
    now - value.savedAt > COMMUNITY_ROUTE_STATE_TTL_MS
  ) {
    return null;
  }

  if (!isRecord(value.route)) return null;
  let route: CommunityRouteSnapshotRoute;
  if (value.route.name === 'list') {
    route = { name: 'list' };
  } else if (
    value.route.name === 'detail' &&
    isNonEmptyString(value.route.postId, MAX_ID_LENGTH)
  ) {
    route = {
      name: 'detail',
      postId: value.route.postId,
      ...(isNonEmptyString(value.route.commentId, MAX_ID_LENGTH)
        ? { commentId: value.route.commentId }
        : {}),
    };
  } else {
    return null;
  }

  const list = normalizeListSnapshot(value.list);
  if (!list) return null;

  return {
    version: COMMUNITY_ROUTE_STATE_VERSION,
    schema: COMMUNITY_ROUTE_STATE_SCHEMA,
    userId: value.userId,
    savedAt: value.savedAt,
    route,
    list,
  };
}

export function createCommunityRouteStateSnapshot(input: {
  userId: string;
  route: CommunityRouteInput;
  list: CommunityRouteListSnapshot;
  savedAt?: number;
}): CommunityRouteStateSnapshot | null {
  if (!isNonEmptyString(input.userId, MAX_ID_LENGTH)) return null;
  const routeName = input.route.name;
  const routeParams = isRecord(input.route.params) ? input.route.params : null;

  const route: CommunityRouteSnapshotRoute | null =
    routeName === 'CommunityDetail' &&
    routeParams &&
    isNonEmptyString(routeParams.postId, MAX_ID_LENGTH)
      ? {
          name: 'detail',
          postId: routeParams.postId,
          ...(isNonEmptyString(routeParams.commentId, MAX_ID_LENGTH)
            ? { commentId: routeParams.commentId }
            : {}),
        }
      : routeName === 'CommunityTab' ||
        routeName === 'CommunityTabList' ||
        routeName === 'CommunityList'
      ? { name: 'list' }
      : null;

  if (!route) return null;

  const savedAt = input.savedAt ?? Date.now();
  const snapshot: CommunityRouteStateSnapshot = {
    version: COMMUNITY_ROUTE_STATE_VERSION,
    schema: COMMUNITY_ROUTE_STATE_SCHEMA,
    userId: input.userId,
    savedAt,
    route,
    list: input.list,
  };

  return parseCommunityRouteStateSnapshot(snapshot, input.userId, savedAt);
}

let writeChain: Promise<void> = Promise.resolve();

export function saveCommunityRouteStateSnapshot(
  snapshot: CommunityRouteStateSnapshot,
): Promise<void> {
  writeChain = writeChain
    .catch(() => {})
    .then(async () => {
      await AsyncStorage.setItem(
        COMMUNITY_ROUTE_STATE_STORAGE_KEY,
        JSON.stringify(snapshot),
      );
    });
  return writeChain;
}

export function clearCommunityRouteStateSnapshot(): Promise<void> {
  writeChain = writeChain
    .catch(() => {})
    .then(() => AsyncStorage.removeItem(COMMUNITY_ROUTE_STATE_STORAGE_KEY));
  return writeChain;
}

export async function loadCommunityRouteStateSnapshot(
  userId: string | null,
  now = Date.now(),
): Promise<CommunityRouteStateSnapshot | null> {
  if (!userId) return null;

  try {
    const raw = await AsyncStorage.getItem(COMMUNITY_ROUTE_STATE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = parseCommunityRouteStateSnapshot(
      JSON.parse(raw) as unknown,
      userId,
      now,
    );
    if (parsed) return parsed;

    await clearCommunityRouteStateSnapshot();
    return null;
  } catch {
    await clearCommunityRouteStateSnapshot();
    return null;
  }
}
