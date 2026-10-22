import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import Screen, { NuriRankingView, type NuriRankingViewProps } from '../src/screens/Ranking/NuriRankingScreen';
import { RANKING_TABS, RANKING_TYPOGRAPHY, type RankingTab } from '../src/screens/Ranking/rankingPresentation';
import { buildRankingBars } from '../src/services/ranking/activityRanking';

const mockFetch = jest.fn();
const mockQueries: Array<{ queryKey: unknown[]; queryFn: () => Promise<unknown>; enabled: boolean }> = [];
let mockOwner: string | null = 'qa-owner';
let mockWidth = 393, mockFontScale = 1;
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/common/PremiumNoticeModal', () => 'PremiumNoticeModal');
jest.mock('../src/hooks/useEntryAwareBackAction', () => ({ useEntryAwareBackAction: () => jest.fn() }));
jest.mock('../src/store/uiStore', () => ({ openMoreDrawer: jest.fn() }));
jest.mock('../src/store/authStore', () => ({ useAuthStore: (select: (state: { session: { user: { id: string } } | null }) => unknown) => select({ session: mockOwner ? { user: { id: mockOwner } } : null }) }));
jest.mock('../src/services/ranking/activityRanking', () => ({ ...jest.requireActual('../src/services/ranking/activityRanking'), fetchActivityRankingSnapshot: (category: string) => mockFetch(category) }));
jest.mock('@tanstack/react-query', () => ({ useQuery: (options: typeof mockQueries[number]) => { mockQueries.push(options); return { data: { rows: [], myRow: null }, isPending: false, isError: false, isRefetching: false, refetch: jest.fn().mockResolvedValue(null) }; } }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), reset: jest.fn() }), useRoute: () => ({ params: { entrySource: 'more' } }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => ({ width: mockWidth, height: 852, scale: 2, fontScale: mockFontScale }) }));

const values = {
  overall: [12840, 11620, 10950, 9840, 9210, 8760, 8340, 7920, 7480, 7150],
  walk: [1840, 1620, 1480, 1350, 1180, 1060, 920], posts: [128, 112, 96, 84, 72, 65, 58],
  comments: [320, 286, 254, 218, 192, 168, 142], health: [86, 78, 71, 64, 58, 52, 46], life: [156, 142, 128, 116, 104, 92, 81],
};
const names = ['보리', '몽이', '두부', '코코', '초코', '나비', '호두', '콩이', '루루', '밤이'];
function props(category: RankingTab = 'overall'): NuriRankingViewProps {
  const row = (score: number, index: number) => ({ rankNo: index + 1, displayName: names[index] + '**', score, level: 1, totalXp: score, category, isCurrentUser: false, rowSource: 'user' as const });
  return { category, rows: buildRankingBars(values[category].map(row)),
    myRow: { ...buildRankingBars([row(6820, 0)])[0], displayName: '누리**', rankNo: 12, isCurrentUser: true },
    myStatus: 'ready', loading: false, error: false, refreshing: false,
    onRefresh: jest.fn(), onBack: jest.fn(), onInfo: jest.fn(), onCategoryChange: jest.fn(), topInset: 24, bottomInset: 24 };
}
function render(p = props()) { let result!: TestRenderer.ReactTestRenderer; act(() => { result = TestRenderer.create(<NuriRankingView {...p} />); }); return result; }
const byId = (r: TestRenderer.ReactTestRenderer, id: string) => r.root.findAll(node => node.type === View && node.props.testID === id);
const text = (r: TestRenderer.ReactTestRenderer) => r.root.findAll(node => String(node.type) === 'AppText').flatMap(node => node.children.filter(child => typeof child === 'string')).join(' ');

