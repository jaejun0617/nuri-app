import React from 'react';
import TestRenderer from 'react-test-renderer';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import Feather from 'react-native-vector-icons/Feather';
import CtaButton from '../src/app/ui/CtaButton';
import { createTheme } from '../src/app/theme/theme';
import CommunityDetailScreen from '../src/screens/Community/CommunityDetailScreen';
import CommunityCommentsScreen from '../src/screens/Community/CommunityCommentsScreen';
import CommentThreadItem from '../src/screens/Community/components/CommentThreadItem';
import {
  fetchDiscussionSummary,
  fetchDiscussionThreads,
} from '../src/services/community/discussionRead';
import { useCommunityStore } from '../src/store/communityStore';
import { useCommunityReadStore } from '../src/store/communityReadStore';
import { showToast } from '../src/store/uiStore';
import type { CommunityPost, CommunityComment } from '../src/types/community';
import { resolveCommunityKeyboardOffset } from '../src/screens/Community/utils/commentViewport';

const mockNavigation = {
  setOptions: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
  getState: () => ({
    routes: [
      { name: 'AppTabs', key: 'tabs' },
      { name: 'CommunityDetail', key: 'parent' },
      { name: 'CommunityComments', key: 'comments' },
    ],
  }),
  dispatch: jest.fn(),
  replace: jest.fn(),
};
let mockRoute = {
  name: 'CommunityDetail',
  key: 'qa-session',
  params: { postId: 'qa-post', postRouteKey: 'parent' },
};
const mockRequireLogin = (action: () => void) => action();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useIsFocused: () => true,
  useRoute: () => mockRoute,
}));
jest.mock('../src/services/community/discussionRead', () => ({
  ...jest.requireActual('../src/services/community/discussionRead'),
  fetchDiscussionSummary: jest.fn(async () => ({
    total: 0,
    revision: 'test',
    comments: [],
  })),
  fetchDiscussionThreads: jest.fn(async () => ({
    revision: 'test',
    rootIds: [],
    comments: [],
    replyPages: [],
    previous: null,
    next: null,
    anchorFound: true,
    anchorRootId: null,
  })),
}));
jest.mock('react-native-safe-area-context', () => {
  const runtime = jest.requireActual('react') as typeof React;
  return {
    SafeAreaInsetsContext: runtime.createContext(null),
    useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
  };
});
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => 'autumn',
}));
jest.mock('../src/hooks/useCommunityAuth', () => ({
  useCommunityAuth: () => ({
    currentUserId: 'qa-author',
    requireLogin: mockRequireLogin,
  }),
}));
jest.mock('../src/hooks/useKeyboardBottomPadding', () => ({
  useKeyboardBottomPadding: () => ({}),
}));
jest.mock('../src/hooks/useKeyboardInset', () => ({
  useKeyboardInset: () => 0,
}));
jest.mock('../src/store/petStore', () => ({
  usePetStore: (selector: (state: unknown) => unknown) =>
    selector({ pets: [], selectedPetId: null }),
}));
jest.mock('../src/store/uiStore', () => ({ showToast: jest.fn() }));

