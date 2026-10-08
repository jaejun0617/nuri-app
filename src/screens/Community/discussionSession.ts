import { useCallback, useEffect, useMemo, type SetStateAction } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { CommunityComment } from '../../types/community';
import { useCommunityStore } from '../../store/communityStore';
import {
  fetchDiscussionSummary,
  fetchDiscussionThreads,
  fetchDiscussionReplies,
  DiscussionReadError,
  type DiscussionCursor,
  type ReplyPage,
} from '../../services/community/discussionRead';
import type { CommunityCommentSort } from './utils/commentHelpers';

type ReadStatus = 'idle' | 'loading' | 'ready' | 'error';
type ThreadPage = {
  ids: string[];
  previous: DiscussionCursor | null;
  next: DiscussionCursor | null;
};
type DiscussionState = {
  submitting: boolean;
  draftResetKey: number;
  selectedId: string | null;
  replyTargetId: string | null;
  expanded: Record<string, boolean>;
  sort: CommunityCommentSort;
  previewIds: string[];
  previewReplyIds: Record<string, string[]>;
  previewCount: number;
  total: number | null;
  summaryStatus: ReadStatus;
  threadStatus: ReadStatus;
  threads: ThreadPage;
  replyPages: Record<string, ReplyPage>;
  replyStatus: Record<string, ReadStatus>;
  error: string | null;
};
const emptyThreads = (): ThreadPage => ({
  ids: [],
  previous: null,
  next: null,
});

