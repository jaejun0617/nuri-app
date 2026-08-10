import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import type { CommunityPost } from '../../../types/community';
import {
  formatCommunityListTimestamp,
  getCommunityCategoryLabel,
} from '../communityListPresentation';
import { styles } from './PostCard.styles';

type Props = {
  post: CommunityPost;
  accentColor: string;
  onPressPost: (postId: string) => void;
};

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
}: Props) {
  const theme = useTheme();
  const title = useMemo(() => resolvePostTitle(post), [post]);
  const categoryLabel = getCommunityCategoryLabel(post.category);
  const createdAtLabel = useMemo(
    () => formatCommunityListTimestamp(post.createdAt),
    [post.createdAt],
  );

  const handlePress = useCallback(() => {
    onPressPost(post.id);
  }, [onPressPost, post.id]);

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
          borderBottomColor: `${theme.colors.textMuted}55`,
        },
      ]}
      onPress={handlePress}
    >
      <View style={styles.content}>
        <View style={styles.titleRow}>
          {post.isNotice ? (
            <View
              style={[
                styles.noticeBadge,
                {
                  backgroundColor: `${accentColor}18`,
                  borderColor: `${accentColor}55`,
                },
              ]}
            >
              <AppText
                preset="caption"
                style={[styles.noticeBadgeText, { color: accentColor }]}
              >
                공지
              </AppText>
            </View>
          ) : null}
          {post.hasImage ? (
            <View style={styles.imageTypeIcon}>
              <MaterialCommunityIcons name="image" size={13} color="#FFFFFF" />
            </View>
          ) : (
            <MaterialCommunityIcons
              name="message-processing"
              size={18}
              color="#C7CBD2"
              style={styles.textTypeIcon}
            />
          )}
          <AppText
            preset="body"
            numberOfLines={1}
            style={[styles.title, { color: theme.colors.textPrimary }]}
          >
            {title}
          </AppText>
        </View>

        <View style={styles.metaRow}>
          <AppText
            preset="caption"
            numberOfLines={1}
            style={[styles.metaText, { color: theme.colors.textMuted }]}
          >
            {`${categoryLabel}  |  ${post.authorNickname}  |  ${createdAtLabel}  |  조회 ${post.viewCount.toLocaleString()}  |  추천 ${post.likeCount.toLocaleString()}`}
          </AppText>
        </View>
      </View>

      <View
        style={[
          styles.commentRail,
          {
            backgroundColor: theme.colors.surface,
            borderLeftColor: `${theme.colors.textMuted}35`,
          },
        ]}
      >
        <AppText
          preset="body"
          style={[styles.commentCount, { color: theme.colors.danger }]}
        >
          {post.commentCount.toLocaleString()}
        </AppText>
      </View>
    </Pressable>
  );
}

const areEqual = (prev: Props, next: Props) =>
  prev.post.id === next.post.id &&
  prev.post.authorNickname === next.post.authorNickname &&
  prev.post.category === next.post.category &&
  prev.post.isNotice === next.post.isNotice &&
  prev.post.noticePublishedAt === next.post.noticePublishedAt &&
  prev.post.title === next.post.title &&
  prev.post.content === next.post.content &&
  prev.post.hasImage === next.post.hasImage &&
  prev.post.viewCount === next.post.viewCount &&
  prev.post.likeCount === next.post.likeCount &&
  prev.post.commentCount === next.post.commentCount &&
  prev.post.createdAt === next.post.createdAt &&
  prev.accentColor === next.accentColor &&
  prev.onPressPost === next.onPressPost;

export default memo(PostCardBase, areEqual);