describe('ranking reference rendering', () => {
  beforeEach(() => { mockWidth = 393; mockFontScale = 1; mockOwner = 'qa-owner'; mockQueries.length = 0; mockFetch.mockReset(); });
  it.each(RANKING_TABS.map(tab => tab.key))('renders the actual shared UI for %s, without changing units', category => {
    const p = props(category), r = render(p), output = text(r);
    expect(byId(r, 'ranking-row')).toHaveLength(values[category].length);
    expect(output).toContain(RANKING_TABS.find(tab => tab.key === category)?.title);
    expect(output).toContain(p.rows[0].scoreLabel);
    expect(byId(r, 'ranking-bar')).toHaveLength(category === 'overall' ? 0 : 7);
    expect(byId(r, 'ranking-my-card')).toHaveLength(1);
    act(() => r.unmount());
  });
  it('uses latest reference typography and fixed white system-area paint', () => {
    const r = render();
    const title = r.root.findAll(node => String(node.type) === 'AppText' && node.props.children === '누리 랭킹')[0];
    expect(StyleSheet.flatten(title.props.style)).toMatchObject(RANKING_TYPOGRAPHY.title);
    expect(StyleSheet.flatten(byId(r, 'ranking-status-bar')[0].props.style)).toMatchObject({ backgroundColor: '#FFFFFF', height: 24 });
    expect(r.root.findAll(node => node.type === TouchableOpacity && node.props.accessibilityRole === 'tab')).toHaveLength(6);
    act(() => r.unmount());
  });
  it('keeps the user font and reduces every ranking role by 2sp without shrinking line heights', () => {
    expect(Object.values(RANKING_TYPOGRAPHY).map(style => style.fontSize)).toEqual([20, 14, 14, 22, 14, 12, 15, 16, 18, 12]);
    expect(Object.values(RANKING_TYPOGRAPHY).map(style => style.lineHeight)).toEqual([30, 24, 22, 32, 24, 20, 24, 24, 28, 20]);
    const r = render();
    expect(r.root.findAll(node => String(node.type) === 'AppText').every(node => node.props.fontModeOverride === undefined)).toBe(true);
    expect(r.root.findAll(node => node.props.testID === 'ranking-privacy-shield').length).toBeGreaterThan(0);
    const glass = byId(r, 'ranking-table-glass')[0];
    expect(StyleSheet.flatten(glass.props.style)).toMatchObject({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 });
    act(() => r.unmount());
  });
  it.each(['loading', 'error', 'empty'] as const)('distinguishes %s without showing dummy values', state => {
    const p = props(); p.rows = []; p.myRow = null; p.loading = state === 'loading'; p.error = state === 'error';
    const r = render(p); expect(byId(r, 'ranking-' + state)).toHaveLength(1);
    expect(text(r)).not.toContain('12,840');
    expect(text(r)).not.toContain('0위'); act(() => r.unmount());
  });
  it('does not refetch an already selected tab and keeps real actions', () => {
    const p = props(), r = render(p);
    const tab = (id: string) => r.root.findAll(node => node.type === TouchableOpacity && node.props.testID === id)[0];
    act(() => tab('ranking-tab-overall').props.onPress()); expect(p.onCategoryChange).not.toHaveBeenCalled();
    act(() => tab('ranking-tab-health').props.onPress()); expect(p.onCategoryChange).toHaveBeenCalledWith('health');
    act(() => tab('ranking-info').props.onPress()); expect(p.onInfo).toHaveBeenCalledTimes(1);
    act(() => r.unmount());
  });
  it.each([320, 360, 393, 412, 430])('keeps scrolling and larger-text layout at %s logical pixels', width => {
    mockWidth = width; mockFontScale = 1.6; const r = render(props('health'));
    expect(byId(r, 'ranking-row')).toHaveLength(7);
    expect(r.root.findAll(node => String(node.type) === 'AppText').every(node => node.props.allowFontScaling !== false)).toBe(true);
    expect(r.root.findAll(node => node.props.testID === 'ranking-scroll').length).toBeGreaterThan(0);
    act(() => r.unmount());
  });
  it('keys authenticated snapshots by owner and selected tab, not a shared fixture cache', async () => {
    let r!: TestRenderer.ReactTestRenderer; act(() => { r = TestRenderer.create(<Screen />); });
    expect(mockQueries.at(-1)?.queryKey).toEqual(['activity-ranking-snapshot-v1', 'qa-owner', 'overall']);
    const tab = r.root.findAll(node => node.type === TouchableOpacity && node.props.testID === 'ranking-tab-comments')[0];
    act(() => tab.props.onPress());
    expect(mockQueries.at(-1)?.queryKey).toEqual(['activity-ranking-snapshot-v1', 'qa-owner', 'comments']);
    await mockQueries.at(-1)?.queryFn(); expect(mockFetch).toHaveBeenCalledWith('comments');
    mockOwner = 'another-owner'; act(() => r.update(<Screen />));
    expect(mockQueries.at(-1)?.queryKey).toEqual(['activity-ranking-snapshot-v1', 'another-owner', 'comments']);
    mockOwner = null; act(() => r.update(<Screen />)); expect(mockQueries.at(-1)?.enabled).toBe(false);
    act(() => r.unmount());
  });
});
