import React, { memo, useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import FastImage from 'react-native-fast-image';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import { useCommunityStore } from '../../../store/communityStore';
import { formatRelativeTimeFromNow } from '../../../utils/date';
import { getVisibleReplies } from '../utils/commentHelpers';
import {
  COMMENT_BUBBLE_BEIGE,
  styles,
} from '../CommunityDetailScreen.styles';
import CommentActionRow from './CommentActionRow';
import ReplyCommentItem from './ReplyCommentItem';

const EMPTY_REPLY_IDS: ReadonlyArray<string> = [];
const EMPTY_COMMENT = null;

type Props = {
  commentId: string;
  repliesExpanded: boolean;
  previewCount: number;
  currentUserId: string | null;
  bestBadgeColor: string;
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
  bestBadgeColor,
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

  const metaText = useMemo(() => {
    if (!comment) return '';
    return `${comment.authorNickname} · ${formatRelativeTimeFromNow(comment.createdAt)}`;
  }, [comment]);
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

  return (
    <View style={styles.commentThreadWrap}>
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
                style={[styles.commentMetaText, { color: theme.colors.textMuted }]}
              >
                {metaText}
              </AppText>
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
                    Best
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>

          <View style={[styles.commentBubble, { backgroundColor: COMMENT_BUBBLE_BEIGE }]}>
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
