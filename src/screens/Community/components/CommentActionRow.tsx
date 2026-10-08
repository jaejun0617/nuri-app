import { resolveCtaPalette } from '../../../app/theme/ctaPalette';
import { useEffectiveSeason } from '../../../app/providers/SeasonPreferenceProvider';
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
  const season = useEffectiveSeason();
  const actionPalette = resolveCtaPalette({
    role: authorId === currentUserId ? 'destructiveEntry' : 'secondary',
    season,
    colorScheme: theme.mode,
    colors: theme.colors,
  });

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
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            authorId === currentUserId ? '댓글 삭제' : '댓글 신고'
          }
          activeOpacity={0.88}
          style={styles.commentActionTouchTarget}
          onPress={
            authorId === currentUserId ? handlePressDelete : handlePressReport
          }
        >
          <View
            style={[
              styles.commentActionFace,
              {
                backgroundColor: actionPalette.background,
                borderColor: actionPalette.border,
              },
            ]}
          >
            <AppText
              preset="caption"
              style={[
                styles.commentActionText,
                { color: actionPalette.text, fontSize: 12, lineHeight: 18 },
              ]}
            >
              {authorId === currentUserId ? '삭제' : '신고'}
            </AppText>
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default memo(CommentActionRowBase);
