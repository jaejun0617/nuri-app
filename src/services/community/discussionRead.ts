import type { CommunityCommentRow } from '../../types/community';
import type { CommunityCommentSort } from '../../screens/Community/utils/commentHelpers';
import { supabase } from '../supabase/client';
import {
  hydrateCommunityCommentRows,
  isCommunityCommentRow,
} from '../supabase/community';

export type DiscussionCursor = {
  version: 1;
  post_id: string;
  scope: 'threads' | 'replies';
  revision: string;
  id: string;
  direction: 'before' | 'after';
  sort?: CommunityCommentSort;
  root_id?: string;
};
export type ReplyPage = {
  rootId: string;
  total: number;
  previous: DiscussionCursor | null;
  next: DiscussionCursor | null;
};

export class DiscussionReadError extends Error {
  constructor(
    readonly code: 'MALFORMED_RESPONSE' | 'STALE_CURSOR' | 'FORBIDDEN',
  ) {
    super(code);
  }
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DiscussionReadError('MALFORMED_RESPONSE');
  }
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value)
    throw new DiscussionReadError('MALFORMED_RESPONSE');
  return value;
}
function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new DiscussionReadError('MALFORMED_RESPONSE');
  }
  return value;
}
export function parseDiscussionCursor(value: unknown): DiscussionCursor | null {
  if (value === null) return null;
  const row = record(value);
  if (
    row.version !== 1 ||
    !['threads', 'replies'].includes(String(row.scope)) ||
    !['before', 'after'].includes(String(row.direction))
  )
    throw new DiscussionReadError('MALFORMED_RESPONSE');
  const common = {
    version: 1 as const,
    post_id: text(row.post_id),
    revision: text(row.revision),
    id: text(row.id),
    direction: row.direction as 'before' | 'after',
  };
  if (row.scope === 'replies')
    return { ...common, scope: 'replies', root_id: text(row.root_id) };
  if (
    row.sort !== 'registered' &&
    row.sort !== 'latest' &&
    row.sort !== 'replies'
  ) {
    throw new DiscussionReadError('MALFORMED_RESPONSE');
  }
  return { ...common, scope: 'threads', sort: row.sort };
}
function rows(
  value: unknown,
  limit: number,
  postId: string,
): CommunityCommentRow[] {
  if (
    !Array.isArray(value) ||
    value.length > limit ||
    !value.every(
      item =>
        isCommunityCommentRow(item) &&
        item.post_id === postId &&
        item.status === 'active' &&
        item.deleted_at === null &&
        (item.parent_comment_id === null ||
          typeof item.parent_comment_id === 'string') &&
        typeof item.reply_count === 'number' &&
        Number.isSafeInteger(item.reply_count) &&
        item.reply_count >= 0,
    )
  )
    throw new DiscussionReadError('MALFORMED_RESPONSE');
  return value;
}
async function read(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, args);
  if (error?.code === 'PT409') throw new DiscussionReadError('STALE_CURSOR');
  if (error?.code === '42501') throw new DiscussionReadError('FORBIDDEN');
  if (error) throw error;
  return record(data);
}
export async function fetchDiscussionSummary(postId: string) {
  const data = await read('community_get_comment_summary_v2', {
    p_post_id: postId,
  });
  const total = count(data.total_count);
  const comments = rows(data.comments, 10, postId);
  const roots = new Set<string>();
  const ids = new Set<string>();
  if (comments.length !== Math.min(total, 10)) {
    throw new DiscussionReadError('MALFORMED_RESPONSE');
  }
  for (const comment of comments) {
    if (
      ids.has(comment.id) ||
      (typeof comment.parent_comment_id === 'string' &&
        !roots.has(comment.parent_comment_id))
    ) {
      throw new DiscussionReadError('MALFORMED_RESPONSE');
    }
    ids.add(comment.id);
    if (comment.parent_comment_id === null) roots.add(comment.id);
  }
  return {
    total,
    revision: text(data.revision),
    comments: await hydrateCommunityCommentRows(comments),
  };
}
export async function fetchDiscussionThreads(
  postId: string,
  sort: CommunityCommentSort,
  cursor: DiscussionCursor | null = null,
  anchorId: string | null = null,
) {
  const data = await read('community_get_comment_threads_v1', {
    p_post_id: postId,
    p_sort: sort,
    p_cursor: cursor,
    p_anchor_id: anchorId,
  });
  const roots = rows(data.roots, 10, postId);
  const replies = rows(data.replies, 50, postId);
  if (
    roots.some(row => row.parent_comment_id !== null) ||
    replies.some(row => !roots.some(root => root.id === row.parent_comment_id))
  )
    throw new DiscussionReadError('MALFORMED_RESPONSE');
  if (
    typeof data.anchor_found !== 'boolean' ||
    !Array.isArray(data.reply_pages) ||
    data.reply_pages.length > 10
  ) {
    throw new DiscussionReadError('MALFORMED_RESPONSE');
  }
  const replyPages: ReplyPage[] = data.reply_pages.map(value => {
    const page = record(value);
    return {
      rootId: text(page.root_id),
      total: count(page.total_count),
      previous: null,
      next: parseDiscussionCursor(page.next_cursor),
    };
  });
  return {
    revision: text(data.revision),
    rootIds: roots.map(row => row.id),
    comments: await hydrateCommunityCommentRows([...roots, ...replies]),
    replyPages,
    anchorFound: data.anchor_found,
    anchorRootId:
      typeof data.anchor_root_id === 'string' ? data.anchor_root_id : null,
    previous: parseDiscussionCursor(data.previous_cursor),
    next: parseDiscussionCursor(data.next_cursor),
  };
}
export async function fetchDiscussionReplies(
  postId: string,
  rootId: string,
  cursor: DiscussionCursor | null = null,
  anchorId: string | null = null,
) {
  const data = await read('community_get_comment_replies_v1', {
    p_post_id: postId,
    p_root_id: rootId,
    p_cursor: cursor,
    p_anchor_id: anchorId,
  });
  if (data.root_id !== rootId || typeof data.anchor_found !== 'boolean')
    throw new DiscussionReadError('MALFORMED_RESPONSE');
  const comments = rows(data.comments, 20, postId);
  if (comments.some(row => row.parent_comment_id !== rootId))
    throw new DiscussionReadError('MALFORMED_RESPONSE');
  return {
    rootId,
    total: count(data.total_count),
    anchorFound: data.anchor_found,
    comments: await hydrateCommunityCommentRows(comments),
    previous: parseDiscussionCursor(data.previous_cursor),
    next: parseDiscussionCursor(data.next_cursor),
  };
}
