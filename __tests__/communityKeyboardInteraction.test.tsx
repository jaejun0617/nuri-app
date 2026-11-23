import React from 'react';
import TestRenderer from 'react-test-renderer';
import { FlatList, TextInput } from 'react-native';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import CommunityCommentsScreen from '../src/screens/Community/CommunityCommentsScreen';
import CommunityDetailScreen from '../src/screens/Community/CommunityDetailScreen';
import CtaButton from '../src/app/ui/CtaButton';
import { useCommunityStore } from '../src/store/communityStore';
import type { CommunityComment, CommunityPost } from '../src/types/community';

const mockNavigation = {
  setOptions: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  canGoBack: () => true,
  getState: () => ({ routes: [] }),
};
const commentsRoute = {
  name: 'CommunityComments',
  key: 'keyboard-session',
  params: { postId: 'keyboard-post' },
};
let mockRoute = commentsRoute;
const mockRequireLogin = (action: () => void) => action();
const mockSubmit = jest.fn();
const mockCurrentUser = { id: 'keyboard-user' };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  usePreventRemove: jest.fn(),
  useIsFocused: () => true,
  useRoute: () => mockRoute,
}));
jest.mock('../src/services/community/discussionRead', () => ({
  ...jest.requireActual('../src/services/community/discussionRead'),
  fetchDiscussionSummary: jest.fn(async () => ({
    total: 2,
    revision: 'test',
    comments: mockReadComments().slice(0, 1),
  })),
  fetchDiscussionThreads: jest.fn(async () => ({
    revision: 'test',
    rootIds: [mockReadComments()[0].id],
    comments: mockReadComments(),
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
    currentUserId: mockCurrentUser.id,
    requireLogin: mockRequireLogin,
  }),
}));
jest.mock('../src/hooks/useKeyboardBottomPadding', () => ({
  useKeyboardBottomPadding: () => ({}),
}));
jest.mock('../src/store/petStore', () => ({
  usePetStore: (selector: (state: unknown) => unknown) =>
    selector({ pets: [], selectedPetId: null }),
}));
jest.mock('../src/store/uiStore', () => ({ showToast: jest.fn() }));

const post: CommunityPost = {
  id: 'keyboard-post',
  authorId: 'post-author',
  authorNickname: 'post-author',
  authorAvatarUrl: null,
  petId: null,
  petName: null,
  petSpecies: null,
  petBreed: null,
  petAgeLabel: null,
  petAvatarUrl: null,
  showPetAge: false,
  title: '키보드 계약 테스트',
  content: '댓글 입력 동작을 확인합니다.',
  imagePath: null,
  imageUrl: null,
  imagePaths: [],
  imageUrls: [],
  hasImage: false,
  status: 'active',
  category: 'free',
  likeCount: 0,
  commentCount: 2,
  viewCount: 0,
  isNotice: false,
  noticePublishedAt: null,
  isLikedByMe: false,
  deletedAt: null,
  createdAt: '2026-10-07T00:00:00Z',
  updatedAt: '2026-10-07T00:00:00Z',
};

function createComment(
  overrides: Partial<CommunityComment> & Pick<CommunityComment, 'id'>,
): CommunityComment {
  const { id, ...rest } = overrides;
  return {
    id,
    postId: post.id,
    authorId: 'reply-author',
    authorNickname: 'reply-author',
    authorAvatarUrl: null,
    parentCommentId: null,
    replyToCommentId: null,
    replyTargetUserId: null,
    replyTargetNickname: null,
    depth: 0,
    replyCount: 0,
    likeCount: 0,
    isLikedByMe: false,
    content: '테스트 댓글',
    status: 'active',
    deletedAt: null,
    createdAt: '2026-10-07T00:00:00Z',
    updatedAt: '2026-10-07T00:00:00Z',
    ...rest,
  };
}

const rootComment = createComment({
  id: 'root-comment',
  authorId: 'root-author',
  authorNickname: 'root-author',
  content: '루트 댓글',
  replyCount: 1,
});
const replyComment = createComment({
  id: 'reply-comment',
  authorId: 'reply-author',
  authorNickname: 'reply-author',
  parentCommentId: rootComment.id,
  replyToCommentId: rootComment.id,
  replyTargetUserId: rootComment.authorId,
  replyTargetNickname: rootComment.authorNickname,
  depth: 1,
  content: '답글 댓글',
});

function mockReadComments() {
  return [rootComment, replyComment];
}

function prepareStore() {
  useCommunityStore.getState().clearAll();
  useCommunityStore.setState({
    postsById: { [post.id]: post },
    detailStatusByPostId: { [post.id]: 'ready' },
    commentsStatusByPostId: { [post.id]: 'ready' },
    commentEntitiesById: {
      [rootComment.id]: rootComment,
      [replyComment.id]: replyComment,
    },
    topLevelCommentIdsByPostId: { [post.id]: [rootComment.id] },
    replyCommentIdsByParentId: { [rootComment.id]: [replyComment.id] },
    commentsByPostId: { [post.id]: [rootComment, replyComment] },
    fetchPostDetail: jest.fn(async () => {}),
    fetchPostComments: jest.fn(async () => {}),
    recordPostView: jest.fn(async () => {}),
    submitComment: mockSubmit,
  });
}

async function renderScreen(mode: 'comments' | 'post' = 'comments') {
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        {mode === 'post' ? <CommunityDetailScreen /> : <CommunityCommentsScreen />}
      </ThemeProvider>,
    );
  });
  return tree;
}

