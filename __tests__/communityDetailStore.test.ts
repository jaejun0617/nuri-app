import type { CommunityComment, CommunityPost } from '../src/types/community';
import {
  fetchCommunityComments,
  fetchCommunityPostById,
} from '../src/services/supabase/community';
import { useCommunityStore } from '../src/store/communityStore';

jest.mock('../src/services/supabase/community', () => ({
  ...jest.requireActual('../src/services/supabase/community'),
  fetchCommunityComments: jest.fn(),
  fetchCommunityPostById: jest.fn(),
  fetchCommunityPosts: jest.fn().mockResolvedValue({
    items: [],
    nextCursor: null,
    hasMore: false,
  }),
}));

const mockedFetchCommunityComments = fetchCommunityComments as jest.MockedFunction<
  typeof fetchCommunityComments
>;
const mockedFetchCommunityPostById = fetchCommunityPostById as jest.MockedFunction<
  typeof fetchCommunityPostById
>;

function makePost(id: string, authorId = `author-${id}`): CommunityPost {
  return {
    id,
    authorId,
    authorNickname: 'QA 사용자',
    authorAvatarUrl: null,
    petId: null,
    petName: null,
    petBreed: null,
    petSpecies: null,
    petAgeLabel: null,
    petAvatarUrl: null,
    showPetAge: true,
    title: id,
    content: id,
    imagePath: null,
    imageUrl: null,
    imagePaths: [],
    imageUrls: [],
    hasImage: false,
    status: 'active',
    category: 'question',
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    isNotice: false,
    noticePublishedAt: null,
    isLikedByMe: false,
    deletedAt: null,
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-19T00:00:00.000Z',
  };
}

function makeComment(postId: string): CommunityComment {
  return {
    id: `comment-${postId}`,
    postId,
    authorId: 'comment-author',
    authorNickname: '댓글 사용자',
    authorAvatarUrl: null,
    parentCommentId: null,
    depth: 0,
    replyCount: 0,
    likeCount: 0,
    isLikedByMe: false,
    content: '댓글',
    status: 'active',
    deletedAt: null,
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-19T00:00:00.000Z',
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(nextResolve => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe('community detail protected read gate', () => {
  beforeEach(() => {
    mockedFetchCommunityPostById.mockReset();
    mockedFetchCommunityComments.mockReset();
    useCommunityStore.getState().clearAll();
  });

  it('item:null detail은 unavailable로 남고 comments를 요청하지 않는다', async () => {
    mockedFetchCommunityPostById.mockResolvedValue(null);

    await useCommunityStore.getState().fetchPostDetail('blocked-post');
    await useCommunityStore.getState().fetchPostComments('blocked-post');

    expect(useCommunityStore.getState().detailStatusByPostId['blocked-post']).toBe(
      'not_found',
    );
    expect(mockedFetchCommunityComments).not.toHaveBeenCalled();
    expect(useCommunityStore.getState().postsById['blocked-post']).toBeUndefined();
  });

  it('eligible detail이 확인된 뒤에만 comments를 요청한다', async () => {
    const post = makePost('visible-post');
    mockedFetchCommunityPostById.mockResolvedValue(post);
    mockedFetchCommunityComments.mockResolvedValue([makeComment(post.id)]);

    await useCommunityStore.getState().fetchPostDetail(post.id);
    await useCommunityStore.getState().fetchPostComments(post.id);

    expect(mockedFetchCommunityComments).toHaveBeenCalledWith(post.id);
    expect(useCommunityStore.getState().commentsByPostId[post.id]).toHaveLength(1);
  });

  it('오래된 detail 응답이 새 detail cache를 덮지 않는다', async () => {
    const oldRequest = deferred<CommunityPost | null>();
    const newPost = makePost('post-b');
    mockedFetchCommunityPostById
      .mockReturnValueOnce(oldRequest.promise)
      .mockResolvedValueOnce(newPost);

    const oldLoad = useCommunityStore.getState().fetchPostDetail('post-a');
    const newLoad = useCommunityStore.getState().fetchPostDetail('post-b');
    oldRequest.resolve(makePost('post-a'));

    await Promise.all([oldLoad, newLoad]);

    expect(useCommunityStore.getState().postsById['post-a']).toBeUndefined();
    expect(useCommunityStore.getState().postsById['post-b']).toEqual(newPost);
  });

  it('오래된 comments 응답이 새 detail 전환 뒤 store에 반영되지 않는다', async () => {
    const postA = makePost('post-a');
    const postB = makePost('post-b');
    const oldComments = deferred<CommunityComment[]>();
    mockedFetchCommunityPostById
      .mockResolvedValueOnce(postA)
      .mockResolvedValueOnce(postB);
    mockedFetchCommunityComments.mockReturnValueOnce(oldComments.promise);

    await useCommunityStore.getState().fetchPostDetail(postA.id);
    const commentsLoad = useCommunityStore.getState().fetchPostComments(postA.id);
    await useCommunityStore.getState().fetchPostDetail(postB.id);
    oldComments.resolve([makeComment(postA.id)]);
    await commentsLoad;

    expect(useCommunityStore.getState().commentsByPostId[postA.id]).toBeUndefined();
    expect(useCommunityStore.getState().commentsByPostId[postB.id]).toBeUndefined();
  });
});
