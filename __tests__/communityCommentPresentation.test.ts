import {
  getVisibleReplies,
  groupCommentsIntoThreads,
  isCommentByPostAuthor,
  resolveCommunityCommentNavigationTarget,
} from '../src/screens/Community/utils/commentHelpers';
import type { CommunityComment } from '../src/types/community';

function buildComment(
  id: string,
  authorId: string,
  parentCommentId: string | null,
): CommunityComment {
  return {
    id,
    postId: 'post-1',
    authorId,
    authorNickname: authorId,
    authorAvatarUrl: null,
    parentCommentId,
    depth: parentCommentId ? 1 : 0,
    replyCount: parentCommentId ? 0 : 1,
    likeCount: 0,
    isLikedByMe: false,
    content: id,
    status: 'active',
    deletedAt: null,
    createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
  };
}

describe('community comment presentation', () => {
  it('identifies both comments and replies written by the post author', () => {
    expect(isCommentByPostAuthor('author-1', 'author-1')).toBe(true);
    expect(isCommentByPostAuthor('reader-1', 'author-1')).toBe(false);
    expect(isCommentByPostAuthor('', '')).toBe(false);
  });

  it('groups one-level replies under their top-level comment', () => {
    const comments = [
      buildComment('parent-1', 'reader-1', null),
      buildComment('reply-1', 'author-1', 'parent-1'),
      buildComment('parent-2', 'author-1', null),
    ];

    expect(groupCommentsIntoThreads(comments)).toMatchObject({
      topLevelCommentIds: ['parent-1', 'parent-2'],
      replyCommentIdsByParentId: { 'parent-1': ['reply-1'] },
    });
  });

  it('keeps reply previews bounded until the thread is expanded', () => {
    expect(getVisibleReplies(['1', '2', '3'], false, 2)).toEqual({
      visibleReplyIds: ['1', '2'],
      remainingReplyCount: 1,
    });
    expect(getVisibleReplies(['1', '2', '3'], true, 2)).toEqual({
      visibleReplyIds: ['1', '2', '3'],
      remainingReplyCount: 0,
    });
  });

  it('resolves a notification target to the containing comment thread', () => {
    const comments = [
      buildComment('parent-1', 'reader-1', null),
      buildComment('reply-1', 'author-1', 'parent-1'),
      buildComment('parent-2', 'author-1', null),
    ];
    const grouped = groupCommentsIntoThreads(comments);

    expect(
      resolveCommunityCommentNavigationTarget(
        'reply-1',
        grouped.commentEntitiesById,
        grouped.topLevelCommentIds,
      ),
    ).toEqual({
      targetCommentId: 'reply-1',
      threadCommentId: 'parent-1',
      threadIndex: 0,
      isReply: true,
    });
    expect(
      resolveCommunityCommentNavigationTarget(
        'missing-comment',
        grouped.commentEntitiesById,
        grouped.topLevelCommentIds,
      ),
    ).toBeNull();
  });
});
