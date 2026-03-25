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
import { toPublicPetAvatarUrl } from '../services/supabase/pets';
import { groupCommentsIntoThreads } from '../screens/Community/utils/commentHelpers';
import {
  createCommunityComment,
  createCommunityPost,
  createCommunityReport,
  deleteCommunityPost,
  deleteCommunityComment,
  fetchCommunityComments,
  fetchCommunityPostById,
  fetchCommunityPosts,
  toggleCommunityCommentLike,
  toggleCommunityPostLike,
  updateCommunityPost,
} from '../services/supabase/community';
import type {
  CommunityComment,
  CommunityDetailStatus,
  CommunityListStatus,
  CommunityPost,
  CommunityPostCategory,
  CommunityReportReasonCategory,
  CreateCommunityPostParams,
  UpdateCommunityPostParams,
} from '../types/community';

const COMMUNITY_PAGE_SIZE = 20;
const UNKNOWN_COMMENT_AUTHOR_NICKNAME = '알 수 없는 사용자';

type CommunityStore = {
  posts: CommunityPost[];
  postsById: Record<string, CommunityPost>;
  commentsByPostId: Record<string, CommunityComment[]>;
  commentEntitiesById: Record<string, CommunityComment>;
  topLevelCommentIdsByPostId: Record<string, string[]>;
  replyCommentIdsByParentId: Record<string, string[]>;
  commentsStatusByPostId: Record<string, 'idle' | 'loading' | 'ready' | 'error'>;
  detailStatusByPostId: Record<string, CommunityDetailStatus>;
  listStatus: CommunityListStatus;
  listErrorMessage: string | null;
  cursor: string | null;
  hasMore: boolean;
  activeCategory: CommunityPostCategory | null;
  lastFetchedAt: number | null;

  fetchPosts: (category?: CommunityPostCategory | null) => Promise<void>;
  refreshPosts: () => Promise<void>;
  loadMorePosts: () => Promise<void>;
  fetchPostDetail: (postId: string) => Promise<void>;
  fetchPostComments: (postId: string) => Promise<void>;
  submitPost: (params: CreateCommunityPostParams, userId: string) => Promise<CommunityPost>;
  editPost: (postId: string, params: UpdateCommunityPostParams) => Promise<void>;
  removePost: (postId: string) => Promise<void>;
  togglePostLike: (postId: string, userId: string) => Promise<void>;
  toggleCommentLike: (commentId: string, postId: string, userId: string) => Promise<void>;
  submitComment: (
    postId: string,
    content: string,
    userId: string,
    parentCommentId?: string | null,
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

function hasKnownCommentAuthorNickname(comment: CommunityComment | null | undefined) {
  const nickname = `${comment?.authorNickname ?? ''}`.trim();
  return (
    nickname.length > 0 && nickname !== UNKNOWN_COMMENT_AUTHOR_NICKNAME
  );
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

export const useCommunityStore = create<CommunityStore>((set, get) => ({
  posts: [],
  postsById: {},
  commentsByPostId: {},
  commentEntitiesById: {},
  topLevelCommentIdsByPostId: {},
  replyCommentIdsByParentId: {},
  commentsStatusByPostId: {},
  detailStatusByPostId: {},
  listStatus: 'idle',
  listErrorMessage: null,
  cursor: null,
  hasMore: true,
  activeCategory: null,
  lastFetchedAt: null,

  fetchPosts: async category => {
    if (get().listStatus === 'loading') return;
    set({
      listStatus: 'loading',
      listErrorMessage: null,
      activeCategory: category ?? null,
    });

    try {
      const result = await fetchCommunityPosts({
        category: category ?? null,
        cursor: null,
        limit: COMMUNITY_PAGE_SIZE,
      });
      set(prev => ({
        posts: result.items,
        postsById: mergePostsById(prev.postsById, result.items),
        listStatus: 'ready',
        cursor: result.nextCursor,
        hasMore: result.hasMore,
        lastFetchedAt: Date.now(),
      }));
    } catch (error: unknown) {
      set({
        listStatus: 'error',
        listErrorMessage: getErrorMessage(error) || '게시글을 불러오지 못했어요.',
      });
    }
  },

  refreshPosts: async () => {
    const category = get().activeCategory;
    if (get().listStatus === 'refreshing') return;

    set({ listStatus: 'refreshing', listErrorMessage: null });

    try {
      const result = await fetchCommunityPosts({
        category,
        cursor: null,
        limit: COMMUNITY_PAGE_SIZE,
      });
      set(prev => ({
        posts: result.items,
        postsById: mergePostsById(prev.postsById, result.items),
        listStatus: 'ready',
        cursor: result.nextCursor,
        hasMore: result.hasMore,
        lastFetchedAt: Date.now(),
      }));
    } catch (error: unknown) {
      set({
        listStatus: 'error',
        listErrorMessage: getErrorMessage(error) || '새로고침에 실패했어요.',
      });
    }
  },

  loadMorePosts: async () => {
    const state = get();
    if (!state.hasMore || !state.cursor) return;
    if (
      state.listStatus === 'loading' ||
      state.listStatus === 'refreshing' ||
      state.listStatus === 'loadingMore'
    ) {
      return;
    }

    set({ listStatus: 'loadingMore', listErrorMessage: null });

    try {
      const result = await fetchCommunityPosts({
        category: state.activeCategory,
        cursor: state.cursor,
        limit: COMMUNITY_PAGE_SIZE,
      });
      const existingIds = new Set(get().posts.map(post => post.id));
      const appended = result.items.filter(post => !existingIds.has(post.id));
      set(prev => ({
        posts: [...prev.posts, ...appended],
        postsById: mergePostsById(prev.postsById, result.items),
        listStatus: 'ready',
        cursor: result.nextCursor,
        hasMore: result.hasMore,
        lastFetchedAt: Date.now(),
      }));
    } catch (error: unknown) {
      set({
        listStatus: 'ready',
        listErrorMessage: getErrorMessage(error) || '더 불러오지 못했어요.',
      });
    }
  },

  fetchPostDetail: async postId => {
    if (get().detailStatusByPostId[postId] === 'loading') return;
    const cachedPost = get().postsById[postId] ?? null;

    set(prev => ({
      detailStatusByPostId: {
        ...prev.detailStatusByPostId,
        [postId]: 'loading',
      },
    }));

    try {
      const post = await fetchCommunityPostById(postId);
      if (!post) {
        set(prev => ({
          posts: prev.posts.filter(item => item.id !== postId),
          postsById: (() => {
            if (!prev.postsById[postId]) return prev.postsById;
            const nextPostsById = { ...prev.postsById };
            delete nextPostsById[postId];
            return nextPostsById;
          })(),
          detailStatusByPostId: {
            ...prev.detailStatusByPostId,
            [postId]: 'not_found',
          },
        }));
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
      set(prev => {
        if (cachedPost) {
          return {
            detailStatusByPostId: {
              ...prev.detailStatusByPostId,
              [postId]: 'ready',
            },
          };
        }

        return {
          detailStatusByPostId: {
            ...prev.detailStatusByPostId,
            [postId]: 'error',
          },
        };
      });
    }
  },

  fetchPostComments: async postId => {
    if (get().commentsStatusByPostId[postId] === 'loading') return;

    set(prev => ({
      commentsStatusByPostId: {
        ...prev.commentsStatusByPostId,
        [postId]: 'loading',
      },
    }));

    try {
      const comments = await fetchCommunityComments(postId);
      const previousCommentsById = new Map(
        (get().commentsByPostId[postId] ?? []).map(comment => [comment.id, comment] as const),
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
          const previousTopLevelIds = prev.topLevelCommentIdsByPostId[postId] ?? [];
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
        topLevelCommentIdsByPostId: {
          ...prev.topLevelCommentIdsByPostId,
          [postId]: grouped.topLevelCommentIds,
        },
        commentsStatusByPostId: {
          ...prev.commentsStatusByPostId,
          [postId]: 'ready',
        },
      }));
    } catch {
      set(prev => ({
        commentsStatusByPostId: {
          ...prev.commentsStatusByPostId,
          [postId]: 'error',
        },
      }));
    }
  },

  submitPost: async (params, userId) => {
    const post = await createCommunityPost(params, userId);
    set(prev => ({
      posts: [post, ...prev.posts],
      postsById: { ...prev.postsById, [post.id]: post },
    }));
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
      params.petId === null ? null : params.petSnapshot?.name ?? current.petName;
    const nextPetBreed =
      params.petId === null ? null : params.petSnapshot?.breed ?? current.petBreed;
    const nextPetSpecies =
      params.petId === null ? null : params.petSnapshot?.species ?? current.petSpecies;
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
      imagePath: params.imagePath !== undefined ? params.imagePath : current.imagePath,
      imagePaths:
        params.imagePaths !== undefined ? params.imagePaths : current.imagePaths,
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
      await toggleCommunityCommentLike(commentId, userId, current.isLikedByMe);
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

  submitComment: async (postId, content, userId, parentCommentId) => {
    const comment = await createCommunityComment(
      { postId, content, parentCommentId: parentCommentId ?? null },
      userId,
    );
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
      commentEntitiesById: {
        ...prev.commentEntitiesById,
        ...(comment.parentCommentId && prev.commentEntitiesById[comment.parentCommentId]
          ? {
              [comment.parentCommentId]: {
                ...prev.commentEntitiesById[comment.parentCommentId],
                replyCount:
                  prev.commentEntitiesById[comment.parentCommentId].replyCount + 1,
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
              ...(prev.replyCommentIdsByParentId[comment.parentCommentId] ?? []),
              comment.id,
            ],
          }
        : prev.replyCommentIdsByParentId,
      commentsStatusByPostId: {
        ...prev.commentsStatusByPostId,
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
      const nextReplyCommentIdsByParentId = { ...prev.replyCommentIdsByParentId };

      if (target?.parentCommentId) {
        nextReplyCommentIdsByParentId[target.parentCommentId] = (
          prev.replyCommentIdsByParentId[target.parentCommentId] ?? []
        ).filter(id => id !== commentId);
      }

      if (target && target.parentCommentId === null) {
        delete nextReplyCommentIdsByParentId[target.id];
      }

      const nextTopLevelCommentIds = (prev.topLevelCommentIdsByPostId[postId] ?? []).filter(
        id => !removedCommentIds.has(id),
      );

      return {
        commentsByPostId: {
          ...prev.commentsByPostId,
          [postId]:
            target?.parentCommentId
              ? filteredComments.map(comment =>
                  comment.id === target.parentCommentId
                    ? {
                        ...comment,
                        replyCount: Math.max(comment.replyCount - 1, 0),
                      }
                    : comment,
                )
              : filteredComments,
        },
        commentEntitiesById:
          target?.parentCommentId && prev.commentEntitiesById[target.parentCommentId]
            ? {
                ...nextCommentEntitiesById,
                [target.parentCommentId]: {
                  ...prev.commentEntitiesById[target.parentCommentId],
                  replyCount: Math.max(
                    prev.commentEntitiesById[target.parentCommentId].replyCount - 1,
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

    try {
      await deleteCommunityComment(commentId);
    } catch (error) {
      await get().fetchPostComments(postId);
      throw error;
    }
  },

  reportContent: async (targetType, targetId, reasonCategory, reason, reporterId) => {
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
    set({
      posts: [],
      postsById: {},
      commentsByPostId: {},
      commentEntitiesById: {},
      topLevelCommentIdsByPostId: {},
      replyCommentIdsByParentId: {},
      commentsStatusByPostId: {},
      detailStatusByPostId: {},
      listStatus: 'idle',
      listErrorMessage: null,
      cursor: null,
      hasMore: true,
      activeCategory: null,
      lastFetchedAt: null,
    });
  },
}));
