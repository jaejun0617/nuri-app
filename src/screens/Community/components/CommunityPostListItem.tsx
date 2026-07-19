import React, { memo, useCallback } from 'react';

import { useCommunityStore } from '../../../store/communityStore';
import PostCard from './PostCard';

type Props = {
  postId: string;
  accentColor: string;
  onPressPost: (postId: string) => void;
  onPressLike: (postId: string) => void;
};

function CommunityPostListItemBase({
  postId,
  accentColor,
  onPressPost,
  onPressLike,
}: Props) {
  const post = useCommunityStore(
    useCallback(s => s.postsById[postId] ?? null, [postId]),
  );
  if (!post) return null;

  return (
    <PostCard
      post={post}
      accentColor={accentColor}
      onPressPost={onPressPost}
      onPressLike={onPressLike}
    />
  );
}

export default memo(CommunityPostListItemBase);
