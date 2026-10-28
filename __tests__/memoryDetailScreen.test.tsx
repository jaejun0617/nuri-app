import React from 'react';
import TestRenderer from 'react-test-renderer';
import {
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  View,
  Dimensions,
  Switch,
} from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import CtaButton from '../src/components/records/TimelineButton';
import TimelineDeleteDialog from '../src/components/records/TimelineDeleteDialog';
import OptimizedImage from '../src/components/images/OptimizedImage';
import { styles } from '../src/screens/Records/RecordDetailScreen.styles';
import RecordDetailScreen from '../src/screens/Records/RecordDetailScreen';
import type { MemoryRecord } from '../src/services/supabase/memories';
import { lightColors } from '../src/app/theme/tokens/colors';
import { TIMELINE_DESIGN as C, TIMELINE_TYPE as T } from '../src/theme/timelineDesign';
import type { SeasonKey } from '../src/theme/seasonal/season';
import { ToolbarHeightContext } from '../src/components/navigation/ToolbarHeightContext';
import { deleteMemoryWithFile } from '../src/services/supabase/memories';
import { walkRecordRepository } from '../src/services/walk/server/supabaseWalkRecordRepository';
import type { WalkMemorySourceSummary, WalkRecordView } from '../src/services/walk/server/recordRepository';
import { appQueryClient } from '../src/services/query/appQueryClient';
import type { TimelineStackParamList } from '../src/navigation/TimelineStackNavigator';

const mockRecord: MemoryRecord = {
  id: 'detail',
  petId: 'pet',
  title: '합성 상세 기록',
  content: '실제 사용자 정보가 아닌 테스트 기록입니다.',
  tags: ['#생활', '#미용'],
  imagePaths: [],
  category: 'other',
  subCategory: 'grooming',
  occurredAt: '2026-10-04',
  createdAt: '2026-10-04T03:16:00Z',
};
let mockWalkScope = { ownerId: 'owner', petId: 'pet', generation: 'first', current: () => true };
let mockWalkSource: WalkMemorySourceSummary | undefined;
const mockHealthParentBack = jest.fn();
let mockHealthParent: {
  getState: () => { index: number; routes: Array<{ name: string }> };
  goBack: () => void;
} | undefined;
jest.mock('../src/hooks/useWalkProduct', () => ({ useWalkScope: () => mockWalkScope, useWalkSources: () => ({ data: mockWalkSource ? [mockWalkSource] : [] }) }));
jest.mock('../src/services/walk/server/supabaseWalkRecordRepository', () => ({ walkRecordRepository: { get: jest.fn() } }));
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
  popTo: jest.fn(),
  replace: jest.fn(),
  getState: () => ({ routeNames: [] }),
  getParent: () => mockHealthParent,
};
const mockRoute: { params: TimelineStackParamList['RecordDetail'] } = {
  params: { petId: 'pet', memoryId: 'detail', entrySource: 'timeline' },
};
let mockTitleOwner = 'owner';
const mockManageRemembrance = jest.fn<Promise<boolean>, [string, boolean | null]>();
jest.mock('../src/services/activity/titleVaultV2', () => ({
  manageRemembranceRecord: (memory: string, included: boolean | null) => mockManageRemembrance(memory, included),
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: Object.assign((select: (state: { session: { user: { id: string } } }) => unknown) =>
    select({ session: { user: { id: mockTitleOwner } } }),
  { getState: () => ({ session: { user: { id: mockTitleOwner } } }), subscribe: () => () => undefined }),
}));
const mockFetchPage = jest.fn();
let mockSeason: SeasonKey = 'autumn';
const mockStore = {
  selectRecordById: () => mockRecord,
  removeOneLocal: jest.fn(),
  refresh: jest.fn(),
  upsertOneLocal: jest.fn(),
  recordsById: {},
};
const mockPets: { pets: Array<{ id: string; name: string; avatarUrl: string | null; deathDate?: string | null }>; selectedPetId: string } = {
  pets: [{ id: 'pet', name: '누리', avatarUrl: null, deathDate: '2026-02-22' }],
  selectedPetId: 'pet',
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
  useFocusEffect: (callback: () => void | (() => void)) => {
    const runtime = jest.requireActual('react') as typeof React;
    runtime.useEffect(callback, [callback]);
  },
}));
jest.mock('react-native-safe-area-context', () => {
  const runtime = jest.requireActual('react') as typeof React;
  return {
    SafeAreaInsetsContext: runtime.createContext(null),
    useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => mockSeason,
}));
jest.mock('../src/store/recordStore', () => ({
  useRecordStore: (selector: (state: typeof mockStore) => unknown) =>
    selector(mockStore),
}));
jest.mock('../src/store/petStore', () => ({
  usePetStore: (selector: (state: typeof mockPets) => unknown) =>
    selector(mockPets),
}));
jest.mock('../src/store/uiStore', () => ({ openMoreDrawer: jest.fn() }));
jest.mock('../src/services/supabase/memories', () => ({
  fetchMemoriesByPetPage: (input: unknown) => mockFetchPage(input),
  fetchMemoryById: jest.fn(),
  deleteMemoryWithFile: jest.fn(),
}));
jest.mock('../src/services/supabase/storageMemories', () => ({
  getMemoryImageSignedUrlsCached: jest.fn((paths: string[]) =>
    Promise.resolve(paths.map(path => `https://example.test/${path}`)),
  ),
}));
jest.mock('../src/services/activity/timelineActivity', () => ({
  removeTimelineWalkActivity: jest.fn(),
}));
jest.mock('../src/hooks/useSignedMemoryImage', () => ({
  useSignedMemoryImage: () => ({ signedUrl: null }),
}));
jest.mock('../src/components/images/OptimizedImage', () => 'OptimizedImage');

