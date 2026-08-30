import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
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
  activeReplyTargetId: string | null;
  inlineComposer: React.ReactNode;
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
  activeReplyTargetId,
  inlineComposer,
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
  const reply = useCommunityStore(
    s => s.commentEntitiesById[replyId] ?? EMPTY_REPLY,
  );

  const createdAtLabel = useMemo(
    () => (reply ? formatRelativeTimeFromNow(reply.createdAt) : ''),
    [reply],
  );
  const handlePressComment = useCallback(() => {
    onPressComment(replyId);
  }, [onPressComment, replyId]);

  if (!reply) return null;
  const isPostAuthor = isCommentByPostAuthor(reply.authorId, postAuthorId);

  return (
    <React.Fragment>
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
          style={({ pressed }) => [
            styles.replyMarkerTapTarget,
            pressed ? styles.commentTapPressed : null,
          ]}
          onPress={handlePressComment}
        >
          <Feather
            name="corner-down-right"
            size={16}
            color={theme.colors.textSecondary}
          />
        </Pressable>
        <View style={styles.replyContentWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`답글 ${reply.authorNickname} 내용에 직접 답글 남기기`}
            style={({ pressed }) => [
              styles.replyTapContent,
              pressed ? styles.commentTapPressed : null,
            ]}
            onPress={handlePressComment}
          >
            <View style={styles.replyMetaRow}>
              <AppText
                preset="caption"
                style={[
                  styles.replyAuthorText,
                  { color: theme.colors.textPrimary },
                ]}
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
                style={[
                  styles.replyMetaText,
                  { color: theme.colors.textMuted },
                ]}
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
                style={[
                  styles.replyContent,
                  { color: theme.colors.textPrimary },
                ]}
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
      {activeReplyTargetId === reply.id ? inlineComposer : null}
    </React.Fragment>
  );
}

export default memo(ReplyCommentItemBase);
