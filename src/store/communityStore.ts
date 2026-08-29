// 파일: src/store/communityStore.ts
// 파일 목적:
// - 커뮤니티 목록/상세/댓글과 기본 쓰기 캐시 상태를 전역으로 관리한다.
// 어디서 쓰이는지:
// - CommunityListScreen, CommunityDetailScreen, AppProviders 로그아웃 정리 흐름에서 사용된다.
// 핵심 역할:
// - cursor 기반 목록 상태, 상세 상태, 엔티티 캐시, 댓글 캐시를 유지한다.
// 수정 시 주의:
// - 목록과 상세가 같은 entity cache를 쓰므로 수정/삭제 후 캐시 정합성을 함께 맞춰야 한다.

import { create } from 'zustand';

import { getErrorMessage } from '../services/app/errors';
import { clearHomeCommunityHighlightsCache } from '../services/home/communityHighlights';
import { toPublicPetAvatarUrl } from '../services/supabase/pets';
import { groupCommentsIntoThreads } from '../screens/Community/utils/commentHelpers';
import {
  createCommunityComment,
  createCommunityPost,
  createCommunityReport,
  deleteCommunityPost,
  deleteCommunityComment,
  fetchCommunityComments,
  fetchLatestCommunityCommentPreview,
  fetchCommunityPostById,
  fetchCommunityPosts,
  recordCommunityPostView,
  toggleCommunityCommentLike,
  toggleCommunityPostLike,
  updateCommunityPost,
  getCommunityListCursorErrorCode,
  getCommunityListErrorMessage,
} from '../services/supabase/community';
import type {
  CommunityCategory,
  CommunityComment,
  CommunityDetailStatus,
  CommunityListFilter,
  CommunityPageSize,
  CommunityListStatus,
  CommunityPost,
  CommunityReportReasonCategory,
  CreateCommunityPostParams,
  UpdateCommunityPostParams,
} from '../types/community';
import { DEFAULT_COMMUNITY_PAGE_SIZE } from '../types/community';
import type { CommunityRouteListSnapshot } from '../navigation/communityRouteState';

const UNKNOWN_COMMENT_AUTHOR_NICKNAME = '알 수 없는 사용자';

type CommunityCursorHistory = Record<string, Record<number, string | null>>;

let detailRequestSequence = 0;
let communityCommentsRequestSequence = 0;

function getCommunityListKey(
  filter: CommunityListFilter,
  category: CommunityCategory,
  pageSize: CommunityPageSize,
) {
  return `${filter}:${category}:${pageSize}`;
}

