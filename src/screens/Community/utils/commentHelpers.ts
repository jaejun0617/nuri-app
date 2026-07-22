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
