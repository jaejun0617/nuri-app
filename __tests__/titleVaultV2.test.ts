import catalog from '../src/services/activity/titleCatalogV2.json';
import { parseTitleVaultV2, getCanonicalTitleIdentity, manageRemembranceRecord } from '../src/services/activity/titleVaultV2';
import { buildActivityDashboard } from '../src/services/activity/activityDashboard';
import { getActivityVault } from '../src/screens/Pets/activityAchievementsPresentation';

const mockRpc = jest.fn<Promise<{ data: unknown; error: unknown }>, [string, Record<string, unknown>]>();
jest.mock('../src/services/supabase/client', () => ({ supabase: { rpc: (name: string, args: Record<string, unknown>) => mockRpc(name, args) } }));

const pets = [{ id: 'pet-a', name: '첫째' }];
function response(earned = false) {
  return { policyVersion: 2, catalogCount: 332, rows: catalog.entries.filter(entry => earned || !entry.hidden).map(entry => ({
    key: entry.id, name: entry.name, domain: entry.domain, scope: entry.scope,
    ownerId: entry.scope === 'common' ? 'common' : 'pet-a', conditionLabel: entry.conditionLabel,
    currentValue: earned ? 1000 : 0, threshold: 1000, achieved: earned, progressLabel: '0 / 1일', progressKnown: true,
    categoryKey: entry.category, categoryLabel: entry.categoryLabel, hidden: entry.hidden, policyVersion: 2,
    earnedAt: earned ? '2026-10-24T00:00:00Z' : null,
  })) };
}

it('has 332 explicit independent definitions with the approved 267 pet / 65 common split', () => {
  expect(catalog.entries).toHaveLength(332);
  expect(new Set(catalog.entries.map(entry => entry.id)).size).toBe(332);
  expect(catalog.entries.filter(entry => entry.scope === 'common')).toHaveLength(65);
  expect(catalog.entries.filter(entry => entry.hidden)).toHaveLength(24);
  expect(catalog.entries.find(entry => entry.id === 'WK02')?.requirements).toEqual([{ metric: 'walk_days', target: 3, unit: '일' }]);
  expect(catalog.entries.find(entry => entry.id === 'GD01')?.requirements).toEqual([
    { metric: 'gps_m', target: 500, unit: 'm' }, { metric: 'gps_days', target: 1, unit: '일' },
  ]);
  expect(catalog.entries.find(entry => entry.id === 'TM28')?.requirements).toEqual([
    { metric: 'elapsed_months', target: 240, unit: '개월' }, { metric: 'active_days', target: 92, unit: '일' },
  ]);
});

it('accepts all acquired entries, but never reveals unearned hidden entries', () => {
  expect(parseTitleVaultV2(response(true), pets)).toHaveLength(332);
  const ordinary = parseTitleVaultV2(response(), pets);
  expect(ordinary).toHaveLength(308);
  expect(ordinary.every(item => !item.hidden)).toBe(true);
});

it.each(['missing', 'duplicate', 'foreign', 'hidden', 'invalid-progress', 'missing-award-proof', 'wrong-policy', 'name-drift'])(
  'rejects %s instead of displaying invented empty or complete data', defect => {
    const value = response();
    if (defect === 'missing') value.rows.pop();
    if (defect === 'duplicate') value.rows.push(value.rows[0]);
    if (defect === 'foreign') value.rows[0].ownerId = 'another-pet';
    if (defect === 'hidden') {
      const hidden = response(true).rows.find(row => row.hidden);
      if (!hidden) throw new Error('missing hidden fixture');
      value.rows.push(hidden);
    }
    if (defect === 'hidden') value.rows[value.rows.length - 1].achieved = false;
    if (defect === 'invalid-progress') value.rows[0].currentValue = Number.NaN;
    if (defect === 'missing-award-proof') value.rows[0].achieved = true;
    if (defect === 'wrong-policy') value.policyVersion = 3;
    if (defect === 'name-drift') value.rows[0].name = '다른 이름';
    expect(() => parseTitleVaultV2(value, pets)).toThrow('TITLE_VAULT_RESPONSE_INVALID');
  },
);

it('preserves v2 multi-condition progress and never replaces it with the legacy daily streak', () => {
  const titles = parseTitleVaultV2(response(), pets);
  const routine = titles.find(item => item.key === 'RT01');
  expect(routine).toBeDefined();
  if (!routine) throw new Error('missing routine fixture');
  routine.currentValue = 500;
  const data = buildActivityDashboard({ pets, titleVault: titles, titles: [], ledgerRows: [],
    levelSummary: { level: 1, totalXp: 0, currentLevelXp: 0, nextLevelXp: 100, updatedAt: null },
    streakByPetId: { 'pet-a': { currentStreak: 9, bestStreak: 9, todayCompleted: true, activityDateKst: '2026-10-24' } },
    timelineCountsByPetId: {}, healthRecordCountsByPetId: {}, communityPostCount: 0, commentCount: 0 });
  expect(getActivityVault(data, data.petSummaries[0]).challenges.find(item => item.key === 'RT01')?.currentValue).toBe(500);
  expect(data.allAchievements).toHaveLength(308);
});

it('maps legacy identities explicitly without guessing from Korean names', () => {
  expect(getCanonicalTitleIdentity('pet_category_keeper')).toEqual({ titleKey: 'MR05', titleName: '차곡차곡 기록지기' });
  expect(getCanonicalTitleIdentity('walk_king')).toEqual({ titleKey: 'WK10', titleName: '씩씩한 산책대장' });
  expect(getCanonicalTitleIdentity('산책왕')).toBeNull();
  expect(getCanonicalTitleIdentity('constructor')).toBeNull();
});

it('reads remembrance with null and sends only explicit booleans as mutations', async () => {
  mockRpc.mockResolvedValue({ data: { included: true }, error: null });
  await expect(manageRemembranceRecord('memory-a', null)).resolves.toBe(true);
  expect(mockRpc).toHaveBeenCalledWith('manage_nuri_remembrance_record_v2', { p_memory_id: 'memory-a', p_included: null });
  await manageRemembranceRecord('memory-a', false);
  expect(mockRpc).toHaveBeenLastCalledWith('manage_nuri_remembrance_record_v2', { p_memory_id: 'memory-a', p_included: false });
});
