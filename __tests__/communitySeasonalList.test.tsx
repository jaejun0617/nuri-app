import React from 'react';
import {
  FlatList,
  Dimensions,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import NativeFeather from 'react-native-vector-icons/Feather';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { createTheme } from '../src/app/theme/theme';
import { SEASON_CTA } from '../src/app/theme/ctaPalette';
import type { SeasonKey } from '../src/theme/seasonal/season';
import {
  COMMUNITY_HERO_ASPECT_RATIO,
  COMMUNITY_HERO_IMAGES,
  COMMUNITY_HERO_PANEL_OVERLAP_RATIO,
  COMMUNITY_HERO_SURFACES,
} from '../src/theme/seasonal/community';
import CommunityStackHeader from '../src/navigation/CommunityStackHeader';
import { ToolbarHeightContext } from '../src/components/navigation/ToolbarHeightContext';
import CommunityListScreen from '../src/screens/Community/CommunityListScreen';
import { styles } from '../src/screens/Community/CommunityListScreen.styles';
import NuriIcon from '../src/components/icons/NuriIcon';
import {
  COMMUNITY_CATEGORY_PALETTE,
  getCommunityCategoryPalette,
} from '../src/screens/Community/communityCategoryPalette';
import { useCommunityStore } from '../src/store/communityStore';
import { usePetStore } from '../src/store/petStore';
import type { CommunityPost } from '../src/types/community';

let mockSeason: SeasonKey = 'autumn';
let mockInsets = { top: 24, bottom: 24, left: 0, right: 0 };
const mockRequireLogin = jest.fn((callback: () => void) => callback());
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: undefined }),
  useFocusEffect: jest.fn(),
}));
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => mockSeason,
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => mockInsets,
}));
jest.mock('../src/hooks/useCommunityAuth', () => ({
  useCommunityAuth: () => ({
    requireLogin: mockRequireLogin,
  }),
}));
jest.mock('../src/hooks/useEntryAwareBackAction', () => ({
  useEntryAwareBackAction: () => mockNavigation.goBack,
}));
jest.mock('../src/components/common/ConfirmDialog', () => {
  const runtime = jest.requireActual('react') as typeof React;
  return {
    __esModule: true,
    default: (props: React.PropsWithChildren<Record<string, unknown>>) =>
      runtime.createElement('ConfirmDialogMock', props),
  };
});

const post: CommunityPost = {
  id: 'post-1',
  authorId: 'author-1',
  authorNickname: '누리 가족',
  authorAvatarUrl: null,
  petId: null,
  petName: null,
  petBreed: null,
  petSpecies: null,
  petAgeLabel: null,
  petAvatarUrl: null,
  showPetAge: true,
  title: '오늘의 산책 이야기',
  content: '함께한 하루',
  imagePath: null,
  imageUrl: null,
  imagePaths: [],
  imageUrls: [],
  hasImage: true,
  status: 'active',
  category: 'daily',
  likeCount: 4,
  commentCount: 2,
  viewCount: 8,
  isNotice: false,
  noticePublishedAt: null,
  isLikedByMe: false,
  deletedAt: null,
  createdAt: '2026-10-06T00:00:00Z',
  updatedAt: '2026-10-06T00:00:00Z',
};
const mockFetch = jest.fn(() => Promise.resolve());
const mockCategory = jest.fn(() => Promise.resolve());
const mockNext = jest.fn(() => Promise.resolve());
const mockPrevious = jest.fn(() => Promise.resolve());
const mockSize = jest.fn(() => Promise.resolve());
const mockRefresh = jest.fn(() => Promise.resolve());

function categoryFace(node: TestRenderer.ReactTestInstance | undefined) {
  return node
    ?.findAllByType(View)
    .find(
      child =>
        Array.isArray(child.props.style) &&
        child.props.style[0] === styles.categoryChipFace,
    );
}

function heroImage(renderer: TestRenderer.ReactTestRenderer) {
  const hero = renderer.root
    .findAllByType(Image)
    .find(node => node.props.testID === 'community-seasonal-hero');
  if (!hero) throw new Error('Expected the complete hero canvas');
  return hero;
}

function tree(toolbarHeight: number | null = 80) {
  return (
    <ThemeProvider theme={createTheme('light')}>
      <ToolbarHeightContext.Provider value={toolbarHeight}>
        <CommunityListScreen />
      </ToolbarHeightContext.Provider>
    </ThemeProvider>
  );
}

