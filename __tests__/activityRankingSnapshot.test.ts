import { buildRankingBars, fetchActivityRankingSnapshot, formatRankingScore } from '../src/services/ranking/activityRanking';

const mockRpc = jest.fn();
jest.mock('../src/services/supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args) } }));
const raw = (rank: number, self = false, category = 'overall') => ({
  rank_no: rank, display_name: self ? '나' : `누리 친구 ${rank}`,
  score: 1000 - rank, total_xp: 1000, level: 6, category, is_current_user: self, row_source: 'user',
});

describe('read-only top ten and self snapshot', () => {
  beforeEach(() => mockRpc.mockReset());
  it('uses the authenticated snapshot RPC without requesting QA fixtures', async () => {
    mockRpc.mockResolvedValue({ data: [...Array.from({ length: 10 }, (_, i) => raw(i + 1)), raw(120, true)], error: null });
    const result = await fetchActivityRankingSnapshot('overall');
    expect(mockRpc).toHaveBeenCalledWith('get_activity_ranking_snapshot_v1', { p_category: 'overall' });
    expect(result.rows).toHaveLength(10);
    expect(result.myRow?.rankNo).toBe(120);
    expect(result.rows.some(row => row.isCurrentUser)).toBe(false);
  });
  it('reuses the same self row inside the top ten', async () => {
    mockRpc.mockResolvedValue({ data: [raw(1), raw(2, true)], error: null });
    const result = await fetchActivityRankingSnapshot('overall');
    expect(result.myRow).toBe(result.rows[1]);
  });
  it('does not invent a rank for zero qualifying activity', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    expect(await fetchActivityRankingSnapshot('overall')).toEqual({ rows: [], myRow: null });
  });
  it.each([
    null, [raw(1), raw(1)], [raw(11)], [raw(1, true), raw(2, true)],
    [{ ...raw(1), row_source: 'qa_fixture' }], [{ ...raw(1), category: 'comments' }], [{ broken: true }],
  ])('rejects malformed, foreign, duplicate or fixture responses: %j', async data => {
    mockRpc.mockResolvedValue({ data, error: null });
    await expect(fetchActivityRankingSnapshot('overall')).rejects.toThrow('NURI_RANKING_INVALID_RESPONSE');
  });
  it('preserves server failures rather than returning dummy or empty success', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('SERVER_FAILURE') });
    await expect(fetchActivityRankingSnapshot('overall')).rejects.toThrow('SERVER_FAILURE');
  });
  it.each([['posts', '12개'], ['comments', '12개'], ['health', '12회'], ['life', '12회'], ['walk', '12 XP']] as const)
    ('formats %s with its own unit', (category, expected) => expect(formatRankingScore({ score: 12, category })).toBe(expected));
  it('uses real relative values including zero and small values, not a minimum fake bar', () => {
    const rows = [100, 1, 0, Number.NaN, Infinity, -10].map((score, index) => ({
      rankNo: index + 1, score, displayName: '보호된 이름', totalXp: 0, level: 1,
      category: 'walk' as const, isCurrentUser: false, rowSource: 'user' as const,
    }));
    expect(buildRankingBars(rows).map(row => row.barRatio)).toEqual([1, .01, 0, 0, 0, 0]);
    expect(buildRankingBars(rows).every(row => Number.isFinite(row.barRatio))).toBe(true);
    expect(buildRankingBars([rows[2]])[0].barRatio).toBe(0);
    expect(buildRankingBars([])).toEqual([]);
  });
});