function uniquePosts(posts: CommunityPost[]) {
  const seen = new Set<string>();
  return posts.filter(post => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

type CommunityStore = {
  posts: CommunityPost[];
  postsById: Record<string, CommunityPost>;
  commentsByPostId: Record<string, CommunityComment[]>;
  latestCommentByPostId: Record<string, CommunityComment | null>;
  commentEntitiesById: Record<string, CommunityComment>;
  topLevelCommentIdsByPostId: Record<string, string[]>;
  replyCommentIdsByParentId: Record<string, string[]>;
  commentsStatusByPostId: Record<
    string,
    'idle' | 'loading' | 'ready' | 'error'
  >;
  latestCommentStatusByPostId: Record<
    string,
    'idle' | 'loading' | 'ready' | 'error'
  >;
  detailStatusByPostId: Record<string, CommunityDetailStatus>;
  postViewRecordStatusByPostId: Record<
    string,
    'idle' | 'loading' | 'ready' | 'error'
  >;
  listStatus: CommunityListStatus;
  listErrorMessage: string | null;
  cursor: string | null;
  hasMore: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  cursorHistory: CommunityCursorHistory;
  activeFilter: CommunityListFilter;
  activeCategory: CommunityCategory;
  pageSize: CommunityPageSize;
  lastFetchedAt: number | null;

  getListSnapshot: () => CommunityRouteListSnapshot;
  restoreListSnapshot: (snapshot: CommunityRouteListSnapshot) => void;
  resumePosts: () => Promise<void>;
  fetchPosts: (
    filter?: CommunityListFilter,
    category?: CommunityCategory,
  ) => Promise<void>;
  setCategory: (category: CommunityCategory) => Promise<void>;
  refreshPosts: () => Promise<void>;
  loadMorePosts: () => Promise<void>;
  loadPreviousPosts: () => Promise<void>;
  setPageSize: (pageSize: CommunityPageSize) => Promise<void>;
  invalidateCommunityVisibility: (authorId?: string) => Promise<void>;
  fetchPostDetail: (postId: string) => Promise<void>;
  recordPostView: (postId: string) => Promise<void>;
  fetchPostComments: (postId: string) => Promise<void>;
  fetchLatestCommentPreview: (postId: string) => Promise<void>;
  submitPost: (
    params: CreateCommunityPostParams,
    userId: string,
  ) => Promise<CommunityPost>;
  editPost: (
    postId: string,
    params: UpdateCommunityPostParams,
  ) => Promise<void>;
  removePost: (postId: string) => Promise<void>;
  togglePostLike: (postId: string, userId: string) => Promise<void>;
  toggleCommentLike: (
    commentId: string,
    postId: string,
    userId: string,
  ) => Promise<void>;
  submitComment: (
    postId: string,
    content: string,
    parentCommentId?: string | null,
    replyToCommentId?: string | null,
  ) => Promise<void>;
  removeComment: (commentId: string, postId: string) => Promise<void>;
  reportContent: (
    targetType: 'post' | 'comment',
    targetId: string,
    reasonCategory: CommunityReportReasonCategory,
    reason: string,
    reporterId: string,
  ) => Promise<'created' | 'duplicate'>;
  updatePostInCache: (postId: string, patch: Partial<CommunityPost>) => void;
  clearAll: () => void;
};

type CommunityDetailStatePatch = Pick<
  CommunityStore,
  | 'posts'
  | 'postsById'
  | 'commentsByPostId'
  | 'latestCommentByPostId'
  | 'commentEntitiesById'
  | 'topLevelCommentIdsByPostId'
  | 'replyCommentIdsByParentId'
  | 'commentsStatusByPostId'
  | 'latestCommentStatusByPostId'
  | 'detailStatusByPostId'
  | 'postViewRecordStatusByPostId'
>;

function clearCommunityDetailState(
  prev: CommunityStore,
  postId: string,
  status: CommunityDetailStatus,
): CommunityDetailStatePatch {
  const nextPostsById = { ...prev.postsById };
  const nextCommentsByPostId = { ...prev.commentsByPostId };
  const nextLatestCommentByPostId = { ...prev.latestCommentByPostId };
  const nextCommentsStatusByPostId = { ...prev.commentsStatusByPostId };
  const nextLatestCommentStatusByPostId = {
    ...prev.latestCommentStatusByPostId,
  };
  const nextDetailStatusByPostId = { ...prev.detailStatusByPostId };
  const nextPostViewRecordStatusByPostId = {
    ...prev.postViewRecordStatusByPostId,
  };
  const nextTopLevelCommentIdsByPostId = {
    ...prev.topLevelCommentIdsByPostId,
  };
  const nextCommentEntitiesById = { ...prev.commentEntitiesById };
  const nextReplyCommentIdsByParentId = {
    ...prev.replyCommentIdsByParentId,
  };
  const removedCommentIds = new Set(
    (prev.commentsByPostId[postId] ?? []).map(comment => comment.id),
  );

  delete nextPostsById[postId];
  delete nextCommentsByPostId[postId];
  delete nextLatestCommentByPostId[postId];
  delete nextCommentsStatusByPostId[postId];
  delete nextLatestCommentStatusByPostId[postId];
  delete nextTopLevelCommentIdsByPostId[postId];
  delete nextPostViewRecordStatusByPostId[postId];
  nextDetailStatusByPostId[postId] = status;

  removedCommentIds.forEach(commentId => {
    delete nextCommentEntitiesById[commentId];
    delete nextReplyCommentIdsByParentId[commentId];
  });
  Object.keys(nextReplyCommentIdsByParentId).forEach(parentId => {
    nextReplyCommentIdsByParentId[parentId] =
      nextReplyCommentIdsByParentId[parentId].filter(
        commentId => !removedCommentIds.has(commentId),
      );
  });

  return {
    posts: prev.posts.filter(post => post.id !== postId),
    postsById: nextPostsById,
    commentsByPostId: nextCommentsByPostId,
    latestCommentByPostId: nextLatestCommentByPostId,
    commentEntitiesById: nextCommentEntitiesById,
    topLevelCommentIdsByPostId: nextTopLevelCommentIdsByPostId,
    replyCommentIdsByParentId: nextReplyCommentIdsByParentId,
    commentsStatusByPostId: nextCommentsStatusByPostId,
    latestCommentStatusByPostId: nextLatestCommentStatusByPostId,
    detailStatusByPostId: nextDetailStatusByPostId,
    postViewRecordStatusByPostId: nextPostViewRecordStatusByPostId,
  };
}

function mergePostsById(
  prev: Record<string, CommunityPost>,
  posts: CommunityPost[],
) {
  if (posts.length === 0) return prev;
  const next = { ...prev };
  posts.forEach(post => {
    next[post.id] = post;
  });
  return next;
}

function hasKnownCommentAuthorNickname(
  comment: CommunityComment | null | undefined,
) {
  const nickname = `${comment?.authorNickname ?? ''}`.trim();
  return nickname.length > 0 && nickname !== UNKNOWN_COMMENT_AUTHOR_NICKNAME;
}

function preserveCommentAuthorMetadata(
  nextComment: CommunityComment,
  previousComment: CommunityComment | null | undefined,
) {
  if (!previousComment) return nextComment;
  if (previousComment.authorId !== nextComment.authorId) return nextComment;

  return {
    ...nextComment,
    authorNickname:
      hasKnownCommentAuthorNickname(nextComment) ||
      !hasKnownCommentAuthorNickname(previousComment)
        ? nextComment.authorNickname
        : previousComment.authorNickname,
    authorAvatarUrl:
      nextComment.authorAvatarUrl ?? previousComment.authorAvatarUrl ?? null,
  };
}

function getLatestCommentPreview(
  comments: readonly CommunityComment[],
): CommunityComment | null {
  if (comments.length === 0) return null;
  return comments[comments.length - 1] ?? null;
}

function reconcileLatestCommentPreviewState(
  prevPostsById: Record<string, CommunityPost>,
  prevLatestCommentByPostId: Record<string, CommunityComment | null>,
  prevLatestCommentStatusByPostId: Record<
    string,
    'idle' | 'loading' | 'ready' | 'error'
  >,
  nextPosts: CommunityPost[],
) {
  const nextLatestCommentByPostId = { ...prevLatestCommentByPostId };
  const nextLatestCommentStatusByPostId = {
    ...prevLatestCommentStatusByPostId,
  };

  nextPosts.forEach(post => {
    const previousPost = prevPostsById[post.id] ?? null;
    if (post.commentCount <= 0) {
      nextLatestCommentByPostId[post.id] = null;
      nextLatestCommentStatusByPostId[post.id] = 'ready';
      return;
    }

    if (!previousPost || previousPost.commentCount !== post.commentCount) {
      nextLatestCommentStatusByPostId[post.id] = 'idle';
    }
  });

  return {
    latestCommentByPostId: nextLatestCommentByPostId,
    latestCommentStatusByPostId: nextLatestCommentStatusByPostId,
  };
}

export const useCommunityStore = create<CommunityStore>((set, get) => {
  let listRequestSequence = 0;
  let filterRequestGeneration = 0;
  let categoryRequestGeneration = 0;
  let pageSizeRequestGeneration = 0;

  const requestListPage = async (options: {
    filter: CommunityListFilter;
    category: CommunityCategory;
    pageSize: CommunityPageSize;
    page: number;
    cursor: string | null;
    status: 'loading' | 'refreshing' | 'loadingMore';
    resetHistory: boolean;
    clearPosts: boolean;
    requestKind:
      | 'filter'
      | 'category'
      | 'pageSize'
      | 'refresh'
      | 'pagination'
      | 'restore';
  }) => {
    if (options.requestKind === 'filter') filterRequestGeneration += 1;
    if (options.requestKind === 'category') categoryRequestGeneration += 1;
    if (options.requestKind === 'pageSize') pageSizeRequestGeneration += 1;

    // Category transitions must never infer a new primary filter from the
    // category control. Read the live store filter at request creation time so
    // a rapid popular -> category tap cannot fall back to the all feed.
    const requestFilter =
      options.requestKind === 'category' ? get().activeFilter : options.filter;
    const requestCategory: CommunityCategory =
      requestFilter === 'notice' ? 'all' : options.category;

    const requestId = ++listRequestSequence;
    const listKey = getCommunityListKey(
      requestFilter,
      requestCategory,
      options.pageSize,
    );
    const requestGeneration = {
      filter: filterRequestGeneration,
      category: categoryRequestGeneration,
      pageSize: pageSizeRequestGeneration,
    };
    const isCurrentRequest = () =>
      requestId === listRequestSequence &&
      filterRequestGeneration === requestGeneration.filter &&
      categoryRequestGeneration === requestGeneration.category &&
      pageSizeRequestGeneration === requestGeneration.pageSize &&
      getCommunityListKey(
        get().activeFilter,
        get().activeCategory,
        get().pageSize,
      ) === listKey;

    set(() => ({
      listStatus: options.status,
      listErrorMessage: null,
      activeFilter: requestFilter,
      activeCategory: requestCategory,
      pageSize: options.pageSize,
      ...(options.resetHistory
        ? {
            currentPage: 1,
            cursor: null,
            hasMore: true,
            hasNextPage: true,
            hasPreviousPage: false,
            cursorHistory: {
              [listKey]: { 1: null },
            },
          }
        : {}),
      ...(options.clearPosts ? { posts: [] } : {}),
    }));

    try {
      const result = await fetchCommunityPosts({
        filter: requestFilter,
        category: requestCategory,
        cursor: options.cursor,
        limit: options.pageSize,
      });

      if (!isCurrentRequest()) return;

      set(prev => {
        const historyForKey = {
          ...(prev.cursorHistory[listKey] ?? { 1: null }),
          [options.page]: options.cursor,
        };
        if (result.nextCursor) {
          historyForKey[options.page + 1] = result.nextCursor;
        } else {
          delete historyForKey[options.page + 1];
        }

        return {
          posts: uniquePosts(result.items),
          postsById: mergePostsById(prev.postsById, result.items),
          ...reconcileLatestCommentPreviewState(
            prev.postsById,
            prev.latestCommentByPostId,
            prev.latestCommentStatusByPostId,
            result.items,
          ),
          listStatus: 'ready',
          listErrorMessage: null,
          cursor: result.nextCursor,
          hasMore: result.hasMore,
          hasNextPage: result.hasMore,
          hasPreviousPage: options.page > 1,
          currentPage: options.page,
          cursorHistory: {
            ...prev.cursorHistory,
            [listKey]: historyForKey,
          },
          lastFetchedAt: Date.now(),
        };
      });
    } catch (error: unknown) {
      if (!isCurrentRequest()) return;

      if (
        options.cursor !== null &&
        getCommunityListCursorErrorCode(error) !== null
      ) {
        // A cursor from before the current server contract is not a list
        // failure. Restart this filter at page one without exposing an empty
        // list or applying the stale page response.
        await requestListPage({
          filter: requestFilter,
          category: requestCategory,
          pageSize: options.pageSize,
          page: 1,
          cursor: null,
          status: 'loading',
          resetHistory: true,
          clearPosts: false,
          requestKind: 'filter',
        });
        return;
      }

      set({
        listStatus:
          options.status === 'loadingMore' || !options.clearPosts
            ? 'ready'
            : 'error',
        listErrorMessage:
          getCommunityListErrorMessage(error) ||
          getErrorMessage(error) ||
          '게시글을 불러오지 못했어요.',
      });
    }
  };

  const getListSnapshot = (): CommunityRouteListSnapshot => {
    const state = get();
    const listKey = getCommunityListKey(
      state.activeFilter,
      state.activeCategory,
      state.pageSize,
    );

    return {
      activeFilter: state.activeFilter,
      activeCategory: state.activeCategory,
      pageSize: state.pageSize,
      currentPage: state.currentPage,
      cursor: state.cursor,
      hasMore: state.hasMore,
      hasNextPage: state.hasNextPage,
      hasPreviousPage: state.hasPreviousPage,
      cursorHistory: {
        ...(state.cursorHistory[listKey] ?? { 1: null }),
      },
    };
  };

  return {
    posts: [],
    postsById: {},
    commentsByPostId: {},
    latestCommentByPostId: {},
    commentEntitiesById: {},
    topLevelCommentIdsByPostId: {},
    replyCommentIdsByParentId: {},
    commentsStatusByPostId: {},
    latestCommentStatusByPostId: {},
    detailStatusByPostId: {},
    postViewRecordStatusByPostId: {},
    listStatus: 'idle',
    listErrorMessage: null,
    cursor: null,
    hasMore: true,
    hasNextPage: true,
    hasPreviousPage: false,
    currentPage: 1,
    cursorHistory: {
      [getCommunityListKey('all', 'all', DEFAULT_COMMUNITY_PAGE_SIZE)]: {
        1: null,
      },
    },
    activeFilter: 'all',
    activeCategory: 'all',
    pageSize: DEFAULT_COMMUNITY_PAGE_SIZE,
    lastFetchedAt: null,

    getListSnapshot,

    restoreListSnapshot: snapshot => {
      listRequestSequence += 1;
      detailRequestSequence += 1;
      communityCommentsRequestSequence += 1;
      const listKey = getCommunityListKey(
        snapshot.activeFilter,
        snapshot.activeCategory,
        snapshot.pageSize,
      );

      set({
        posts: [],
        postsById: {},
        commentsByPostId: {},
        latestCommentByPostId: {},
        commentEntitiesById: {},
        topLevelCommentIdsByPostId: {},
        replyCommentIdsByParentId: {},
        commentsStatusByPostId: {},
        latestCommentStatusByPostId: {},
        detailStatusByPostId: {},
        postViewRecordStatusByPostId: {},
        listStatus: 'idle',
        listErrorMessage: null,
        cursor: snapshot.cursor,
        hasMore: snapshot.hasMore,
        hasNextPage: snapshot.hasNextPage,
        hasPreviousPage: snapshot.hasPreviousPage,
        currentPage: snapshot.currentPage,
        cursorHistory: {
          [listKey]: { ...snapshot.cursorHistory },
        },
        activeFilter: snapshot.activeFilter,
        activeCategory:
          snapshot.activeFilter === 'notice' ? 'all' : snapshot.activeCategory,
        pageSize: snapshot.pageSize,
        lastFetchedAt: null,
      });
    },

    resumePosts: async () => {
      const state = get();
      const listKey = getCommunityListKey(
        state.activeFilter,
        state.activeCategory,
        state.pageSize,
      );
      const pageCursor =
        state.currentPage === 1
          ? null
          : state.cursorHistory[listKey]?.[state.currentPage];

      if (state.currentPage > 1 && pageCursor === undefined) {
        await requestListPage({
          filter: state.activeFilter,
          category: state.activeCategory,
          pageSize: state.pageSize,
          page: 1,
          cursor: null,
          status: 'loading',
          resetHistory: true,
          clearPosts: true,
          requestKind: 'restore',
        });
        return;
      }

      await requestListPage({
        filter: state.activeFilter,
        category: state.activeCategory,
        pageSize: state.pageSize,
        page: state.currentPage,
        cursor: pageCursor ?? null,
        status: 'loading',
        resetHistory: state.currentPage === 1,
        clearPosts: true,
        requestKind: 'restore',
      });
    },

    fetchPosts: async (filter, category) => {
      const nextFilter = filter ?? 'all';
      const nextCategory =
        nextFilter === 'notice' ? 'all' : category ?? get().activeCategory;
      const state = get();
      if (
        state.listStatus === 'loading' &&
        state.activeFilter === nextFilter &&
        state.activeCategory === nextCategory
      ) {
        return;
      }
      await requestListPage({
        filter: nextFilter,
        category: nextCategory,
        pageSize: get().pageSize,
        page: 1,
        cursor: null,
        status: 'loading',
        resetHistory: true,
        clearPosts: true,
        requestKind: 'filter',
      });
    },

    setCategory: async category => {
      const state = get();
      const nextCategory = state.activeFilter === 'notice' ? 'all' : category;
      if (state.activeCategory === nextCategory) return;

      await requestListPage({
        filter: state.activeFilter,
        category: nextCategory,
        pageSize: state.pageSize,
        page: 1,
        cursor: null,
        status: 'loading',
        resetHistory: true,
        clearPosts: false,
        requestKind: 'category',
      });
    },

    refreshPosts: async () => {
      const state = get();
      if (
        state.listStatus === 'refreshing' ||
        state.listStatus === 'loading' ||
        state.listStatus === 'loadingMore'
      ) {
        return;
      }

      await requestListPage({
        filter: state.activeFilter,
        category: state.activeCategory,
        pageSize: state.pageSize,
        page: 1,
        cursor: null,
        status: 'refreshing',
        resetHistory: true,
        clearPosts: false,
        requestKind: 'refresh',
      });
    },

    loadMorePosts: async () => {
      const state = get();
      if (!state.hasNextPage || !state.cursor) return;
      if (
        state.listStatus === 'loading' ||
        state.listStatus === 'refreshing' ||
        state.listStatus === 'loadingMore'
      ) {
        return;
      }

      await requestListPage({
        filter: state.activeFilter,
        category: state.activeCategory,
        pageSize: state.pageSize,
        page: state.currentPage + 1,
        cursor: state.cursor,
        status: 'loadingMore',
        resetHistory: false,
        clearPosts: false,
        requestKind: 'pagination',
      });
    },

    loadPreviousPosts: async () => {
      const state = get();
      if (state.currentPage <= 1 || !state.hasPreviousPage) return;
      if (
        state.listStatus === 'loading' ||
        state.listStatus === 'refreshing' ||
        state.listStatus === 'loadingMore'
      ) {
        return;
      }

      const listKey = getCommunityListKey(
        state.activeFilter,
        state.activeCategory,
        state.pageSize,
      );
      const previousPage = state.currentPage - 1;
      const previousCursor = state.cursorHistory[listKey]?.[previousPage];
      if (previousCursor === undefined) return;

      await requestListPage({
        filter: state.activeFilter,
        category: state.activeCategory,
        pageSize: state.pageSize,
        page: previousPage,
        cursor: previousCursor,
        status: 'loadingMore',
        resetHistory: false,
        clearPosts: false,
        requestKind: 'pagination',
      });
    },

    setPageSize: async pageSize => {
      const state = get();
      if (state.pageSize === pageSize) return;
      await requestListPage({
        filter: state.activeFilter,
        category: state.activeCategory,
        pageSize,
        page: 1,
        cursor: null,
        status: 'loading',
        resetHistory: true,
        clearPosts: false,
        requestKind: 'pageSize',
      });
    },

    invalidateCommunityVisibility: async authorId => {
      // A block mutation can finish while a list request is still in flight.
      // Invalidate that request before removing the author from the local
      // entity cache so a late pre-block response cannot reinsert the post.
      listRequestSequence += 1;
      detailRequestSequence += 1;
      communityCommentsRequestSequence += 1;
      const state = get();
      const removedPostIds = authorId
        ? Object.values(state.postsById)
            .filter(post => post.authorId === authorId)
            .map(post => post.id)
        : [];
      const removedCommentIds = removedPostIds.flatMap(
        postId =>
          (state.commentsByPostId[postId] ?? []).map(comment => comment.id),
      );

      set(prev => {
        const nextPostsById = { ...prev.postsById };
        const nextDetailStatusByPostId = { ...prev.detailStatusByPostId };
        const nextPostViewRecordStatusByPostId = {
          ...prev.postViewRecordStatusByPostId,
        };
        const nextCommentsByPostId = { ...prev.commentsByPostId };
        const nextLatestCommentByPostId = { ...prev.latestCommentByPostId };
        const nextCommentsStatusByPostId = { ...prev.commentsStatusByPostId };
        const nextLatestCommentStatusByPostId = {
          ...prev.latestCommentStatusByPostId,
        };
        const nextTopLevelCommentIdsByPostId = {
          ...prev.topLevelCommentIdsByPostId,
        };
        const nextCommentEntitiesById = { ...prev.commentEntitiesById };
        const nextReplyCommentIdsByParentId = {
          ...prev.replyCommentIdsByParentId,
        };

        removedPostIds.forEach(postId => {
          delete nextPostsById[postId];
          delete nextDetailStatusByPostId[postId];
          delete nextPostViewRecordStatusByPostId[postId];
          delete nextCommentsByPostId[postId];
          delete nextLatestCommentByPostId[postId];
          delete nextCommentsStatusByPostId[postId];
          delete nextLatestCommentStatusByPostId[postId];
          delete nextTopLevelCommentIdsByPostId[postId];
        });
        removedCommentIds.forEach(commentId => {
          delete nextCommentEntitiesById[commentId];
          delete nextReplyCommentIdsByParentId[commentId];
        });

        return {
          posts: authorId
            ? prev.posts.filter(post => post.authorId !== authorId)
            : prev.posts,
          postsById: authorId ? nextPostsById : prev.postsById,
          detailStatusByPostId: authorId
            ? nextDetailStatusByPostId
            : prev.detailStatusByPostId,
          postViewRecordStatusByPostId: authorId
            ? nextPostViewRecordStatusByPostId
            : prev.postViewRecordStatusByPostId,
          commentsByPostId: authorId ? nextCommentsByPostId : prev.commentsByPostId,
          latestCommentByPostId: authorId
            ? nextLatestCommentByPostId
            : prev.latestCommentByPostId,
          commentsStatusByPostId: authorId
            ? nextCommentsStatusByPostId
            : prev.commentsStatusByPostId,
          latestCommentStatusByPostId: authorId
            ? nextLatestCommentStatusByPostId
            : prev.latestCommentStatusByPostId,
          topLevelCommentIdsByPostId: authorId
            ? nextTopLevelCommentIdsByPostId
            : prev.topLevelCommentIdsByPostId,
          commentEntitiesById: authorId
            ? nextCommentEntitiesById
            : prev.commentEntitiesById,
          replyCommentIdsByParentId: authorId
            ? nextReplyCommentIdsByParentId
            : prev.replyCommentIdsByParentId,
        };
      });

      clearHomeCommunityHighlightsCache();
      const refreshedState = get();
      await requestListPage({
        filter: refreshedState.activeFilter,
        category: refreshedState.activeCategory,
        pageSize: refreshedState.pageSize,
        page: 1,
        cursor: null,
        status: 'refreshing',
        resetHistory: true,
        clearPosts: false,
        requestKind: 'refresh',
      });
    },

    fetchPostDetail: async postId => {
      if (get().detailStatusByPostId[postId] === 'loading') return;
      const requestId = ++detailRequestSequence;
      communityCommentsRequestSequence += 1;

      set(prev => clearCommunityDetailState(prev, postId, 'loading'));

      try {
        const post = await fetchCommunityPostById(postId);
        if (requestId !== detailRequestSequence) return;

        if (!post) {
          set(prev => clearCommunityDetailState(prev, postId, 'not_found'));
          return;
        }

        let nextStatus: CommunityDetailStatus = 'ready';
        if (post.deletedAt) {
          nextStatus = 'deleted';
        } else if (
          post.status === 'hidden' ||
          post.status === 'auto_hidden' ||
          post.status === 'banned'
        ) {
          nextStatus = 'moderated';
        }

        set(prev => ({
          postsById: { ...prev.postsById, [postId]: post },
          posts: prev.posts.map(item => (item.id === postId ? post : item)),
          detailStatusByPostId: {
            ...prev.detailStatusByPostId,
            [postId]: nextStatus,
          },
        }));
      } catch {
        if (requestId !== detailRequestSequence) return;
        set(prev => clearCommunityDetailState(prev, postId, 'error'));
      }
    },

    recordPostView: async postId => {
      if (get().postViewRecordStatusByPostId[postId] === 'loading') return;
      if (!get().postsById[postId]) return;

      set(prev => ({
        postViewRecordStatusByPostId: {
          ...prev.postViewRecordStatusByPostId,
          [postId]: 'loading',
        },
      }));

      try {
        const result = await recordCommunityPostView(postId);
        set(prev => {
          const current = prev.postsById[postId] ?? null;
          const nextStatusMap = {
            ...prev.postViewRecordStatusByPostId,
            [postId]: 'ready' as const,
          };

          if (!current) {
            return {
              postViewRecordStatusByPostId: nextStatusMap,
            };
          }

          if (current.viewCount === result.viewCount) {
            return {
              postViewRecordStatusByPostId: nextStatusMap,
            };
          }

          const updatedPost: CommunityPost = {
            ...current,
            viewCount: result.viewCount,
          };

          return {
            postViewRecordStatusByPostId: nextStatusMap,
            postsById: {
              ...prev.postsById,
              [postId]: updatedPost,
            },
            posts: prev.posts.map(post =>
              post.id === postId
                ? {
                    ...post,
                    viewCount: result.viewCount,
                  }
                : post,
            ),
          };
        });
      } catch (error) {
        console.warn('community_post_view_record_failed', error);
        set(prev => ({
          postViewRecordStatusByPostId: {
            ...prev.postViewRecordStatusByPostId,
            [postId]: 'error',
          },
        }));
      }
    },

    fetchPostComments: async postId => {
      const detailState = get();
      if (
        detailState.detailStatusByPostId[postId] !== 'ready' ||
        !detailState.postsById[postId]
      ) {
        return;
      }
      if (get().commentsStatusByPostId[postId] === 'loading') return;

      const requestId = ++communityCommentsRequestSequence;

      set(prev => ({
        commentsStatusByPostId: {
          ...prev.commentsStatusByPostId,
          [postId]: 'loading',
        },
      }));

      try {
        const comments = await fetchCommunityComments(postId);
        if (requestId !== communityCommentsRequestSequence) return;
        const previousCommentsById = new Map(
          (get().commentsByPostId[postId] ?? []).map(
            comment => [comment.id, comment] as const,
          ),
        );
        const mergedComments = comments.map(comment =>
          preserveCommentAuthorMetadata(
            comment,
            previousCommentsById.get(comment.id),
          ),
        );
        const grouped = groupCommentsIntoThreads(mergedComments);
        set(prev => ({
          ...((): Pick<
            CommunityStore,
            'commentEntitiesById' | 'replyCommentIdsByParentId'
          > => {
            const previousCommentIds = new Set(
              (prev.commentsByPostId[postId] ?? []).map(comment => comment.id),
            );
            const nextCommentEntitiesById = { ...prev.commentEntitiesById };
            previousCommentIds.forEach(commentId => {
              delete nextCommentEntitiesById[commentId];
            });

            const nextReplyCommentIdsByParentId = {
              ...prev.replyCommentIdsByParentId,
            };
            const previousTopLevelIds =
              prev.topLevelCommentIdsByPostId[postId] ?? [];
            previousTopLevelIds.forEach(commentId => {
              delete nextReplyCommentIdsByParentId[commentId];
            });

            return {
              commentEntitiesById: {
                ...nextCommentEntitiesById,
                ...grouped.commentEntitiesById,
              },
              replyCommentIdsByParentId: {
                ...nextReplyCommentIdsByParentId,
                ...grouped.replyCommentIdsByParentId,
              },
            };
          })(),
          commentsByPostId: {
            ...prev.commentsByPostId,
            [postId]: mergedComments,
          },
          latestCommentByPostId: {
            ...prev.latestCommentByPostId,
            [postId]: getLatestCommentPreview(mergedComments),
          },
          topLevelCommentIdsByPostId: {
            ...prev.topLevelCommentIdsByPostId,
            [postId]: grouped.topLevelCommentIds,
          },
          commentsStatusByPostId: {
            ...prev.commentsStatusByPostId,
            [postId]: 'ready',
          },
          latestCommentStatusByPostId: {
            ...prev.latestCommentStatusByPostId,
            [postId]: 'ready',
          },
        }));
      } catch {
        if (requestId !== communityCommentsRequestSequence) return;
        set(prev => ({
          commentsStatusByPostId: {
            ...prev.commentsStatusByPostId,
            [postId]: 'error',
          },
        }));
      }
    },

    fetchLatestCommentPreview: async postId => {
      if (get().latestCommentStatusByPostId[postId] === 'loading') return;
      const currentPost = get().postsById[postId] ?? null;
      if (currentPost && currentPost.commentCount <= 0) {
        set(prev => ({
          latestCommentByPostId: {
            ...prev.latestCommentByPostId,
            [postId]: null,
          },
          latestCommentStatusByPostId: {
            ...prev.latestCommentStatusByPostId,
            [postId]: 'ready',
          },
        }));
        return;
      }

      set(prev => ({
        latestCommentStatusByPostId: {
          ...prev.latestCommentStatusByPostId,
          [postId]: 'loading',
        },
      }));

      try {
        const latestComment = await fetchLatestCommunityCommentPreview(postId);
        const previousComment = get().latestCommentByPostId[postId] ?? null;
        set(prev => ({
          latestCommentByPostId: {
            ...prev.latestCommentByPostId,
            [postId]:
              latestComment === null
                ? null
                : preserveCommentAuthorMetadata(latestComment, previousComment),
          },
          latestCommentStatusByPostId: {
            ...prev.latestCommentStatusByPostId,
            [postId]: 'ready',
          },
        }));
      } catch {
        set(prev => ({
          latestCommentStatusByPostId: {
            ...prev.latestCommentStatusByPostId,
            [postId]: 'error',
          },
        }));
      }
    },

    submitPost: async (params, userId) => {
      const post = await createCommunityPost(params, userId);
      set(prev => ({
        // The server owns notice-first ordering. Do not prepend a newly-created
        // regular post into an already-fetched page because that could place it
        // above a notice returned by the RPC.
        posts: prev.posts,
        postsById: { ...prev.postsById, [post.id]: post },
      }));

      const state = get();
      if (state.activeFilter === 'all' && state.currentPage === 1) {
        await state.fetchPosts('all').catch(() => {});
      }
      return post;
    },

    editPost: async (postId, params) => {
      await updateCommunityPost(postId, params);
      const current = get().postsById[postId];
      if (!current) return;
      const nextAvatarUrl =
        params.petSnapshot !== undefined
          ? toPublicPetAvatarUrl(params.petSnapshot?.avatarPath ?? null)
          : current.petAvatarUrl;
      const nextPetName =
        params.petId === null
          ? null
          : params.petSnapshot?.name ?? current.petName;
      const nextPetBreed =
        params.petId === null
          ? null
          : params.petSnapshot?.breed ?? current.petBreed;
      const nextPetSpecies =
        params.petId === null
          ? null
          : params.petSnapshot?.species ?? current.petSpecies;
      const nextPetAgeLabel =
        params.petId === null
          ? null
          : params.petSnapshot?.showPetAge === false
          ? null
          : params.petSnapshot?.ageLabel ?? current.petAgeLabel;

      get().updatePostInCache(postId, {
        title: params.title ?? current.title,
        content: params.content ?? current.content,
        category: params.category ?? current.category,
        petId: params.petId !== undefined ? params.petId : current.petId,
        imagePath:
          params.imagePath !== undefined ? params.imagePath : current.imagePath,
        imagePaths:
          params.imagePaths !== undefined
            ? params.imagePaths
            : current.imagePaths,
        imageUrls: params.imagePaths !== undefined ? [] : current.imageUrls,
        hasImage:
          params.imagePaths !== undefined
            ? params.imagePaths.some(path => `${path ?? ''}`.trim().length > 0)
            : params.imagePath !== undefined
            ? `${params.imagePath ?? ''}`.trim().length > 0
            : current.hasImage,
        imageUrl: params.imagePath !== undefined ? null : current.imageUrl,
        petName: nextPetName,
        petBreed: nextPetBreed,
        petSpecies: nextPetSpecies,
        petAgeLabel: nextPetAgeLabel,
        petAvatarUrl: nextAvatarUrl,
        showPetAge: params.petSnapshot?.showPetAge ?? current.showPetAge,
      });
    },

    removePost: async postId => {
      const deletedAt = await deleteCommunityPost(postId);
      set(prev => {
        const current = prev.postsById[postId];
        const nextPost = current
          ? {
              ...current,
              status: 'deleted' as const,
              deletedAt,
            }
          : undefined;

        return {
          posts: prev.posts.filter(post => post.id !== postId),
          postsById: nextPost
            ? { ...prev.postsById, [postId]: nextPost }
            : prev.postsById,
          detailStatusByPostId: {
            ...prev.detailStatusByPostId,
            [postId]: 'deleted',
          },
        };
      });
    },

    togglePostLike: async (postId, userId) => {
      const current = get().postsById[postId];
      if (!current) return;

      const optimisticIsLiked = !current.isLikedByMe;
      const optimisticLikeCount = optimisticIsLiked
        ? current.likeCount + 1
        : Math.max(current.likeCount - 1, 0);

      get().updatePostInCache(postId, {
        isLikedByMe: optimisticIsLiked,
        likeCount: optimisticLikeCount,
      });

      try {
        await toggleCommunityPostLike(postId, userId, current.isLikedByMe);
      } catch (error) {
        get().updatePostInCache(postId, {
          isLikedByMe: current.isLikedByMe,
          likeCount: current.likeCount,
        });
        throw error;
      }
    },

    toggleCommentLike: async (commentId, postId, userId) => {
      const current = get().commentEntitiesById[commentId] ?? null;
      if (!current) return;

      const optimisticIsLiked = !current.isLikedByMe;
      const optimisticLikeCount = optimisticIsLiked
        ? current.likeCount + 1
        : Math.max(current.likeCount - 1, 0);

      set(prev => ({
        commentsByPostId: {
          ...prev.commentsByPostId,
          [postId]: (prev.commentsByPostId[postId] ?? []).map(comment =>
            comment.id === commentId
              ? {
                  ...comment,
                  isLikedByMe: optimisticIsLiked,
                  likeCount: optimisticLikeCount,
                }
              : comment,
          ),
        },
        commentEntitiesById: {
          ...prev.commentEntitiesById,
          [commentId]: {
            ...prev.commentEntitiesById[commentId],
            isLikedByMe: optimisticIsLiked,
            likeCount: optimisticLikeCount,
          },
        },
      }));

      try {
        await toggleCommunityCommentLike(
          commentId,
          userId,
          current.isLikedByMe,
        );
      } catch (error) {
        set(prev => ({
          commentsByPostId: {
            ...prev.commentsByPostId,
            [postId]: (prev.commentsByPostId[postId] ?? []).map(comment =>
              comment.id === commentId
                ? {
                    ...comment,
                    isLikedByMe: current.isLikedByMe,
                    likeCount: current.likeCount,
                  }
                : comment,
            ),
          },
          commentEntitiesById: {
            ...prev.commentEntitiesById,
            [commentId]: {
              ...prev.commentEntitiesById[commentId],
              isLikedByMe: current.isLikedByMe,
              likeCount: current.likeCount,
            },
          },
        }));
        throw error;
      }
    },

    submitComment: async (postId, content, parentCommentId, replyToCommentId) => {
      const comment = await createCommunityComment({
        postId,
        content,
        parentCommentId: parentCommentId ?? null,
        replyToCommentId: replyToCommentId ?? null,
      });
      set(prev => ({
        commentsByPostId: {
          ...prev.commentsByPostId,
          [postId]: ((): CommunityComment[] => {
            const currentComments = prev.commentsByPostId[postId] ?? [];
            const nextComments = [...currentComments, comment];
            if (!comment.parentCommentId) {
              return nextComments;
            }

            return nextComments.map(item =>
              item.id === comment.parentCommentId
                ? { ...item, replyCount: item.replyCount + 1 }
                : item,
            );
          })(),
        },
        latestCommentByPostId: {
          ...prev.latestCommentByPostId,
          [postId]: comment,
        },
        commentEntitiesById: {
          ...prev.commentEntitiesById,
          ...(comment.parentCommentId &&
          prev.commentEntitiesById[comment.parentCommentId]
            ? {
                [comment.parentCommentId]: {
                  ...prev.commentEntitiesById[comment.parentCommentId],
                  replyCount:
                    prev.commentEntitiesById[comment.parentCommentId]
                      .replyCount + 1,
                },
              }
            : {}),
          [comment.id]: comment,
        },
        topLevelCommentIdsByPostId: {
          ...prev.topLevelCommentIdsByPostId,
          [postId]: comment.parentCommentId
            ? prev.topLevelCommentIdsByPostId[postId] ?? []
            : [...(prev.topLevelCommentIdsByPostId[postId] ?? []), comment.id],
        },
        replyCommentIdsByParentId: comment.parentCommentId
          ? {
              ...prev.replyCommentIdsByParentId,
              [comment.parentCommentId]: [
                ...(prev.replyCommentIdsByParentId[comment.parentCommentId] ??
                  []),
                comment.id,
              ],
            }
          : prev.replyCommentIdsByParentId,
        commentsStatusByPostId: {
          ...prev.commentsStatusByPostId,
          [postId]: 'ready',
        },
        latestCommentStatusByPostId: {
          ...prev.latestCommentStatusByPostId,
          [postId]: 'ready',
        },
        postsById: prev.postsById[postId]
          ? {
              ...prev.postsById,
              [postId]: {
                ...prev.postsById[postId],
                commentCount: prev.postsById[postId].commentCount + 1,
              },
            }
          : prev.postsById,
        posts: prev.posts.map(post =>
          post.id === postId
            ? { ...post, commentCount: post.commentCount + 1 }
            : post,
        ),
      }));
    },

    removeComment: async (commentId, postId) => {
      await deleteCommunityComment(commentId);

      // Invalidate an in-flight comments read before updating local state. A
      // late response must not reinsert a comment the protected RPC deleted.
      communityCommentsRequestSequence += 1;

      set(prev => {
        const currentComments = prev.commentsByPostId[postId] ?? [];
        const target = prev.commentEntitiesById[commentId] ?? null;
        const removedCommentIds = new Set<string>([commentId]);

        if (target && target.parentCommentId === null) {
          (prev.replyCommentIdsByParentId[target.id] ?? []).forEach(replyId => {
            removedCommentIds.add(replyId);
          });
        }

        const removedCount = removedCommentIds.size;
        const filteredComments = currentComments.filter(
          comment => !removedCommentIds.has(comment.id),
        );
        const nextCommentEntitiesById = { ...prev.commentEntitiesById };
        removedCommentIds.forEach(removedId => {
          delete nextCommentEntitiesById[removedId];
        });
        const nextReplyCommentIdsByParentId = {
          ...prev.replyCommentIdsByParentId,
        };

        if (target?.parentCommentId) {
          nextReplyCommentIdsByParentId[target.parentCommentId] = (
            prev.replyCommentIdsByParentId[target.parentCommentId] ?? []
          ).filter(id => id !== commentId);
        }

        if (target && target.parentCommentId === null) {
          delete nextReplyCommentIdsByParentId[target.id];
        }

        const nextTopLevelCommentIds = (
          prev.topLevelCommentIdsByPostId[postId] ?? []
        ).filter(id => !removedCommentIds.has(id));
        const nextCommentsForPost = target?.parentCommentId
          ? filteredComments.map(comment =>
              comment.id === target.parentCommentId
                ? {
                    ...comment,
                    replyCount: Math.max(comment.replyCount - 1, 0),
                  }
                : comment,
            )
          : filteredComments;

        return {
          commentsByPostId: {
            ...prev.commentsByPostId,
            [postId]: nextCommentsForPost,
          },
          latestCommentByPostId: {
            ...prev.latestCommentByPostId,
            [postId]: getLatestCommentPreview(nextCommentsForPost),
          },
          commentEntitiesById:
            target?.parentCommentId &&
            prev.commentEntitiesById[target.parentCommentId]
              ? {
                  ...nextCommentEntitiesById,
                  [target.parentCommentId]: {
                    ...prev.commentEntitiesById[target.parentCommentId],
                    replyCount: Math.max(
                      prev.commentEntitiesById[target.parentCommentId]
                        .replyCount - 1,
                      0,
                    ),
                  },
                }
              : nextCommentEntitiesById,
          topLevelCommentIdsByPostId: {
            ...prev.topLevelCommentIdsByPostId,
            [postId]: nextTopLevelCommentIds,
          },
          replyCommentIdsByParentId: nextReplyCommentIdsByParentId,
          latestCommentStatusByPostId: {
            ...prev.latestCommentStatusByPostId,
            [postId]: 'ready',
          },
          postsById: prev.postsById[postId]
            ? {
                ...prev.postsById,
                [postId]: {
                  ...prev.postsById[postId],
                  commentCount: Math.max(
                    prev.postsById[postId].commentCount - removedCount,
                    0,
                  ),
                },
              }
            : prev.postsById,
          posts: prev.posts.map(post =>
            post.id === postId
              ? {
                  ...post,
                  commentCount: Math.max(post.commentCount - removedCount, 0),
                }
              : post,
          ),
        };
      });

    },

    reportContent: async (
      targetType,
      targetId,
      reasonCategory,
      reason,
      reporterId,
    ) => {
      return createCommunityReport(
        { targetType, targetId, reasonCategory, reason },
        reporterId,
      );
    },

    updatePostInCache: (postId, patch) => {
      set(prev => {
        const current = prev.postsById[postId];
        if (!current) return prev;
        const updated = { ...current, ...patch };
        return {
          postsById: { ...prev.postsById, [postId]: updated },
          posts: prev.posts.map(post => (post.id === postId ? updated : post)),
        };
      });
    },

    clearAll: () => {
      listRequestSequence += 1;
      detailRequestSequence += 1;
      communityCommentsRequestSequence += 1;
      set({
        posts: [],
        postsById: {},
        commentsByPostId: {},
        latestCommentByPostId: {},
        commentEntitiesById: {},
        topLevelCommentIdsByPostId: {},
        replyCommentIdsByParentId: {},
        commentsStatusByPostId: {},
        latestCommentStatusByPostId: {},
        detailStatusByPostId: {},
        postViewRecordStatusByPostId: {},
        listStatus: 'idle',
        listErrorMessage: null,
        cursor: null,
        hasMore: true,
        hasNextPage: true,
        hasPreviousPage: false,
        currentPage: 1,
        cursorHistory: {
          [getCommunityListKey('all', 'all', DEFAULT_COMMUNITY_PAGE_SIZE)]: {
            1: null,
          },
        },
        activeFilter: 'all',
        activeCategory: 'all',
        pageSize: DEFAULT_COMMUNITY_PAGE_SIZE,
        lastFetchedAt: null,
      });
    },
  };
});
