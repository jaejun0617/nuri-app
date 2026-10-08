import React from 'react';
import TestRenderer from 'react-test-renderer';
import {
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import Feather from 'react-native-vector-icons/Feather';
import CtaButton from '../src/app/ui/CtaButton';
import { createTheme } from '../src/app/theme/theme';
import CommunityDetailScreen from '../src/screens/Community/CommunityDetailScreen';
import { useCommunityStore } from '../src/store/communityStore';
import { showToast } from '../src/store/uiStore';
import type { CommunityPost } from '../src/types/community';
import { resolveCommunityKeyboardOffset } from '../src/screens/Community/utils/commentViewport';

const mockNavigation = {
  setOptions: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
};
const mockRequireLogin = (action: () => void) => action();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { postId: 'qa-post' } }),
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
async function render() {
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <CommunityDetailScreen />
      </ThemeProvider>,
    );
  });
  return tree;
}
describe('community comment corrective rendered contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    await TestRenderer.act(async () => {
      send.props.onPress();
      send.props.onPress();
    });
    expect(mockSubmit).toHaveBeenCalledTimes(1);
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
    expect(tree.root.findByProps({ testID: 'community-comment-keyboard-owner' }).props).toMatchObject({ behavior: 'height', keyboardVerticalOffset: 0 });
    expect(tree.root.findByProps({ testID: 'community-comment-keyboard-owner' }).props.automaticOffset).toBeUndefined();
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
