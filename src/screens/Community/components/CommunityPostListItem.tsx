import React, { memo, useCallback } from 'react';

import { useCommunityStore } from '../../../store/communityStore';
import type { CommunityComment } from '../../../types/community';
import PostCard from './PostCard';

const EMPTY_COMMENTS: ReadonlyArray<CommunityComment> = [];

type Props = {
  postId: string;
  onPressPost: (postId: string) => void;
  onPressLike: (postId: string) => void;
};

function CommunityPostListItemBase({
  postId,
  onPressPost,
  onPressLike,
}: Props) {
  const post = useCommunityStore(
    useCallback(s => s.postsById[postId] ?? null, [postId]),
  );
  const latestComment = useCommunityStore(
    useCallback(s => {
      const comments = s.commentsByPostId[postId] ?? EMPTY_COMMENTS;
      if (comments.length === 0) return null;
      return comments[comments.length - 1] ?? null;
    }, [postId]),
  );

  if (!post) return null;

  return (
    <PostCard
      post={post}
      latestComment={latestComment}
      onPressPost={onPressPost}
      onPressLike={onPressLike}
    />
  );
}

export default memo(CommunityPostListItemBase);