describe('community seasonal list candidate', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  let infoSpy: jest.SpyInstance;
  const originalState = useCommunityStore.getState();
  const originalPets = usePetStore.getState();

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSeason = 'autumn';
    mockInsets = { top: 24, bottom: 24, left: 0, right: 0 };
    mockRequireLogin.mockImplementation(callback => callback());
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    useCommunityStore.setState({
      posts: [post],
      postsById: { [post.id]: post },
      listStatus: 'ready',
      listErrorMessage: null,
      currentPage: 1,
      hasNextPage: true,
      hasPreviousPage: false,
      activeFilter: 'all',
      activeCategory: 'all',
      pageSize: 30,
      lastFetchedAt: Date.now(),
      fetchPosts: mockFetch,
      setCategory: mockCategory,
      loadMorePosts: mockNext,
      loadPreviousPosts: mockPrevious,
      setPageSize: mockSize,
      refreshPosts: mockRefresh,
    });
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(tree());
    });
  });
  afterEach(async () => {
    await TestRenderer.act(async () => {
      renderer.unmount();
    });
    useCommunityStore.setState(originalState, true);
    usePetStore.setState(originalPets, true);
    mockInsets = { top: 24, bottom: 24, left: 0, right: 0 };
    infoSpy.mockRestore();
  });

  it.each(['autumn', 'winter', 'spring', 'summer'] as const)(
    'uses the global %s artwork and seasonal accent, independent of pet theme',
    async season => {
      mockSeason = season;
      usePetStore.setState({
        pets: [{ id: 'pet', name: '누리', themeColor: '#6741D9' }],
        selectedPetId: 'pet',
      });
      await TestRenderer.act(async () => {
        renderer.update(tree());
      });
      const hero = heroImage(renderer);
      expect(hero.props.source).toEqual(COMMUNITY_HERO_IMAGES[season]);
      expect(hero.props.resizeMode).toBe('contain');
      expect(StyleSheet.flatten(hero.props.style)).toMatchObject({
        position: 'absolute',
        top: 0,
        left: 0,
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').width / COMMUNITY_HERO_ASPECT_RATIO,
      });
      expect(hero.props.accessibilityLabel).toContain('우리 아이들의 이야기');
      const category = renderer.root
        .findAllByType(TouchableOpacity)
        .find(
          node =>
            node.props.accessibilityRole === 'tab' &&
            node.props.style === styles.categoryChip &&
            node.props.accessibilityState.selected,
        );
      expect(category?.props.accessibilityState).toEqual({ selected: true });
      expect(
        StyleSheet.flatten(categoryFace(category)?.props.style).backgroundColor,
      ).toBe(SEASON_CTA[season].primary);
      const overlay = renderer.root.findAllByProps({
        testID: 'community-hero-overlay-header',
      })[0];
      expect(StyleSheet.flatten(overlay.props.style)).toMatchObject({
        position: 'absolute',
        top: 0,
        paddingTop: 8,
        paddingLeft: 0,
        paddingRight: 20,
      });
      expect(
        StyleSheet.flatten(overlay.props.style).backgroundColor,
      ).toBeUndefined();
      expect(renderer.root.findAllByType(Image)).toHaveLength(1);
      const create = renderer.root
        .findAll(node => typeof node.props.style === 'function')
        .find(node => node.props.testID === 'community-fixed-create');
      expect(
        StyleSheet.flatten(create?.props.style({ pressed: false })),
      ).toMatchObject({
        backgroundColor: SEASON_CTA[season].primary,
        width: 48,
        minHeight: 48,
      });
      expect(create?.findAllByType(NativeFeather)).toHaveLength(0);
      expect(create?.findAllByProps({ children: '글쓰기' }).length).toBeGreaterThan(0);
      expect(create?.findAllByType(NuriIcon)).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({
          testID: 'community-hero-header-artwork',
        }),
      ).toHaveLength(0);
      expect(mockNavigation.setOptions).not.toHaveBeenCalled();
      expect(
        renderer.root.findAllByProps({
          testID: 'community-hero-top-blend',
        }),
      ).toHaveLength(0);
      const tail = renderer.root.findAllByProps({
        testID: 'community-hero-tail',
      })[0];
      expect(tail.props.colors).toEqual([
        ...COMMUNITY_HERO_SURFACES[season].tail,
      ]);
      const panel = renderer.root.findAllByProps({
        testID: 'community-list-panel',
      })[0];
      expect(StyleSheet.flatten(panel.props.style).marginTop).toBeCloseTo(
        -styles.heroTail.height -
          Dimensions.get('window').width * COMMUNITY_HERO_PANEL_OVERLAP_RATIO,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it('switches the remaining seasons without resetting the page, filter, or approved layout', async () => {
    await TestRenderer.act(async () => {
      useCommunityStore.setState({
        currentPage: 2,
        activeCategory: 'question',
        hasPreviousPage: true,
      });
    });
    const originalHero = StyleSheet.flatten(heroImage(renderer).props.style);
    const originalPanel = StyleSheet.flatten(
      renderer.root.findAllByProps({ testID: 'community-list-panel' })[0].props
        .style,
    );
    for (const season of ['winter', 'spring', 'summer', 'autumn'] as const) {
      mockSeason = season;
      await TestRenderer.act(async () => {
        renderer.update(tree());
      });
      expect(heroImage(renderer).props.source).toEqual(
        COMMUNITY_HERO_IMAGES[season],
      );
      expect(StyleSheet.flatten(heroImage(renderer).props.style)).toEqual(
        originalHero,
      );
      expect(
        StyleSheet.flatten(
          renderer.root.findAllByProps({ testID: 'community-list-panel' })[0]
            .props.style,
        ),
      ).toEqual(originalPanel);
      expect(useCommunityStore.getState()).toMatchObject({
        currentPage: 2,
        activeCategory: 'question',
        activeFilter: 'all',
        pageSize: 30,
        posts: [post],
      });
    }
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockCategory).not.toHaveBeenCalled();
    expect(mockSize).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('places pagination after the final row inside the scrolling list', async () => {
    const list = renderer.root.findByType(FlatList);
    const footer = renderer.root.findAllByProps({
      testID: 'community-list-pagination',
    })[0];
    expect(list.props.ListFooterComponent.props.testID).toBe(
      'community-list-pagination',
    );
    expect(list.findAll(node => node === footer)).toHaveLength(1);
    expect(StyleSheet.flatten(footer.props.style)).toMatchObject({
      marginTop: 8,
    });
    expect(StyleSheet.flatten(footer.props.style)).not.toHaveProperty(
      'position',
    );
    const root = renderer.root.findByType(CommunityListScreen).children[0];
    if (typeof root === 'string') throw new Error('screen root must be a view');
    expect(StyleSheet.flatten(root.props.style)).toMatchObject({
      backgroundColor: '#FFFFFF',
      paddingTop: 24,
      paddingBottom: 80,
    });
    await TestRenderer.act(async () => {
      renderer.update(tree(105));
    });
    expect(StyleSheet.flatten(root.props.style).paddingBottom).toBe(105);
    await TestRenderer.act(async () => {
      renderer.update(tree(null));
    });
    expect(StyleSheet.flatten(root.props.style).paddingBottom).toBe(24);
  });

  it('anchors the single original canvas below the status bar without a separate header band', async () => {
    const header = renderer.root.findAllByProps({
      testID: 'community-hero-overlay-header',
    })[0];
    const frame = renderer.root.findAllByProps({
      testID: 'community-hero-frame',
    })[0];
    expect(
      frame
        .findAllByProps({ testID: 'community-hero-overlay-header' })
        .some(node => node === header),
    ).toBe(true);
    const canvas = frame.findAllByProps({
      testID: 'community-hero-canvas',
    })[0];
    expect(StyleSheet.flatten(canvas.props.style)).toMatchObject({
      position: 'relative',
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').width / COMMUNITY_HERO_ASPECT_RATIO,
    });
    for (const node of [frame, canvas]) {
      const bounds = StyleSheet.flatten(node.props.style);
      for (const property of ['paddingTop', 'marginTop', 'top']) {
        expect(bounds[property]).toBeUndefined();
      }
    }
    expect(frame.findAllByType(Image)).toHaveLength(1);
    expect(StyleSheet.flatten(heroImage(renderer).props.style)).toMatchObject({
      position: 'absolute',
      top: 0,
      left: 0,
    });
    expect(StyleSheet.flatten(header.props.style)).toMatchObject({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: 8,
    });
    // Unequal inner columns balance the right gutter without pushing back into artwork copy.
    expect(styles.headerLeft.width).toBe(
      styles.headerSide.width + styles.header.paddingHorizontal,
    );
    const back = header
      .findAllByType(TouchableOpacity)
      .find(node => node.props.accessibilityLabel === '뒤로가기');
    await TestRenderer.act(async () => back?.props.onPress());
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(header.props.onLayout).toBeUndefined();
  });

  it.each([0, 24, 48])(
    'reserves the %s dp status-bar inset once without changing the artwork bounds',
    async top => {
      mockInsets = { top, bottom: 24, left: 0, right: 0 };
      await TestRenderer.act(async () => renderer.update(tree()));
      const root = renderer.root.findAllByProps({
        testID: 'community-screen',
      })[0];
      const header = renderer.root.findAllByProps({
        testID: 'community-hero-overlay-header',
      })[0];
      expect(StyleSheet.flatten(root.props.style)).toMatchObject({
        paddingTop: top,
        backgroundColor: '#FFFFFF',
      });
      expect(StyleSheet.flatten(header.props.style)).toMatchObject({
        top: 0,
        paddingTop: 8,
      });
      expect(StyleSheet.flatten(heroImage(renderer).props.style)).toMatchObject(
        {
          top: 0,
          height: Dimensions.get('window').width / COMMUNITY_HERO_ASPECT_RATIO,
        },
      );
    },
  );

  it('keeps the fixed compose action separate from pagination, list content and scroll-to-top', async () => {
    const list = renderer.root.findByType(FlatList);
    const footer = renderer.root.findAllByProps({
      testID: 'community-list-pagination',
    })[0];
    const controls = footer.findAllByProps({
      testID: 'community-pagination-controls',
    })[0];
    const floating = renderer.root.findAllByProps({
      testID: 'community-floating-actions',
    })[0];
    const create = floating
      .findAll(node => typeof node.props.style === 'function')
      .find(node => node.props.testID === 'community-fixed-create');
    expect(create).toBeDefined();
    expect(
      footer.findAllByProps({ testID: 'community-fixed-create' }),
    ).toHaveLength(0);
    expect(
      list.findAllByProps({ testID: 'community-fixed-create' }),
    ).toHaveLength(0);
    expect(
      controls.findAllByProps({ testID: 'community-fixed-create' }),
    ).toHaveLength(0);
    expect(create?.findAllByProps({ children: '글쓰기' }).length).toBeGreaterThan(0);
    expect(create?.findAllByType(NativeFeather)).toHaveLength(0);
    expect(
      StyleSheet.flatten(create?.props.style({ pressed: false })),
    ).not.toHaveProperty('position');
    expect(StyleSheet.flatten(floating.props.style)).toMatchObject({
      position: 'absolute',
      bottom: 12,
      right: 16,
      gap: 12,
    });
    expect(
      StyleSheet.flatten(list.props.contentContainerStyle).paddingBottom,
    ).toBe(12);
    await TestRenderer.act(async () => {
      list.props.onScroll({ nativeEvent: { contentOffset: { y: 300 } } });
    });
    expect(
      list.findAll(node => node.props.accessibilityLabel === '목록 맨 위로'),
    ).toHaveLength(0);
    expect(
      footer.findAll(node => node.props.accessibilityLabel === '목록 맨 위로'),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ accessibilityLabel: '목록 맨 위로' })
        .length,
    ).toBeGreaterThan(0);
    expect(
      StyleSheet.flatten(list.props.contentContainerStyle).paddingBottom,
    ).toBe(12);
    expect(floating.props.children[0].props.accessibilityLabel).toBe(
      '목록 맨 위로',
    );
    expect(floating.props.children[1].props.testID).toBe(
      'community-fixed-create',
    );
  });

  it('aligns the compose overlay with the borderless footer without reserving content height', () => {
    const list = renderer.root.findByType(FlatList);
    const footer = renderer.root.findAllByProps({
      testID: 'community-list-pagination',
    })[0];
    const floating = renderer.root.findAllByProps({
      testID: 'community-floating-actions',
    })[0];
    expect(StyleSheet.flatten(floating.props.style).bottom).toBe(12);
    expect(footer.props.onLayout).toBeUndefined();
    expect(StyleSheet.flatten(footer.props.style)).not.toHaveProperty(
      'borderTopWidth',
    );
    expect(StyleSheet.flatten(footer.props.style)).not.toHaveProperty(
      'borderTopColor',
    );
    expect(StyleSheet.flatten(list.props.contentContainerStyle)).toEqual({
      flexGrow: 1,
      paddingBottom: 12,
    });
    expect(list.props.ListFooterComponentStyle).toBeUndefined();
    expect(StyleSheet.flatten(footer.props.style)).not.toHaveProperty('flex');
    expect(StyleSheet.flatten(footer.props.style)).not.toHaveProperty(
      'minHeight',
    );
    expect(StyleSheet.flatten(footer.props.style).marginTop).toBe(8);
  });

  it('stretches only the empty-result cell instead of spacing a populated footer away from posts', async () => {
    const list = renderer.root.findByType(FlatList);
    expect(list.props.data).toEqual([post.id]);
    expect(
      list.findAllByProps({ testID: 'community-empty-result' }),
    ).toHaveLength(0);
    expect(
      StyleSheet.flatten(list.props.contentContainerStyle),
    ).not.toHaveProperty('justifyContent');
    expect(StyleSheet.flatten(styles.paginationFooter)).not.toHaveProperty(
      'marginBottom',
    );
    expect(
      styles.paginationFooter.marginTop + styles.paginationFooter.paddingTop,
    ).toBe(12);
    expect(
      styles.paginationFooter.paddingBottom + styles.listContent.paddingBottom,
    ).toBe(16);
    await TestRenderer.act(async () => {
      useCommunityStore.setState({
        posts: [],
        postsById: {},
        hasNextPage: false,
      });
    });
    const empty = list.findAllByProps({ testID: 'community-empty-result' })[0];
    expect(StyleSheet.flatten(empty.props.style)).toEqual({ flexGrow: 1 });
    expect(list.props.ListFooterComponent.props.testID).toBe(
      'community-list-pagination',
    );
    expect(
      StyleSheet.flatten(list.props.contentContainerStyle).paddingBottom,
    ).toBe(12);
    for (const label of ['이전 페이지', '다음 페이지']) {
      const button = renderer.root
        .findAll(node => typeof node.props.style === 'function')
        .find(node => node.props.accessibilityLabel === label);
      expect(button?.props.accessibilityState.disabled).toBe(true);
    }
  });

  it('reserves horizontal safe-area space for list footer and fixed compose', async () => {
    mockInsets = { top: 24, bottom: 24, left: 12, right: 20 };
    await TestRenderer.act(async () => renderer.update(tree()));
    const footer = renderer.root.findAllByProps({
      testID: 'community-list-pagination',
    })[0];
    expect(StyleSheet.flatten(footer.props.style)).toMatchObject({
      paddingLeft: 28,
      paddingRight: 36,
    });
    const floating = renderer.root.findAllByProps({
      testID: 'community-floating-actions',
    })[0];
    expect(StyleSheet.flatten(floating.props.style).right).toBe(36);
  });

  it('uses content-width compact pagination and a transparent page number', async () => {
    const footer = renderer.root.findAllByProps({
      testID: 'community-list-pagination',
    })[0];
    const labels = footer.findAllByType(Text).map(node => node.props.children);
    expect(labels).toContain('이전');
    expect(labels).toContain('다음');
    for (const label of ['이전 페이지', '다음 페이지']) {
      const button = footer
        .findAll(node => typeof node.props.style === 'function')
        .find(node => node.props.accessibilityLabel === label);
      expect(button?.props.accessibilityRole).toBe('button');
      const buttonStyle = StyleSheet.flatten(
        button?.props.style({ pressed: false }),
      );
      expect(buttonStyle).toMatchObject({
        minWidth: 44,
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 0,
        borderRadius: 6,
        opacity: 1,
      });
      expect(buttonStyle).not.toHaveProperty('width');
      expect(buttonStyle).not.toHaveProperty('flex');
      expect(buttonStyle).not.toHaveProperty('elevation');
    }
    const page = footer.findAllByProps({
      accessibilityLabel: '현재 1페이지',
    })[0];
    expect(StyleSheet.flatten(page.props.style)).toMatchObject({
      backgroundColor: 'transparent',
    });
    expect(StyleSheet.flatten(page.props.style).borderRadius).toBeUndefined();
    await TestRenderer.act(async () =>
      useCommunityStore.setState({ listStatus: 'loadingMore' }),
    );
    expect(StyleSheet.flatten(page.props.style).backgroundColor).toBe(
      'transparent',
    );
  });

  it.each([360, 384, 400, 430, 768])(
    'overrides native intrinsic asset dimensions with the measured %s dp list width',
    async width => {
      const viewport = renderer.root.findAllByProps({
        testID: 'community-list-viewport',
      })[0];
      await TestRenderer.act(async () => {
        viewport.props.onLayout({
          nativeEvent: { layout: { x: 0, y: 0, width, height: 600 } },
        });
      });
      const hero = heroImage(renderer);
      // React Native Image prepends asset width/height before the caller's style.
      const nativeStyle = StyleSheet.flatten([
        { width: 883, height: 439 },
        hero.props.style,
      ]);
      expect(nativeStyle.width).toBe(width);
      expect(nativeStyle).toMatchObject({ top: 0, left: 0 });
      expect(nativeStyle.height).toBeCloseTo(
        width / COMMUNITY_HERO_ASPECT_RATIO,
      );
      expect(nativeStyle.height).not.toBe(439);
      const canvas = renderer.root.findAllByProps({
        testID: 'community-hero-canvas',
      })[0];
      expect(StyleSheet.flatten(canvas.props.style)).toMatchObject({
        width,
        height: width / COMMUNITY_HERO_ASPECT_RATIO,
      });
      const panel = renderer.root.findAllByProps({
        testID: 'community-list-panel',
      })[0];
      const panelTop =
        nativeStyle.height +
        styles.heroTail.height +
        StyleSheet.flatten(panel.props.style).marginTop;
      expect(panelTop).toBeCloseTo((410 * width) / 883);
      await TestRenderer.act(async () => {
        hero.props.onError();
      });
      const fallbackView = renderer.root.findAll(
        node =>
          Array.isArray(node.props.style) &&
          node.props.style[0] === styles.heroFallback,
      )[0];
      expect(StyleSheet.flatten(fallbackView.props.style)).toMatchObject({
        width,
        height: width / COMMUNITY_HERO_ASPECT_RATIO,
      });
      expect(StyleSheet.flatten(panel.props.style).marginTop).toBe(
        -styles.heroTail.height,
      );
    },
  );

  it('remeasures a resized list and ignores invalid layout widths', async () => {
    const viewport = renderer.root.findAllByProps({
      testID: 'community-list-viewport',
    })[0];
    for (const width of [
      384,
      430,
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      await TestRenderer.act(async () => {
        viewport.props.onLayout({
          nativeEvent: { layout: { x: 0, y: 0, width, height: 600 } },
        });
      });
      const expected = width === 384 ? 384 : 430;
      expect(StyleSheet.flatten(heroImage(renderer).props.style).width).toBe(
        expected,
      );
    }
  });

  it('keeps all three filters and five category chips with gray inactive fills', async () => {
    const tabs = renderer.root
      .findAllByType(TouchableOpacity)
      .filter(node => node.props.accessibilityRole === 'tab');
    expect(tabs).toHaveLength(8);
    const categories = tabs.slice(3);
    expect(
      categories
        .slice(1)
        .map(
          node =>
            StyleSheet.flatten(categoryFace(node)?.props.style).backgroundColor,
        ),
    ).toEqual(Array(4).fill('#F1F3F6'));
    await TestRenderer.act(async () => {
      tabs[1].props.onPress();
    });
    expect(mockFetch).toHaveBeenLastCalledWith('popular', 'all');
    await TestRenderer.act(async () => {
      categories[2].props.onPress();
    });
    expect(mockCategory).toHaveBeenCalledWith('info');
    await TestRenderer.act(async () => {
      tabs[2].props.onPress();
    });
    expect(mockFetch).toHaveBeenLastCalledWith('notice', 'all');
  });

  it.each(['question', 'info', 'daily', 'free'] as const)(
    'keeps %s identity on filter and post badges independently of the season',
    async category => {
      const classified = { ...post, category };
      await TestRenderer.act(async () => {
        useCommunityStore.setState({
          activeCategory: category,
          posts: [classified],
          postsById: { [post.id]: classified },
        });
      });
      const palette = COMMUNITY_CATEGORY_PALETTE[category];
      for (const season of ['autumn', 'winter', 'spring', 'summer'] as const) {
        mockSeason = season;
        await TestRenderer.act(async () => renderer.update(tree()));
        const selected = renderer.root
          .findAllByType(TouchableOpacity)
          .find(
            node =>
              node.props.style === styles.categoryChip &&
              node.props.accessibilityState.selected,
          );
        expect(
          StyleSheet.flatten(categoryFace(selected)?.props.style)
            .backgroundColor,
        ).toBe(palette.text);
        const badge = renderer.root.findAllByProps({
          testID: 'community-post-category-badge',
        })[0];
        expect(StyleSheet.flatten(badge.props.style).backgroundColor).toBe(
          palette.subtle,
        );
        expect(
          StyleSheet.flatten(badge.findByType(Text).props.style).color,
        ).toBe(palette.text);
      }
    },
  );

  it('uses a circle-only pressed fill for scroll-to-top without native ripple', async () => {
    const list = renderer.root.findByType(FlatList);
    await TestRenderer.act(async () => {
      list.props.onScroll({ nativeEvent: { contentOffset: { y: 300 } } });
    });
    const top = renderer.root
      .findAllByProps({ accessibilityLabel: '목록 맨 위로' })
      .find(node => typeof node.props.style === 'function');
    expect(top).toBeDefined();
    expect(top?.props.android_ripple).toBeUndefined();
    expect(
      StyleSheet.flatten(top?.props.style({ pressed: true })),
    ).toMatchObject({
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: SEASON_CTA.autumn.subtle,
    });
    expect(
      StyleSheet.flatten(top?.props.style({ pressed: false })),
    ).toMatchObject({
      borderRadius: 22,
      backgroundColor: '#FFFFFF',
    });
  });

  it('shows each row category once, with an attachment icon instead of a thumbnail', () => {
    const row = renderer.root
      .findAll(node => typeof node.props.style === 'function')
      .find(node =>
        node.props.accessibilityLabel?.includes('오늘의 산책 이야기'),
      );
    expect(row).toBeDefined();
    expect(row?.props.accessibilityLabel).toContain('이미지 첨부');
    expect(row?.findAllByType(Image)).toHaveLength(0);
    expect(
      row?.findAllByType(Text).filter(node => node.props.children === '일상'),
    ).toHaveLength(1);
    expect(
      row?.findAllByProps({ testID: 'community-post-image-indicator' }).length,
    ).toBeGreaterThan(0);
    const meta = row
      ?.findAllByType(Text)
      .filter(
        node =>
          typeof node.props.children === 'string' &&
          node.props.children.includes('조회 8'),
      )[0];
    expect(meta?.props.children).not.toContain('일상');
    expect(meta?.props.children).toContain('추천 4');
  });

  it('preserves post navigation and moves the gated writing action above pagination', async () => {
    const row = renderer.root
      .findAll(node => typeof node.props.style === 'function')
      .find(node =>
        node.props.accessibilityLabel?.includes('오늘의 산책 이야기'),
      );
    await TestRenderer.act(async () => {
      row?.props.onPress();
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CommunityDetail', {
      postId: post.id,
    });
    const header = renderer.root.findAllByProps({
      testID: 'community-hero-overlay-header',
    })[0];
    expect(
      header.findAllByType(Text).some(node => node.props.children === '글쓰기'),
    ).toBe(false);
    expect(
      header.findAll(node => node.props.accessibilityLabel === '게시글 작성'),
    ).toHaveLength(0);
    await TestRenderer.act(async () => {
      renderer.root
        .find(
          node =>
            typeof node.props.style === 'function' &&
            node.props.accessibilityLabel === '게시글 작성',
        )
        .props.onPress();
    });
    expect(mockRequireLogin).toHaveBeenCalledTimes(1);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CommunityCreate');
    await TestRenderer.act(async () => {
      useCommunityStore.setState({ activeFilter: 'notice' });
    });
    expect(
      renderer.root.findAll(
        node => node.props.accessibilityLabel === '게시글 작성',
      ),
    ).toHaveLength(0);
    expect(
      renderer.root
        .findAllByType(TouchableOpacity)
        .filter(node => node.props.accessibilityRole === 'tab'),
    ).toHaveLength(3);
  });

  it('does not bypass login when the fixed compose action is pressed', async () => {
    mockRequireLogin.mockImplementation(() => {});
    const create = renderer.root
      .findAll(node => typeof node.props.style === 'function')
      .find(node => node.props.testID === 'community-fixed-create');
    await TestRenderer.act(async () => create?.props.onPress());
    expect(mockRequireLogin).toHaveBeenCalledTimes(1);
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('keeps notice semantics and removes the attachment indicator for text-only posts', async () => {
    const notice = { ...post, hasImage: false, isNotice: true };
    await TestRenderer.act(async () => {
      useCommunityStore.setState({
        posts: [notice],
        postsById: { [notice.id]: notice },
      });
    });
    const row = renderer.root
      .findAll(node => typeof node.props.style === 'function')
      .find(node => node.props.accessibilityLabel?.includes('공지사항 게시글'));
    expect(row).toBeDefined();
    expect(row?.props.accessibilityLabel).not.toContain('이미지 첨부');
    expect(
      row?.findAllByProps({ testID: 'community-post-image-indicator' }),
    ).toHaveLength(0);
    expect(
      row?.findAllByType(Text).filter(node => node.props.children === '일상'),
    ).toHaveLength(0);
    expect(
      row?.findAllByType(Text).filter(node => node.props.children === '공지'),
    ).toHaveLength(1);
  });

  it('uses the existing previous/next callbacks and blocks loading or unavailable pages', async () => {
    const next = () =>
      renderer.root
        .findAll(node => typeof node.props.style === 'function')
        .find(node => node.props.accessibilityLabel === '다음 페이지');
    const previous = () =>
      renderer.root
        .findAll(node => typeof node.props.style === 'function')
        .find(node => node.props.accessibilityLabel === '이전 페이지');
    expect(previous()?.props.disabled).toBe(true);
    expect(previous()?.props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(
      StyleSheet.flatten(previous()?.props.style({ pressed: false })),
    ).toMatchObject({ opacity: 1, backgroundColor: '#E8EBEF' });
    await TestRenderer.act(async () => {
      next()?.props.onPress();
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
    await TestRenderer.act(async () => {
      useCommunityStore.setState({ listStatus: 'loadingMore' });
    });
    expect(next()?.props.disabled).toBe(true);
    expect(previous()?.props.disabled).toBe(true);
    await TestRenderer.act(async () => {
      useCommunityStore.setState({
        listStatus: 'ready',
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });
    expect(next()?.props.disabled).toBe(true);
    await TestRenderer.act(async () => {
      previous()?.props.onPress();
    });
    expect(mockPrevious).toHaveBeenCalledTimes(1);
    expect(next()?.props.accessibilityState).toMatchObject({ disabled: true });
    expect(
      StyleSheet.flatten(next()?.props.style({ pressed: false })),
    ).toMatchObject({ opacity: 1, backgroundColor: '#E8EBEF' });
  });

  it('preserves page-size selection and refresh callbacks', async () => {
    const size = renderer.root
      .findAllByType(TouchableOpacity)
      .find(
        node => node.props.accessibilityLabel === '목록 표시 개수, 현재 30개',
      );
    await TestRenderer.act(async () => {
      size?.props.onPress();
    });
    const option = renderer.root
      .findAllByType(TouchableOpacity)
      .filter(node => node.props.accessibilityRole === 'radio')[1];
    await TestRenderer.act(async () => {
      option.props.onPress();
    });
    expect(mockSize).toHaveBeenCalledWith(50);
    const list = renderer.root.findByType(FlatList);
    await TestRenderer.act(async () => {
      list.props.refreshControl.props.onRefresh();
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it.each(['loading', 'error', 'ready'] as const)(
    'keeps the hero and filters in %s empty state',
    async status => {
      await TestRenderer.act(async () => {
        useCommunityStore.setState({
          posts: [],
          postsById: {},
          listStatus: status,
        });
      });
      expect(heroImage(renderer).props.source).toEqual(
        COMMUNITY_HERO_IMAGES.autumn,
      );
      expect(
        renderer.root
          .findAllByType(TouchableOpacity)
          .filter(node => node.props.accessibilityRole === 'tab'),
      ).toHaveLength(8);
      expect(
        renderer.root
          .findAll(node => typeof node.props.style === 'function')
          .find(node => node.props.accessibilityLabel === '다음 페이지')?.props
          .disabled,
      ).toBe(true);
      if (status === 'error')
        expect(
          renderer.root
            .findAllByType(Text)
            .some(node => node.props.children === '게시글을 불러오지 못했어요'),
        ).toBe(true);
    },
  );

  it('falls back without losing navigation when an image cannot decode', async () => {
    await TestRenderer.act(async () => {
      heroImage(renderer).props.onError();
    });
    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    expect(
      renderer.root
        .findAllByType(Text)
        .some(node => node.props.children === '우리 아이들의 이야기'),
    ).toBe(true);
    expect(
      renderer.root.findAllByProps({ testID: 'community-list-pagination' })
        .length,
    ).toBeGreaterThan(0);
    mockSeason = 'winter';
    await TestRenderer.act(async () => {
      renderer.update(tree());
    });
    expect(heroImage(renderer).props.source).toEqual(
      COMMUNITY_HERO_IMAGES.winter,
    );
  });
});

describe('community seasonal artwork and responsive source contract', () => {
  it('owns four distinct legible category palettes and preserves unclassified data', () => {
    const luminance = (hex: string) => {
      const channels = [1, 3, 5].map(index => {
        const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const contrast = (foreground: string, background: string) => {
      const a = luminance(foreground),
        b = luminance(background);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    const palettes = Object.values(COMMUNITY_CATEGORY_PALETTE);
    expect(new Set(palettes.map(item => item.text)).size).toBe(4);
    expect(new Set(palettes.map(item => item.subtle)).size).toBe(4);
    for (const palette of palettes) {
      expect(contrast(palette.text, palette.subtle)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrast(palette.text, '#F1F3F6')).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.onSelected, palette.text)).toBeGreaterThanOrEqual(
        4.5,
      );
    }
    expect(getCommunityCategoryPalette(null)).toEqual({
      text: '#566271',
      subtle: '#F1F3F6',
      onSelected: '#FFFFFF',
    });
  });
  it('disables the separate list headers without changing the detail header route', () => {
    const root = fs.readFileSync(
      path.join(__dirname, '../src/navigation/RootNavigator.tsx'),
      'utf8',
    );
    const tab = fs.readFileSync(
      path.join(__dirname, '../src/navigation/CommunityTabStackNavigator.tsx'),
      'utf8',
    );
    expect(
      root.match(/<Stack.Screen\s+name="CommunityList"[\s\S]*?\/>/)?.[0],
    ).toContain('headerShown: false');
    expect(
      root.match(/<Stack.Screen\s+name="CommunityDetail"[\s\S]*?\/>/)?.[0],
    ).toContain('headerShown: true');
    expect(
      tab.match(/<Stack.Screen\s+name="CommunityTabList"[\s\S]*?\/>/)?.[0],
    ).toContain('headerShown: false');
  });
  it('bundles four distinct intact 883 by 439 PNG canvases', () => {
    const hashes = Object.keys(COMMUNITY_HERO_IMAGES).map(season => {
      const bytes = fs.readFileSync(
        path.join(__dirname, `../src/assets/seasonal/community/${season}.png`),
      );
      expect(bytes.readUInt32BE(16)).toBe(883);
      expect(bytes.readUInt32BE(20)).toBe(439);
      return createHash('sha256').update(bytes).digest('hex');
    });
    expect(new Set(hashes).size).toBe(4);
  });
  it.each([
    [
      'winter',
      'bdaee084f789bef304a8b7f60a20aaff5d70a7f0d59eb8cfc30be04dd225c08b',
    ],
    [
      'spring',
      '2611ee51708799bde93fed55438fd001b2e932705f2446d72fc12ee32659cdea',
    ],
    [
      'summer',
      '0b4451194a70489da3f366260b37aa37e0d72d58c50b323757331b2941f1f893',
    ],
  ] as const)(
    'preserves the supplied %s hero artwork byte for byte',
    (season, hash) => {
      const bytes = fs.readFileSync(
        path.join(__dirname, `../src/assets/seasonal/community/${season}.png`),
      );
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);
    },
  );
  it.each([360, 384, 400, 430, 768])(
    'keeps the complete hero canvas at %s dp',
    width => {
      const height = width / COMMUNITY_HERO_ASPECT_RATIO;
      expect(height / width).toBeCloseTo(439 / 883);
      expect(styles.heroImage).not.toHaveProperty('width');
      expect(styles.filterBarRow).not.toHaveProperty('height');
      expect(styles.secondaryCategoryRow).not.toHaveProperty('height');
      expect(styles.categoryChip.minHeight).toBeGreaterThanOrEqual(44);
      expect(styles.categoryChipFace.minHeight).toBe(32);
      expect(styles.paginationButton.minHeight).toBeGreaterThanOrEqual(44);
      expect(styles.paginationFooter).not.toHaveProperty('minHeight');
      expect(styles.createButton.minHeight).toBe(48);
      expect(styles.createButton.width).toBe(48);
      expect(styles.floatingActions.position).toBe('absolute');
      expect(styles.floatingActions.bottom).toBe(12);
      expect(styles.paginationControls.flex).toBe(1);
      expect(styles.createButton).not.toHaveProperty('height');
      expect(styles.paginationButton).not.toHaveProperty('height');
      expect(styles.categoryChipLabel).toMatchObject({
        fontWeight: '500',
        letterSpacing: 0,
      });
    },
  );
  it.each([360, 384, 400, 430])(
    'reserves separate touch areas and a four-digit page label at 1.5 font scale within %s dp',
    width => {
      const controlsWidth =
        width - styles.paginationFooter.paddingHorizontal * 2;
      const pageLabelBound =
        styles.paginationPageText.fontSize * 1.5 * 4 +
        styles.paginationPageIndicator.paddingHorizontal * 2;
      const controlsBound =
        (styles.paginationButton.paddingHorizontal * 2 +
          14 +
          styles.paginationButton.gap +
          styles.paginationButtonText.fontSize * 1.5 * 2) *
          2 +
        styles.paginationControls.gap * 2 +
        pageLabelBound;
      expect(controlsWidth).toBeGreaterThanOrEqual(controlsBound);
      expect(styles.paginationButton.minWidth).toBe(44);
      expect(styles.paginationPageIndicator).not.toHaveProperty('height');
    },
  );
});

describe('community header opt-in composition', () => {
  it('preserves the themed header on routes without list-specific options', async () => {
    const theme = createTheme('light');
    let renderer!: TestRenderer.ReactTestRenderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={theme}>
          <CommunityStackHeader
            back={undefined}
            route={{ key: 'detail', name: 'CommunityDetail' }}
            options={{ title: '게시글' }}
          />
        </ThemeProvider>,
      );
    });
    const root = renderer.root.findByType(CommunityStackHeader).children[0];
    if (typeof root === 'string') throw new Error('header root must be a view');
    expect(StyleSheet.flatten(root.props.style)).toMatchObject({
      paddingTop: 24,
      backgroundColor: theme.colors.background,
    });
    expect(
      StyleSheet.flatten(renderer.root.findByType(Text).props.style).color,
    ).toBe(theme.colors.textPrimary);
    expect(renderer.root.findAllByType(View)).toHaveLength(3);
    await TestRenderer.act(async () => renderer.unmount());
  });

  it('honors the list surface and title options without changing safe-area ownership', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <CommunityStackHeader
            back={{ title: '뒤로', href: undefined }}
            route={{ key: 'list', name: 'CommunityTabList' }}
            options={{
              title: '커뮤니티',
              headerStyle: {
                backgroundColor: COMMUNITY_HERO_SURFACES.autumn.header,
              },
              headerTintColor: '#243042',
              headerTitleStyle: styles.connectedHeaderTitle,
              headerBackground: () => (
                <View testID="community-seasonal-header-surface" />
              ),
            }}
          />
        </ThemeProvider>,
      );
    });
    const root = renderer.root.findByType(CommunityStackHeader).children[0];
    if (typeof root === 'string') throw new Error('header root must be a view');
    expect(StyleSheet.flatten(root.props.style)).toMatchObject({
      paddingTop: 24,
      backgroundColor: COMMUNITY_HERO_SURFACES.autumn.header,
    });
    expect(
      StyleSheet.flatten(renderer.root.findByType(Text).props.style),
    ).toMatchObject({ color: '#243042', fontSize: 18, fontWeight: '600' });
    const background = renderer.root.findAllByProps({
      testID: 'community-seasonal-header-surface',
    })[0];
    expect(background.parent?.props.pointerEvents).toBe('none');
    expect(background.parent?.props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
    await TestRenderer.act(async () => renderer.unmount());
  });
});
