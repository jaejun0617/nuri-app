import {
  fetchDiscussionSummary,
  fetchDiscussionThreads,
  fetchDiscussionReplies,
  parseDiscussionCursor,
} from '../src/services/community/discussionRead';
import { supabase } from '../src/services/supabase/client';
import { hydrateCommunityCommentRows } from '../src/services/supabase/community';
import fs from 'node:fs';
import path from 'node:path';

jest.mock('../src/services/supabase/client', () => ({
  supabase: { rpc: jest.fn() },
}));
jest.mock('../src/services/supabase/community', () => ({
  ...jest.requireActual('../src/services/supabase/community'),
  hydrateCommunityCommentRows: jest.fn(async rows => rows),
}));
type RpcResult = {
  data: unknown;
  error: {
    code: string;
    message: string;
    details: string;
    hint: string;
  } | null;
  count: null;
  status: number;
  statusText: string;
};
const rpc = supabase.rpc as unknown as jest.Mock<
  Promise<RpcResult>,
  [string, Record<string, unknown>]
>;
const row = {
  id: 'a',
  post_id: 'post',
  user_id: 'qa',
  content: '합성',
  parent_comment_id: null,
  reply_to_comment_id: null,
  reply_target_user_id: null,
  depth: 0,
  reply_count: 0,
  like_count: 0,
  status: 'active',
  deleted_at: null,
  created_at: '2026-10-08T00:00:00Z',
  updated_at: '2026-10-08T00:00:00Z',
};
function result(data: unknown) {
  rpc.mockResolvedValueOnce({
    data,
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  });
}
beforeEach(() => {
  jest.clearAllMocks();
});
test('summary has a bounded, validated public-author hydration projection', async () => {
  result({ total_count: 1, revision: 'r1', comments: [row] });
  const data = await fetchDiscussionSummary('post');
  expect(data.total).toBe(1);
  expect(hydrateCommunityCommentRows).toHaveBeenCalledWith([row]);
  expect(rpc).toHaveBeenCalledWith('community_get_comment_summary_v2', {
    p_post_id: 'post',
  });
});
test.each([
  { total_count: null, revision: 'r1', comments: [] },
  { total_count: 0, revision: 'r1', comments: [row] },
  { total_count: 2, revision: 'r1', comments: [row, row] },
  { total_count: 1, revision: 'r1', comments: [{ ...row, post_id: 'other' }] },
  { total_count: 1, revision: 'r1', comments: [{ ...row, status: 'hidden' }] },
  {
    total_count: 1,
    revision: 'r1',
    comments: [{ ...row, parent_comment_id: 'missing' }],
  },
  {
    total_count: 11,
    revision: 'r1',
    comments: Array.from({ length: 11 }, (_, i) => ({ ...row, id: String(i) })),
  },
])(
  'malformed reads fail closed rather than become an empty success',
  async data => {
    result(data);
    await expect(fetchDiscussionSummary('post')).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    });
    expect(hydrateCommunityCommentRows).not.toHaveBeenCalled();
  },
);
test.each([0, 1, 2, 10, 11, 100])(
  'preview contains min(total, 10) entities including replies: %i',
  async total => {
    const comments = Array.from({ length: Math.min(total, 10) }, (_, i) => ({
      ...row,
      id: String(i),
      parent_comment_id: i === 0 ? null : '0',
      depth: i === 0 ? 0 : 1,
    }));
    result({ total_count: total, revision: 'r', comments });
    await expect(fetchDiscussionSummary('post')).resolves.toMatchObject({
      total,
      comments,
    });
  },
);
test('v2 preserves the invoker visibility boundary and limits roots plus replies to ten', () => {
  const sql = fs.readFileSync(
    path.resolve(
      __dirname,
      '../supabase/migrations/20261008183526_community_ten_comment_preview.sql',
    ),
    'utf8',
  );
  expect(sql).toContain('stable security invoker');
  expect(sql).toContain(
    'private.community_parent_post_visible_to_current_user(p_post_id)',
  );
  expect(sql).toContain('limit 10');
  expect(sql).toContain('root.id = coalesce(c.parent_comment_id, c.id)');
  expect(sql).not.toMatch(
    /security definer|create policy|alter table|insert into|update public\.|delete from/i,
  );
  expect(sql).not.toContain('function public.community_get_comment_summary_v1');
});
test('threads request forwards only the exact sort/cursor/anchor contract', async () => {
  result({
    revision: 'r1',
    anchor_found: true,
    anchor_root_id: 'a',
    roots: [row],
    replies: [],
    reply_pages: [],
    previous_cursor: null,
    next_cursor: null,
  });
  const data = await fetchDiscussionThreads('post', 'latest', null, 'a');
  expect(data.rootIds).toEqual(['a']);
  expect(data.anchorRootId).toBe('a');
  expect(rpc).toHaveBeenCalledWith('community_get_comment_threads_v1', {
    p_post_id: 'post',
    p_sort: 'latest',
    p_cursor: null,
    p_anchor_id: 'a',
  });
});
test('replies reject a mismatched thread response', async () => {
  result({ root_id: 'different', comments: [] });
  await expect(fetchDiscussionReplies('post', 'a')).rejects.toMatchObject({
    code: 'MALFORMED_RESPONSE',
  });
});
test('stale server cursors become a stable client error, without unbounded fallback', async () => {
  rpc.mockResolvedValueOnce({
    data: null,
    error: { code: 'PT409', message: 'ignored', details: '', hint: '' },
    count: null,
    status: 409,
    statusText: 'Conflict',
  });
  await expect(
    fetchDiscussionThreads('post', 'registered'),
  ).rejects.toMatchObject({ code: 'STALE_CURSOR' });
  expect(rpc).toHaveBeenCalledTimes(1);
});
test('cursor decoder rejects incomplete or unknown context', () => {
  expect(parseDiscussionCursor(null)).toBeNull();
  expect(() =>
    parseDiscussionCursor({ version: 1, scope: 'threads' }),
  ).toThrow();
  expect(() =>
    parseDiscussionCursor({ version: 2, scope: 'threads' }),
  ).toThrow();
});
test('new SQL reads remain invoker, stable, bounded and never alter RLS or writes', () => {
  const sql = fs.readFileSync(
    path.resolve(
      __dirname,
      '../supabase/migrations/20261008145458_community_discussion_read_contract.sql',
    ),
    'utf8',
  );
  expect(sql.match(/stable security invoker/g)).toHaveLength(3);
  expect(sql).toContain(
    'private.community_parent_post_visible_to_current_user',
  );
  expect(sql).toContain('limit 3');
  expect(sql).toContain('limit 10');
  expect(sql).toContain('limit 5');
  expect(sql).toContain('limit 20');
  expect(sql).not.toMatch(
    /security definer|create policy|alter table|insert into|update public\.|delete from/i,
  );
});
