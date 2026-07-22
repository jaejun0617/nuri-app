import React, { memo, useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import FastImage from 'react-native-fast-image';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import { useCommunityStore } from '../../../store/communityStore';
import { formatRelativeTimeFromNow } from '../../../utils/date';
import {
  getVisibleReplies,
  isCommentByPostAuthor,
} from '../utils/commentHelpers';
import { styles } from '../CommunityDetailScreen.styles';
import CommentActionRow from './CommentActionRow';
import ReplyCommentItem from './ReplyCommentItem';

const EMPTY_REPLY_IDS: ReadonlyArray<string> = [];
const EMPTY_COMMENT = null;

type Props = {
  commentId: string;
  repliesExpanded: boolean;
  previewCount: number;
  currentUserId: string | null;
  postAuthorId: string;
  authorAccentColor: string;
  bestBadgeColor: string;
  highlightedCommentId: string | null;
  onTargetReady: (target: React.ElementRef<typeof View> | null) => void;
  onPressReply: (commentId: string) => void;
  onToggleLike: (commentId: string) => void;
  onPressDelete: (commentId: string) => void;
  onPressReport: (commentId: string) => void;
  onExpandReplies: (commentId: string) => void;
};

function isBestCommentLikeEligible(likeCount: number, status: string, depth: number) {
  return depth === 0 && likeCount >= 5 && status === 'active';
}

function CommentThreadItemBase({
  commentId,
  repliesExpanded,
  previewCount,
  currentUserId,
  postAuthorId,
  authorAccentColor,
  bestBadgeColor,
  highlightedCommentId,
  onTargetReady,
  onPressReply,
  onToggleLike,
  onPressDelete,
  onPressReport,
  onExpandReplies,
}: Props) {
  const theme = useTheme();
  const comment = useCommunityStore(s => s.commentEntitiesById[commentId] ?? EMPTY_COMMENT);
  const replyIds = useCommunityStore(
    s => s.replyCommentIdsByParentId[commentId] ?? EMPTY_REPLY_IDS,
  );

  const createdAtLabel = useMemo(
    () => (comment ? formatRelativeTimeFromNow(comment.createdAt) : ''),
    [comment],
  );
  const avatarSource = useMemo(() => {
    if (!comment?.authorAvatarUrl) return null;
    return {
      uri: comment.authorAvatarUrl,
      priority: FastImage.priority.normal,
    };
  }, [comment?.authorAvatarUrl]);

  const { visibleReplyIds, remainingReplyCount } = useMemo(
    () => getVisibleReplies(replyIds, repliesExpanded, previewCount),
    [previewCount, repliesExpanded, replyIds],
  );

  const handleExpandReplies = useCallback(() => {
    onExpandReplies(commentId);
  }, [commentId, onExpandReplies]);

  if (!comment) return null;
  const isPostAuthor = isCommentByPostAuthor(comment.authorId, postAuthorId);
  const isHighlighted = highlightedCommentId === comment.id;

  return (
    <View
      ref={isHighlighted ? onTargetReady : undefined}
      style={[
        styles.commentThreadWrap,
        isHighlighted ? styles.targetCommentThread : null,
        {
          backgroundColor: isHighlighted
            ? `${authorAccentColor}1A`
            : isPostAuthor
            ? `${authorAccentColor}0D`
            : theme.colors.background,
          borderColor: theme.colors.border,
          borderLeftColor: isHighlighted
            ? authorAccentColor
            : theme.colors.border,
        },
      ]}
    >
      <View style={styles.commentRow}>
        {avatarSource ? (
          <FastImage
            source={avatarSource}
            style={[styles.commentAvatar, { borderColor: theme.colors.border }]}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View
            style={[
              styles.commentAvatarFallback,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Feather name="user" size={12} color={theme.colors.textMuted} />
          </View>
        )}

        <View style={styles.commentBodyWrap}>
          <View style={styles.commentMetaRow}>
            <View style={styles.commentMetaInline}>
              <AppText
                preset="caption"
                style={[styles.commentAuthorText, { color: theme.colors.textPrimary }]}
              >
                {comment.authorNickname}
              </AppText>
              {isPostAuthor ? (
                <View
                  style={[
                    styles.authorBadge,
                    { backgroundColor: authorAccentColor },
                  ]}
                >
                  <AppText
                    preset="caption"
                    style={[styles.authorBadgeText, { color: '#FFFFFF' }]}
                  >
                    글쓴이
                  </AppText>
                </View>
              ) : null}
              {isBestCommentLikeEligible(
                comment.likeCount,
                comment.status,
                comment.depth,
              ) ? (
                <View
                  style={[
                    styles.bestBadge,
                    { backgroundColor: `${bestBadgeColor}12` },
                  ]}
                >
                  <AppText
                    preset="caption"
                    style={[styles.bestBadgeText, { color: bestBadgeColor }]}
                  >
                    인기
                  </AppText>
                </View>
              ) : null}
              <AppText
                preset="caption"
                style={[styles.commentMetaText, { color: theme.colors.textMuted }]}
              >
                {createdAtLabel}
              </AppText>
            </View>
          </View>

          <View
            style={[
              styles.commentBubble,
              {
                backgroundColor: isPostAuthor
                  ? `${authorAccentColor}10`
                  : theme.colors.surface,
                borderColor: isPostAuthor
                  ? `${authorAccentColor}2E`
                  : theme.colors.border,
              },
            ]}
          >
            <AppText
              preset="body"
              style={[styles.commentContent, { color: theme.colors.textPrimary }]}
            >
              {comment.content}
            </AppText>
          </View>

          <CommentActionRow
            commentId={comment.id}
            authorId={comment.authorId}
            currentUserId={currentUserId}
            isLikedByMe={comment.isLikedByMe}
            likeCount={comment.likeCount}
            onPressReply={onPressReply}
            onToggleLike={onToggleLike}
            onPressDelete={onPressDelete}
            onPressReport={onPressReport}
          />

          {visibleReplyIds.length > 0 ? (
            <View style={styles.replyListWrap}>
              {visibleReplyIds.map(replyId => (
                <ReplyCommentItem
                  key={replyId}
                  replyId={replyId}
                  currentUserId={currentUserId}
                  postAuthorId={postAuthorId}
                  authorAccentColor={authorAccentColor}
                  highlighted={highlightedCommentId === replyId}
                  onTargetReady={onTargetReady}
                  onPressReply={onPressReply}
                  onToggleLike={onToggleLike}
                  onPressDelete={onPressDelete}
                  onPressReport={onPressReport}
                />
              ))}

              {remainingReplyCount > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.moreRepliesButton}
                  onPress={handleExpandReplies}
                >
                  <AppText
                    preset="caption"
                    style={[styles.moreRepliesText, { color: bestBadgeColor }]}
                  >
                    답글 {remainingReplyCount}개 더보기
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : comment.replyCount > 0 ? (
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.moreRepliesButton}
              onPress={handleExpandReplies}
            >
              <AppText
                preset="caption"
                style={[styles.moreRepliesText, { color: bestBadgeColor }]}
              >
                답글 {comment.replyCount}개 보기
              </AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default memo(CommentThreadItemBase);