const post: CommunityPost = {
  id: 'qa-post',
  authorId: 'qa-author',
  authorNickname: 'QA',
  authorAvatarUrl: null,
  petId: null,
  petName: null,
  petSpecies: null,
  petBreed: null,
  petAgeLabel: null,
  petAvatarUrl: null,
  showPetAge: false,
  title: '합성 QA',
  content: '합성 QA 내용',
  imagePath: null,
  imageUrl: null,
  imagePaths: [],
  imageUrls: [],
  hasImage: false,
  status: 'active',
  category: 'free',
  likeCount: 0,
  commentCount: 0,
  viewCount: 0,
  isNotice: false,
  noticePublishedAt: null,
  isLikedByMe: false,
  deletedAt: null,
  createdAt: '2026-10-07T00:00:00Z',
  updatedAt: '2026-10-07T00:00:00Z',
};
const mockSubmit = jest.fn();
async function render(mode: 'post' | 'comments' = 'post') {
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        {mode === 'post' ? (
          <CommunityDetailScreen />
        ) : (
          <CommunityCommentsScreen />
        )}
      </ThemeProvider>,
    );
  });
  return tree;
}
describe('community comment corrective rendered contract', () => {
  afterEach(() => jest.restoreAllMocks());
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute = {
      name: 'CommunityDetail',
      key: 'qa-session',
      params: { postId: 'qa-post', postRouteKey: 'parent' },
    };
    mockSubmit.mockReset();
    useCommunityStore.getState().clearAll();
    useCommunityStore.setState({
      postsById: { [post.id]: post },
      detailStatusByPostId: { [post.id]: 'ready' },
      commentsStatusByPostId: { [post.id]: 'ready' },
      fetchPostDetail: jest.fn(async () => {}),
      fetchPostComments: jest.fn(async () => {}),
      recordPostView: jest.fn(async () => {}),
      submitComment: mockSubmit,
    });
  });
  it('shows the post body before attached photos in attachment order', async () => {
    const urls = ['https://example.test/first', 'https://example.test/second'];
    useCommunityStore.setState({
      postsById: { [post.id]: { ...post, hasImage: true, imageUrls: urls } },
    });
    const tree = await render();
    const content = tree.root.findAll(
      node => node.type === Text || node.type === Image,
    );
    const bodyIndex = content.findIndex(
      node => node.props.children === post.content,
    );
    const photoIndex = content.findIndex(
      node => node.type === Image && node.props.source?.uri === urls[0],
    );
    expect(bodyIndex).toBeGreaterThanOrEqual(0);
    expect(photoIndex).toBeGreaterThan(bodyIndex);
    expect(
      content
        .filter(node => node.type === Image)
        .map(node => node.props.source.uri),
    ).toEqual(urls);
    await TestRenderer.act(async () => tree.unmount());
  });
  it.each(['post', 'comments'] as const)(
    'marks a ready post read only when its body is shown: %s',
    async mode => {
      const mark = jest
        .spyOn(useCommunityReadStore.getState(), 'markRead')
        .mockResolvedValue(true);
      const tree = await render(mode);
      if (mode === 'post')
        expect(mark).toHaveBeenCalledWith('qa-author', post.id);
      else expect(mark).not.toHaveBeenCalled();
      await TestRenderer.act(async () => tree.unmount());
    },
  );
  it.each(['loading', 'error', 'not_found', 'deleted', 'moderated'] as const)(
    'does not mark an unsuccessful detail read: %s',
    async status => {
      const mark = jest
        .spyOn(useCommunityReadStore.getState(), 'markRead')
        .mockResolvedValue(true);
      useCommunityStore.setState({
        detailStatusByPostId: { [post.id]: status },
      });
      const tree = await render();
      expect(mark).not.toHaveBeenCalled();
      await TestRenderer.act(async () => tree.unmount());
    },
  );
  it('does not mark a cached post read while protected loading invalidates it', async () => {
    const mark = jest
      .spyOn(useCommunityReadStore.getState(), 'markRead')
      .mockResolvedValue(true);
    useCommunityStore.setState({
      fetchPostDetail: jest.fn(async () => {
        useCommunityStore.setState({
          detailStatusByPostId: { [post.id]: 'loading' },
        });
      }),
    });
    const tree = await render();
    expect(mark).not.toHaveBeenCalled();
    await TestRenderer.act(async () => tree.unmount());
  });
  it.each(['root', 'reply'])(
    'retains neutral comment text for a selected %s',
    async selected => {
      const root: CommunityComment = {
        id: 'root',
        postId: post.id,
        authorId: 'other',
        authorNickname: 'QA',
        authorAvatarUrl: null,
        parentCommentId: null,
        replyToCommentId: null,
        replyTargetUserId: null,
        replyTargetNickname: null,
        depth: 0,
        replyCount: 1,
        likeCount: 0,
        isLikedByMe: false,
        content: 'root-body',
        status: 'active',
        deletedAt: null,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
      const reply: CommunityComment = {
        ...root,
        id: 'reply',
        content: 'reply-body',
        parentCommentId: root.id,
        depth: 1,
        replyCount: 0,
      };
      useCommunityStore.setState({
        commentEntitiesById: { root, reply },
        replyCommentIdsByParentId: { root: [reply.id] },
      });
      let tree!: TestRenderer.ReactTestRenderer;
      await TestRenderer.act(async () => {
        tree = TestRenderer.create(
          <ThemeProvider theme={createTheme('light')}>
            <CommentThreadItem
              commentId={root.id}
              repliesExpanded
              activeReplyTargetId={null}
              inlineComposer={null}
              currentUserId="qa-author"
              postAuthorId={post.authorId}
              authorAccentColor="#B95000"
              bestBadgeColor="#B95000"
              highlightedCommentId={selected}
              onTargetReady={jest.fn()}
              onPressComment={jest.fn()}
              onToggleLike={jest.fn()}
              onPressDelete={jest.fn()}
              onPressReport={jest.fn()}
              onToggleReplies={jest.fn()}
            />
          </ThemeProvider>,
        );
      });
      for (const body of [root.content, reply.content]) {
        const texts = tree.root.findAll(
          node =>
            node.props.style &&
            Array.isArray(node.props.children) &&
            node.props.children.includes(body),
        );
        expect(texts.length).toBeGreaterThan(0);
        for (const text of texts)
          expect(StyleSheet.flatten(text.props.style).color).toBe(
            createTheme('light').colors.textPrimary,
          );
      }
      await TestRenderer.act(async () => tree.unmount());
    },
  );
  it.each([
    { total: 2, withReplies: false },
    { total: 2, withReplies: true },
    { total: 5, withReplies: true },
    { total: 10, withReplies: false },
    { total: 11, withReplies: false },
    { total: 12, withReplies: true },
  ])(
    'renders a ten-entity preview and accurate remainder: %o',
    async ({ total, withReplies }) => {
      const comments: CommunityComment[] = Array.from(
        { length: Math.min(total, 10) },
        (_, index) => ({
          id: String(index),
          postId: post.id,
          authorId: 'other',
          authorNickname: 'QA',
          authorAvatarUrl: null,
          parentCommentId: withReplies && index > 0 ? '0' : null,
          replyToCommentId: null,
          replyTargetUserId: null,
          replyTargetNickname: null,
          depth: withReplies && index > 0 ? 1 : 0,
          replyCount: withReplies && index === 0 ? total - 1 : 0,
          likeCount: 0,
          isLikedByMe: false,
          content: `preview-content-${index}`,
          status: 'active',
          deletedAt: null,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        }),
      );
      jest
        .mocked(fetchDiscussionSummary)
        .mockResolvedValueOnce({ total, revision: 'test', comments });
      const tree = await render();
      const renderedRow = tree.root.findByType(FlatList).props.renderItem({
        item: '0',
        index: 0,
      });
      expect(renderedRow.props.authorAccentColor).toBe(
        createTheme('light').colors.textSecondary,
      );
      expect(renderedRow.props.bestBadgeColor).toBe(
        createTheme('light').colors.textSecondary,
      );
      expect(
        tree.root.findByProps({ accessibilityLabel: '댓글 전송' }).props.role,
      ).toBe('neutral');
      expect(tree.root.findByType(FlatList).props.data).toEqual(
        comments.filter(c => !c.parentCommentId).map(c => c.id),
      );
      if (withReplies) {
        expect(renderedRow.props.previewReplyIds).toEqual(
          comments.slice(1).map(c => c.id),
        );
      }
      let footer!: TestRenderer.ReactTestRenderer;
      await TestRenderer.act(async () => {
        footer = TestRenderer.create(
          <ThemeProvider theme={createTheme('light')}>
            {tree.root.findByType(FlatList).props.ListFooterComponent}
          </ThemeProvider>,
        );
      });
      if (total <= 10) {
        expect(
          footer.root.findAllByProps({ testID: 'community-comments-more' }),
        ).toHaveLength(0);
      } else {
        expect(
          footer.root.findAll(
            node => node.props.children === `댓글 ${total - 10}개 더보기`,
          ).length,
        ).toBeGreaterThan(0);
        await TestRenderer.act(async () =>
          footer.root
            .findByProps({ testID: 'community-comments-more' })
            .props.onPress(),
        );
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          'CommunityComments',
          expect.objectContaining({
            postId: post.id,
            discussionSessionId: 'qa-session',
            postRouteKey: 'qa-session',
          }),
        );
      }
      expect(fetchDiscussionThreads).not.toHaveBeenCalled();
      if (withReplies && total <= 5) {
        await TestRenderer.act(async () =>
          renderedRow.props.onPressComment('1'),
        );
        expect(mockNavigation.navigate).not.toHaveBeenCalled();
        const input = tree.root
          .findAllByType(TextInput)
          .find(node => node.props.accessibilityLabel === '답글 입력')!;
        await TestRenderer.act(async () =>
          input.props.onChangeText('접어도 유지할 답글'),
        );
        const toggle = (action: '접기' | '펼치기') =>
          tree.root.findByProps({
            accessibilityLabel: `답글 ${total - 1}, ${action}`,
          });
        expect(toggle('접기').props.accessibilityState.expanded).toBe(true);
        await TestRenderer.act(async () => toggle('접기').props.onPress());
        expect(mockNavigation.navigate).not.toHaveBeenCalled();
        expect(
          tree.root
            .findAllByType(Text)
            .flatMap(node => node.props.children)
            .includes('preview-content-1'),
        ).toBe(false);
        expect(toggle('펼치기').props.accessibilityState.expanded).toBe(false);
        await TestRenderer.act(async () => toggle('펼치기').props.onPress());
        expect(mockNavigation.navigate).not.toHaveBeenCalled();
        expect(
          tree.root
            .findAllByType(Text)
            .flatMap(node => node.props.children)
            .includes('preview-content-1'),
        ).toBe(true);
        const updatedRow = tree.root
          .findByType(FlatList)
          .props.renderItem({ item: '0', index: 0 });
        await TestRenderer.act(async () =>
          updatedRow.props.onPressComment('1'),
        );
        expect(
          tree.root
            .findAllByType(TextInput)
            .some(
              node =>
                node.props.accessibilityLabel === '답글 입력' &&
                node.props.value === '접어도 유지할 답글',
            ),
        ).toBe(true);
        expect(fetchDiscussionThreads).not.toHaveBeenCalled();
      }
      await TestRenderer.act(async () => {
        footer.unmount();
        tree.unmount();
      });
    },
  );
  it('shows the total only in the comments header and retains the sort control', async () => {
    mockRoute = {
      name: 'CommunityComments',
      key: 'comments',
      params: { postId: 'qa-post', postRouteKey: 'parent' },
    };
    jest
      .mocked(fetchDiscussionSummary)
      .mockResolvedValueOnce({ total: 11, revision: 'header', comments: [] });
    const tree = await render('comments');
    expect(mockNavigation.setOptions.mock.calls.at(-1)![0].headerTitle).toBe(
      '댓글(11)',
    );
    expect(
      tree.root.findAllByProps({ accessibilityLabel: '전체 댓글 11개 보기' }),
    ).toHaveLength(0);
    expect(
      tree.root.findByProps({ accessibilityLabel: '댓글 정렬, 현재 등록순' }),
    ).toBeDefined();
    await TestRenderer.act(async () => tree.unmount());
  });
  it('keeps the post preview title and count in a single native text line', async () => {
    jest.mocked(fetchDiscussionSummary).mockResolvedValueOnce({
      total: 11,
      revision: 'preview-header',
      comments: [],
    });
    const tree = await render('post');
    const title = tree.root.findByProps({
      accessibilityLabel: '전체 댓글 11개 보기',
    });
    const heading = title
      .findAllByType(Text)
      .find(text => text.props.numberOfLines === 1);
    expect(heading).toBeDefined();
    expect(StyleSheet.flatten(heading?.props.style)).toMatchObject({
      fontSize: 14,
      lineHeight: 22,
    });
    expect(heading?.props.children[0]).toBe('댓글');
    expect(
      heading?.findAllByType(Text).some(text => text.props.children === '11'),
    ).toBe(true);
    expect(
      tree.root.findAllByProps({
        accessibilityLabel: '댓글 정렬, 현재 등록순',
      }),
    ).toHaveLength(0);
    expect(title.findByType(Feather).props).toMatchObject({
      name: 'chevron-right',
      size: 14,
      accessible: false,
    });
    await TestRenderer.act(async () => title.props.onPress());
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'CommunityComments',
      expect.objectContaining({ postId: post.id, postRouteKey: 'qa-session' }),
    );
    await TestRenderer.act(async () => tree.unmount());
  });
  it('comments view omits the post body and distinguishes body navigation from Back', async () => {
    mockRoute = {
      name: 'CommunityComments',
      key: 'comments',
      params: { postId: 'qa-post', postRouteKey: 'parent' },
    };
    const tree = await render('comments');
    expect(
      tree.root.findAll(node => node.props.children === post.content),
    ).toHaveLength(0);
    const options = mockNavigation.setOptions.mock.calls.at(-1)![0];
    let header!: TestRenderer.ReactTestRenderer;
    await TestRenderer.act(async () => {
      header = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          {options.headerRight()}
        </ThemeProvider>,
      );
    });
    await TestRenderer.act(async () =>
      header.root.findByType(TouchableOpacity).props.onPress(),
    );
    expect(mockNavigation.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'POP', payload: { count: 1 } }),
    );
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    await TestRenderer.act(async () => {
      header.unmount();
      tree.unmount();
    });
  });
  it('locks repeated taps synchronously and clears the draft only after success', async () => {
    let finish!: () => void;
    mockSubmit.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        }),
    );
    const tree = await render();
    await TestRenderer.act(async () => {
      tree.root.findByType(TextInput).props.onChangeText('합성 댓글');
    });
    const send = tree.root
      .findAllByType(CtaButton)
      .find(node => node.props.accessibilityLabel === '댓글 전송')!;
    expect(send.findByType(Feather).props).toMatchObject({
      name: 'arrow-up',
      size: 22,
      accessible: false,
    });
    expect(
      send.findAllByType(Text).some(node => node.props.children === '전송'),
    ).toBe(false);
    await TestRenderer.act(async () => {
      send.props.onPress();
      send.props.onPress();
    });
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(
      tree.root.findByProps({ accessibilityLabel: '댓글 전송 중' }).props
        .loading,
    ).toBe(true);
    expect(tree.root.findByType(TextInput).props.value).toBe('합성 댓글');
    await TestRenderer.act(async () => {
      finish();
    });
    expect(tree.root.findByType(TextInput).props.value).toBe('');
    await TestRenderer.act(async () => {
      tree.unmount();
    });
  });
  it('keeps a rejected draft editable and exposes the server stable reason', async () => {
    mockSubmit.mockRejectedValueOnce({
      code: 'P0001',
      details: JSON.stringify({
        app_code: 'community_comment_duplicate_recent',
      }),
    });
    const tree = await render();
    await TestRenderer.act(async () => {
      tree.root.findByType(TextInput).props.onChangeText('중복 QA');
    });
    await TestRenderer.act(async () => {
      tree.root
        .findAllByType(CtaButton)
        .find(node => node.props.accessibilityLabel === '댓글 전송')!
        .props.onPress();
    });
    expect(tree.root.findByType(TextInput).props).toMatchObject({
      value: '중복 QA',
      editable: true,
    });
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: 'error',
        message: expect.stringContaining('같은'),
      }),
    );
    mockSubmit.mockResolvedValueOnce(undefined);
    await TestRenderer.act(async () => {
      tree.root.findByType(TextInput).props.onChangeText('다른 QA');
    });
    await TestRenderer.act(async () => {
      tree.root
        .findAllByType(CtaButton)
        .find(node => node.props.accessibilityLabel === '댓글 전송')!
        .props.onPress();
    });
    expect(mockSubmit).toHaveBeenCalledTimes(2);
    await TestRenderer.act(async () => {
      tree.unmount();
    });
  });
  it('uses one keyboard owner and the same plain seasonal more glyph as memory detail', async () => {
    const tree = await render();
    expect(
      tree.root.findByProps({ testID: 'community-comment-keyboard-owner' })
        .props,
    ).toMatchObject({ behavior: 'height', keyboardVerticalOffset: 0 });
    expect(
      tree.root.findByProps({ testID: 'community-comment-keyboard-owner' })
        .props.automaticOffset,
    ).toBeUndefined();
    expect(tree.root.findByType(FlatList).props).toMatchObject({
      automaticallyAdjustKeyboardInsets: false,
      contentContainerStyle: { paddingBottom: 12 },
      removeClippedSubviews: false,
    });
    const options = mockNavigation.setOptions.mock.calls.at(-1)![0];
    let header!: TestRenderer.ReactTestRenderer;
    await TestRenderer.act(async () => {
      header = TestRenderer.create(options.headerRight());
    });
    expect(
      header.root.findByType(TouchableOpacity).props.accessibilityLabel,
    ).toBe('게시글 더보기');
    expect(header.root.findByType(Feather).props).toMatchObject({
      name: 'more-horizontal',
      size: 22,
      color: '#D44912',
    });
    await TestRenderer.act(async () => {
      tree.unmount();
      header.unmount();
    });
  });
  it('derives the stack offset from the actual viewport without reserving IME height twice', () => {
    expect(resolveCommunityKeyboardOffset(832, 743)).toBe(89);
    expect(resolveCommunityKeyboardOffset(832, 695, 48)).toBe(89);
    expect(resolveCommunityKeyboardOffset(832, 832)).toBe(0);
    expect(resolveCommunityKeyboardOffset(496, 496)).toBe(0);
    expect(resolveCommunityKeyboardOffset(832, null)).toBe(0);
    expect(resolveCommunityKeyboardOffset(832, 0)).toBe(0);
    expect(resolveCommunityKeyboardOffset(832, Number.NaN)).toBe(0);
  });
});
