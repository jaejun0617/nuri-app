import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import CommunitySection from '../src/screens/Main/components/LoggedInHome/CommunitySection';
import { styles as communityStyles } from '../src/screens/Main/components/LoggedInHome/CommunitySection.styles';
import { styles as homeStyles } from '../src/screens/Main/components/LoggedInHome/LoggedInHome.styles';
import type { CommunityPost } from '../src/types/community';
import {
  fetchHomeCommunityHighlights,
  getHomeCommunityHighlightsCache,
} from '../src/services/home/communityHighlights';

jest.mock('../src/services/home/communityHighlights', () => ({
  HOME_COMMUNITY_TAB_OPTIONS: [
    { key: 'popular', label: '인기', filter: 'popular', category: 'all' },
    { key: 'question', label: '질문', filter: 'popular', category: 'question' },
    { key: 'info', label: '정보', filter: 'popular', category: 'info' },
    { key: 'daily', label: '일상', filter: 'popular', category: 'daily' },
    { key: 'free', label: '자유', filter: 'popular', category: 'free' },
  ],
  fetchHomeCommunityHighlights: jest.fn(),
  getHomeCommunityHighlightsCache: jest.fn(),
}));

const mockedFetchHomeCommunityHighlights =
  fetchHomeCommunityHighlights as jest.MockedFunction<
    typeof fetchHomeCommunityHighlights
  >;
const mockedGetHomeCommunityHighlightsCache =
  getHomeCommunityHighlightsCache as jest.MockedFunction<
    typeof getHomeCommunityHighlightsCache
  >;

function makePost(id: string, title = `게시글 ${id}`): CommunityPost {
  return {
    id,
    authorId: `author-${id}`,
    authorNickname: 'QA 사용자',
    authorAvatarUrl: null,
    petId: null,
    petName: null,
    petBreed: null,
    petSpecies: null,
    petAvatarUrl: null,
    petAgeLabel: null,
    showPetAge: true,
    title,
    content: `내용 ${id}`,
    imagePath: null,
    imageUrl: null,
    imagePaths: [],
    imageUrls: [],
    hasImage: false,
    status: 'active',
    category: 'info',
    likeCount: 12,
    commentCount: 3,
    viewCount: 0,
    isNotice: false,
    noticePublishedAt: null,
    isLikedByMe: false,
    deletedAt: null,
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
  };
}

function renderSection(options: {
  isFocused?: boolean;
  onPressPost?: (postId: string) => void;
  onPressAll?: () => void;
} = {}) {
  return TestRenderer.create(
    <ThemeProvider theme={createTheme('light')}>
      <CommunitySection
        isFocused={options.isFocused ?? true}
        accentColor="#6D6AF8"
        accentTint="#F0EFFF"
        accentBorder="#D9D7FF"
        onPressPost={options.onPressPost ?? jest.fn()}
        onPressAll={options.onPressAll ?? jest.fn()}
      />
    </ThemeProvider>,
  );
}

function serialized(renderer: TestRenderer.ReactTestRenderer) {
  return JSON.stringify(renderer.toJSON());
}

