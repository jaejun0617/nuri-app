import type { CommunityComment } from '../../../types/community';

export type GroupedCommentThreads = {
  commentEntitiesById: Record<string, CommunityComment>;
  topLevelCommentIds: string[];
  replyCommentIdsByParentId: Record<string, string[]>;
};

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