const mountedTrees: TestRenderer.ReactTestRenderer[] = [];
async function render() {
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <ToolbarHeightContext.Provider value={72}>
          <RecordDetailScreen />
        </ToolbarHeightContext.Provider>
      </ThemeProvider>,
    );
  });
  mountedTrees.push(tree);
  return tree;
}
function text(tree: TestRenderer.ReactTestRenderer) {
  return tree.root
    .findAllByType(Text)
    .flatMap(node => React.Children.toArray(node.props.children))
    .filter(child => typeof child === 'string' || typeof child === 'number')
    .join(' ');
}
describe('memory detail rendered contract', () => {
  afterEach(async () => {
    await TestRenderer.act(async () => {
      mountedTrees.splice(0).forEach(tree => tree.unmount());
    });
    appQueryClient.clear();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockHealthParent = undefined;
    mockRoute.params = { petId: 'pet', memoryId: 'detail', entrySource: 'timeline' };
    mockTitleOwner = 'owner';
    mockPets.pets = [{ id: 'pet', name: '누리', avatarUrl: null, deathDate: '2026-02-22' }];
    mockPets.selectedPetId = 'pet';
    mockManageRemembrance.mockReset().mockResolvedValue(false);
    mockSeason = 'autumn';
    mockRecord.imagePaths = [];
    mockRecord.category = 'other';
    mockWalkSource = undefined;
    mockWalkScope = { ownerId: 'owner', petId: 'pet', generation: 'first', current: () => true };
    const rows = [
      mockRecord,
      ...Array.from({ length: 7 }, (_, index) => ({
        ...mockRecord,
        id: `same-day-${index}`,
        title: `합성 관련 기록 ${index}`,
        category: 'diary',
        occurredAt: '2026-09-01',
      })),
    ];
    mockFetchPage.mockImplementation(
      async ({ cursor, limit }: { cursor?: string | null; limit: number }) => {
        const start = Number(cursor ?? 0);
        return {
          items: rows.slice(start, start + limit),
          hasMore: start + limit < rows.length,
          nextCursor: `${start + limit}`,
        };
      },
    );
  });
  it.each([null, undefined, ''])('hides remembrance for a together pet without querying or changing participation: %s', async deathDate => {
    mockPets.pets = [
      { id: 'pet', name: '함께하는 아이', avatarUrl: null, deathDate },
      { id: 'other', name: '추모 아이', avatarUrl: null, deathDate: '2026-02-22' },
    ];
    mockPets.selectedPetId = 'other'; // The record's pet, not the global selection, owns this action.
    const before = JSON.stringify(mockRecord), tree = await render();
    const open = tree.root.findAllByType(TouchableOpacity).find(node => node.props.testID === 'memory-detail-more');
    if (!open) throw new Error('missing record menu');
    await TestRenderer.act(async () => open.props.onPress());
    expect(tree.root.findAllByProps({ testID: 'memory-remembrance-control' })).toHaveLength(0);
    expect(mockManageRemembrance).not.toHaveBeenCalled();
    expect(tree.root.findAll(node => node.props.accessibilityLabel === '기록 수정하기').length).toBeGreaterThan(0);
    expect(tree.root.findAll(node => node.props.accessibilityLabel === '기록 삭제하기').length).toBeGreaterThan(0);
    expect(JSON.stringify(mockRecord)).toBe(before);
  });
  it('does not infer memorial state while the record pet profile is unavailable', async () => {
    mockPets.pets = [];
    const tree = await render();
    const open = tree.root.findAllByType(TouchableOpacity).find(node => node.props.testID === 'memory-detail-more');
    if (!open) throw new Error('missing record menu');
    await TestRenderer.act(async () => open.props.onPress());
    expect(tree.root.findAllByProps({ testID: 'memory-remembrance-control' })).toHaveLength(0);
    expect(mockManageRemembrance).not.toHaveBeenCalled();
  });
  it('reads remembrance only on a memorial record menu even with another together pet selected', async () => {
    mockPets.pets.push({ id: 'other', name: '함께하는 아이', avatarUrl: null });
    mockPets.selectedPetId = 'other';
    const before = JSON.stringify(mockRecord), tree = await render();
    try {
      expect(mockManageRemembrance).not.toHaveBeenCalled();
      const open = tree.root.findAllByType(TouchableOpacity).find(node => node.props.testID === 'memory-detail-more');
      if (!open) throw new Error('missing record menu');
      await TestRenderer.act(async () => open.props.onPress());
      expect(mockManageRemembrance).toHaveBeenCalledTimes(1);
      expect(mockManageRemembrance).toHaveBeenCalledWith('detail', null);
      expect(tree.root.findAllByType(Switch).find(node => node.props.testID === 'memory-remembrance-switch')?.props.value).toBe(false);
      expect(JSON.stringify(mockRecord)).toBe(before);
    } finally { TestRenderer.act(() => tree.unmount()); }
  });

  it('serializes explicit remembrance toggles and uses the server result without editing record fields', async () => {
    const before = JSON.stringify(mockRecord), tree = await render();
    try {
      const open = tree.root.findAllByType(TouchableOpacity).find(node => node.props.testID === 'memory-detail-more');
      if (!open) throw new Error('missing record menu');
      await TestRenderer.act(async () => open.props.onPress());
      const control = tree.root.findAllByType(Switch).find(node => node.props.testID === 'memory-remembrance-switch');
      if (!control) throw new Error('missing remembrance switch');
      let resolve: (value: boolean) => void = () => { throw new Error('missing pending operation'); };
      mockManageRemembrance.mockImplementationOnce(() => new Promise<boolean>(done => { resolve = done; }));
      TestRenderer.act(() => { control.props.onValueChange(true); control.props.onValueChange(true); });
      expect(mockManageRemembrance.mock.calls.filter(call => call[1] === true)).toHaveLength(1);
      await TestRenderer.act(async () => resolve(true));
      expect(tree.root.findAllByType(Switch).find(node => node.props.testID === 'memory-remembrance-switch')?.props.value).toBe(true);
      expect(JSON.stringify(mockRecord)).toBe(before);
    } finally { TestRenderer.act(() => tree.unmount()); }
  });

  it('shows a retry instead of an unchecked value when remembrance status is unknown', async () => {
    mockManageRemembrance.mockRejectedValueOnce(new Error('offline'));
    const tree = await render();
    try {
      const open = tree.root.findAllByType(TouchableOpacity).find(node => node.props.testID === 'memory-detail-more');
      if (!open) throw new Error('missing record menu');
      await TestRenderer.act(async () => open.props.onPress());
      expect(tree.root.findAllByType(Switch).filter(node => node.props.testID === 'memory-remembrance-switch')).toHaveLength(0);
      expect(tree.root.findAll(node => node.props.accessibilityLabel === '추억 활동 다시 확인').length).toBeGreaterThan(0);
      expect(mockManageRemembrance.mock.calls.every(call => call[1] === null)).toBe(true);
    } finally { TestRenderer.act(() => tree.unmount()); }
  });
  it('removes the default black outline from the more memories action', () => {
    expect(StyleSheet.flatten(styles.relatedMoreButton)).toMatchObject({ borderWidth: 0 });
  });
  it.each([[1600, 900], [800, 800], [400, 1600]])('does not paint gray bands around an uncropped %sx%s photo', async (width, height) => {
    mockRecord.imagePaths = ['qa/fit-only.jpg'];
    const size = jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => success(width, height));
    const tree = await render();
    try {
      const viewport = tree.root.findAllByType(View).find(node => node.props.testID === 'memory-detail-photo-viewport');
      if (!viewport) throw new Error('Photo viewport missing');
      TestRenderer.act(() => viewport.props.onLayout({ nativeEvent: { layout: { width: 320 } } }));
      expect(StyleSheet.flatten(viewport.props.style).height).toBe(Math.min(320 / (width / height), Dimensions.get('window').height * 0.7));
      const photo = tree.root.findAllByType(OptimizedImage).find(node => node.props.uri.endsWith('fit-only.jpg'));
      if (!photo) throw new Error('Resolved original photo missing');
      expect(photo.props.resizeMode).toBe('contain');
      expect(StyleSheet.flatten(photo.props.style)).toMatchObject({ backgroundColor: 'transparent' });
      expect(StyleSheet.flatten(styles.postImageSlide)).toMatchObject({ backgroundColor: 'transparent' });
      expect(deleteMemoryWithFile).not.toHaveBeenCalled();
    } finally {
      TestRenderer.act(() => tree.unmount());
      size.mockRestore();
    }
  });
  it('uses one vertical list and reserves the measured overlay toolbar once', async () => {
    const tree = await render();
    const lists = tree.root
      .findAllByType(FlatList)
      .filter(node => !node.props.horizontal);
    expect(lists).toHaveLength(1);
    expect(lists[0].props.testID).toBe('memory-detail-scroll');
    expect(
      StyleSheet.flatten(lists[0].props.contentContainerStyle).paddingBottom,
    ).toBe(88);
    expect(lists[0].props.scrollEnabled).not.toBe(false);
    TestRenderer.act(() => tree.unmount());
  });
  it('uses a warm history heading and text-only category chips while preserving empty thumbnails', async () => {
    const tree = await render();
    expect(text(tree)).toContain('함께 쌓아온 추억');
    expect(text(tree)).not.toContain('다른 추억들');
    const chips = tree.root
      .findAllByType(View)
      .filter(
        node =>
          Array.isArray(node.props.style) &&
          node.props.style.includes(styles.categoryChip),
      );
    expect(chips).toHaveLength(6);
    chips.forEach(chip => {
      expect(chip.findAll(node => node.props.family === 'material')).toHaveLength(
        0,
      );
    });
    const related = tree.root
      .findAllByType(TouchableOpacity)
      .filter(node => node.props.testID === 'memory-detail-related-record');
    related.forEach(card => {
      expect(
        card.findAll(
          node => node.props.family === 'material' && node.props.size === 26,
        ),
      ).toHaveLength(1);
    });
    TestRenderer.act(() => tree.unmount());
  });
  it('keeps the approved unframed story, transparent related rows and larger identity avatar', async () => {
    const tree = await render();
    const main = tree.root.findAll(
      node => node.type === View && node.props.testID === 'memory-detail-post-glass',
    );
    const related = tree.root.findAll(
      node => node.type === View && node.props.testID === 'memory-detail-related-glass',
    );
    expect(main).toHaveLength(1);
    expect(related).toHaveLength(5);
    expect(StyleSheet.flatten(main[0].props.style)).toMatchObject({ padding: 0, marginHorizontal: 16, backgroundColor: 'transparent' });
    for (const frame of related) expect(StyleSheet.flatten(frame.props.style)).toMatchObject({
      backgroundColor: 'transparent', borderRadius: 8, marginTop: 0, padding: 6,
    });
    expect(main[0].findAll(node => node.props.testID === 'home-reflective-fill')).toHaveLength(0);
    expect(styles.postCard.backgroundColor).not.toBe('#FFFFFF');
    expect(styles.postAvatar).toMatchObject({ width: 48, height: 48, borderRadius: 24 });
    expect(styles.relatedThumb).toMatchObject({ width: 72, height: 80 });
    expect(styles.headerLink.backgroundColor).toBe('transparent');
    TestRenderer.act(() => tree.unmount());
  });
  it('shows each historical date as well as time instead of implying every record is from the same day', async () => {
    const tree = await render();
    const related = tree.root.findAllByType(TouchableOpacity).filter(
      node => node.props.testID === 'memory-detail-related-record',
    );
    related.forEach(card => {
      const copy = card.findAllByType(Text).map(node => node.props.children).join(' ');
      expect(copy).toContain('2026.09.01');
      expect(copy).toContain('오후 12:16');
    });
    TestRenderer.act(() => tree.unmount());
  });
  it('uses the existing KST date fallback for a historical record without an occurred date', async () => {
    mockFetchPage.mockResolvedValueOnce({
      items: [{ ...mockRecord, id: 'history-fallback', occurredAt: null, createdAt: '2026-12-31T15:01:00Z' }],
      hasMore: false,
      nextCursor: null,
    });
    const tree = await render();
    expect(text(tree)).toContain('2027.01.01');
    expect(text(tree)).toContain('오전 12:01');
    TestRenderer.act(() => tree.unmount());
  });
  it('uses fixed timeline metadata colors while keeping the historical row hierarchy', () => {
    for (const style of [styles.postMetaLine, styles.relatedSectionCount, styles.postTagsText]) {
      expect(StyleSheet.flatten(style)?.color).toBe('#716A9C');
    }
    expect(styles.relatedTime.color).toBe(lightColors.textSecondary);
    expect(styles.tagText.color).toBe('#7D4DFA');
    expect(styles.postContentText.fontSize).toBe(T.body.fontSize);
    expect(styles.tagText.fontSize).toBe(T.meta.fontSize);
    expect(styles.relatedTitle.fontSize).toBe(12);
  });
  it('fits original image proportions without crop and opens a dismissible overlay', async () => {
    mockRecord.imagePaths = ['qa/portrait.png'];
    const spy = jest
      .spyOn(Image, 'getSize')
      .mockImplementation((_uri, success) => success(800, 1200));
    const tree = await render();
    const carousel = tree.root
      .findAllByType(FlatList)
      .find(node => node.props.horizontal)!;
    const viewport = tree.root
      .findAllByType(View)
      .find(node => node.props.testID === 'memory-detail-photo-viewport')!;
    TestRenderer.act(() =>
      viewport.props.onLayout({ nativeEvent: { layout: { width: 320 } } }),
    );
    expect(StyleSheet.flatten(viewport.props.style).height).toBe(480);
    expect(carousel.props.horizontal).toBe(true);
    const photo = tree.root
      .findAllByType(OptimizedImage)
      .find(node => node.props.uri.endsWith('portrait.png'))!;
    expect(photo.props.resizeMode).toBe('contain');
    const imageButton = tree.root.findAll(
      node =>
        /^사진 \d+ 크게 보기$/.test(node.props.accessibilityLabel ?? '') &&
        typeof node.props.onPress === 'function',
    )[0];
    TestRenderer.act(() => imageButton.props.onPress());
    expect(
      tree.root.findAllByType(Modal).some(node => node.props.visible),
    ).toBe(true);
    const close = tree.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.accessibilityLabel === '확대 사진 닫기')!;
    const closeIcon = close.findAll(node => node.props.family === 'feather' && node.props.name === 'x')[0];
    expect(closeIcon).toBeDefined();
    expect(closeIcon.props).toMatchObject({
      name: 'x',
      color: '#FFFFFF',
    });
    TestRenderer.act(() =>
      tree.root
        .findAllByType(TouchableOpacity)
        .find(node => node.props.accessibilityLabel === '확대 사진 닫기')!
        .props.onPress(),
    );
    expect(
      tree.root.findAllByType(Modal).some(node => node.props.visible),
    ).toBe(false);
    TestRenderer.act(() => tree.unmount());
    spy.mockRestore();
  });
  it('keeps all three photo pages, counter and dots without showing the no-photo state', async () => {
    mockRecord.imagePaths = [
      'qa/photo-1.jpg',
      'qa/photo-2.jpg',
      'qa/photo-3.jpg',
    ];
    const tree = await render();
    const carousel = tree.root
      .findAllByType(FlatList)
      .find(node => node.props.horizontal)!;
    expect(carousel.props.data).toHaveLength(3);
    expect(carousel.props.pagingEnabled).toBe(true);
    expect(text(tree)).not.toContain('사진 없이 남긴 소중한 기록이에요');
    TestRenderer.act(() =>
      carousel.props.onMomentumScrollEnd({
        nativeEvent: {
          layoutMeasurement: { width: 320 },
          contentOffset: { x: 640 },
        },
      }),
    );
    expect(text(tree)).toMatch(/3\s*\/\s*3/);
    TestRenderer.act(() => tree.unmount());
  });
  it.each(['autumn', 'winter', 'spring', 'summer'] as SeasonKey[])(
    'renders a text-first no-photo story and fixed-palette related action in %s',
    async season => {
      mockSeason = season;
      const tree = await render();
      expect(text(tree)).toContain('추억 상세');
      expect(tree.root.findAllByType(FlatList).filter(node => node.props.horizontal)).toHaveLength(0);
      expect(text(tree)).toContain(mockRecord.title);
      expect(text(tree)).toContain(mockRecord.content);
      expect(text(tree)).toContain('5개 표시');
      expect(
        tree.root
          .findAllByType(TouchableOpacity)
          .filter(node => node.props.testID === 'memory-detail-related-record'),
      ).toHaveLength(5);
      const more = tree.root
        .findAllByType(CtaButton)
        .find(
          node => node.props.accessibilityLabel === '다른 추억 5개 더보기',
        )!;
      expect(more.props.role).toBe('primary');
      const button = more.findAllByType(View).find(node => node.props.accessibilityLabel === '다른 추억 5개 더보기');
      expect(button).toBeDefined();
      expect(StyleSheet.flatten(button?.props.style).backgroundColor).toBe(C.primary);
      const moreIcon = more.findAll(node => node.props.family === 'feather' && node.props.name === 'chevron-right')[0];
      expect(moreIcon).toBeDefined();
      expect(moreIcon.props).toMatchObject({
        family: 'feather',
        name: 'chevron-right',
        color: '#FFFFFF',
      });
      expect(text(tree)).toContain('추억을 더 만나볼까요');
      expect(text(tree)).not.toContain('추억을 더 만나볼까요?');
      expect(styles.relatedMoreButtonText).toMatchObject({
        flex: 1,
        textAlign: 'center',
      });
      expect(
        more
          .findAllByType(View)
          .filter(node => node.props.style === styles.relatedMoreButtonSide),
      ).toHaveLength(2);
      expect(styles.relatedMoreButtonSide.width).toBe(18);
      expect(mockFetchPage).toHaveBeenCalledWith(
        expect.objectContaining({
          petId: 'pet',
          limit: 6,
          cursor: null,
        }),
      );
      await TestRenderer.act(async () => more.props.onPress());
      expect(
        tree.root
          .findAllByType(TouchableOpacity)
          .filter(node => node.props.testID === 'memory-detail-related-record'),
      ).toHaveLength(7);
      TestRenderer.act(() => tree.unmount());
    },
  );
  it('uses stack Back rather than navigating Home, and preserves origin for related record replacement', async () => {
    const tree = await render();
    TestRenderer.act(() =>
      tree.root
        .findAllByType(TouchableOpacity)
        .find(node => node.props.accessibilityLabel === '추억 상세 뒤로가기')!
        .props.onPress(),
    );
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    TestRenderer.act(() =>
      tree.root
        .findAllByType(TouchableOpacity)
        .find(node => node.props.testID === 'memory-detail-related-record')!
        .props.onPress(),
    );
    expect(mockNavigation.replace).toHaveBeenCalledWith(
      'RecordDetail',
      expect.objectContaining({ entrySource: 'timeline', petId: 'pet' }),
    );
    TestRenderer.act(() => tree.unmount());
  });
  it('opens a spacious text-only edit/delete menu while retaining final deletion confirmation', async () => {
    const tree = await render();
    TestRenderer.act(() =>
      tree.root
        .findAllByType(TouchableOpacity)
        .find(node => node.props.testID === 'memory-detail-more')!
        .props.onPress(),
    );
    const menu = tree.root
      .findAllByType(Modal)
      .find(node => node.props.visible)!;
    const edit = menu.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === '기록 수정하기');
    const remove = menu.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === '기록 삭제하기');
    expect(edit).toBeDefined();
    expect(remove).toBeDefined();
    expect(menu.findAllByType(CtaButton).map(node => node.props.role)).toEqual(['neutral']);
    if (!remove) throw new Error('Delete management action missing');
    TestRenderer.act(() => remove.props.onPress());
    expect(mockStore.removeOneLocal).not.toHaveBeenCalled();
    const confirmation = tree.root.findByType(TimelineDeleteDialog);
    expect(confirmation.props.visible).toBe(true);
    expect(confirmation.findAllByType(CtaButton).find(node => node.props.testID === 'timeline-delete-confirm')?.props.role).toBe('destructiveConfirm');
    TestRenderer.act(() => tree.unmount());
  });
  it('foreground after interrupted Walk delete unlocks UI and reconciles canonical deletion without applying old completion', async () => {
    mockRecord.category = 'walk';
    mockWalkSource = { version: 1, source: 'GPS_TRACKED', petId: 'pet', memoryId: 'detail', clientSessionId: 'session', recordState: 'RECORDED', sessionDeleted: true, summary: null };
    let oldCurrent = true;
    mockWalkScope = { ownerId: 'owner', petId: 'pet', generation: 'old', current: () => oldCurrent };
    let finish!: () => void;
    jest.mocked(deleteMemoryWithFile).mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
    jest.mocked(walkRecordRepository.get).mockResolvedValue({ recordState: 'RECORD_DELETED', memory: null } as WalkRecordView);
    const tree = await render();
    const dialog = () => tree.root.findByType(TimelineDeleteDialog);
    TestRenderer.act(() => dialog().props.onConfirm());
    expect(dialog().props.loading).toBe(true);
    await TestRenderer.act(async () => {
      oldCurrent = false;
      mockWalkScope = { ownerId: 'owner', petId: 'pet', generation: 'foreground', current: () => true };
      tree.update(<ThemeProvider theme={createTheme('light')}><ToolbarHeightContext.Provider value={72}><RecordDetailScreen /></ToolbarHeightContext.Provider></ThemeProvider>);
    });
    expect(dialog().props.loading).toBe(false);
    expect(walkRecordRepository.get).toHaveBeenCalledWith('session', 'pet');
    expect(mockStore.removeOneLocal).toHaveBeenCalledTimes(1);
    await TestRenderer.act(async () => finish());
    expect(mockStore.removeOneLocal).toHaveBeenCalledTimes(1);
    TestRenderer.act(() => tree.unmount());
  });
  it.each(['header', 'delete'])('returns to the still-mounted health report after %s without changing its menu context', async action => {
    const invalidation = jest.spyOn(appQueryClient, 'invalidateQueries');
    mockRoute.params = { petId: 'pet', memoryId: 'detail', entrySource: 'health_report' };
    mockHealthParent = {
      getState: () => ({ index: 2, routes: [{ name: 'AppTabs' }, { name: 'HealthReport' }, { name: 'HealthTimeline' }] }),
      goBack: mockHealthParentBack,
    };
    if (action === 'delete') {
      jest.mocked(deleteMemoryWithFile).mockResolvedValueOnce(undefined);
      mockStore.refresh.mockResolvedValueOnce(undefined);
    }
    const tree = await render();
    await TestRenderer.act(async () => {
      if (action === 'delete') await tree.root.findByType(TimelineDeleteDialog).props.onConfirm();
      else {
        const back = tree.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === '추억 상세 뒤로가기');
        if (!back) throw new Error('Expected detail Back');
        back.props.onPress();
      }
    });
    expect(mockHealthParentBack).toHaveBeenCalledTimes(1);
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    expect(invalidation).toHaveBeenCalledWith({ queryKey: ['health-report', 'month', 'pet'] });
    invalidation.mockRestore();
  });
  it('retains the existing health return when no report is under the detail stack', async () => {
    mockRoute.params = { petId: 'pet', memoryId: 'detail', entrySource: 'health_report' };
    mockHealthParent = {
      getState: () => ({ index: 1, routes: [{ name: 'AppTabs' }, { name: 'HealthTimeline' }] }),
      goBack: mockHealthParentBack,
    };
    const tree = await render();
    const back = tree.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === '추억 상세 뒤로가기');
    if (!back) throw new Error('Expected detail Back');
    await TestRenderer.act(async () => back.props.onPress());
    expect(mockNavigation.navigate).toHaveBeenCalledWith('HealthReport', expect.objectContaining({ petId: 'pet', initialTab: 'records' }));
    expect(mockHealthParentBack).not.toHaveBeenCalled();
  });
  it.each([false, true])('returns a deleted record to its notification origin only when notification=%s', async notification => {
    if (notification) {
      mockRoute.params = {
        petId: 'pet', memoryId: 'detail',
        notificationOpen: { id: 'notice', source: 'user', ownerId: 'owner', requestId: 'open-1' },
      };
    }
    jest.mocked(deleteMemoryWithFile).mockResolvedValueOnce(undefined);
    mockStore.refresh.mockResolvedValueOnce(undefined);
    const tree = await render();
    await TestRenderer.act(async () => tree.root.findByType(TimelineDeleteDialog).props.onConfirm());
    expect(deleteMemoryWithFile).toHaveBeenCalledWith({ memoryId: 'detail', imagePath: undefined, imagePaths: [] });
    expect(mockStore.removeOneLocal).toHaveBeenCalledWith('pet', 'detail');
    if (notification) {
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    } else {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('TimelineMain', { petId: 'pet', mainCategory: 'all' });
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    }
  });
  it.each(['owner', 'unmount'])('does not apply an old delete callback after %s changes', async boundary => {
    let finish!: () => void;
    jest.mocked(deleteMemoryWithFile).mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
    const tree = await render();
    let deleting!: Promise<void>;
    TestRenderer.act(() => { deleting = tree.root.findByType(TimelineDeleteDialog).props.onConfirm(); });
    if (boundary === 'owner') mockTitleOwner = 'different-owner';
    else TestRenderer.act(() => tree.unmount());
    await TestRenderer.act(async () => { finish(); await deleting; });
    expect(mockStore.removeOneLocal).not.toHaveBeenCalled();
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });
  it('shows a retry instead of inventing a zero related count after a read failure', async () => {
    mockFetchPage.mockRejectedValueOnce(new Error('read failure'));
    const tree = await render();
    expect(text(tree)).toContain('관련 기록 다시 불러오기');
    expect(text(tree)).not.toContain('아직 다른 추억은 없어요.');
    TestRenderer.act(() => tree.unmount());
  });
});
