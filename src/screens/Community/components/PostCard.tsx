import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import type { CommunityPost } from '../../../types/community';
import {
  formatCommunityListTimestamp,
  getCommunityCategoryLabel,
  getCommunityPostAccessibilityLabel,
  getCommunityPostTitleLineCount,
  COMMUNITY_NOTICE_ICON_NAME,
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
  const noticeColor = theme.colors.brand;
  const accessibilityLabel = getCommunityPostAccessibilityLabel(
    title,
    post.commentCount,
    post.isNotice,
  );

  const handlePress = useCallback(() => {
    onPressPost(post.id);
  }, [onPressPost, post.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{
        color: post.isNotice ? `${noticeColor}18` : `${accentColor}0D`,
      }}
      style={({ pressed }) => [
        styles.row,
        post.isNotice ? styles.noticeRow : null,
        {
          backgroundColor: pressed
            ? post.isNotice
              ? `${noticeColor}18`
              : `${accentColor}08`
            : post.isNotice
            ? `${noticeColor}08`
            : theme.colors.background,
          borderColor: post.isNotice
            ? noticeColor
            : `${theme.colors.textMuted}55`,
          borderBottomColor: post.isNotice
            ? noticeColor
            : `${theme.colors.textMuted}55`,
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
                  backgroundColor: `${noticeColor}18`,
                  borderColor: `${noticeColor}66`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={COMMUNITY_NOTICE_ICON_NAME}
                size={13}
                color={noticeColor}
                accessibilityElementsHidden
              />
              <AppText
                preset="caption"
                style={[styles.noticeBadgeText, { color: noticeColor }]}
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
            numberOfLines={getCommunityPostTitleLineCount(post.isNotice)}
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
            backgroundColor: post.isNotice
              ? `${noticeColor}0D`
              : theme.colors.surface,
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
