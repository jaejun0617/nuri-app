import {
  COMMUNITY_COMMENT_SORT_OPTIONS,
  getVisibleReplies,
  getCommunityCommentSortLabel,
  groupCommentsIntoThreads,
  isCommentByPostAuthor,
  resolveCommunityCommentNavigationTarget,
  sortCommunityCommentIds,
} from '../src/screens/Community/utils/commentHelpers';
import type { CommunityComment } from '../src/types/community';

function buildComment(
  id: string,
  authorId: string,
  parentCommentId: string | null,
  createdAt = '2026-07-19T00:00:00.000Z',
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
    createdAt,
    updatedAt: createdAt,
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

  it('sorts registered roots oldest first and preserves replies under their root', () => {
    const comments = [
      buildComment('root-2', 'reader-2', null, '2026-07-19T00:00:02.000Z'),
      buildComment('reply-2', 'reader-3', 'root-2', '2026-07-19T00:00:03.000Z'),
      buildComment('root-1', 'reader-1', null, '2026-07-19T00:00:01.000Z'),
    ];
    const grouped = groupCommentsIntoThreads(comments);

    expect(
      sortCommunityCommentIds(
        grouped.topLevelCommentIds,
        grouped.commentEntitiesById,
        grouped.replyCommentIdsByParentId,
        'registered',
      ),
    ).toEqual(['root-1', 'root-2']);
    expect(grouped.replyCommentIdsByParentId).toEqual({
      'root-2': ['reply-2'],
    });
  });

  it('sorts latest roots by created time and stable id', () => {
    const comments = [
      buildComment('older-z', 'reader-1', null, '2026-07-19T00:00:01.000Z'),
      buildComment('newer-a', 'reader-2', null, '2026-07-19T00:00:03.000Z'),
      buildComment('newer-b', 'reader-3', null, '2026-07-19T00:00:03.000Z'),
    ];
    const grouped = groupCommentsIntoThreads(comments);

    expect(
      sortCommunityCommentIds(
        grouped.topLevelCommentIds,
        grouped.commentEntitiesById,
        grouped.replyCommentIdsByParentId,
        'latest',
      ),
    ).toEqual(['newer-b', 'newer-a', 'older-z']);
  });

  it('sorts reply mode by visible reply count, then oldest root', () => {
    const comments = [
      buildComment('root-c', 'reader-3', null, '2026-07-19T00:00:03.000Z'),
      buildComment('root-a', 'reader-1', null, '2026-07-19T00:00:01.000Z'),
      buildComment('root-b', 'reader-2', null, '2026-07-19T00:00:02.000Z'),
    ];
    const grouped = groupCommentsIntoThreads(comments);
    const entitiesWithDifferentStoredCounts = {
      ...grouped.commentEntitiesById,
      'root-a': { ...grouped.commentEntitiesById['root-a'], replyCount: 0 },
      'root-b': { ...grouped.commentEntitiesById['root-b'], replyCount: 99 },
    };

    expect(
      sortCommunityCommentIds(
        grouped.topLevelCommentIds,
        entitiesWithDifferentStoredCounts,
        {
          'root-a': ['reply-a-1', 'reply-a-2'],
          'root-b': ['reply-b-1'],
          'root-c': ['reply-c-1', 'reply-c-2'],
        },
        'replies',
      ),
    ).toEqual(['root-a', 'root-c', 'root-b']);
  });

  it('exposes exactly the three session-only sort options', () => {
    expect(COMMUNITY_COMMENT_SORT_OPTIONS.map(option => option.label)).toEqual([
      '등록순',
      '최신순',
      '답글순',
    ]);
    expect(getCommunityCommentSortLabel('latest')).toBe('최신순');
  });
});
