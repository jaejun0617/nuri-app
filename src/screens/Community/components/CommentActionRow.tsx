import { resolveCtaPalette } from '../../../app/theme/ctaPalette';
import { useEffectiveSeason } from '../../../app/providers/SeasonPreferenceProvider';
import React, { memo, useCallback } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import NuriSemanticIcon from '../../../components/icons/NuriSemanticIcon';
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
  const { fontScale } = useWindowDimensions();
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
        accessibilityRole="button"
        accessibilityLabel="답글쓰기"
        activeOpacity={0.88}
        style={styles.commentActionTouchTarget}
        onPress={() => onPressReply(commentId)}
      >
        <AppText
          preset="caption"
          style={[
            styles.commentActionText,
            { color: theme.colors.textSecondary },
          ]}
        >
          답글쓰기
        </AppText>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`댓글 좋아요 ${likeCount}개`}
        accessibilityState={{ selected: isLikedByMe }}
        activeOpacity={0.88}
        style={[styles.commentActionTouchTarget, styles.commentLikeGroup]}
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
          좋아요
        </AppText>
        <NuriSemanticIcon
          family="material"
          preserveOriginal
          name={isLikedByMe ? 'heart' : 'heart-outline'}
          size={styles.commentActionText.fontSize * Math.min(fontScale, 2)}
          color={isLikedByMe ? theme.colors.danger : theme.colors.textSecondary}
          accessible={false}
          accessibilityElementsHidden
        />
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
          {likeCount}
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
                backgroundColor: 'transparent',
              },
            ]}
          >
            <AppText
              preset="caption"
              style={[styles.commentActionText, { color: actionPalette.text }]}
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
