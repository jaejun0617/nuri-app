import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';

import CtaButton, { CtaText } from '../../../app/ui/CtaButton';
import AppText from '../../../app/ui/AppText';
import type { CommunityComment } from '../../../types/community';
import { styles } from '../CommunityDetailScreen.styles';
import {
  getCommunityReplyMode,
  getCommunityReplyTargetMention,
} from '../utils/commentHelpers';

type Props = {
  placement: 'inline' | 'bottom';
  replyTargetId: string | null;
  replyTarget: CommunityComment | null;
  currentUserId: string | null;
  commentSubmitting: boolean;
  initialDraft: string;
  resetKey: number;
  paddingBottom: number;
  accentColor: string;
  inputRef: React.RefObject<React.ComponentRef<typeof TextInput> | null>;
  inlineComposerRef: React.RefObject<React.ComponentRef<typeof View> | null>;
  onDraftChange: (draft: string) => void;
  onSubmit: (draft: string) => void;
  onCancelReply: () => void;
  onInlinePressIn: (targetId: string, instanceId: number) => void;
  onInlineFocus: (targetId: string, instanceId: number) => void;
  onInlineComposerMounted: (targetId: string, instanceId: number) => void;
  onInlineLayoutReady: (targetId: string, instanceId: number) => void;
  onNavigateToSignIn: () => void;
};

let nextInlineComposerInstanceId = 0;

export default function CommunityCommentComposer({
  placement,
  replyTargetId,
  replyTarget,
  currentUserId,
  commentSubmitting,
  initialDraft,
  resetKey,
  paddingBottom,
  accentColor,
  inputRef,
  inlineComposerRef,
  onDraftChange,
  onSubmit,
  onCancelReply,
  onInlinePressIn,
  onInlineFocus,
  onInlineComposerMounted,
  onInlineLayoutReady,
  onNavigateToSignIn,
}: Props) {
  const theme = useTheme();
  const instanceIdRef = useRef<number | null>(null);
  if (instanceIdRef.current === null) {
    nextInlineComposerInstanceId += 1;
    instanceIdRef.current = nextInlineComposerInstanceId;
  }
  const [draft, setDraft] = useState(initialDraft);
  const firstResetKeyRef = useRef(resetKey);
  const isInline = placement === 'inline';
  const isDirectReply =
    replyTarget !== null && getCommunityReplyMode(replyTarget) === 'direct';
  const inlineBackground = replyTarget?.parentCommentId
    ? theme.colors.surface
    : theme.colors.background;
  const canSubmit =
    !!currentUserId && !commentSubmitting && draft.trim().length > 0;

  useEffect(() => {
    if (firstResetKeyRef.current === resetKey) return;
    firstResetKeyRef.current = resetKey;
    setDraft('');
  }, [resetKey]);

  useLayoutEffect(() => {
    if (!isInline || replyTargetId === null || instanceIdRef.current === null) {
      return;
    }
    onInlineComposerMounted(replyTargetId, instanceIdRef.current);
  }, [isInline, onInlineComposerMounted, replyTargetId]);

  return (
    <View
      ref={isInline ? inlineComposerRef : undefined}
      testID={isInline ? 'community-inline-composer' : 'community-root-composer'}
      onLayout={
        isInline && replyTargetId !== null
          ? () =>
              onInlineLayoutReady(
                replyTargetId,
                instanceIdRef.current ?? 0,
              )
          : undefined
      }
      style={[
        isInline
          ? styles.inlineCommentComposerWrap
          : styles.commentComposerWrap,
        {
          backgroundColor: isInline
            ? inlineBackground
            : theme.colors.background,
          borderTopColor: theme.colors.border,
          paddingHorizontal: isInline
            ? replyTarget?.parentCommentId
              ? 16
              : 0
            : 20,
          paddingBottom,
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
            {isDirectReply && replyTarget ? (
              <>
                <AppText
                  preset="caption"
                  style={[
                    styles.replyComposerMention,
                    { color: accentColor },
                  ]}
                >
                  {getCommunityReplyTargetMention(replyTarget.authorNickname)}
                </AppText>
                {'님에게 답글 남기는 중'}
              </>
            ) : (
              '답글 남기는 중'
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
        <TextInput
          testID="community-comment-input"
          accessibilityLabel={isInline ? '답글 입력' : '댓글 입력'}
          ref={inputRef}
          value={draft}
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
          onPressIn={() => {
            if (isInline && replyTargetId !== null) {
              onInlinePressIn(replyTargetId, instanceIdRef.current ?? 0);
            }
          }}
          onFocus={() => {
            if (!currentUserId) {
              onNavigateToSignIn();
              return;
            }
            if (isInline && replyTargetId !== null) {
              onInlineFocus(replyTargetId, instanceIdRef.current ?? 0);
            }
          }}
        />
        <CtaButton
          role="primary"
          loading={commentSubmitting}
          accessibilityLabel={commentSubmitting ? '댓글 전송 중' : '댓글 전송'}
          compact
          activeOpacity={0.88}
          hitSlop={4}
          style={[styles.commentSubmitButton, { paddingHorizontal: 4 }]}
          disabled={!canSubmit}
          onPress={() => onSubmit(draft)}
        >
          <CtaText preset="caption" style={{ fontSize: 12, fontWeight: '800' }}>전송</CtaText>
        </CtaButton>
      </View>
    </View>
  );
}
