import type { CommunityComment } from '../../../types/community';

export type GroupedCommentThreads = {
  commentEntitiesById: Record<string, CommunityComment>;
  topLevelCommentIds: string[];
  replyCommentIdsByParentId: Record<string, string[]>;
};

export type CommunityCommentNavigationTarget = {
  targetCommentId: string;
  threadCommentId: string;
  threadIndex: number;
  isReply: boolean;
};

export type CommunityCommentSort = 'registered' | 'latest' | 'replies';

export const COMMUNITY_COMMENT_SORT_OPTIONS: ReadonlyArray<{
  key: CommunityCommentSort;
  label: string;
  description: string;
}> = [
  {
    key: 'registered',
    label: '등록순',
    description: '먼저 등록된 댓글부터',
  },
  {
    key: 'latest',
    label: '최신순',
    description: '최근에 등록된 댓글부터',
  },
  {
    key: 'replies',
    label: '답글순',
    description: '답글이 많은 댓글부터',
  },
];

export function isCommentByPostAuthor(
  commentAuthorId: string,
  postAuthorId: string,
) {
  return commentAuthorId.length > 0 && commentAuthorId === postAuthorId;
}

export function groupCommentsIntoThreads(
  comments: ReadonlyArray<CommunityComment>,
): GroupedCommentThreads {
  const commentEntitiesById: Record<string, CommunityComment> = {};
  const topLevelCommentIds: string[] = [];
  const replyCommentIdsByParentId: Record<string, string[]> = {};

  comments.forEach(comment => {
    commentEntitiesById[comment.id] = comment;

    if (comment.depth === 0 || !comment.parentCommentId) {
      topLevelCommentIds.push(comment.id);
      return;
    }

    const currentReplyIds = replyCommentIdsByParentId[comment.parentCommentId] ?? [];
    replyCommentIdsByParentId[comment.parentCommentId] = [
      ...currentReplyIds,
      comment.id,
    ];
  });

  return {
    commentEntitiesById,
    topLevelCommentIds,
    replyCommentIdsByParentId,
  };
}

export function getVisibleReplies(
  replyIds: ReadonlyArray<string>,
  expanded: boolean,
  previewCount: number,
) {
  const visibleReplyIds = expanded ? [...replyIds] : replyIds.slice(0, previewCount);
  const remainingReplyCount = Math.max(replyIds.length - visibleReplyIds.length, 0);

  return {
    visibleReplyIds,
    remainingReplyCount,
  };
}

function compareIdsAscending(left: string, right: string) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function compareIdsDescending(left: string, right: string) {
  return compareIdsAscending(right, left);
}

function compareCreatedAt(
  left: CommunityComment,
  right: CommunityComment,
  direction: 'ascending' | 'descending',
) {
  const leftTime = Date.parse(left.createdAt);
  const rightTime = Date.parse(right.createdAt);
  const leftIsValid = Number.isFinite(leftTime);
  const rightIsValid = Number.isFinite(rightTime);

  if (leftIsValid && rightIsValid && leftTime !== rightTime) {
    return direction === 'ascending'
      ? leftTime - rightTime
      : rightTime - leftTime;
  }

  if (leftIsValid !== rightIsValid) {
    return leftIsValid ? -1 : 1;
  }

  return 0;
}

/**
 * Reorders only root comment IDs. Reply IDs remain in their server-provided
 * order, and reply counts come from the RLS-filtered thread map rather than a
 * raw stored aggregate so hidden replies cannot affect the ranking.
 */
export function sortCommunityCommentIds(
  commentIds: ReadonlyArray<string>,
  commentEntitiesById: Readonly<Record<string, CommunityComment>>,
  replyCommentIdsByParentId: Readonly<Record<string, ReadonlyArray<string>>>,
  sort: CommunityCommentSort,
) {
  return [...commentIds].sort((leftId, rightId) => {
    const left = commentEntitiesById[leftId];
    const right = commentEntitiesById[rightId];

    if (!left || !right) {
      return compareIdsAscending(leftId, rightId);
    }

    if (sort === 'registered') {
      const createdAtOrder = compareCreatedAt(left, right, 'ascending');
      if (createdAtOrder !== 0) return createdAtOrder;
      return compareIdsAscending(left.id, right.id);
    }

    if (sort === 'replies') {
      const leftReplyCount = replyCommentIdsByParentId[leftId]?.length ?? 0;
      const rightReplyCount = replyCommentIdsByParentId[rightId]?.length ?? 0;
      if (leftReplyCount !== rightReplyCount) {
        return rightReplyCount - leftReplyCount;
      }

      const createdAtOrder = compareCreatedAt(left, right, 'ascending');
      if (createdAtOrder !== 0) return createdAtOrder;
      return compareIdsAscending(left.id, right.id);
    }

    const createdAtOrder = compareCreatedAt(left, right, 'descending');
    if (createdAtOrder !== 0) return createdAtOrder;
    return compareIdsDescending(left.id, right.id);
  });
}

export function getCommunityCommentSortLabel(sort: CommunityCommentSort) {
  return (
    COMMUNITY_COMMENT_SORT_OPTIONS.find(option => option.key === sort)?.label ??
    '등록순'
  );
}

export function getCommunityReplyTargetMention(
  nickname: string | null | undefined,
) {
  const normalizedNickname = nickname?.trim() ?? '';
  return normalizedNickname.length > 0 ? `@${normalizedNickname}` : null;
}

export function resolveCommunityCommentNavigationTarget(
  targetCommentId: string,
  commentEntitiesById: Readonly<Record<string, CommunityComment>>,
  topLevelCommentIds: ReadonlyArray<string>,
): CommunityCommentNavigationTarget | null {
  const target = commentEntitiesById[targetCommentId] ?? null;
  if (!target) return null;

  const threadCommentId =
    target.depth === 0 || !target.parentCommentId
      ? target.id
      : target.parentCommentId;
  const threadIndex = topLevelCommentIds.indexOf(threadCommentId);
  if (threadIndex < 0) return null;

  return {
    targetCommentId,
    threadCommentId,
    threadIndex,
    isReply: target.id !== threadCommentId,
  };
}
