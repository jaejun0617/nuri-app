import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FastImage from 'react-native-fast-image';

import AppText from '../../../app/ui/AppText';
import type { CommunityComment, CommunityPost } from '../../../types/community';
import { getKstDateParts } from '../../../utils/date';
import { styles } from './PostCard.styles';

type Props = {
  post: CommunityPost;
  latestComment: CommunityComment | null;
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

function trimText(value: string | null | undefined) {
  return `${value ?? ''}`.trim();
}

function buildPostTitleAndPreview(content: string) {
  const normalized = content.replace(/\r/g, '').trim();
  if (!normalized) {
    return {
      title: '내용이 없는 게시글',
      preview: '',
    };
  }

  const lines = normalized
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const firstLine = lines[0] ?? normalized;
  const titleCandidate =
    firstLine.length > 42 ? `${firstLine.slice(0, 42)}…` : firstLine;
  const previewSource =
    lines.length > 1
      ? lines.slice(1).join(' ')
      : normalized.replace(firstLine, '').trim();

  return {
    title: titleCandidate,
    preview: previewSource,
  };
}

function buildPostPreview(content: string) {
  const normalized = content.replace(/\r/g, '').trim();
  if (!normalized) return '';

  return normalized
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ');
}

function buildCommentPreviewLine(input: {
  authorNickname: string | null | undefined;
  content: string | null | undefined;
}) {
  const author = trimText(input.authorNickname) || '익명';
  const content = trimText(input.content);

  if (!content) {
    return `${author}님이 댓글을 남겼어요.`;
  }

  return `${author} · ${content}`;
}

function formatPostCreatedAt(input: string) {
  const parts = getKstDateParts(input);
  if (!parts) return '';
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}.${month}.${day}`;
}

function PostCardBase({
  post,
  latestComment,
  onPressPost,
  onPressLike,
}: Props) {
  const theme = useTheme();
  const createdAtLabel = useMemo(
    () => formatPostCreatedAt(post.createdAt),
    [post.createdAt],
  );
  const petName = post.petName?.trim() || null;
  const petBreedAge = [post.petBreed || post.petSpecies, post.petAgeLabel]
    .filter(Boolean)
    .join(' · ');
  const petMetaLine = [petName, petBreedAge].filter(Boolean).join(' · ');
  const categoryTone = getCategoryTone(post.category);
  const commentPreviewLine = useMemo(() => {
    if (!latestComment) return null;

    return buildCommentPreviewLine({
      authorNickname: latestComment.authorNickname,
      content: latestComment.content,
    });
  }, [latestComment]);
  const { title, preview } = useMemo(() => {
    const normalizedTitle = trimText(post.title);
    if (normalizedTitle) {
      return {
        title: normalizedTitle,
        preview: buildPostPreview(post.content),
      };
    }

    return buildPostTitleAndPreview(post.content);
  }, [post.content, post.title]);
  const bodyPreview = trimText(preview);
  const authorAvatarUrl =
    trimText(post.authorAvatarUrl) || trimText(post.petAvatarUrl) || null;
  const authorAvatarSource = useMemo(() => {
    if (!authorAvatarUrl) return null;
    return {
      uri: authorAvatarUrl,
      priority: FastImage.priority.normal,
    };
  }, [authorAvatarUrl]);
  const latestCommentAvatarSource = useMemo(() => {
    if (!latestComment?.authorAvatarUrl) return null;
    return {
      uri: latestComment.authorAvatarUrl,
      priority: FastImage.priority.normal,
    };
  }, [latestComment?.authorAvatarUrl]);
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
        styles.rowCard,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
      onPress={handlePress}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerMeta}>
          {authorAvatarSource ? (
            <FastImage
              source={authorAvatarSource}
              style={[styles.avatar, { borderColor: theme.colors.border }]}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Feather name="user" size={13} color={theme.colors.textSecondary} />
            </View>
          )}

          <View style={styles.headerTextBlock}>
            <View style={styles.metaTopRow}>
              <View style={styles.petMetaRow}>
                {petMetaLine ? (
                  <AppText
                    preset="caption"
                    numberOfLines={1}
                    style={[
                      styles.petNameText,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {petMetaLine}
                  </AppText>
                ) : null}
              </View>

              {post.category && categoryTone ? (
                <View
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: categoryTone.backgroundColor,
                      borderColor: categoryTone.borderColor,
                    },
                  ]}
                >
                  <AppText
                    preset="caption"
                    style={[
                      styles.categoryChipText,
                      { color: categoryTone.textColor },
                    ]}
                  >
                    {getCategoryLabel(post.category)}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bodySection}>
        <AppText
          preset="body"
          numberOfLines={2}
          style={[styles.titleText, { color: theme.colors.textPrimary }]}
        >
          {title}
        </AppText>
        {bodyPreview ? (
          <AppText
            preset="caption"
            numberOfLines={2}
            style={[styles.previewText, { color: theme.colors.textSecondary }]}
          >
            {bodyPreview}
          </AppText>
        ) : null}
      </View>

          {commentPreviewLine ? (
        <View style={styles.commentPreviewRow}>
          <View
            style={[
              styles.commentPreviewConnector,
              { borderColor: theme.colors.textMuted },
            ]}
          />
          {latestCommentAvatarSource ? (
            <FastImage
              source={latestCommentAvatarSource}
              style={[
                styles.commentPreviewAvatar,
                { borderColor: theme.colors.border },
              ]}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View
              style={[
                styles.commentPreviewAvatarFallback,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Feather name="user" size={10} color={theme.colors.textSecondary} />
            </View>
          )}
          <AppText
            preset="caption"
            numberOfLines={1}
            style={[
              styles.commentPreviewText,
              { color: theme.colors.textSecondary },
            ]}
          >
            {commentPreviewLine}
          </AppText>
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <AppText
          preset="caption"
          numberOfLines={1}
          style={[styles.authorMeta, { color: theme.colors.textSecondary }]}
        >
          {createdAtLabel
            ? `${post.authorNickname} · ${createdAtLabel}`
            : post.authorNickname}
        </AppText>
        <View style={styles.footerActionGroup}>
          <View style={styles.footerMetaItem}>
            <Feather name="eye" size={14} color={theme.colors.textSecondary} />
            <AppText
              preset="caption"
              style={[styles.footerMetaText, { color: theme.colors.textSecondary }]}
            >
              {post.viewCount}
            </AppText>
          </View>

          <View style={styles.footerMetaItem}>
            <MaterialCommunityIcons
              name="message-processing-outline"
              size={14}
              color={theme.colors.textSecondary}
            />
            <AppText
              preset="caption"
              style={[styles.footerMetaText, { color: theme.colors.textSecondary }]}
            >
              {post.commentCount}
            </AppText>
          </View>

          <Pressable
            hitSlop={8}
            style={styles.likeAction}
            onPress={event => {
              event.stopPropagation();
              handlePressLike();
            }}
          >
            <Feather
              name="heart"
              size={15}
              color={
                post.isLikedByMe ? theme.colors.danger : theme.colors.textSecondary
              }
            />
            <AppText
              preset="caption"
              style={[
                styles.likeActionText,
                {
                  color: post.isLikedByMe
                    ? theme.colors.danger
                    : theme.colors.textSecondary,
                },
              ]}
            >
              {post.likeCount}
            </AppText>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}


const areEqual = (prev: Props, next: Props) =>
  prev.post.id === next.post.id &&
  prev.latestComment?.id === next.latestComment?.id &&
  prev.latestComment?.updatedAt === next.latestComment?.updatedAt &&
  prev.latestComment?.authorAvatarUrl === next.latestComment?.authorAvatarUrl &&
  prev.latestComment?.authorNickname === next.latestComment?.authorNickname &&
  prev.latestComment?.content === next.latestComment?.content &&
  prev.post.authorNickname === next.post.authorNickname &&
  prev.post.petName === next.post.petName &&
  prev.post.petBreed === next.post.petBreed &&
  prev.post.petSpecies === next.post.petSpecies &&
  prev.post.petAgeLabel === next.post.petAgeLabel &&
  prev.post.authorAvatarUrl === next.post.authorAvatarUrl &&
  prev.post.category === next.post.category &&
  prev.post.title === next.post.title &&
  prev.post.content === next.post.content &&
  prev.post.hasImage === next.post.hasImage &&
  prev.post.viewCount === next.post.viewCount &&
  prev.post.likeCount === next.post.likeCount &&
  prev.post.isLikedByMe === next.post.isLikedByMe &&
  prev.post.commentCount === next.post.commentCount &&
  prev.post.createdAt === next.post.createdAt &&
  prev.onPressPost === next.onPressPost &&
  prev.onPressLike === next.onPressLike;

export default memo(PostCardBase, areEqual);
