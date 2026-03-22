import React, { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../../app/ui/AppText';
import type { CommunityPost } from '../../../types/community';
import { formatRelativeTimeFromNow } from '../../../utils/date';

type Props = {
  post: CommunityPost;
  onPressPost: (postId: string) => void;
  onPressLike: (postId: string) => void;
  relativeTimeTick: number;
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

function getCategoryTone(category: CommunityPost['category']) {
  switch (category) {
    case 'question':
      return {
        backgroundColor: '#E8F8EE',
        borderColor: '#B9E9CA',
        textColor: '#1F8A4D',
      };
    case 'info':
      return {
        backgroundColor: '#E9F6FF',
        borderColor: '#B9E0FF',
        textColor: '#2176C7',
      };
    case 'daily':
      return {
        backgroundColor: '#FFF2E8',
        borderColor: '#FFD6B8',
        textColor: '#C66A1D',
      };
    case 'free':
      return {
        backgroundColor: '#F2F3F5',
        borderColor: '#D8DCE1',
        textColor: '#5B6470',
      };
    default:
      return null;
  }
}

function PostCardBase({ post, onPressPost, onPressLike, relativeTimeTick }: Props) {
  const theme = useTheme();
  const relativeTime = formatRelativeTimeFromNow(post.createdAt);
  const relativeTimeKey = `${post.id}-${Math.floor(relativeTimeTick / 60000)}`;
  const petName = post.petName?.trim() || null;
  const petBreedAge = [post.petBreed || post.petSpecies, post.petAgeLabel]
    .filter(Boolean)
    .join(' · ');
  const categoryTone = getCategoryTone(post.category);
  const handlePress = useCallback(() => {
    onPressPost(post.id);
  }, [onPressPost, post.id]);
  const handlePressLike = useCallback(() => {
    onPressLike(post.id);
  }, [onPressLike, post.id]);

  return (
    <Pressable
      android_ripple={{ color: `${theme.colors.textPrimary}08` }}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={handlePress}
    >
      <View style={styles.topRow}>
        <View style={styles.authorWrap}>
          <View style={styles.profileRow}>
            {post.petAvatarUrl ? (
              <Image
                source={{ uri: post.petAvatarUrl }}
                style={[styles.petAvatar, { borderColor: theme.colors.border }]}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.petAvatarFallback,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Feather name="user" size={14} color={theme.colors.textMuted} />
              </View>
            )}
            <View style={styles.profileTextBlock}>
              <AppText preset="body" style={[styles.author, { color: theme.colors.textPrimary }]}>
                {post.authorNickname}
              </AppText>
              {petName ? (
                <AppText
                  preset="caption"
                  numberOfLines={1}
                  style={[styles.petName, { color: theme.colors.textPrimary }]}
                >
                  {petName}
                </AppText>
              ) : null}
              {petBreedAge ? (
                <AppText
                  preset="caption"
                  numberOfLines={1}
                  style={[styles.petMeta, { color: theme.colors.textMuted }]}
                >
                  {petBreedAge}
                </AppText>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.badges}>
          {post.category && categoryTone ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: categoryTone.backgroundColor,
                  borderColor: categoryTone.borderColor,
                  borderWidth: 1,
                },
              ]}
            >
              <AppText preset="caption" style={[styles.badgeText, { color: categoryTone.textColor }]}>
                {getCategoryLabel(post.category)}
              </AppText>
            </View>
          ) : null}
          {post.hasImage ? (
            <View style={[styles.badge, styles.imageBadge, { borderColor: theme.colors.border }]}>
              <AppText preset="caption" style={[styles.badgeText, { color: theme.colors.textPrimary }]}>
                이미지
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      <AppText
        preset="body"
        numberOfLines={2}
        style={[styles.content, { color: theme.colors.textPrimary }]}
      >
        {post.content}
      </AppText>

      <View style={styles.metaRow}>
        <View style={styles.metaGroup}>
          <Pressable
            hitSlop={8}
            style={styles.metaItem}
            onPress={event => {
              event.stopPropagation();
              handlePressLike();
            }}
          >
            <Feather
              name="heart"
              size={16}
              color={post.isLikedByMe ? theme.colors.danger : theme.colors.textMuted}
            />
            <AppText preset="caption" style={[styles.metaText, { color: theme.colors.textMuted }]}>
              {post.likeCount}
            </AppText>
          </Pressable>
          <View style={styles.metaItem}>
            <Feather name="message-circle" size={16} color={theme.colors.textMuted} />
            <AppText preset="caption" style={[styles.metaText, { color: theme.colors.textMuted }]}>
              {post.commentCount}
            </AppText>
          </View>
        </View>
        <AppText
          key={relativeTimeKey}
          preset="caption"
          style={[styles.timeText, { color: theme.colors.textMuted }]}
        >
          {relativeTime}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  authorWrap: {
    flex: 1,
    gap: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  author: {
    fontWeight: '700',
  },
  petAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  petAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextBlock: {
    flex: 1,
    gap: 4,
  },
  petName: {
    lineHeight: 18,
    fontWeight: '600',
    fontSize: 13,
  },
  petMeta: {
    lineHeight: 18,
    fontSize: 12,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBadge: {
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    lineHeight: 24,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    lineHeight: 16,
  },
  timeText: {
    lineHeight: 16,
  },
});

const areEqual = (prev: Props, next: Props) =>
  prev.post.id === next.post.id &&
  prev.post.authorNickname === next.post.authorNickname &&
  prev.post.petName === next.post.petName &&
  prev.post.petBreed === next.post.petBreed &&
  prev.post.petSpecies === next.post.petSpecies &&
  prev.post.petAgeLabel === next.post.petAgeLabel &&
  prev.post.category === next.post.category &&
  prev.post.content === next.post.content &&
  prev.post.hasImage === next.post.hasImage &&
  prev.post.likeCount === next.post.likeCount &&
  prev.post.isLikedByMe === next.post.isLikedByMe &&
  prev.post.commentCount === next.post.commentCount &&
  prev.post.createdAt === next.post.createdAt &&
  prev.relativeTimeTick === next.relativeTimeTick &&
  prev.onPressPost === next.onPressPost &&
  prev.onPressLike === next.onPressLike;

export default memo(PostCardBase, areEqual);
