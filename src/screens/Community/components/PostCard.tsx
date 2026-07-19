import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import type { CommunityPost } from '../../../types/community';
import { formatRelativeTimeFromNow } from '../../../utils/date';
import { styles } from './PostCard.styles';

type Props = {
  post: CommunityPost;
  accentColor: string;
  onPressPost: (postId: string) => void;
  onPressLike: (postId: string) => void;
};

function getCategoryLabel(category: CommunityPost['category']) {
  switch (category) {
    case 'question':
      return '질문';
    case 'info':
      return '팁 공유';
    case 'daily':
      return '일상';
    case 'free':
      return '정보';
    default:
      return '전체';
  }
}

function trimText(value: string | null | undefined) {
  return `${value ?? ''}`.trim();
}

function resolvePostTitle(post: CommunityPost) {
  const explicitTitle = trimText(post.title);
  if (explicitTitle) return explicitTitle;

  const firstContentLine = post.content
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.trim())
    .find(Boolean);

  return firstContentLine || '내용이 없는 게시글';
}

function PostCardBase({
  post,
  accentColor,
  onPressPost,
  onPressLike,
}: Props) {
  const theme = useTheme();
  const title = useMemo(() => resolvePostTitle(post), [post]);
  const categoryLabel = getCategoryLabel(post.category);
  const createdAtLabel = useMemo(
    () => formatRelativeTimeFromNow(post.createdAt),
    [post.createdAt],
  );
  const petLabel = [post.petName, post.petBreed || post.petSpecies]
    .map(trimText)
    .filter(Boolean)
    .join(' · ');

  const handlePress = useCallback(() => {
    onPressPost(post.id);
  }, [onPressPost, post.id]);
  const handlePressLike = useCallback(() => {
    onPressLike(post.id);
  }, [onPressLike, post.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, 댓글 ${post.commentCount}개`}
      android_ripple={{ color: `${accentColor}0D` }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed
            ? `${accentColor}08`
            : theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}
      onPress={handlePress}
    >
      <View
        style={[
          styles.typeIcon,
          {
            backgroundColor: post.hasImage ? `${accentColor}14` : theme.colors.surface,
            borderColor: post.hasImage ? `${accentColor}26` : theme.colors.border,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={post.hasImage ? 'image-outline' : 'message-text-outline'}
          size={18}
          color={post.hasImage ? accentColor : theme.colors.textMuted}
        />
      </View>

      <View style={styles.content}>
        <AppText
          preset="body"
          numberOfLines={2}
          style={[styles.title, { color: theme.colors.textPrimary }]}
        >
          {title}
        </AppText>

        <View style={styles.metaRow}>
          <AppText
            preset="caption"
            numberOfLines={1}
            style={[styles.metaText, { color: theme.colors.textMuted }]}
          >
            {`${categoryLabel} · ${post.authorNickname}${
              petLabel ? ` · ${petLabel}` : ''
            } · ${createdAtLabel} · 조회 ${post.viewCount.toLocaleString()}`}
          </AppText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`좋아요 ${post.likeCount}개`}
            hitSlop={8}
            style={styles.likeButton}
            onPress={event => {
              event.stopPropagation();
              handlePressLike();
            }}
          >
            <Feather
              name="heart"
              size={13}
              color={post.isLikedByMe ? theme.colors.danger : theme.colors.textMuted}
            />
            <AppText
              preset="caption"
              style={[
                styles.likeText,
                {
                  color: post.isLikedByMe
                    ? theme.colors.danger
                    : theme.colors.textMuted,
                },
              ]}
            >
              {post.likeCount.toLocaleString()}
            </AppText>
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.commentRail,
          { borderLeftColor: theme.colors.border },
        ]}
      >
        <AppText
          preset="body"
          style={[styles.commentCount, { color: accentColor }]}
        >
          {post.commentCount.toLocaleString()}
        </AppText>
        <AppText
          preset="caption"
          style={[styles.commentLabel, { color: theme.colors.textMuted }]}
        >
          댓글
        </AppText>
      </View>
    </Pressable>
  );
}

const areEqual = (prev: Props, next: Props) =>
  prev.post.id === next.post.id &&
  prev.post.authorNickname === next.post.authorNickname &&
  prev.post.petName === next.post.petName &&
  prev.post.petBreed === next.post.petBreed &&
  prev.post.petSpecies === next.post.petSpecies &&
  prev.post.category === next.post.category &&
  prev.post.title === next.post.title &&
  prev.post.content === next.post.content &&
  prev.post.hasImage === next.post.hasImage &&
  prev.post.viewCount === next.post.viewCount &&
  prev.post.likeCount === next.post.likeCount &&
  prev.post.isLikedByMe === next.post.isLikedByMe &&
  prev.post.commentCount === next.post.commentCount &&
  prev.post.createdAt === next.post.createdAt &&
  prev.accentColor === next.accentColor &&
  prev.onPressPost === next.onPressPost &&
  prev.onPressLike === next.onPressLike;

export default memo(PostCardBase, areEqual);
