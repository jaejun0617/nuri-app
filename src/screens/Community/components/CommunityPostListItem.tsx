import React, { memo, useCallback } from 'react';

import { useCommunityStore } from '../../../store/communityStore';
import PostCard from './PostCard';

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
    useCallback(s => s.latestCommentByPostId[postId] ?? null, [postId]),
  );

  if (!post) return null;

  return (
    <PostCard
      post={post}
      latestComment={post.commentCount > 0 ? latestComment : null}
      onPressPost={onPressPost}
      onPressLike={onPressLike}
    />
  );
}

export default memo(CommunityPostListItemBase);
