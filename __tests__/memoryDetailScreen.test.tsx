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
} from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import CtaButton from '../src/app/ui/CtaButton';
import OptimizedImage from '../src/components/images/OptimizedImage';
import Feather from 'react-native-vector-icons/Feather';
import { styles } from '../src/screens/Records/RecordDetailScreen.styles';
import RecordDetailScreen from '../src/screens/Records/RecordDetailScreen';
import type { MemoryRecord } from '../src/services/supabase/memories';
import { SEASON_CTA } from '../src/app/theme/ctaPalette';
import { lightColors, PRODUCT_CANVAS_COLOR } from '../src/app/theme/tokens/colors';
import { HOME_FLOATING_WIDGET_MATERIAL } from '../src/components/home/HomeWidgetMaterial';
import type { SeasonKey } from '../src/theme/seasonal/season';
import { ToolbarHeightContext } from '../src/components/navigation/ToolbarHeightContext';
import { deleteMemoryWithFile } from '../src/services/supabase/memories';
import { walkRecordRepository } from '../src/services/walk/server/supabaseWalkRecordRepository';
import type { WalkMemorySourceSummary, WalkRecordView } from '../src/services/walk/server/recordRepository';
import { appQueryClient } from '../src/services/query/appQueryClient';

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
jest.mock('../src/hooks/useWalkProduct', () => ({ useWalkScope: () => mockWalkScope, useWalkSources: () => ({ data: mockWalkSource ? [mockWalkSource] : [] }) }));
jest.mock('../src/services/walk/server/supabaseWalkRecordRepository', () => ({ walkRecordRepository: { get: jest.fn() } }));
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
  popTo: jest.fn(),
  replace: jest.fn(),
};
const mockRoute = {
  params: { petId: 'pet', memoryId: 'detail', entrySource: 'timeline' },
};
const mockFetchPage = jest.fn();
let mockSeason: SeasonKey = 'autumn';
const mockStore = {
  selectRecordById: () => mockRecord,
  removeOneLocal: jest.fn(),
  refresh: jest.fn(),
  upsertOneLocal: jest.fn(),
  recordsById: {},
};
const mockPets = {
  pets: [{ id: 'pet', name: '누리', avatarUrl: null }],
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
  afterEach(() => appQueryClient.clear());
  beforeEach(() => {
    jest.clearAllMocks();
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
  it('uses shared reflective glass without opaque card backing and shrinks only the pet avatar', async () => {
    const tree = await render();
    const main = tree.root.findAll(
      node => node.type === View && node.props.testID === 'memory-detail-post-glass',
    );
    const related = tree.root.findAll(
      node => node.type === View && node.props.testID === 'memory-detail-related-glass',
    );
    expect(main).toHaveLength(1);
    expect(related).toHaveLength(5);
    for (const frame of [...main, ...related]) {
      expect(StyleSheet.flatten(frame.props.style)).toMatchObject({
        backgroundColor: 'transparent',
        borderRadius: 8,
        marginTop: 0,
      });
      const fill = frame.findAll(
        node => node.type === View && node.props.testID === 'home-reflective-fill',
      )[0];
      expect(StyleSheet.flatten(fill.props.style)).toMatchObject(
        HOME_FLOATING_WIDGET_MATERIAL,
      );
    }
    expect(StyleSheet.flatten(main[0].props.style).padding).toBe(12);
    expect(styles.postCard.backgroundColor).not.toBe('#FFFFFF');
    expect(styles.postAvatar).toMatchObject({ width: 36, height: 36, borderRadius: 18 });
    expect(styles.relatedThumb).toMatchObject({ width: 72, height: 80 });
    expect(styles.headerLink.backgroundColor).toBe(PRODUCT_CANVAS_COLOR);
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
  it('keeps small metadata readable using the existing neutral secondary foreground', () => {
    for (const style of [styles.postMetaLine, styles.relatedSectionCount, styles.relatedTime, styles.postTagsText, styles.tagText]) {
      expect(StyleSheet.flatten(style)?.color).toBe(lightColors.textSecondary);
    }
    expect(styles.postContentText.fontSize).toBe(13);
    expect(styles.tagText.fontSize).toBe(11);
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
    const closeIcon = close.findByType(Feather);
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
    'renders the no-photo state and five historical previews with %s accents',
    async season => {
      mockSeason = season;
      const tree = await render();
      expect(text(tree)).toContain('추억 상세');
      expect(text(tree)).toContain('사진 없이 남긴 소중한 기록이에요');
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
      const button = more.findAllByType(View).find(
        node => node.props.accessibilityRole === 'button',
      )!;
      expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(SEASON_CTA[season].primary);
      expect(more.findByType(Feather).props).toMatchObject({
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
    expect(menu.findAllByType(CtaButton).map(node => node.props.role)).toEqual([
      'primary',
      'destructiveConfirm',
    ]);
    expect(
      menu.findAll(
        node => node.props.name === 'edit-2' || node.props.name === 'trash-2',
      ),
    ).toHaveLength(0);
    expect(text(tree)).toContain('수정하기');
    expect(text(tree)).toContain('삭제하기');
    TestRenderer.act(() => menu.findAllByType(CtaButton)[1].props.onPress());
    expect(mockStore.removeOneLocal).not.toHaveBeenCalled();
    const confirmation = tree.root
      .findAllByType(Modal)
      .find(node => node.props.visible)!;
    expect(
      confirmation
        .findAllByType(CtaButton)
        .some(node => node.props.role === 'destructiveConfirm'),
    ).toBe(true);
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
    TestRenderer.act(() => tree.root.findAllByProps({ title: '정말 삭제할까요?' })[0].props.onConfirm());
    expect(tree.root.findAllByProps({ title: '정말 삭제할까요?' })[0].props.confirmLoading).toBe(true);
    await TestRenderer.act(async () => {
      oldCurrent = false;
      mockWalkScope = { ownerId: 'owner', petId: 'pet', generation: 'foreground', current: () => true };
      tree.update(<ThemeProvider theme={createTheme('light')}><ToolbarHeightContext.Provider value={72}><RecordDetailScreen /></ToolbarHeightContext.Provider></ThemeProvider>);
    });
    expect(tree.root.findAllByProps({ title: '정말 삭제할까요?' })[0].props.confirmLoading).toBe(false);
    expect(walkRecordRepository.get).toHaveBeenCalledWith('session', 'pet');
    expect(mockStore.removeOneLocal).toHaveBeenCalledTimes(1);
    await TestRenderer.act(async () => finish());
    expect(mockStore.removeOneLocal).toHaveBeenCalledTimes(1);
    TestRenderer.act(() => tree.unmount());
  });
  it('shows a retry instead of inventing a zero related count after a read failure', async () => {
    mockFetchPage.mockRejectedValueOnce(new Error('read failure'));
    const tree = await render();
    expect(text(tree)).toContain('관련 기록 다시 불러오기');
    expect(text(tree)).not.toContain('아직 다른 추억은 없어요.');
    TestRenderer.act(() => tree.unmount());
  });
});
