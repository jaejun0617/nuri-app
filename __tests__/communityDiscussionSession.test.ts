import { createDiscussionSession } from '../src/screens/Community/discussionSession';
import { useCommunityStore } from '../src/store/communityStore';
import {
  fetchDiscussionSummary,
  fetchDiscussionThreads,
  fetchDiscussionReplies,
  DiscussionReadError,
} from '../src/services/community/discussionRead';
import type { CommunityComment } from '../src/types/community';

jest.mock('../src/services/community/discussionRead', () => ({
  ...jest.requireActual('../src/services/community/discussionRead'),
  fetchDiscussionSummary: jest.fn(),
  fetchDiscussionThreads: jest.fn(),
  fetchDiscussionReplies: jest.fn(),
}));
const summary = jest.mocked(fetchDiscussionSummary);
const threads = jest.mocked(fetchDiscussionThreads);
const replies = jest.mocked(fetchDiscussionReplies);
function comment(
  id: string,
  parentCommentId: string | null = null,
): CommunityComment {
  return {
    id,
    postId: 'post',
    authorId: 'qa',
    authorNickname: 'QA',
    authorAvatarUrl: null,
    parentCommentId,
    replyToCommentId: parentCommentId,
    replyTargetUserId: null,
    replyTargetNickname: null,
    depth: parentCommentId ? 1 : 0,
    replyCount: 0,
    likeCount: 0,
    isLikedByMe: false,
    content: '합성 테스트',
    status: 'active',
    deletedAt: null,
    createdAt: '2026-10-08T00:00:00Z',
    updatedAt: '2026-10-08T00:00:00Z',
  };
}
const page = (ids: string[]) => ({
  revision: 'r1',
  rootIds: ids,
  comments: ids.map(id => comment(id)),
  replyPages: [],
  previous: null,
  next: null,
  anchorFound: true,
  anchorRootId: null,
});
const cursor = {
  version: 1 as const,
  post_id: 'post',
  scope: 'threads' as const,
  revision: 'r1',
  id: 'a',
  direction: 'after' as const,
  sort: 'registered' as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  useCommunityStore.getState().clearAll();
  summary.mockResolvedValue({
    total: 6,
    revision: 'r1',
    comments: ['a', 'b', 'c'].map(id => comment(id)),
  });
  threads.mockResolvedValue(page(['a', 'b', 'c']));
});
test('preview is a separate bounded cache; opening comments reuses summary and author entities', async () => {
  const session = createDiscussionSession('post');
  await session.summary();
  await session.summary();
  await session.threads();
  expect(summary).toHaveBeenCalledTimes(1);
  expect(threads).toHaveBeenCalledTimes(1);
  expect(session.store.getState()).toMatchObject({
    total: 6,
    previewIds: ['a', 'b', 'c'],
    summaryStatus: 'ready',
  });
  expect(useCommunityStore.getState().commentEntitiesById.a.content).toBe(
    '합성 테스트',
  );
});
test('duplicate page requests are locked and appended IDs deduplicate', async () => {
  const session = createDiscussionSession('post');
  await session.threads();
  threads.mockResolvedValue(page(['c', 'd']));
  await Promise.all([session.threads(cursor), session.threads(cursor)]);
  expect(threads).toHaveBeenCalledTimes(2);
  expect(session.store.getState().threads.ids).toEqual(['a', 'b', 'c', 'd']);
});
test('preview replies and count remain bounded after full replies load, and refresh replaces them', async () => {
  const session = createDiscussionSession('post');
  summary.mockResolvedValueOnce({
    total: 12,
    revision: 'r',
    comments: [
      comment('a'),
      ...Array.from({ length: 9 }, (_, i) => comment(`reply-${i}`, 'a')),
    ],
  });
  await session.summary();
  const preview = session.store.getState();
  replies.mockResolvedValueOnce({
    rootId: 'a',
    total: 11,
    anchorFound: true,
    comments: [comment('outside-preview', 'a')],
    previous: null,
    next: null,
  });
  await session.replies('a');
  expect(session.store.getState()).toMatchObject({
    previewIds: ['a'],
    previewCount: 10,
    previewReplyIds: preview.previewReplyIds,
  });
  expect(session.store.getState().previewReplyIds.a).not.toContain(
    'outside-preview',
  );
  summary.mockResolvedValueOnce({
    total: 2,
    revision: 'r2',
    comments: [comment('a'), comment('new-reply', 'a')],
  });
  await session.refresh('post');
  expect(session.store.getState()).toMatchObject({
    previewCount: 2,
    previewReplyIds: { a: ['new-reply'] },
  });
  summary.mockRejectedValueOnce(new DiscussionReadError('FORBIDDEN'));
  await session.refresh('post');
  expect(session.store.getState()).toMatchObject({
    previewCount: 0,
    previewReplyIds: {},
    previewIds: [],
  });
});
test('previous pages prepend and retain the later boundary', async () => {
  const session = createDiscussionSession('post');
  threads.mockResolvedValueOnce({
    ...page(['c']),
    previous: { ...cursor, direction: 'before' },
    next: cursor,
  });
  await session.threads();
  threads.mockResolvedValueOnce(page(['a', 'b']));
  await session.threads({ ...cursor, direction: 'before' });
  expect(session.store.getState().threads).toEqual({
    ids: ['a', 'b', 'c'],
    previous: null,
    next: cursor,
  });
});
test('stale cursor keeps draft, target, selection and loaded content, and reports retry', async () => {
  const session = createDiscussionSession('post');
  await session.threads();
  session.draft.current = '작성 중';
  session.selection.current = { start: 2, end: 2 };
  session.store.setState({ selectedId: 'b', replyTargetId: 'b' });
  threads.mockRejectedValueOnce(new DiscussionReadError('STALE_CURSOR'));
  await session.threads(cursor);
  expect(session.store.getState()).toMatchObject({
    threadStatus: 'error',
    replyTargetId: 'b',
    selectedId: 'b',
    threads: { ids: ['a', 'b', 'c'] },
  });
  expect(session.draft.current).toBe('작성 중');
  expect(session.selection.current?.start).toBe(2);
});
test('keystrokes do not notify rows or screen subscribers', () => {
  const session = createDiscussionSession('post');
  const subscriber = jest.fn();
  session.store.subscribe(subscriber);
  session.draft.current = '연속 한글';
  session.selection.current = { start: 5, end: 5 };
  expect(subscriber).not.toHaveBeenCalled();
});
test('sort invalidates a late previous request without overwriting the current page', async () => {
  const session = createDiscussionSession('post');
  let resolve!: (value: ReturnType<typeof page>) => void;
  threads.mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  const old = session.threads();
  threads.mockResolvedValueOnce(page(['new']));
  await session.changeSort('latest');
  resolve(page(['old']));
  await old;
  expect(session.store.getState().threads.ids).toEqual(['new']);
  expect(useCommunityStore.getState().commentEntitiesById.old).toBeUndefined();
});
test('dispose prevents late private-content hydration and clears the draft', async () => {
  const session = createDiscussionSession('post');
  session.draft.current = '임시';
  let resolve!: (
    value: Awaited<ReturnType<typeof fetchDiscussionSummary>>,
  ) => void;
  summary.mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  const pending = session.summary();
  session.dispose();
  resolve({ total: 1, revision: 'r', comments: [comment('late')] });
  await pending;
  expect(session.draft.current).toBe('');
  expect(useCommunityStore.getState().commentEntitiesById.late).toBeUndefined();
});
test('far reply anchors fetch their bounded reply window, not all replies', async () => {
  const session = createDiscussionSession('post');
  threads.mockResolvedValueOnce({ ...page(['root']), anchorRootId: 'root' });
  replies.mockResolvedValueOnce({
    rootId: 'root',
    total: 50,
    anchorFound: true,
    comments: [comment('far', 'root')],
    previous: null,
    next: null,
  });
  await session.threads(null, 'far');
  expect(replies).toHaveBeenCalledWith('post', 'root', null, 'far');
  expect(session.store.getState()).toMatchObject({
    threadStatus: 'ready',
    expanded: { root: true },
  });
  expect(useCommunityStore.getState().replyCommentIdsByParentId.root).toEqual([
    'far',
  ]);
});
test('failed summary is not presented as a zero-comment success', async () => {
  const session = createDiscussionSession('post');
  summary.mockRejectedValueOnce(new Error('offline'));
  await session.summary();
  expect(session.store.getState()).toMatchObject({
    summaryStatus: 'error',
    total: null,
  });
});
