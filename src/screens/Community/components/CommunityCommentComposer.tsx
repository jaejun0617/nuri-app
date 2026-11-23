import React, { useEffect, useRef, useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import CtaButton, { CtaIcon } from '../../../app/ui/CtaButton';
import AppText from '../../../app/ui/AppText';
import AppTextInput from '../../../app/ui/AppTextInput';
import type { CommunityComment } from '../../../types/community';
import { styles } from '../CommunityDetailScreen.styles';
import {
  getCommunityReplyTargetMention,
} from '../utils/commentHelpers';

type Props = {
  replyTargetId: string | null;
  replyTarget: CommunityComment | null;
  currentUserId: string | null;
  commentSubmitting: boolean;
  initialDraft: string;
  initialSelection?: { start: number; end: number };
  onSelectionChange?: (selection: { start: number; end: number }) => void;
  resetKey: number;
  accentColor: string;
  inputRef: React.RefObject<React.ComponentRef<typeof TextInput> | null>;
  onDraftChange: (draft: string) => void;
  onSubmit: (draft: string) => void;
  onCancelReply: () => void;
  onNavigateToSignIn: () => void;
};

export default function CommunityCommentComposer({
  replyTargetId,
  replyTarget,
  currentUserId,
  commentSubmitting,
  initialDraft,
  initialSelection,
  onSelectionChange,
  resetKey,
  accentColor,
  inputRef,
  onDraftChange,
  onSubmit,
  onCancelReply,
  onNavigateToSignIn,
}: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState(initialDraft);
  const [restoredSelection, setRestoredSelection] = useState(initialSelection);
  const firstResetKeyRef = useRef(resetKey);
  const isReply = replyTargetId !== null;
  const canSubmit =
    !!currentUserId &&
    !commentSubmitting &&
    (!isReply || replyTarget?.status === 'active');

  useEffect(() => {
    if (firstResetKeyRef.current === resetKey) return;
    firstResetKeyRef.current = resetKey;
    setDraft('');
  }, [resetKey]);

  return (
    <View
      testID="community-root-composer"
      style={[
        styles.commentComposerWrap,
        {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      {replyTargetId !== null ? (
        <View
          style={[
            styles.replyComposerBanner,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <AppText
            preset="caption"
            style={[
              styles.replyComposerText,
              { color: theme.colors.textPrimary },
            ]}
          >
            {replyTarget?.status === 'active' ? (
              <>
                <AppText
                  preset="caption"
                  style={[styles.replyComposerMention, { color: accentColor }]}
                >
                  {getCommunityReplyTargetMention(replyTarget.authorNickname)}
                </AppText>
                {replyTarget.parentCommentId ? '님에게 답글' : '님 댓글에 답글'}
              </>
            ) : (
              '답글 대상을 확인할 수 없어요'
            )}
          </AppText>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="답글 작성 취소"
            style={styles.replyCancelTouchTarget}
            activeOpacity={0.88}
            onPress={onCancelReply}
          >
            <AppText
              preset="caption"
              style={[
                styles.replyComposerCancel,
                { color: theme.colors.textMuted },
              ]}
            >
              취소
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}
      <View
        style={[
          styles.commentComposer,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <AppTextInput
          testID="community-comment-input"
          accessibilityLabel={isReply ? '답글 입력' : '댓글 입력'}
          ref={inputRef}
          value={draft}
          selection={restoredSelection}
          onSelectionChange={event => {
            setRestoredSelection(undefined);
            onSelectionChange?.(event.nativeEvent.selection);
          }}
          onChangeText={value => {
            setDraft(value);
            onDraftChange(value);
          }}
          placeholder={
            currentUserId
              ? replyTargetId !== null
                ? '답글을 입력해 주세요'
                : '댓글을 입력해 주세요'
              : '로그인 후 댓글을 남길 수 있어요'
          }
          placeholderTextColor={theme.colors.textMuted}
          editable={!!currentUserId && !commentSubmitting}
          style={[styles.commentInput, { color: theme.colors.textPrimary }]}
          multiline
          maxLength={500}
          onFocus={() => {
            if (!currentUserId) onNavigateToSignIn();
          }}
        />
        <View style={styles.commentSubmitSlot}>
          {draft.trim().length > 0 && currentUserId ? (
            <CtaButton
              testID="community-comment-send"
              role="primary"
              variant="solidLavender"
              solidFaceInset={4}
              loading={commentSubmitting}
              accessibilityLabel={
                commentSubmitting
                  ? isReply ? '답글 전송 중' : '댓글 전송 중'
                  : isReply ? '답글 전송' : '댓글 전송'
              }
              compact
              style={styles.commentSubmitButton}
              disabled={!canSubmit}
              onPress={() => onSubmit(draft)}
            >
              <CtaIcon
                name="arrow-up"
                size={20}
                accessible={false}
                accessibilityElementsHidden
              />
            </CtaButton>
          ) : null}
        </View>
      </View>
    </View>
  );
}
