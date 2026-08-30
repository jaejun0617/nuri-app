import type { CommunityComment, CommunityPost } from '../src/types/community';
import {
  createCommunityComment,
  deleteCommunityComment,
  fetchCommunityComments,
  fetchCommunityPostById,
} from '../src/services/supabase/community';
import { useCommunityStore } from '../src/store/communityStore';

jest.mock('../src/services/supabase/community', () => ({
  ...jest.requireActual('../src/services/supabase/community'),
  createCommunityComment: jest.fn(),
  fetchCommunityComments: jest.fn(),
  fetchCommunityPostById: jest.fn(),
  deleteCommunityComment: jest.fn(),
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
const mockedCreateCommunityComment = createCommunityComment as jest.MockedFunction<
  typeof createCommunityComment
>;
const mockedDeleteCommunityComment = deleteCommunityComment as jest.MockedFunction<
  typeof deleteCommunityComment
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
    replyToCommentId: null,
    replyTargetUserId: null,
    replyTargetNickname: null,
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

function makeReply(postId: string, parentCommentId: string): CommunityComment {
  return {
    ...makeComment(postId),
    id: `reply-${postId}`,
    authorId: 'reply-author',
    authorNickname: '답글 사용자',
    parentCommentId,
    replyToCommentId: null,
    replyTargetUserId: null,
    replyTargetNickname: null,
    depth: 1,
    content: '답글',
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
    mockedCreateCommunityComment.mockReset();
    mockedDeleteCommunityComment.mockReset();
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

  function seedCommentState(post: CommunityPost, comment: CommunityComment) {
    useCommunityStore.setState({
      posts: [post],
      postsById: { [post.id]: post },
      detailStatusByPostId: { [post.id]: 'ready' },
      commentsByPostId: { [post.id]: [comment] },
      commentsStatusByPostId: { [post.id]: 'ready' },
      commentEntitiesById: { [comment.id]: comment },
      topLevelCommentIdsByPostId: { [post.id]: [comment.id] },
      replyCommentIdsByParentId: {},
      latestCommentByPostId: { [post.id]: comment },
      latestCommentStatusByPostId: { [post.id]: 'ready' },
    });
  }

  it('owner delete 성공 후에만 comment state와 count를 제거한다', async () => {
    const post = makePost('delete-post');
    const comment = makeComment(post.id);
    seedCommentState(post, comment);
    mockedDeleteCommunityComment.mockResolvedValue(true);

    await useCommunityStore.getState().removeComment(comment.id, post.id);

    expect(mockedDeleteCommunityComment).toHaveBeenCalledWith(comment.id);
    expect(useCommunityStore.getState().commentsByPostId[post.id]).toEqual([]);
    expect(useCommunityStore.getState().commentEntitiesById[comment.id]).toBeUndefined();
    expect(useCommunityStore.getState().postsById[post.id]?.commentCount).toBe(0);
  });

  it('reply create 성공 직후 visible reply와 root/post count를 함께 갱신한다', async () => {
    const post = makePost('reply-create-post');
    const root = makeComment(post.id);
    const reply = makeReply(post.id, root.id);
    seedCommentState(post, root);
    mockedCreateCommunityComment.mockResolvedValue(reply);

    await useCommunityStore
      .getState()
      .submitComment(post.id, reply.content, root.id, null);

    expect(mockedCreateCommunityComment).toHaveBeenCalledWith({
      postId: post.id,
      content: reply.content,
      parentCommentId: root.id,
      replyToCommentId: null,
    });
    expect(useCommunityStore.getState().replyCommentIdsByParentId[root.id]).toEqual([
      reply.id,
    ]);
    expect(useCommunityStore.getState().commentEntitiesById[root.id]?.replyCount).toBe(1);
    expect(useCommunityStore.getState().postsById[post.id]?.commentCount).toBe(1);
  });

  it('reply delete 성공 직후 reply 목록과 root/post count를 함께 갱신한다', async () => {
    const post = { ...makePost('reply-delete-post'), commentCount: 1 };
    const root = { ...makeComment(post.id), replyCount: 1 };
    const reply = makeReply(post.id, root.id);
    useCommunityStore.setState({
      posts: [post],
      postsById: { [post.id]: post },
      detailStatusByPostId: { [post.id]: 'ready' },
      commentsByPostId: { [post.id]: [root, reply] },
      commentsStatusByPostId: { [post.id]: 'ready' },
      commentEntitiesById: { [root.id]: root, [reply.id]: reply },
      topLevelCommentIdsByPostId: { [post.id]: [root.id] },
      replyCommentIdsByParentId: { [root.id]: [reply.id] },
      latestCommentByPostId: { [post.id]: reply },
      latestCommentStatusByPostId: { [post.id]: 'ready' },
    });
    mockedDeleteCommunityComment.mockResolvedValue(true);

    await useCommunityStore.getState().removeComment(reply.id, post.id);

    expect(useCommunityStore.getState().commentsByPostId[post.id]).toEqual([
      expect.objectContaining({ id: root.id, replyCount: 0 }),
    ]);
    expect(useCommunityStore.getState().replyCommentIdsByParentId[root.id]).toEqual([]);
    expect(useCommunityStore.getState().postsById[post.id]?.commentCount).toBe(0);
  });

  it('delete failure와 forbidden은 comment state를 성공 상태로 바꾸지 않는다', async () => {
    const post = makePost('failed-delete-post');
    const comment = makeComment(post.id);
    seedCommentState(post, comment);
    const error = new Error('forbidden');
    mockedDeleteCommunityComment.mockRejectedValue(error);

    await expect(
      useCommunityStore.getState().removeComment(comment.id, post.id),
    ).rejects.toBe(error);

    expect(useCommunityStore.getState().commentsByPostId[post.id]).toEqual([comment]);
    expect(useCommunityStore.getState().commentEntitiesById[comment.id]).toEqual(comment);
    expect(useCommunityStore.getState().postsById[post.id]?.commentCount).toBe(0);
  });

  it('삭제 성공 뒤 늦은 comments 응답이 삭제 comment를 재삽입하지 않는다', async () => {
    const post = makePost('stale-delete-post');
    const comment = makeComment(post.id);
    seedCommentState(post, comment);
    const staleComments = deferred<CommunityComment[]>();
    mockedFetchCommunityComments.mockReturnValueOnce(staleComments.promise);
    mockedDeleteCommunityComment.mockResolvedValue(true);

    const commentsLoad = useCommunityStore.getState().fetchPostComments(post.id);
    await useCommunityStore.getState().removeComment(comment.id, post.id);
    staleComments.resolve([comment]);
    await commentsLoad;

    expect(useCommunityStore.getState().commentsByPostId[post.id]).toEqual([]);
    expect(useCommunityStore.getState().commentEntitiesById[comment.id]).toBeUndefined();
  });
});
