import CtaButton, { CtaText } from '../../../app/ui/CtaButton';
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
  onToggleLike,
  onPressDelete,
  onPressReport,
  rowStyle,
}: Props) {
  const theme = useTheme();

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
      <TouchableOpacity
        activeOpacity={0.88}
        hitSlop={8}
        onPress={handleToggleLike}
      >
        <AppText
          preset="caption"
          style={[
            styles.commentActionText,
            {
              color: isLikedByMe
                ? theme.colors.danger
                : theme.colors.textSecondary,
            },
          ]}
        >
          좋아요 {likeCount}
        </AppText>
      </TouchableOpacity>

      {currentUserId ? (
        authorId === currentUserId ? (
          <CtaButton
            role="destructiveEntry"
            activeOpacity={0.88}
            hitSlop={8}
            onPress={handlePressDelete}
          >
            <CtaText preset="caption" style={[styles.commentActionText, {}]}>
              삭제
            </CtaText>
          </CtaButton>
        ) : (
          <CtaButton
            role="secondary"
            activeOpacity={0.88}
            hitSlop={8}
            onPress={handlePressReport}
          >
            <CtaText preset="caption" style={[styles.commentActionText, {}]}>
              신고
            </CtaText>
          </CtaButton>
        )
      ) : null}
    </View>
  );
}

export default memo(CommentActionRowBase);
