import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import { useCommunityStore } from '../../../store/communityStore';
import { formatRelativeTimeFromNow } from '../../../utils/date';
import {
  getCommunityReplyTargetMention,
  isCommentByPostAuthor,
} from '../utils/commentHelpers';
import { styles } from '../CommunityDetailScreen.styles';
import CommentActionRow from './CommentActionRow';

const EMPTY_REPLY = null;

type Props = {
  replyId: string;
  currentUserId: string | null;
  postAuthorId: string;
  authorAccentColor: string;
  highlighted: boolean;
  onTargetReady: (target: React.ElementRef<typeof View> | null) => void;
  onPressComment: (commentId: string) => void;
  onToggleLike: (commentId: string) => void;
  onPressDelete: (commentId: string) => void;
  onPressReport: (commentId: string) => void;
};

function ReplyCommentItemBase({
  replyId,
  currentUserId,
  postAuthorId,
  authorAccentColor,
  highlighted,
  onTargetReady,
  onPressComment,
  onToggleLike,
  onPressDelete,
  onPressReport,
}: Props) {
  const theme = useTheme();
  const reply = useCommunityStore(s => s.commentEntitiesById[replyId] ?? EMPTY_REPLY);

  const createdAtLabel = useMemo(
    () => (reply ? formatRelativeTimeFromNow(reply.createdAt) : ''),
    [reply],
  );
  const avatarSource = useMemo(() => {
    if (!reply?.authorAvatarUrl) return null;
    return {
      uri: reply.authorAvatarUrl,
      priority: FastImage.priority.normal,
    };
  }, [reply?.authorAvatarUrl]);
  const handlePressComment = useCallback(() => {
    onPressComment(replyId);
  }, [onPressComment, replyId]);

  if (!reply) return null;
  const isPostAuthor = isCommentByPostAuthor(reply.authorId, postAuthorId);

  return (
    <View
      ref={highlighted ? onTargetReady : undefined}
      style={[
        styles.replyRow,
        highlighted ? styles.targetReplyRow : null,
        highlighted
          ? {
              backgroundColor: `${authorAccentColor}1A`,
              borderColor: authorAccentColor,
            }
          : { backgroundColor: theme.colors.surface },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`답글 ${reply.authorNickname}에 답글 남기기`}
        hitSlop={8}
        style={styles.replyAvatarTapTarget}
        onPress={handlePressComment}
      >
        {avatarSource ? (
          <FastImage
            source={avatarSource}
            style={[styles.replyAvatar, { borderColor: theme.colors.border }]}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View
            style={[
              styles.replyAvatarFallback,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Feather name="user" size={10} color={theme.colors.textMuted} />
          </View>
        )}
      </Pressable>
      <View style={styles.replyContentWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`답글 ${reply.authorNickname} 내용에 직접 답글 남기기`}
          style={styles.replyTapContent}
          onPress={handlePressComment}
        >
          <View style={styles.replyMetaRow}>
            <AppText
              preset="caption"
              style={[styles.replyAuthorText, { color: theme.colors.textPrimary }]}
            >
              {reply.authorNickname}
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
            <AppText
              preset="caption"
              style={[styles.replyMetaText, { color: theme.colors.textMuted }]}
            >
              {createdAtLabel}
            </AppText>
          </View>
          <View
            style={[
              styles.replyBubble,
              {
                backgroundColor: 'transparent',
                borderColor: 'transparent',
              },
            ]}
          >
            <AppText
              preset="body"
              style={[styles.replyContent, { color: theme.colors.textPrimary }]}
            >
              {reply.replyTargetNickname ? (
                <AppText
                  preset="body"
                  style={[styles.replyMention, { color: authorAccentColor }]}
                >
                  {getCommunityReplyTargetMention(reply.replyTargetNickname)}{' '}
                </AppText>
              ) : null}
              {reply.content}
            </AppText>
          </View>
        </Pressable>
        <CommentActionRow
          commentId={reply.id}
          authorId={reply.authorId}
          currentUserId={currentUserId}
          isLikedByMe={reply.isLikedByMe}
          likeCount={reply.likeCount}
          onToggleLike={onToggleLike}
          onPressDelete={onPressDelete}
          onPressReport={onPressReport}
          rowStyle={styles.replyActionRow}
        />
      </View>
    </View>
  );
}

export default memo(ReplyCommentItemBase);