function containsRenderedText(
  tree: TestRenderer.ReactTestRenderer,
  target: string,
) {
  return (
    tree.root.findAll(node => {
      const children = node.props.children as unknown;
      const flatten = (value: unknown): string => {
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) return value.map(flatten).join('');
        return '';
      };
      return flatten(children).includes(target);
    }).length > 0
  );
}

const rootLabel = '댓글 root-author 내용에 답글 남기기';
const replyLabel = '답글 reply-author 내용에 직접 답글 남기기';
const tap = (tree: TestRenderer.ReactTestRenderer, label: string) =>
  TestRenderer.act(async () => tree.root.findAllByProps({ accessibilityLabel: label })[0].props.onPress());
const findInput = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findByType(TextInput);
const send = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(CtaButton).find(button => button.props.testID === 'community-comment-send');

describe('Community bottom composer', () => {
  beforeEach(() => {
    mockRoute = commentsRoute;
    mockSubmit.mockReset();
    mockNavigation.navigate.mockClear();
    prepareStore();
  });

  it('opens the existing comments route exactly once with the selected target and reply focus', async () => {
    mockRoute = { ...commentsRoute, name: 'CommunityDetail' };
    const tree = await renderScreen('post');
    await tap(tree, rootLabel);
    expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CommunityComments', {
      postId: post.id,
      commentId: rootComment.id,
      discussionSessionId: 'keyboard-session',
      postRouteKey: 'keyboard-session',
      focusReply: true,
    });
    await TestRenderer.act(async () => tree.unmount());
  });

  it('keeps a single input outside the list and hides the send control until there is text', async () => {
    const tree = await renderScreen();
    const original = findInput(tree);
    expect(tree.root.findByType(FlatList).findAllByType(TextInput)).toHaveLength(0);
    expect(send(tree)).toBeUndefined();
    expect(tree.root.findByType(FlatList).props).toMatchObject({
      keyboardDismissMode: 'none',
      keyboardShouldPersistTaps: 'always',
    });
    await tap(tree, rootLabel);
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(findInput(tree)).toBe(original);
    expect(findInput(tree).props.accessibilityLabel).toBe('답글 입력');
    await TestRenderer.act(async () => original.props.onChangeText(' \n '));
    expect(send(tree)).toBeUndefined();
    await TestRenderer.act(async () => original.props.onChangeText('한 줄\n두 줄'));
    expect(send(tree)?.props).toMatchObject({
      variant: 'solidLavender',
      role: 'primary',
      accessibilityLabel: '답글 전송',
      disabled: false,
    });
    await TestRenderer.act(async () => tree.unmount());
  });

  it('requires confirmation before reassigning a draft or cancelling a reply', async () => {
    const tree = await renderScreen();
    await tap(tree, rootLabel);
    await TestRenderer.act(async () => findInput(tree).props.onChangeText('원래 댓글에 쓸 내용'));
    await tap(tree, replyLabel);
    const confirmation = () => tree.root.findAll(node => node.props.title === '작성 중인 글을 버릴까요?' && typeof node.props.onConfirm === 'function')[0];
    expect(confirmation()?.props.visible).toBe(true);
    expect(containsRenderedText(tree, '@root-author')).toBe(true);
    await TestRenderer.act(async () => confirmation()?.props.onCancel());
    expect(findInput(tree).props.value).toBe('원래 댓글에 쓸 내용');
    await tap(tree, '답글 작성 취소');
    expect(confirmation()?.props.visible).toBe(true);
    await TestRenderer.act(async () => confirmation()?.props.onConfirm());
    expect(findInput(tree).props.value).toBe('');
    expect(findInput(tree).props.accessibilityLabel).toBe('댓글 입력');
    expect(send(tree)).toBeUndefined();
    await TestRenderer.act(async () => tree.unmount());
  });

  it('opens a direct reply composer for a reply tap and keeps the target payload', async () => {
    mockSubmit.mockResolvedValue(undefined);
    const tree = await renderScreen();
    const replyBody = tree.root
      .findAll(
        node =>
          node.props.accessibilityLabel ===
          '답글 reply-author 내용에 직접 답글 남기기',
      )
      .at(0);
    if (!replyBody) throw new Error('reply body was not rendered');

    await TestRenderer.act(async () => replyBody.props.onPress());
    const input = tree.root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === '답글 입력')!;
    await TestRenderer.act(async () => input.props.onChangeText('직접 답글'));
    expect(containsRenderedText(tree, '@reply-author')).toBe(true);
    const submit = send(tree);
    expect(submit).toBeDefined();
    await TestRenderer.act(async () => submit?.props.onPress());

    expect(mockSubmit).toHaveBeenCalledWith(
      post.id,
      '직접 답글',
      rootComment.id,
      replyComment.id,
    );
    await TestRenderer.act(async () => tree.unmount());
  });

  it('keeps the same input instance for draft updates and isolates action taps', async () => {
    const tree = await renderScreen();
    const rootBody = tree.root
      .findAll(
        node =>
          node.props.accessibilityLabel ===
          '댓글 root-author 내용에 답글 남기기',
      )
      .at(0);
    if (!rootBody) throw new Error('root comment body was not rendered');
    await TestRenderer.act(async () => rootBody.props.onPress());
    const input = tree.root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === '답글 입력')!;
    await TestRenderer.act(async () =>
      input.props.onChangeText('작성 중인 초안'),
    );
    expect(
      tree.root
        .findAllByType(TextInput)
        .find(node => node.props.accessibilityLabel === '답글 입력')!,
    ).toBe(input);
    expect(input.props.value).toBe('작성 중인 초안');

    const replyBody = tree.root
      .findAll(
        node =>
          node.props.accessibilityLabel ===
          '답글 reply-author 내용에 직접 답글 남기기',
      )
      .at(0);
    if (!replyBody) throw new Error('reply body was not rendered');
    await TestRenderer.act(async () => replyBody.props.onPress());
    expect(
      tree.root
        .findAllByType(TextInput)
        .find(node => node.props.accessibilityLabel === '답글 입력')!.props
        .value,
    ).toBe('작성 중인 초안');

    const reportAction = tree.root
      .findAll(node => node.props.accessibilityLabel === '댓글 신고')
      .at(0);
    if (!reportAction) throw new Error('report action was not rendered');
    await TestRenderer.act(async () => reportAction.props.onPress());
    expect(
      tree.root
        .findAllByType(TextInput)
        .filter(node => node.props.accessibilityLabel === '답글 입력'),
    ).toHaveLength(1);
    await TestRenderer.act(async () => tree.unmount());
  });

  it('keeps a failed-submit draft available for retry', async () => {
    mockSubmit.mockRejectedValueOnce(new Error('temporary failure'));
    const tree = await renderScreen();
    const rootBody = tree.root
      .findAll(
        node =>
          node.props.accessibilityLabel ===
          '댓글 root-author 내용에 답글 남기기',
      )
      .at(0);
    if (!rootBody) throw new Error('root comment body was not rendered');

    await TestRenderer.act(async () => rootBody.props.onPress());
    const input = tree.root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === '답글 입력')!;
    await TestRenderer.act(async () =>
      input.props.onChangeText('재시도할 초안'),
    );
    await TestRenderer.act(async () =>
      tree.root
        .findByProps({ accessibilityLabel: '답글 전송' })
        .props.onPress(),
    );

    expect(
      tree.root
        .findAllByType(TextInput)
        .find(node => node.props.accessibilityLabel === '답글 입력')!.props
        .value,
    ).toBe('재시도할 초안');
    await TestRenderer.act(async () => tree.unmount());
  });

  it('keeps the draft after a canonical comment rate-limit rejection', async () => {
    mockSubmit.mockRejectedValueOnce({
      message: 'community_comment_rate_limited',
      details: JSON.stringify({ app_code: 'community_comment_rate_limited' }),
    });
    const tree = await renderScreen();
    const input = tree.root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === '댓글 입력')!;
    await TestRenderer.act(async () =>
      input.props.onChangeText('제한 후에도 남아야 할 초안'),
    );
    await TestRenderer.act(async () =>
      tree.root
        .findByProps({ accessibilityLabel: '댓글 전송' })
        .props.onPress(),
    );

    expect(
      tree.root
        .findAllByType(TextInput)
        .find(node => node.props.accessibilityLabel === '댓글 입력')!.props
        .value,
    ).toBe('제한 후에도 남아야 할 초안');
    await TestRenderer.act(async () => tree.unmount());
  });
});
