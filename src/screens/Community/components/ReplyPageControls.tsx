import React from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import { useStore } from 'zustand';
import { useTheme } from 'styled-components/native';
import AppText from '../../../app/ui/AppText';
import type { DiscussionSession } from '../discussionSession';
import { styles } from '../CommunityDetailScreen.styles';

export default function ReplyPageControls({
  session,
  rootId,
  edge,
}: {
  session: DiscussionSession;
  rootId: string;
  edge: 'before' | 'after';
}) {
  const theme = useTheme();
  const page = useStore(session.store, state => state.replyPages[rootId]);
  const status = useStore(session.store, state => state.replyStatus[rootId]);
  const cursor = edge === 'before' ? page?.previous : page?.next;
  if (edge === 'after' && status === 'loading')
    return <ActivityIndicator color={theme.colors.textSecondary} />;
  if (!cursor && !(edge === 'after' && status === 'error')) return null;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.readRetry}
      disabled={status === 'loading'}
      onPress={() => {
        if (status === 'error') session.retryReplies(rootId);
        else session.replies(rootId, cursor ?? null);
      }}
    >
      <AppText style={{ color: theme.colors.textSecondary }}>
        {status === 'error'
          ? '답글 다시 불러오기'
          : edge === 'before'
          ? '이전 답글 보기'
          : '답글 더 보기'}
      </AppText>
    </TouchableOpacity>
  );
}
