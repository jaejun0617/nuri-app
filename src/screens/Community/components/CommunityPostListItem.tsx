import React, { memo, useCallback } from 'react';

import { useCommunityStore } from '../../../store/communityStore';
import PostCard from './PostCard';
import { formatCommunityListTimestamp } from '../communityListPresentation';

type Props = {
  postId: string;
  now: Date;
  accentColor: string;
  onPressPost: (postId: string) => void;
};

function CommunityPostListItemBase({
  postId,
  now,
  accentColor,
  onPressPost,
}: Props) {
  const post = useCommunityStore(
    // Only the list may reuse its eligible snapshot while detail revalidates.
    useCallback(
      s => s.postsById[postId] ?? s.posts.find(item => item.id === postId) ?? null,
      [postId],
    ),
  );
  if (!post) return null;

  return (
    <PostCard
      post={post}
      createdAtLabel={formatCommunityListTimestamp(post.createdAt, now)}
      accentColor={accentColor}
      onPressPost={onPressPost}
    />
  );
}

export default memo(CommunityPostListItemBase);
