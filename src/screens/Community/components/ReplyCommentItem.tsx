import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import FastImage from 'react-native-fast-image';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import { useCommunityStore } from '../../../store/communityStore';
import { formatRelativeTimeFromNow } from '../../../utils/date';
import {
  DETAIL_DIVIDER_COLOR,
  REPLY_BUBBLE_BEIGE,
  styles,
} from '../CommunityDetailScreen.styles';
import CommentActionRow from './CommentActionRow';

const EMPTY_REPLY = null;

type Props = {
  replyId: string;
  currentUserId: string | null;
  onPressReply: (commentId: string) => void;
  onToggleLike: (commentId: string) => void;
  onPressDelete: (commentId: string) => void;
  onPressReport: (commentId: string) => void;
};

function ReplyCommentItemBase({
  replyId,
  currentUserId,
  onPressReply,
  onToggleLike,
  onPressDelete,
  onPressReport,
}: Props) {
  const theme = useTheme();
  const reply = useCommunityStore(s => s.commentEntitiesById[replyId] ?? EMPTY_REPLY);

  const replyMeta = useMemo(() => {
    if (!reply) return '';
    return `${reply.authorNickname} · ${formatRelativeTimeFromNow(reply.createdAt)}`;
  }, [reply]);
  const avatarSource = useMemo(() => {
    if (!reply?.authorAvatarUrl) return null;
    return {
      uri: reply.authorAvatarUrl,
      priority: FastImage.priority.normal,
    };
  }, [reply?.authorAvatarUrl]);

  if (!reply) return null;

  return (
    <View style={styles.replyRow}>
      <View style={styles.replyLead}>
        <View
          style={[
            styles.replyLeadLine,
            { backgroundColor: DETAIL_DIVIDER_COLOR },
          ]}
        />
        <View
          style={[
            styles.replyLeadDot,
            { backgroundColor: theme.colors.background },
          ]}
        />
      </View>
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
            style={[styles.replyMetaText, { color: theme.colors.textMuted }]}
          >
            {replyMeta}
          </AppText>
        </View>
        <View style={[styles.replyBubble, { backgroundColor: REPLY_BUBBLE_BEIGE }]}>
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
