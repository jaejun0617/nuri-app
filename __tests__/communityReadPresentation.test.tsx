import React from 'react';
import TestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import PostCard from '../src/screens/Community/components/PostCard';
import CommunityPostListItem from '../src/screens/Community/components/CommunityPostListItem';
import { useCommunityStore } from '../src/store/communityStore';
import { fetchCommunityPostById } from '../src/services/supabase/community';
import { useCommunityReadStore } from '../src/store/communityReadStore';
import type { CommunityPost } from '../src/types/community';
import { COMMUNITY_LIST_COLORS } from '../src/screens/Community/communityCategoryPalette';

let mockViewer = 'reader-a';
jest.mock('../src/services/supabase/community', () => ({
  ...jest.requireActual('../src/services/supabase/community'),
  fetchCommunityPostById: jest.fn(),
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (
    selector: (state: { session: { user: { id: string } } }) => unknown,
  ) => selector({ session: { user: { id: mockViewer } } }),
}));

const post: CommunityPost = {
  id: 'read-title-fixture',
  authorId: 'author',
  authorNickname: 'QA',
  authorAvatarUrl: null,
  petId: null,
  petName: null,
  petSpecies: null,
  petBreed: null,
  petAgeLabel: null,
  petAvatarUrl: null,
  showPetAge: false,
  title: '목록에 계속 남는 글',
  content: '내용',
  imagePath: null,
  imageUrl: null,
  imagePaths: [],
  imageUrls: [],
  hasImage: false,
  status: 'active',
  category: 'free',
  likeCount: 0,
  commentCount: 3,
  viewCount: 4,
  isNotice: false,
  noticePublishedAt: null,
  isLikedByMe: false,
  deletedAt: null,
  createdAt: '2026-10-09T00:00:00Z',
  updatedAt: '2026-10-09T00:00:00Z',
};

it('changes only the visited title and accessibility label, retaining the row and action', async () => {
  const onPress = jest.fn();
  const render = (accent: string) => (
    <ThemeProvider theme={createTheme('light')}>
      <PostCard post={post} createdAtLabel="10.09" accentColor={accent} onPressPost={onPress} />
    </ThemeProvider>
  );
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(render('#B95000'));
  });
  const title = () => tree.root.findByProps({ testID: 'community-post-title' });
  const card = () =>
    tree.root.findAll(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    )[0];
  expect(StyleSheet.flatten(title().props.style).color).toBe(COMMUNITY_LIST_COLORS.title);
  await TestRenderer.act(async () => {
    card().props.onPress();
  });
  expect(onPress).toHaveBeenCalledWith(post.id);
  expect(StyleSheet.flatten(title().props.style).color).toBe(COMMUNITY_LIST_COLORS.title);
  await TestRenderer.act(async () => {
    await useCommunityReadStore.getState().markRead(mockViewer, post.id);
  });
  expect(StyleSheet.flatten(title().props.style).color).toBe(COMMUNITY_LIST_COLORS.readTitle);
  expect(title().props.children).toBe(post.title);
  expect(card().props.accessibilityLabel).toContain('읽은 게시글');
  await TestRenderer.act(async () => {
    tree.update(render('#247264'));
  });
  expect(StyleSheet.flatten(title().props.style).color).toBe(COMMUNITY_LIST_COLORS.readTitle);
  mockViewer = 'reader-b';
  await TestRenderer.act(async () => {
    tree.update(render('#3B6398'));
  });
  expect(StyleSheet.flatten(title().props.style).color).toBe(COMMUNITY_LIST_COLORS.title);
  await TestRenderer.act(async () => {
    tree.unmount();
  });
});

it('retains the mounted list row through protected detail load and immediately reflects read state', async () => {
  mockViewer = 'integration-reader';
  useCommunityStore.getState().clearAll();
  useCommunityStore.setState({ posts: [post], postsById: { [post.id]: post } });
  let resolve!: (value: CommunityPost) => void;
  jest.mocked(fetchCommunityPostById).mockImplementation(() => new Promise(done => { resolve = done; }));
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(<ThemeProvider theme={createTheme('light')}>
      <CommunityPostListItem postId={post.id} now={new Date('2026-10-10T00:00Z')} accentColor="#B95000" onPressPost={jest.fn()} />
    </ThemeProvider>);
  });
  const title = () => tree.root.findByProps({ testID: 'community-post-title' });
  let pending!: Promise<void>;
  await TestRenderer.act(async () => {
    pending = useCommunityStore.getState().fetchPostDetail(post.id);
  });
  expect(title().props.children).toBe(post.title);
  expect(useCommunityStore.getState().postsById[post.id]).toBeUndefined();
  await TestRenderer.act(async () => {
    resolve(post);
    await pending;
    await useCommunityReadStore.getState().markRead(mockViewer, post.id);
  });
  expect(title().props.children).toBe(post.title);
  expect(StyleSheet.flatten(title().props.style).color).toBe(COMMUNITY_LIST_COLORS.readTitle);
  expect(useCommunityStore.getState().posts).toHaveLength(1);
  await TestRenderer.act(async () => tree.unmount());
});

it('updates the same mounted post to a date at Korean midnight without changing post data', async () => {
  useCommunityStore.setState({ postsById: { [post.id]: post } });
  const onPress = jest.fn();
  const row = (now: string) => (
    <ThemeProvider theme={createTheme('light')}>
      <CommunityPostListItem postId={post.id} now={new Date(now)} accentColor="#B95000" onPressPost={onPress} />
    </ThemeProvider>
  );
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => { tree = TestRenderer.create(row('2026-10-09T14:59:00Z')); });
  const label = () => tree.root.findByProps({ testID: 'community-post-created-at' }).props.children;
  expect(label()).toBe('14시간 전');
  await TestRenderer.act(async () => { tree.update(row('2026-10-09T15:00:00Z')); });
  expect(label()).toBe('10.09');
  await TestRenderer.act(async () => { tree.unmount(); });
});
