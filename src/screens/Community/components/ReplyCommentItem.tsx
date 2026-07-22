import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import FastImage from 'react-native-fast-image';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import { useCommunityStore } from '../../../store/communityStore';
import { formatRelativeTimeFromNow } from '../../../utils/date';
import { isCommentByPostAuthor } from '../utils/commentHelpers';
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
  onPressReply: (commentId: string) => void;
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
  onPressReply,
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
          : null,
      ]}
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
      <View style={styles.replyContentWrap}>
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
            style={[styles.replyContent, { color: theme.colors.textPrimary }]}
          >
            {reply.content}
          </AppText>
        </View>
        <CommentActionRow
          commentId={reply.id}
          authorId={reply.authorId}
          currentUserId={currentUserId}
          isLikedByMe={reply.isLikedByMe}
          likeCount={reply.likeCount}
          onPressReply={onPressReply}
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
