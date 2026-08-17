import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import CommunitySection from '../src/screens/Main/components/LoggedInHome/CommunitySection';
import type { CommunityPost } from '../src/types/community';
import {
  fetchHomeCommunityHighlights,
  getHomeCommunityHighlightsCache,
} from '../src/services/home/communityHighlights';

jest.mock('../src/services/home/communityHighlights', () => ({
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
        node.props.accessibilityLabel?.startsWith('게시글 one'),
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
    mockedFetchHomeCommunityHighlights.mockRejectedValue(new Error('network'));

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
      renderer.unmount();
    });
  });
});
