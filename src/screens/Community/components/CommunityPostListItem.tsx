import React, { memo, useCallback } from 'react';

import { useCommunityStore } from '../../../store/communityStore';
import PostCard from './PostCard';

type Props = {
  postId: string;
  accentColor: string;
  onPressPost: (postId: string) => void;
};

function CommunityPostListItemBase({
  postId,
  accentColor,
  onPressPost,
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
    />
  );
}

export default memo(CommunityPostListItemBase);
