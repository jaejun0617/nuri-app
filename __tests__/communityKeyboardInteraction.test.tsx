import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import {
  FlatList,
  Keyboard,
  StyleSheet,
  TextInput,
} from 'react-native';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import CommunityDetailScreen from '../src/screens/Community/CommunityDetailScreen';
import { useCommunityStore } from '../src/store/communityStore';
import type { CommunityComment, CommunityPost } from '../src/types/community';

const detailScreenSource = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/screens/Community/CommunityDetailScreen.tsx',
  ),
  'utf8',
);
const commentThreadSource = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/screens/Community/components/CommentThreadItem.tsx',
  ),
  'utf8',
);
const replyItemSource = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/screens/Community/components/ReplyCommentItem.tsx',
  ),
  'utf8',
);
const composerSource = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/screens/Community/components/CommunityCommentComposer.tsx',
  ),
  'utf8',
);

const mockNavigation = {
  setOptions: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  canGoBack: () => true,
};
const mockRequireLogin = (action: () => void) => action();
const mockSubmit = jest.fn();
const mockCurrentUser = { id: 'keyboard-user' };
let mockKeyboardInset = 0;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { postId: 'keyboard-post' } }),
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
jest.mock('../src/hooks/useKeyboardInset', () => ({
  useKeyboardInset: () => mockKeyboardInset,
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

async function renderScreen() {
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

function containsRenderedText(
  tree: TestRenderer.ReactTestRenderer,
  target: string,
) {
  return tree.root.findAll(node => {
    const children = node.props.children as unknown;
    const flatten = (value: unknown): string => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.map(flatten).join('');
      return '';
    };
    return flatten(children).includes(target);
  }).length > 0;
}

function flattenRenderedText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(flattenRenderedText).join('');
  if (React.isValidElement<{ children?: unknown }>(value)) {
    return flattenRenderedText(value.props.children);
  }
  return '';
}

describe('Community K22/K23 keyboard interaction contract', () => {
  it('keeps the focused draft while list gestures leave the keyboard alone', () => {
    expect(detailScreenSource).toContain('keyboardShouldPersistTaps="always"');
    expect(detailScreenSource).toContain('keyboardDismissMode="none"');
    expect(detailScreenSource).not.toContain(
      'onScrollBeginDrag={Keyboard.dismiss}',
    );
    expect(detailScreenSource).toContain('onScrollBeginDrag={() => {');
    expect(detailScreenSource).toContain('isCommentListDraggingRef.current = true;');
    expect(detailScreenSource).toContain('cancelPendingInlineReveal(true);');
  });

  it('uses one conditional inline composer and does not feed draft elements to inactive rows', () => {
    expect(detailScreenSource).toContain(
      'activeReplyThreadRootId === commentId ? inlineCommentComposer : null',
    );
    expect(commentThreadSource).toContain(
      'activeReplyTargetId === replyId ? inlineComposer : null',
    );
    expect(detailScreenSource).not.toContain(
      'inlineComposer={inlineCommentComposer}',
    );
    expect(commentThreadSource).not.toContain(
      'inlineComposer={inlineComposer}\n',
    );
  });

  it('removes delayed reveal retries and preserves the native input identity', () => {
    expect(detailScreenSource).not.toContain('INLINE_REVEAL_INITIAL_DELAY_MS');
    expect(detailScreenSource).not.toContain('INLINE_REVEAL_RETRY_DELAY_MS');
    expect(detailScreenSource).not.toContain('INLINE_REVEAL_MAX_ATTEMPTS');
    expect(detailScreenSource).not.toContain('inlineRevealTimerRef');
    expect(detailScreenSource).not.toContain('autoFocus={isInline}');
    expect(detailScreenSource).toContain('inlineInteractionGenerationRef');
    expect(detailScreenSource).toContain('hasMeasuredForInteraction');
    expect(composerSource).toContain('ref={inputRef}');
    expect(composerSource).toContain('testID="community-comment-input"');
    expect(composerSource).not.toContain('key={commentDraft}');
    expect(replyItemSource).toContain('name="corner-down-right"');
  });
});

describe('Community K22/K23 rendered interaction behavior', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSubmit.mockReset();
    mockKeyboardInset = 0;
    await TestRenderer.act(async () => {
      prepareStore();
    });
    global.requestAnimationFrame = callback => {
      callback(0);
      return 1;
    };
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
    jest.restoreAllMocks();
  });

  it('keeps the keyboard during a list drag and cancels a stale focus request', async () => {
    mockSubmit.mockResolvedValue(undefined);
    const pendingFrames: Array<(time: number) => void> = [];
    global.requestAnimationFrame = callback => {
      pendingFrames.push(callback);
      return pendingFrames.length;
    };
    const addListenerSpy = jest.spyOn(Keyboard, 'addListener');
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss');
    const tree = await renderScreen();
    const rootBody = tree.root
      .findAll(node =>
        node.props.accessibilityLabel ===
        '댓글 root-author 내용에 답글 남기기',
      )
      .at(0);
    if (!rootBody) throw new Error('root comment body was not rendered');
    const list = tree.root.findByType(FlatList);
    const initialKeyboardShowListenerCount = addListenerSpy.mock.calls.filter(
      ([eventName]) => eventName === 'keyboardDidShow',
    ).length;

    await TestRenderer.act(async () => rootBody.props.onPress());
    const input = tree.root.findByProps({ accessibilityLabel: '답글 입력' });
    await TestRenderer.act(async () => {
      input.props.onChangeText('드래그 중 초안');
      tree.root.findByType(FlatList).props.onScrollBeginDrag({});
      tree.root.findByType(FlatList).props.onScrollEndDrag({});
      pendingFrames.splice(0).forEach(frame => frame(0));
    });

    expect(dismissSpy).not.toHaveBeenCalled();
    expect(
      addListenerSpy.mock.calls.filter(
        ([eventName]) => eventName === 'keyboardDidShow',
      ),
    ).toHaveLength(initialKeyboardShowListenerCount);
    expect(list.props.keyboardDismissMode).toBe('none');
    expect(
      tree.root.findByProps({ accessibilityLabel: '답글 입력' }).props.value,
    ).toBe('드래그 중 초안');
    expect(tree.root.findAllByType(TextInput)).toHaveLength(1);

    await TestRenderer.act(async () =>
      tree.root.findByProps({ accessibilityLabel: '댓글 전송' }).props.onPress(),
    );
    expect(mockSubmit).toHaveBeenCalledWith(
      post.id,
      '드래그 중 초안',
      rootComment.id,
      null,
    );
    await TestRenderer.act(async () => tree.unmount());
    addListenerSpy.mockRestore();
    dismissSpy.mockRestore();
  });

  it('opens one inline thread composer for a root tap without a mention', async () => {
    const tree = await renderScreen();
    const rootBody = tree.root
      .findAll(node =>
        node.props.accessibilityLabel ===
        '댓글 root-author 내용에 답글 남기기',
      )
      .at(0);
    if (!rootBody) throw new Error('root comment body was not rendered');

    await TestRenderer.act(async () => rootBody.props.onPress());

    expect(tree.root.findAllByType(TextInput)).toHaveLength(1);
    expect(containsRenderedText(tree, '답글 남기는 중')).toBe(true);
    await TestRenderer.act(async () => tree.unmount());
  });

  it('keeps the system inset stable while one measured controller owns IME overlap', async () => {
    const tree = await renderScreen();
    const contentPadding = () => StyleSheet.flatten(
      tree.root.findByProps({ testID: 'community-detail-safe-content' }).props.style,
    ).paddingBottom;
    expect(contentPadding()).toBe(24);
    const rootComposer = tree.root.findByProps({ placement: 'bottom' });
    expect(rootComposer.props.paddingBottom).toBe(6);
    const rootBody = tree.root.findAll(node =>
      node.props.accessibilityLabel === '댓글 root-author 내용에 답글 남기기',
    )[0];
    await TestRenderer.act(async () => rootBody.props.onPress());
    expect(contentPadding()).toBe(24);
    expect(tree.root.findByProps({ placement: 'inline' }).props.paddingBottom).toBe(8);
    mockKeyboardInset = 300;
    await TestRenderer.act(async () => tree.update(
      <ThemeProvider theme={createTheme('light')}><CommunityDetailScreen /></ThemeProvider>,
    ));
    expect(contentPadding()).toBe(24);
    expect(tree.root.findByProps({ testID: 'community-comment-keyboard-owner' }).props).toMatchObject({ behavior: 'height', keyboardVerticalOffset: 0 });
    expect(tree.root.findByProps({ testID: 'community-comment-keyboard-owner' }).props.automaticOffset).toBeUndefined();
    expect(tree.root.findByType(FlatList).props.keyboardDismissMode).toBe('none');
    expect(tree.root.findByType(FlatList).props.keyboardShouldPersistTaps).toBe('always');
    await TestRenderer.act(async () => tree.unmount());
  });

  it('uses the measured custom-header origin once without duplicating safe-area padding', async () => {
    const tree = await renderScreen();
    const safeContent = tree.root.findByProps({ testID: 'community-detail-safe-content' });
    const instance = safeContent.instance as unknown as {
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
    };
    const measureInWindow = jest.spyOn(instance, 'measureInWindow').mockImplementation(callback => callback(0, 89, 384, 695));
    await TestRenderer.act(async () => {
      safeContent.props.onLayout();
    });
    expect(measureInWindow).toHaveBeenCalledTimes(1);
    expect(tree.root.findByProps({ testID: 'community-comment-keyboard-owner' }).props.keyboardVerticalOffset).toBe(89);
    expect(StyleSheet.flatten(tree.root.findByProps({ testID: 'community-detail-safe-content' }).props.style).paddingBottom).toBe(24);
    await TestRenderer.act(async () => tree.unmount());
    measureInWindow.mockRestore();
  });

  it('uses native mock refs for one reveal and refocuses after Android Back', async () => {
    const metricsSpy = jest.spyOn(Keyboard, 'metrics').mockReturnValue({
      height: 600,
      screenY: 1740,
      screenX: 0,
      width: 1080,
    });
    const tree = await renderScreen();
    const rootBody = tree.root
      .findAll(node =>
        node.props.accessibilityLabel ===
        '댓글 root-author 내용에 답글 남기기',
      )
      .at(0);
    if (!rootBody) throw new Error('root comment body was not rendered');

    await TestRenderer.act(async () => rootBody.props.onPress());
    const inputNode = tree.root.findByProps({
      accessibilityLabel: '답글 입력',
    });
    const inputInstance = inputNode.instance as unknown as {
      blur: jest.Mock;
      focus: jest.Mock;
      isFocused: jest.Mock;
    };
    const focusSpy = jest.spyOn(inputInstance, 'focus');
    const blurSpy = jest.spyOn(inputInstance, 'blur');
    const listInstance = tree.root.findByType(FlatList).instance as unknown as {
      scrollToOffset: jest.Mock;
    };
    const scrollSpy = jest.spyOn(listInstance, 'scrollToOffset');
    const inlineComposer = tree.root.findByProps({
      testID: 'community-inline-composer',
    });
    const measureTarget = inlineComposer.instance as unknown as {
      measureInWindow: (
        callback: (x: number, y: number, width: number, height: number) => void,
      ) => void;
    };
    let queuedMeasureCallback:
      | ((x: number, y: number, width: number, height: number) => void)
      | null = null;
    const measureSpy = jest
      .spyOn(measureTarget, 'measureInWindow')
      .mockImplementation(callback => {
        queuedMeasureCallback = callback;
      });
    const runQueuedMeasure = () => {
      if (queuedMeasureCallback === null) {
        throw new Error('Expected a queued inline composer measurement');
      }
      queuedMeasureCallback(0, 2200, 320, 180);
    };
    await TestRenderer.act(async () =>
      inlineComposer.props.onLayout({
        nativeEvent: { layout: { height: 180 } },
      }),
    );

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(measureSpy).toHaveBeenCalledTimes(1);
    runQueuedMeasure();
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    await TestRenderer.act(async () => {
      inputNode.props.onFocus();
      tree.root.findByType(FlatList).props.onScrollBeginDrag({});
      tree.root.findByType(FlatList).props.onScrollEndDrag({});
      inputNode.props.onFocus();
      runQueuedMeasure();
    });

    expect(measureSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    inputInstance.isFocused.mockReturnValue(true);
    metricsSpy.mockReturnValue(undefined);
    await TestRenderer.act(async () => inputNode.props.onPressIn());

    expect(blurSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledTimes(2);
    await TestRenderer.act(async () => tree.unmount());
    metricsSpy.mockRestore();
  });

  it('keeps mounted readiness through sort cancel and refocuses the same target', async () => {
    const tree = await renderScreen();
    const rootBody = tree.root
      .findAll(node =>
        node.props.accessibilityLabel ===
        '댓글 root-author 내용에 답글 남기기',
      )
      .at(0);
    if (!rootBody) throw new Error('root comment body was not rendered');

    await TestRenderer.act(async () => rootBody.props.onPress());
    const inlineComposer = tree.root.findByProps({
      testID: 'community-inline-composer',
    });
    await TestRenderer.act(async () =>
      inlineComposer.props.onLayout({
        nativeEvent: { layout: { height: 180 } },
      }),
    );
    const inputInstance = tree.root.findByProps({
      accessibilityLabel: '답글 입력',
    }).instance as unknown as { focus: jest.Mock };
    const focusSpy = jest.spyOn(inputInstance, 'focus');

    const sortButton = tree.root
      .findAll(node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('댓글 정렬'),
      )
      .at(0);
    if (!sortButton) throw new Error('comment sort button was not rendered');
    await TestRenderer.act(async () => sortButton.props.onPress());

    const sortDialog = tree.root
      .findAll(
        node => node.props.title === '댓글 정렬' && node.props.visible === true,
      )
      .at(0);
    if (!sortDialog) throw new Error('comment sort dialog was not opened');
    await TestRenderer.act(async () => sortDialog.props.onCancel());
    await TestRenderer.act(async () => rootBody.props.onPress());

    expect(focusSpy).toHaveBeenCalledTimes(2);
    await TestRenderer.act(async () => tree.unmount());
  });

  it('keeps mounted readiness through report cancel and refocuses the same target', async () => {
    const tree = await renderScreen();
    const rootBody = tree.root
      .findAll(node =>
        node.props.accessibilityLabel ===
        '댓글 root-author 내용에 답글 남기기',
      )
      .at(0);
    if (!rootBody) throw new Error('root comment body was not rendered');

    await TestRenderer.act(async () => rootBody.props.onPress());
    const inputInstance = tree.root.findByProps({
      accessibilityLabel: '답글 입력',
    }).instance as unknown as { focus: jest.Mock };
    const focusSpy = jest.spyOn(inputInstance, 'focus');
    const inlineComposer = tree.root.findByProps({
      testID: 'community-inline-composer',
    });
    await TestRenderer.act(async () =>
      inlineComposer.props.onLayout({
        nativeEvent: { layout: { height: 180 } },
      }),
    );
    focusSpy.mockClear();

    const reportAction = tree.root.findAll(node =>
      node.props.accessibilityLabel === '댓글 신고',
    )[0];
    if (!reportAction) throw new Error('report action was not rendered');
    await TestRenderer.act(async () => reportAction.props.onPress());

    const reportSurface = tree.root.findByProps({
      testID: 'community-report-surface',
    });
    const reportCancel = reportSurface.findAll(node =>
      typeof node.props.onPress === 'function' &&
      flattenRenderedText(node.props.children) === '취소',
    )[0];
    if (!reportCancel) throw new Error('report cancel action was not rendered');
    await TestRenderer.act(async () => reportCancel.props.onPress());
    await TestRenderer.act(async () => rootBody.props.onPress());

    expect(focusSpy).toHaveBeenCalledTimes(1);
    await TestRenderer.act(async () => tree.unmount());
  });

  it('keeps mounted readiness through delete cancel and refocuses the same target', async () => {
    mockCurrentUser.id = rootComment.authorId;
    try {
      const tree = await renderScreen();
      const rootBody = tree.root
        .findAll(node =>
          node.props.accessibilityLabel ===
          '댓글 root-author 내용에 답글 남기기',
        )
        .at(0);
      if (!rootBody) throw new Error('root comment body was not rendered');

      await TestRenderer.act(async () => rootBody.props.onPress());
      const inputInstance = tree.root.findByProps({
        accessibilityLabel: '답글 입력',
      }).instance as unknown as { focus: jest.Mock };
      const focusSpy = jest.spyOn(inputInstance, 'focus');
      const inlineComposer = tree.root.findByProps({
        testID: 'community-inline-composer',
      });
      await TestRenderer.act(async () =>
        inlineComposer.props.onLayout({
          nativeEvent: { layout: { height: 180 } },
        }),
      );
      focusSpy.mockClear();

      const deleteAction = tree.root.findAll(node =>
        node.props.accessibilityLabel === '댓글 삭제',
      )[0];
      if (!deleteAction) throw new Error('delete action was not rendered');
      await TestRenderer.act(async () => deleteAction.props.onPress());

      const deleteDialog = tree.root.findAll(
        node =>
          node.props.title === '댓글을 삭제할까요?' &&
          node.props.visible === true,
      )[0];
      if (!deleteDialog) throw new Error('delete dialog was not opened');
      await TestRenderer.act(async () => deleteDialog.props.onCancel());
      await TestRenderer.act(async () => rootBody.props.onPress());

      expect(focusSpy).toHaveBeenCalledTimes(1);
      await TestRenderer.act(async () => tree.unmount());
    } finally {
      mockCurrentUser.id = 'keyboard-user';
    }
  });

  it('keeps mounted readiness through navigation blur and refocuses the same target', async () => {
    const tree = await renderScreen();
    const rootBody = tree.root
      .findAll(node =>
        node.props.accessibilityLabel ===
        '댓글 root-author 내용에 답글 남기기',
      )
      .at(0);
    if (!rootBody) throw new Error('root comment body was not rendered');

    await TestRenderer.act(async () => rootBody.props.onPress());
    const inlineComposer = tree.root.findByProps({
      testID: 'community-inline-composer',
    });
    await TestRenderer.act(async () =>
      inlineComposer.props.onLayout({
        nativeEvent: { layout: { height: 180 } },
      }),
    );
    const inputInstance = tree.root.findByProps({
      accessibilityLabel: '답글 입력',
    }).instance as unknown as { focus: jest.Mock };
    const focusSpy = jest.spyOn(inputInstance, 'focus');
    focusSpy.mockClear();

    const blurCalls = (mockNavigation.addListener as jest.Mock).mock.calls as Array<
      [string, () => void]
    >;
    const blurListener = blurCalls
      .filter(([eventName]) => eventName === 'blur')
      .at(-1)?.[1] as (() => void) | undefined;
    if (!blurListener) throw new Error('navigation blur listener was not registered');

    await TestRenderer.act(async () => blurListener());
    await TestRenderer.act(async () => rootBody.props.onPress());

    expect(focusSpy).toHaveBeenCalledTimes(1);
    await TestRenderer.act(async () => tree.unmount());
  });

  it('rejects stale layout and focus callbacks after an inline target swap', async () => {
    const tree = await renderScreen();
    const rootBody = tree.root
      .findAll(node =>
        node.props.accessibilityLabel ===
        '댓글 root-author 내용에 답글 남기기',
      )
      .at(0);
    const replyBody = tree.root
      .findAll(node =>
        node.props.accessibilityLabel ===
        '답글 reply-author 내용에 직접 답글 남기기',
      )
      .at(0);
    if (!rootBody || !replyBody) {
      throw new Error('comment rows were not rendered');
    }

    await TestRenderer.act(async () => rootBody.props.onPress());
    const staleComposer = tree.root.findByProps({
      testID: 'community-inline-composer',
    });
    const staleLayout = staleComposer.props.onLayout;
    const staleInput = tree.root.findByProps({
      accessibilityLabel: '답글 입력',
    });
    const staleInputFocus = staleInput.props.onFocus as () => void;

    await TestRenderer.act(async () => replyBody.props.onPress());
    const replyComposer = tree.root.findByProps({
      testID: 'community-inline-composer',
    });
    const replyLayout = replyComposer.props.onLayout;
    const replyInput = tree.root.findByProps({
      accessibilityLabel: '답글 입력',
    });
    const replyInputFocus = replyInput.props.onFocus as () => void;

    await TestRenderer.act(async () => rootBody.props.onPress());
    const activeComposer = tree.root.findByProps({
      testID: 'community-inline-composer',
    });
    const activeInput = tree.root.findByProps({
      accessibilityLabel: '답글 입력',
    });
    const activeInputFocusSpy = jest.spyOn(
      activeInput.instance as unknown as { focus: () => void },
      'focus',
    );

    await TestRenderer.act(async () => {
      staleLayout({ nativeEvent: { layout: { height: 180 } } });
      staleInputFocus();
      replyLayout({ nativeEvent: { layout: { height: 180 } } });
      replyInputFocus();
    });
    expect(activeInputFocusSpy).not.toHaveBeenCalled();

    await TestRenderer.act(async () =>
      activeComposer.props.onLayout({
        nativeEvent: { layout: { height: 180 } },
      }),
    );
    expect(activeInputFocusSpy).toHaveBeenCalledTimes(1);
    expect(tree.root.findAllByType(TextInput)).toHaveLength(1);
    await TestRenderer.act(async () => tree.unmount());
  });

  it('cancels inline reply mode back to the single root composer', async () => {
    const tree = await renderScreen();
    const rootBody = tree.root
      .findAll(node =>
        node.props.accessibilityLabel ===
        '댓글 root-author 내용에 답글 남기기',
      )
      .at(0);
    if (!rootBody) throw new Error('root comment body was not rendered');

    await TestRenderer.act(async () => rootBody.props.onPress());
    const input = tree.root.findByProps({ accessibilityLabel: '답글 입력' });
    await TestRenderer.act(async () => input.props.onChangeText('작성 중인 초안'));
    const cancel = tree.root.findByProps({
      accessibilityLabel: '답글 작성 취소',
    });
    await TestRenderer.act(async () => cancel.props.onPress());

    expect(tree.root.findAllByProps({ testID: 'community-inline-composer' })).toHaveLength(0);
    expect(tree.root.findByProps({ accessibilityLabel: '댓글 입력' }).props.value).toBe(
      '작성 중인 초안',
    );
    expect(tree.root.findAllByType(TextInput)).toHaveLength(1);
    await TestRenderer.act(async () => tree.unmount());
  });

  it('opens a direct reply composer for a reply tap and keeps the target payload', async () => {
    mockSubmit.mockResolvedValue(undefined);
    const tree = await renderScreen();
    const replyBody = tree.root
      .findAll(node =>
        node.props.accessibilityLabel ===
        '답글 reply-author 내용에 직접 답글 남기기',
      )
      .at(0);
    if (!replyBody) throw new Error('reply body was not rendered');

    await TestRenderer.act(async () => replyBody.props.onPress());
    const input = tree.root.findByProps({ accessibilityLabel: '답글 입력' });
    await TestRenderer.act(async () => input.props.onChangeText('직접 답글'));
    expect(containsRenderedText(tree, '@reply-author')).toBe(true);
    const send = tree.root.findByProps({ accessibilityLabel: '댓글 전송' });
    await TestRenderer.act(async () => send.props.onPress());

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
      .findAll(node =>
        node.props.accessibilityLabel ===
        '댓글 root-author 내용에 답글 남기기',
      )
      .at(0);
    if (!rootBody) throw new Error('root comment body was not rendered');
    await TestRenderer.act(async () => rootBody.props.onPress());
    const input = tree.root.findByProps({ accessibilityLabel: '답글 입력' });
    await TestRenderer.act(async () => input.props.onChangeText('작성 중인 초안'));
    expect(tree.root.findByProps({ accessibilityLabel: '답글 입력' })).toBe(
      input,
    );
    expect(input.props.value).toBe('작성 중인 초안');

    const replyBody = tree.root
      .findAll(node =>
        node.props.accessibilityLabel ===
        '답글 reply-author 내용에 직접 답글 남기기',
      )
      .at(0);
    if (!replyBody) throw new Error('reply body was not rendered');
    await TestRenderer.act(async () => replyBody.props.onPress());
    expect(
      tree.root.findByProps({ accessibilityLabel: '답글 입력' }).props.value,
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
    const input = tree.root.findByProps({ accessibilityLabel: '답글 입력' });
    await TestRenderer.act(async () => input.props.onChangeText('재시도할 초안'));
    await TestRenderer.act(async () =>
      tree.root.findByProps({ accessibilityLabel: '댓글 전송' }).props.onPress(),
    );

    expect(tree.root.findByProps({ accessibilityLabel: '답글 입력' }).props.value).toBe(
      '재시도할 초안',
    );
    await TestRenderer.act(async () => tree.unmount());
  });

  it('keeps the draft after a canonical comment rate-limit rejection', async () => {
    mockSubmit.mockRejectedValueOnce({
      message: 'community_comment_rate_limited',
      details: JSON.stringify({ app_code: 'community_comment_rate_limited' }),
    });
    const tree = await renderScreen();
    const input = tree.root.findByProps({ accessibilityLabel: '댓글 입력' });
    await TestRenderer.act(async () => input.props.onChangeText('제한 후에도 남아야 할 초안'));
    await TestRenderer.act(async () =>
      tree.root.findByProps({ accessibilityLabel: '댓글 전송' }).props.onPress(),
    );

    expect(tree.root.findByProps({ accessibilityLabel: '댓글 입력' }).props.value).toBe(
      '제한 후에도 남아야 할 초안',
    );
    await TestRenderer.act(async () => tree.unmount());
  });
});

describe('Community K22/K23 focus-race guards', () => {
  it('separates mounted readiness from focus cancellation and keyboard visibility', () => {
    expect(detailScreenSource).toContain('preserveMountedLayout');
    expect(detailScreenSource).toContain('keyboardIsVisible');
    expect(detailScreenSource).toContain('inlineMountedComposerRef');
    expect(detailScreenSource).toContain('inlineMountedComposerRef.current.instanceId');
    expect(detailScreenSource).toContain('commentInputRef.current?.blur()');
    expect(detailScreenSource).toContain('forceRefocus');
    expect(composerSource).toContain('onInlineComposerMounted');
    expect(composerSource).toContain('instanceIdRef.current');
  });

  it('invalidates late ABA layout callbacks with a remounted composer key', () => {
    expect(detailScreenSource).toContain(
      'community-inline-composer-${replyTargetId ?? \'none\'}',
    );
    expect(composerSource).toContain('onInlineLayoutReady(');
  });
});
