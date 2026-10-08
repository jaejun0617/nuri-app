import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  Dimensions,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  View,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import PostImageGallery from '../src/components/community/PostImageGallery';
import CommentActionRow from '../src/screens/Community/components/CommentActionRow';
import CommentThreadItem from '../src/screens/Community/components/CommentThreadItem';
import { useCommunityStore } from '../src/store/communityStore';
import type { CommunityComment } from '../src/types/community';

jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => 'autumn',
}));
async function render(
  child: React.ReactNode,
  mode: 'light' | 'dark' = 'light',
) {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <ThemeProvider theme={createTheme(mode)}>{child}</ThemeProvider>,
    );
  });
  return tree;
}
test.each([
  [400, 1200],
  [1600, 900],
  [900, 900],
])(
  'post image retains full decoded ratio %s/%s without cropping',
  async (width, height) => {
    const tree = await render(
      <PostImageGallery imageUrls={['https://example.test/photo']} />,
    );
    let image = tree.root.findByType(Image);
    await act(async () =>
      image.props.onLoad({ nativeEvent: { source: { width, height } } }),
    );
    image = tree.root.findByType(Image);
    expect(image.props.resizeMode).toBe('contain');
    expect(StyleSheet.flatten(image.parent?.props.style)).toMatchObject({
      width: '100%',
      aspectRatio: width / height,
      borderRadius: 8,
    });
    expect(StyleSheet.flatten(image.props.style)).toMatchObject({
      width: '100%',
      height: '100%',
    });
    await act(async () => tree.unmount());
  },
);
test('all five images remain visible in reading order and a failed image can retry', async () => {
  const urls = Array.from({ length: 5 }, (_, i) => `https://example.test/${i}`);
  const tree = await render(<PostImageGallery imageUrls={urls} />);
  expect(
    tree.root.findAllByType(Image).map(item => item.props.source.uri),
  ).toEqual(urls);
  await act(async () => tree.root.findAllByType(Image)[4].props.onError());
  await act(async () =>
    tree.root
      .findByProps({ accessibilityLabel: '사진 5 다시 불러오기' })
      .props.onPress(),
  );
  expect(tree.root.findAllByType(Image)).toHaveLength(5);
  expect(
    tree.root.findAllByProps({ accessibilityLabel: '사진 5 다시 불러오기' }),
  ).toHaveLength(0);
  await act(async () => tree.unmount());
});
test('invalid image dimensions do not create an infinite or collapsed layout', async () => {
  const tree = await render(
    <PostImageGallery imageUrls={['https://example.test/photo']} />,
  );
  await act(async () =>
    tree.root
      .findByType(Image)
      .props.onLoad({ nativeEvent: { source: { width: 900, height: 0 } } }),
  );
  expect(
    tree.root.findAllByProps({ accessibilityLabel: '사진 1 다시 불러오기' })
      .length,
  ).toBeGreaterThan(0);
  await act(async () => tree.unmount());
});
test.each([false, true])(
  'action order and 12sp sizing follow delete label; liked=%s',
  async liked => {
    const reply = jest.fn(),
      like = jest.fn(),
      remove = jest.fn();
    const tree = await render(
      <CommentActionRow
        commentId="root"
        authorId="qa"
        currentUserId="qa"
        isLikedByMe={liked}
        likeCount={7}
        onPressReply={reply}
        onToggleLike={like}
        onPressDelete={remove}
        onPressReport={jest.fn()}
      />,
    );
    const actions = tree.root.findAllByType(TouchableOpacity);
    expect(actions.map(action => action.props.accessibilityLabel)).toEqual([
      '답글쓰기',
      '댓글 좋아요 7개',
      '댓글 삭제',
    ]);
    const labels = tree.root
      .findAllByType(Text)
      .filter(label =>
        ['답글쓰기', '좋아요', 7, '삭제'].includes(label.props.children),
      );
    expect(labels.map(label => label.props.children)).toEqual([
      '답글쓰기',
      '좋아요',
      7,
      '삭제',
    ]);
    for (const label of labels)
      expect(StyleSheet.flatten(label.props.style)).toMatchObject({
        fontSize: 12,
        lineHeight: 18,
      });
    expect(tree.root.findByType(MaterialIcon).props).toMatchObject({
      name: liked ? 'heart' : 'heart-outline',
      size: 12 * Math.min(Dimensions.get('window').fontScale, 2),
    });
    for (const action of actions) {
      expect(StyleSheet.flatten(action.props.style).minHeight).toBe(48);
      await act(async () => action.props.onPress());
    }
    expect(reply).toHaveBeenCalledWith('root');
    expect(like).toHaveBeenCalledWith('root');
    expect(remove).toHaveBeenCalledWith('root');
    await act(async () => tree.unmount());
  },
);
test.each(['light', 'dark'] as const)(
  'neutral %s preview keeps explicit replies, small reply avatar and inline composer',
  async mode => {
    const root: CommunityComment = {
      id: 'root',
      postId: 'post',
      authorId: 'qa',
      authorNickname: 'QA',
      authorAvatarUrl: null,
      parentCommentId: null,
      replyToCommentId: null,
      replyTargetUserId: null,
      replyTargetNickname: null,
      depth: 0,
      replyCount: 2,
      likeCount: 0,
      isLikedByMe: false,
      content: 'root',
      status: 'active',
      deletedAt: null,
      createdAt: '2026-10-08T00:00:00Z',
      updatedAt: '2026-10-08T00:00:00Z',
    };
    useCommunityStore.setState({
      commentEntitiesById: {
        root,
        a: {
          ...root,
          id: 'a',
          content: 'preview-reply',
          authorAvatarUrl: 'https://example.test/reply-avatar',
          parentCommentId: 'root',
          depth: 1,
        },
        b: {
          ...root,
          id: 'b',
          content: 'outside-preview',
          parentCommentId: 'root',
          depth: 1,
        },
      },
      replyCommentIdsByParentId: { root: ['a', 'b'] },
    });
    const onPressComment = jest.fn();
    const tree = await render(
      <CommentThreadItem
        preview
        previewReplyIds={['a']}
        commentId="root"
        repliesExpanded
        activeReplyTargetId="a"
        inlineComposer={<TextInput testID="inline-draft" value="유지할 답글" />}
        currentUserId="qa"
        postAuthorId="qa"
        authorAccentColor="#333333"
        bestBadgeColor="#333333"
        highlightedCommentId={null}
        onTargetReady={jest.fn()}
        onPressComment={onPressComment}
        onToggleLike={jest.fn()}
        onPressDelete={jest.fn()}
        onPressReport={jest.fn()}
        onToggleReplies={jest.fn()}
      />,
      mode,
    );
    const renderedText = tree.root
      .findAllByType(Text)
      .flatMap(node => node.props.children);
    expect(renderedText).toContain('preview-reply');
    expect(renderedText).not.toContain('outside-preview');
    const bubbleColor = mode === 'light' ? '#F4F4F5' : '#27272A';
    const bubbles = tree.root.findAllByType(View).filter(node => {
      const style = StyleSheet.flatten(node.props.style);
      return (
        style?.backgroundColor === bubbleColor && style?.borderRadius === 8
      );
    });
    expect(bubbles).toHaveLength(2);
    for (const bubble of bubbles)
      expect(StyleSheet.flatten(bubble.props.style)).toMatchObject({
        maxWidth: '100%',
        paddingHorizontal: 10,
        paddingVertical: 6,
      });
    const avatar = tree.root.findByType(FastImage);
    expect(avatar.props.source.uri).toBe('https://example.test/reply-avatar');
    expect(StyleSheet.flatten(avatar.props.style)).toMatchObject({
      width: 20,
      height: 20,
    });
    expect(tree.root.findByType(TextInput).props.value).toBe('유지할 답글');
    const replyActions = tree.root
      .findAllByType(TouchableOpacity)
      .filter(node => node.props.accessibilityLabel === '답글쓰기');
    expect(replyActions).toHaveLength(2);
    await act(async () => replyActions[1].props.onPress());
    expect(onPressComment).toHaveBeenCalledWith('a');
    await act(async () => tree.unmount());
  },
);