describe('CommunitySection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetHomeCommunityHighlightsCache.mockReturnValue(null);
  });

  it('keeps the content frame while loading', async () => {
    mockedFetchHomeCommunityHighlights.mockReturnValue(new Promise(() => {}));

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderSection();
      await Promise.resolve();
    });

    expect(serialized(renderer)).toContain('커뮤니티를 불러오는 중이에요.');
    await act(async () => {
      renderer.unmount();
    });
  });

  it('waits for Home focus before requesting community highlights', async () => {
    mockedFetchHomeCommunityHighlights.mockResolvedValue([makePost('focused')]);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderSection({ isFocused: false });
      await Promise.resolve();
    });

    expect(mockedFetchHomeCommunityHighlights).not.toHaveBeenCalled();

    await act(async () => {
      renderer.update(
        <ThemeProvider theme={createTheme('light')}>
          <CommunitySection
            isFocused
            accentColor="#6D6AF8"
            accentTint="#F0EFFF"
            accentBorder="#D9D7FF"
            onPressPost={jest.fn()}
            onPressAll={jest.fn()}
          />
        </ThemeProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedFetchHomeCommunityHighlights).toHaveBeenCalledTimes(1);
    await act(async () => {
      renderer.unmount();
    });
  });

  it('renders a featured post and at most two supporting posts', async () => {
    mockedFetchHomeCommunityHighlights.mockResolvedValue([
      makePost('one'),
      makePost('two'),
      makePost('three'),
      makePost('four'),
    ]);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderSection();
      await Promise.resolve();
      await Promise.resolve();
    });

    const output = serialized(renderer);
    expect(output).toContain('반려인들이 주목한 이야기');
    expect(output).toContain('게시글 one');
    expect(output).toContain('게시글 two');
    expect(output).toContain('게시글 three');
    expect(output).not.toContain('게시글 four');

    const tabs = renderer.root
      .findAll(
        node =>
          node.props.accessibilityRole === 'tab' &&
          node.props.accessibilityState !== undefined,
      )
      .map(node => node.props.accessibilityLabel)
      .filter((label, index, labels) => labels.indexOf(label) === index);
    expect(tabs).toEqual([
      '인기 탭',
      '질문 탭',
      '정보 탭',
      '일상 탭',
      '자유 탭',
    ]);
    expect(output).not.toContain('산책');
    expect(output).not.toContain('건강');
    expect(output).not.toContain('생활');
    expect(output).not.toContain('팁 공유');
    expect(
      renderer.root.find(node => node.props.accessibilityLabel === '인기 탭').props
        .accessibilityState,
    ).toEqual({ selected: true });
    await act(async () => {
      renderer.unmount();
    });
  });

  it('keeps the approved title, pill, and post typography geometry', async () => {
    mockedFetchHomeCommunityHighlights.mockResolvedValue([makePost('one')]);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderSection();
      await Promise.resolve();
      await Promise.resolve();
    });

    const title = renderer.root.find(
      node =>
        node.props.preset === 'unifiedTitle' &&
        node.props.children === '반려인들이 주목한 이야기',
    );
    const titleIcon = renderer.root.find(node => node.props.name === 'message-circle');
    const postTitle = renderer.root.find(node => node.props.preset === 'cardTitle');
    const horizontalPillScroll = renderer.root.find(
      node => node.type === ScrollView && node.props.horizontal === true,
    );
    const pillTouch = StyleSheet.flatten(communityStyles.pillTouch);
    const pillVisual = StyleSheet.flatten(communityStyles.pillVisual);
    const pillText = StyleSheet.flatten(communityStyles.pillText);
    const communitySection = StyleSheet.flatten(communityStyles.section);
    const homeSection = StyleSheet.flatten(homeStyles.section);

    expect(title.props.preset).toBe('unifiedTitle');
    expect(titleIcon.props.color).toBe(createTheme('light').colors.brand);
    expect(titleIcon.props.accessible).toBe(false);
    expect(postTitle.props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(postTitle.props.style)).toEqual(
      expect.objectContaining({ fontSize: 16, lineHeight: 22 }),
    );
    expect(horizontalPillScroll.props.horizontal).toBe(true);
    expect(pillTouch.minHeight).toBe(44);
    expect(pillVisual.minHeight).toBe(36);
    expect(pillVisual.paddingHorizontal).toBe(12);
    expect(pillVisual.borderRadius).toBe(18);
    expect(StyleSheet.flatten(communityStyles.pillContent).gap).toBe(8);
    expect(pillText.fontSize).toBe(14);
    expect(pillText.lineHeight).toBe(20);
    expect(communitySection).toEqual(
      expect.objectContaining({
        gap: homeSection.gap,
        paddingHorizontal: homeSection.paddingHorizontal,
        paddingTop: homeSection.paddingTop,
        paddingBottom: homeSection.paddingBottom,
      }),
    );
    expect('width' in communitySection).toBe(false);
    expect('width' in StyleSheet.flatten(communityStyles.panel)).toBe(false);
    expect(StyleSheet.flatten(communityStyles.title).flexShrink).toBe(1);
    expect(StyleSheet.flatten(communityStyles.postBody).minWidth).toBe(0);

    await act(async () => {
      renderer.unmount();
    });
  });

  it('loads the selected category and ignores an older tab response', async () => {
    let resolvePopular!: (items: CommunityPost[]) => void;
    let resolveQuestion!: (items: CommunityPost[]) => void;
    const popularRequest = new Promise<CommunityPost[]>(resolve => {
      resolvePopular = resolve;
    });
    const questionRequest = new Promise<CommunityPost[]>(resolve => {
      resolveQuestion = resolve;
    });
    mockedFetchHomeCommunityHighlights
      .mockReturnValueOnce(popularRequest)
      .mockReturnValueOnce(questionRequest);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderSection();
      await Promise.resolve();
    });

    const questionTab = renderer.root.find(
      node => node.props.accessibilityLabel === '질문 탭',
    );
    act(() => {
      questionTab.props.onPress();
    });

    resolvePopular([makePost('old-popular')]);
    await act(async () => {
      await Promise.resolve();
    });
    expect(serialized(renderer)).not.toContain('old-popular');

    resolveQuestion([makePost('new-question')]);
    await act(async () => {
      await Promise.resolve();
    });
    expect(serialized(renderer)).toContain('new-question');
    expect(mockedFetchHomeCommunityHighlights).toHaveBeenNthCalledWith(1, 'popular', {
      force: false,
    });
    expect(mockedFetchHomeCommunityHighlights).toHaveBeenNthCalledWith(2, 'question', {
      force: false,
    });
    await act(async () => {
      renderer.unmount();
    });
  });

  it('delegates post and all-view presses to the existing navigation callbacks', async () => {
    const onPressPost = jest.fn();
    const onPressAll = jest.fn();
    mockedFetchHomeCommunityHighlights.mockResolvedValue([makePost('one')]);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderSection({ onPressPost, onPressAll });
      await Promise.resolve();
      await Promise.resolve();
    });

    const allButton = renderer.root.find(
      node => node.props.accessibilityLabel === '커뮤니티 전체 보기',
    );
    const postButton = renderer.root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel?.includes('게시글 one'),
    );

    act(() => {
      allButton.props.onPress();
      postButton.props.onPress();
    });

    expect(onPressAll).toHaveBeenCalledTimes(1);
    expect(onPressPost).toHaveBeenCalledWith('one');
    await act(async () => {
      renderer.unmount();
    });
  });

  it('renders the approved empty copy without a create CTA', async () => {
    mockedFetchHomeCommunityHighlights.mockResolvedValue([]);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderSection();
      await Promise.resolve();
      await Promise.resolve();
    });

    const output = serialized(renderer);
    expect(output).toContain('아직 보여드릴 이야기가 없어요');
    expect(output).not.toContain('글쓰기');
    await act(async () => {
      renderer.unmount();
    });
  });

  it('keeps the error and retry inside the section', async () => {
    mockedFetchHomeCommunityHighlights
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([makePost('retry-success')]);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderSection();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(serialized(renderer)).toContain('커뮤니티를 불러오지 못했어요');
    const retryButton = renderer.root.findAll(
      node => node.props.accessibilityLabel === '커뮤니티 다시 시도',
    )[0];
    expect(retryButton).toBeDefined();
    await act(async () => {
      retryButton.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(serialized(renderer)).toContain('retry-success');
    expect(mockedFetchHomeCommunityHighlights).toHaveBeenCalledTimes(2);
    await act(async () => {
      renderer.unmount();
    });
  });
});
