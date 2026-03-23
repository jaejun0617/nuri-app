import React, { memo, useCallback } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import { styles } from '../CommunityDetailScreen.styles';

type Props = {
  commentId: string;
  authorId: string;
  currentUserId: string | null;
  isLikedByMe: boolean;
  likeCount: number;
  onPressReply: (commentId: string) => void;
  onToggleLike: (commentId: string) => void;
  onPressDelete: (commentId: string) => void;
  onPressReport: (commentId: string) => void;
  rowStyle?: StyleProp<ViewStyle>;
};

function CommentActionRowBase({
  commentId,
  authorId,
  currentUserId,
  isLikedByMe,
  likeCount,
  onPressReply,
  onToggleLike,
  onPressDelete,
  onPressReport,
  rowStyle,
}: Props) {
  const theme = useTheme();

  const handlePressReply = useCallback(() => {
    onPressReply(commentId);
  }, [commentId, onPressReply]);

  const handleToggleLike = useCallback(() => {
    onToggleLike(commentId);
  }, [commentId, onToggleLike]);

  const handlePressDelete = useCallback(() => {
    onPressDelete(commentId);
  }, [commentId, onPressDelete]);

  const handlePressReport = useCallback(() => {
    onPressReport(commentId);
  }, [commentId, onPressReport]);

  return (
    <View style={[styles.commentActionRow, rowStyle]}>
      <TouchableOpacity activeOpacity={0.88} onPress={handlePressReply}>
        <AppText
          preset="caption"
          style={[styles.commentActionText, { color: theme.colors.textMuted }]}
        >
          답글쓰기
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.88} onPress={handleToggleLike}>
        <AppText
          preset="caption"
          style={[
            styles.commentActionText,
            {
              color: isLikedByMe ? theme.colors.danger : theme.colors.textMuted,
            },
          ]}
        >
          좋아요 {likeCount}
        </AppText>
      </TouchableOpacity>

      {currentUserId ? (
        authorId === currentUserId ? (
          <TouchableOpacity activeOpacity={0.88} onPress={handlePressDelete}>
            <AppText
              preset="caption"
              style={[styles.commentActionText, { color: theme.colors.danger }]}
            >
              삭제
            </AppText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity activeOpacity={0.88} onPress={handlePressReport}>
            <AppText
              preset="caption"
              style={[styles.commentActionText, { color: theme.colors.textMuted }]}
            >
              신고
            </AppText>
          </TouchableOpacity>
        )
      ) : null}
    </View>
  );
}

export default memo(CommentActionRowBase);
