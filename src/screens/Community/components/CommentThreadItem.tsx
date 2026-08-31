import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import FastImage from 'react-native-fast-image';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import { useCommunityStore } from '../../../store/communityStore';
import { formatRelativeTimeFromNow } from '../../../utils/date';
import {
  getCommunityReplyTargetMention,
  getCommunityReplySectionHeaderLabel,
  getVisibleReplies,
  isCommentByPostAuthor,
  shouldShowReplyDivider,
} from '../utils/commentHelpers';
import {
  COMMENT_ROOT_DIVIDER_COLOR,
  styles,
} from '../CommunityDetailScreen.styles';
import CommentActionRow from './CommentActionRow';
import ReplyCommentItem from './ReplyCommentItem';

const EMPTY_REPLY_IDS: ReadonlyArray<string> = [];
const EMPTY_COMMENT = null;

type Props = {
  commentId: string;
  repliesExpanded: boolean;
  activeReplyTargetId: string | null;
  inlineComposer: React.ReactNode;
  currentUserId: string | null;
  postAuthorId: string;
  authorAccentColor: string;
  bestBadgeColor: string;
  highlightedCommentId: string | null;
  onTargetReady: (target: React.ComponentRef<typeof View> | null) => void;
  onPressComment: (commentId: string) => void;
  onToggleLike: (commentId: string) => void;
  onPressDelete: (commentId: string) => void;
  onPressReport: (commentId: string) => void;
  onToggleReplies: (commentId: string) => void;
};

function isBestCommentLikeEligible(
  likeCount: number,
  status: string,
  depth: number,
) {
  return depth === 0 && likeCount >= 5 && status === 'active';
}

function CommentThreadItemBase({
  commentId,
  repliesExpanded,
  activeReplyTargetId,
  inlineComposer,
  currentUserId,
  postAuthorId,
  authorAccentColor,
  bestBadgeColor,
  highlightedCommentId,
  onTargetReady,
  onPressComment,
  onToggleLike,
  onPressDelete,
  onPressReport,
  onToggleReplies,
}: Props) {
  const theme = useTheme();
  const comment = useCommunityStore(
    s => s.commentEntitiesById[commentId] ?? EMPTY_COMMENT,
  );
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

  const visibleReplyIds = useMemo(
    () => getVisibleReplies(replyIds, repliesExpanded),
    [repliesExpanded, replyIds],
  );
  const handleToggleReplies = useCallback(() => {
    onToggleReplies(commentId);
  }, [commentId, onToggleReplies]);
  const handlePressComment = useCallback(() => {
    onPressComment(commentId);
  }, [commentId, onPressComment]);

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
            : 'transparent',
          borderLeftColor: isHighlighted
            ? authorAccentColor
            : theme.colors.border,
          borderBottomColor: COMMENT_ROOT_DIVIDER_COLOR,
        },
      ]}
    >
      <View style={styles.commentRootContent}>
        <View style={styles.commentRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`댓글 ${comment.authorNickname}에 답글 남기기`}
            hitSlop={8}
            style={({ pressed }) => [
              styles.commentAvatarTapTarget,
              pressed ? styles.commentTapPressed : null,
            ]}
            onPress={handlePressComment}
          >
            {avatarSource ? (
              <FastImage
                source={avatarSource}
                style={[
                  styles.commentAvatar,
                  { borderColor: theme.colors.border },
                ]}
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
          </Pressable>

          <View style={styles.commentBodyWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`댓글 ${comment.authorNickname} 내용에 답글 남기기`}
              style={({ pressed }) => [
                styles.commentTapContent,
                pressed ? styles.commentTapPressed : null,
              ]}
              onPress={handlePressComment}
            >
              <View style={styles.commentMetaRow}>
                <View style={styles.commentMetaInline}>
                  <AppText
                    preset="caption"
                    style={[
                      styles.commentAuthorText,
                      { color: theme.colors.textPrimary },
                    ]}
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
                        style={[
                          styles.bestBadgeText,
                          { color: bestBadgeColor },
                        ]}
                      >
                        인기
                      </AppText>
                    </View>
                  ) : null}
                  <AppText
                    preset="caption"
                    style={[
                      styles.commentMetaText,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {createdAtLabel}
                  </AppText>
                </View>
              </View>

              <View
                style={[
                  styles.commentBubble,
                  {
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                  },
                ]}
              >
                <AppText
                  preset="body"
                  style={[
                    styles.commentContent,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {comment.replyTargetNickname ? (
                    <AppText
                      preset="body"
                      style={[
                        styles.commentMention,
                        { color: authorAccentColor },
                      ]}
                    >
                      {getCommunityReplyTargetMention(
                        comment.replyTargetNickname,
                      )}{' '}
                    </AppText>
                  ) : null}
                  {comment.content}
                </AppText>
              </View>
            </Pressable>

            <CommentActionRow
              commentId={comment.id}
              authorId={comment.authorId}
              currentUserId={currentUserId}
              isLikedByMe={comment.isLikedByMe}
              likeCount={comment.likeCount}
              onToggleLike={onToggleLike}
              onPressDelete={onPressDelete}
              onPressReport={onPressReport}
            />
          </View>
        </View>
        {activeReplyTargetId === comment.id ? inlineComposer : null}
      </View>

      {replyIds.length > 0 ? (
        <View style={styles.replyListWrap}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`답글 ${replyIds.length}, ${
              repliesExpanded ? '접기' : '펼치기'
            }`}
            activeOpacity={0.88}
            hitSlop={4}
            style={styles.replySectionHeader}
            onPress={handleToggleReplies}
          >
            <AppText
              preset="caption"
              style={[
                styles.replySectionHeaderText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {getCommunityReplySectionHeaderLabel(replyIds.length)}
            </AppText>
            <Feather
              name={repliesExpanded ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          {repliesExpanded
            ? visibleReplyIds.map((replyId, replyIndex) => (
                <React.Fragment key={replyId}>
                  <ReplyCommentItem
                    replyId={replyId}
                    activeReplyTargetId={activeReplyTargetId}
                    inlineComposer={inlineComposer}
                    currentUserId={currentUserId}
                    postAuthorId={postAuthorId}
                    authorAccentColor={authorAccentColor}
                    highlighted={highlightedCommentId === replyId}
                    onTargetReady={onTargetReady}
                    onPressComment={onPressComment}
                    onToggleLike={onToggleLike}
                    onPressDelete={onPressDelete}
                    onPressReport={onPressReport}
                  />
                  {shouldShowReplyDivider(
                    replyIndex,
                    visibleReplyIds.length,
                  ) ? (
                    <View style={styles.replyDivider} />
                  ) : null}
                </React.Fragment>
              ))
            : null}
        </View>
      ) : null}
    </View>
  );
}

export default memo(CommentThreadItemBase);
