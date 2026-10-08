import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import MaterialCommunityIcons from '../../../components/icons/NuriMaterialIcon';

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
import { getCommunityCategoryPalette } from '../communityCategoryPalette';
import { useAuthStore } from '../../../store/authStore';
import {
  communityPostReadKey,
  useCommunityReadStore,
} from '../../../store/communityReadStore';

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

function PostCardBase({ post, accentColor, onPressPost }: Props) {
  const theme = useTheme();
  const viewerId = useAuthStore(s => s.session?.user?.id ?? null);
  const readKey = communityPostReadKey(viewerId, post.id);
  const hasRead = useCommunityReadStore(s => s.readKeys[readKey] === true);
  useEffect(() => {
    useCommunityReadStore.getState().hydratePost(viewerId, post.id);
  }, [post.id, viewerId]);
  const title = useMemo(() => resolvePostTitle(post), [post]);
  const categoryLabel = getCommunityCategoryLabel(post.category);
  const categoryPalette = getCommunityCategoryPalette(post.category);
  const createdAtLabel = useMemo(
    () => formatCommunityListTimestamp(post.createdAt),
    [post.createdAt],
  );
  const noticeColor = accentColor;
  const accessibilityLabel = getCommunityPostAccessibilityLabel(
    title,
    post.commentCount,
    post.isNotice,
    post.hasImage,
  );

  const handlePress = useCallback(() => {
    onPressPost(post.id);
  }, [onPressPost, post.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        hasRead ? `읽은 게시글, ${accessibilityLabel}` : accessibilityLabel
      }
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
            : '#FFFFFF',
          borderColor: post.isNotice ? noticeColor : '#E6E8F0',
          borderBottomColor: post.isNotice ? noticeColor : '#E6E8F0',
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
          ) : (
            <View
              testID="community-post-category-badge"
              style={[
                styles.categoryBadge,
                { backgroundColor: categoryPalette.subtle },
              ]}
            >
              <AppText
                preset="caption"
                style={[
                  styles.categoryBadgeText,
                  { color: categoryPalette.text },
                ]}
              >
                {categoryLabel}
              </AppText>
            </View>
          )}
          {post.hasImage ? (
            <View
              testID="community-post-image-indicator"
              style={styles.imageTypeIcon}
            >
              <MaterialCommunityIcons
                name="image-outline"
                size={15}
                color="#566271"
                accessibilityElementsHidden
              />
            </View>
          ) : null}
          <AppText
            testID="community-post-title"
            preset="body"
            numberOfLines={getCommunityPostTitleLineCount(post.isNotice)}
            style={[
              styles.title,
              hasRead ? { color: theme.colors.communityReadTitle } : null,
            ]}
          >
            {title}
          </AppText>
        </View>

        <View style={styles.metaRow}>
          <AppText preset="caption" numberOfLines={1} style={styles.metaText}>
            {`${
              post.authorNickname
            }  |  ${createdAtLabel}  |  조회 ${post.viewCount.toLocaleString()}  |  추천 ${post.likeCount.toLocaleString()}`}
          </AppText>
        </View>
      </View>

      <View
        style={[
          styles.commentRail,
          {
            backgroundColor: post.isNotice ? `${noticeColor}0D` : '#F8F9FB',
            borderLeftColor: '#E6E8F0',
          },
        ]}
      >
        <AppText
          preset="body"
          style={[styles.commentCount, { color: accentColor }]}
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