// Only the active composer owns keystrokes. Screens subscribe to navigation/read
// state, never the draft, so typing does not fan out to unrelated comment rows.
export function createDiscussionSession(postId: string) {
  const store = createStore<DiscussionState>(() => ({
    submitting: false,
    draftResetKey: 0,
    selectedId: null,
    replyTargetId: null,
    expanded: {},
    sort: 'registered',
    previewIds: [],
    previewReplyIds: {},
    previewCount: 0,
    total: null,
    summaryStatus: 'idle',
    threadStatus: 'idle',
    threads: emptyThreads(),
    replyPages: {},
    replyStatus: {},
    error: null,
  }));
  const draft = { current: '' };
  const selection = {
    current: undefined as { start: number; end: number } | undefined,
  };
  const submitLock = { current: false };
  const offsets = { post: 0, comments: 0 };
  const bodyRequest = { current: false };
  const viewAttempted = { current: false };
  let epoch = 0;
  let alive = true;
  const replyRequests = new Map<
    string,
    { cursor: DiscussionCursor | null; anchorId: string | null }
  >();
  const current = (ticket: number) => alive && ticket === epoch;
  const fail = (error: unknown) =>
    error instanceof DiscussionReadError && error.code === 'STALE_CURSOR'
      ? '댓글 목록이 변경됐어요. 새로 불러와 주세요.'
      : '댓글을 불러오지 못했어요. 다시 시도해 주세요.';
  function hideDeniedContent(error: unknown) {
    if (error instanceof DiscussionReadError && error.code === 'FORBIDDEN') {
      store.setState({
        previewIds: [],
        previewReplyIds: {},
        previewCount: 0,
        threads: emptyThreads(),
        total: null,
        replyPages: {},
        selectedId: null,
        replyTargetId: null,
      });
    }
  }
  function merge(comments: CommunityComment[], replaceRoots: string[] = []) {
    useCommunityStore.setState(state => {
      const entities = { ...state.commentEntitiesById };
      const replyIdsByParent = { ...state.replyCommentIdsByParentId };
      for (const root of replaceRoots) replyIdsByParent[root] = [];
      for (const comment of comments) {
        entities[comment.id] = comment;
        if (comment.parentCommentId) {
          const root = comment.parentCommentId;
          replyIdsByParent[root] = Array.from(
            new Set([...(replyIdsByParent[root] ?? []), comment.id]),
          ).sort(
            (a, b) =>
              entities[a].createdAt.localeCompare(entities[b].createdAt) ||
              a.localeCompare(b),
          );
        }
      }
      return {
        commentEntitiesById: entities,
        replyCommentIdsByParentId: replyIdsByParent,
      };
    });
  }
  async function summary(force = false) {
    const status = store.getState().summaryStatus;
    if (!force && (status === 'ready' || status === 'loading')) return;
    const ticket = epoch;
    store.setState({ summaryStatus: 'loading' });
    try {
      const data = await fetchDiscussionSummary(postId);
      if (!current(ticket)) return;
      merge(data.comments);
      // Full-thread pages must never expand the bounded post preview on return.
      const previewReplyIds: Record<string, string[]> = {};
      for (const row of data.comments) {
        if (row.parentCommentId) {
          (previewReplyIds[row.parentCommentId] ??= []).push(row.id);
        }
      }
      store.setState({
        previewIds: data.comments
          .filter(row => !row.parentCommentId)
          .map(row => row.id),
        previewReplyIds,
        previewCount: data.comments.length,
        total: data.total,
        summaryStatus: 'ready',
        error: null,
      });
    } catch (error) {
      if (current(ticket)) {
        hideDeniedContent(error);
        store.setState({ summaryStatus: 'error', error: fail(error) });
      }
    }
  }
  async function replies(
    rootId: string,
    cursor: DiscussionCursor | null = null,
    anchorId: string | null = null,
  ) {
    if (store.getState().replyStatus[rootId] === 'loading') return;
    const ticket = epoch;
    replyRequests.set(rootId, { cursor, anchorId });
    store.setState(state => ({
      replyStatus: { ...state.replyStatus, [rootId]: 'loading' },
    }));
    try {
      const data = await fetchDiscussionReplies(
        postId,
        rootId,
        cursor,
        anchorId,
      );
      if (!current(ticket)) return;
      merge(data.comments, cursor ? [] : [rootId]);
      store.setState(state => ({
        replyStatus: { ...state.replyStatus, [rootId]: 'ready' },
        replyPages: {
          ...state.replyPages,
          [rootId]: {
            rootId,
            total: data.total,
            previous:
              cursor?.direction === 'after'
                ? state.replyPages[rootId]?.previous ?? null
                : data.previous,
            next:
              cursor?.direction === 'before'
                ? state.replyPages[rootId]?.next ?? null
                : data.next,
          },
        },
      }));
    } catch (error) {
      if (current(ticket)) {
        hideDeniedContent(error);
        store.setState(state => ({
          replyStatus: { ...state.replyStatus, [rootId]: 'error' },
          error: fail(error),
        }));
      }
    }
  }
  async function threads(
    cursor: DiscussionCursor | null = null,
    anchorId: string | null = null,
    force = false,
  ) {
    const state = store.getState();
    if (
      state.threadStatus === 'loading' ||
      (!cursor && !force && state.threadStatus === 'ready')
    )
      return;
    const ticket = epoch;
    store.setState({ threadStatus: 'loading', error: null });
    if (anchorId) store.setState({ selectedId: anchorId });
    try {
      const data = await fetchDiscussionThreads(
        postId,
        state.sort,
        cursor,
        anchorId,
      );
      if (!current(ticket)) return;
      merge(
        data.comments,
        data.rootIds.filter(id => !state.replyPages[id]),
      );
      store.setState(previous => ({
        threadStatus:
          anchorId && data.anchorRootId && anchorId !== data.anchorRootId
            ? 'loading'
            : 'ready',
        threads: {
          ids: cursor
            ? Array.from(
                new Set(
                  cursor.direction === 'before'
                    ? [...data.rootIds, ...previous.threads.ids]
                    : [...previous.threads.ids, ...data.rootIds],
                ),
              )
            : data.rootIds,
          previous:
            cursor?.direction === 'after'
              ? previous.threads.previous
              : data.previous,
          next:
            cursor?.direction === 'before' ? previous.threads.next : data.next,
        },
        replyPages: {
          ...previous.replyPages,
          ...Object.fromEntries(
            data.replyPages
              .filter(page => !previous.replyPages[page.rootId])
              .map(page => [page.rootId, page]),
          ),
        },
        error: !data.anchorFound
          ? '선택한 댓글은 삭제되었거나 더 이상 볼 수 없어요.'
          : null,
        selectedId: data.anchorFound ? previous.selectedId : null,
      }));
      if (anchorId && data.anchorRootId && anchorId !== data.anchorRootId) {
        await replies(data.anchorRootId, null, anchorId);
        const anchorRootId = data.anchorRootId;
        if (current(ticket))
          store.setState(previous => ({
            threadStatus:
              previous.replyStatus[anchorRootId] === 'error'
                ? 'error'
                : 'ready',
            expanded: { ...previous.expanded, [anchorRootId]: true },
          }));
      }
    } catch (error) {
      if (current(ticket)) {
        hideDeniedContent(error);
        store.setState({ threadStatus: 'error', error: fail(error) });
      }
    }
  }
  async function changeSort(sort: CommunityCommentSort) {
    epoch += 1;
    store.setState({
      sort,
      threads: emptyThreads(),
      threadStatus: 'idle',
      replyStatus: {},
      summaryStatus:
        store.getState().summaryStatus === 'loading'
          ? 'idle'
          : store.getState().summaryStatus,
    });
    await summary();
    await threads();
  }
  async function refresh(mode: 'post' | 'comments') {
    epoch += 1;
    store.setState({
      summaryStatus: 'idle',
      threadStatus: 'idle',
      replyPages: {},
      replyStatus: {},
    });
    await summary();
    if (mode === 'comments')
      await threads(null, store.getState().selectedId, true);
  }
  return {
    store,
    draft,
    selection,
    submitLock,
    offsets,
    bodyRequest,
    viewAttempted,
    summary,
    threads,
    replies,
    changeSort,
    refresh,
    retryReplies(rootId: string) {
      const request = replyRequests.get(rootId);
      return replies(
        rootId,
        request?.cursor ?? null,
        request?.anchorId ?? null,
      );
    },
    dispose() {
      alive = false;
      epoch += 1;
      draft.current = '';
      selection.current = undefined;
    },
  };
}
export type DiscussionSession = ReturnType<typeof createDiscussionSession>;
export function useDiscussionField<K extends keyof DiscussionState>(
  session: DiscussionSession,
  key: K,
) {
  const value = useStore(session.store, state => state[key]);
  const setValue = useCallback(
    (next: SetStateAction<DiscussionState[K]>) => {
      const resolved =
        typeof next === 'function'
          ? (next as (previous: DiscussionState[K]) => DiscussionState[K])(
              session.store.getState()[key],
            )
          : next;
      session.store.setState({ [key]: resolved } as Pick<DiscussionState, K>);
    },
    [session, key],
  );
  return [value, setValue] as const;
}
const sessions = new Map<
  string,
  { session: DiscussionSession; owners: number }
>();

export function useDiscussionSession(
  viewerId: string | null,
  postId: string,
  routeSessionId: string,
) {
  const key = `${viewerId ?? 'guest'}:${postId}:${routeSessionId}`;
  const entry = useMemo(() => {
    const existing = sessions.get(key);
    if (existing) return existing;
    const created = { session: createDiscussionSession(postId), owners: 0 };
    sessions.set(key, created);
    return created;
  }, [key, postId]);
  useEffect(() => {
    entry.owners += 1;
    return () => {
      entry.owners -= 1;
      // Allow a same-stack route replacement to acquire the session first.
      Promise.resolve().then(() => {
        if (entry.owners === 0) {
          entry.session.dispose();
          sessions.delete(key);
        }
      });
    };
  }, [entry, key]);
  return entry.session;
}
