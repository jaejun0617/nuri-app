import React, { useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationScope } from '../../app/providers/NotificationScopeProvider';
import { mixedInboxKey, type InboxKey } from '../../services/notifications/mixedNotifications';
import { createNotificationOpenReceipt, resolveNotificationDestination } from '../../services/notifications/openNotification';
import { InquiryMessage, inquiryDate } from '../Support/InquiryPresentation';
import { Copy } from '../Support/PreviewPrimitives';
import TicketPhotoViewer from '../SupportIsolation/TicketPhotoViewer';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { NotificationCanvas, NotificationDetailDesign, NotificationHeader, NotificationState } from './NotificationDesign';

export function replyIntersectsViewport(top: number, height: number, viewportTop: number, viewportHeight: number) {
  return height > 0 && viewportHeight > 0 && top >= viewportTop - 1 &&
    Math.min(top + height, viewportTop + viewportHeight) - top >= Math.min(height, viewportHeight * 0.7);
}

export default function ScopedNotificationDestination({ identity, scopeKey, onBack }: {
  identity: InboxKey;
  scopeKey: string;
  onBack(): void;
}) {
  const { inbox } = useNotificationScope();
  const scope = inbox?.key === scopeKey ? inbox : null;
  const { top, bottom } = useSafeAreaInsets();
  const focused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [appeared, setAppeared] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [readError, setReadError] = useState(false);
  const visibility = useRef({ active: false, seen: false, pending: false, read: false });
  const viewport = useRef<React.ComponentRef<typeof View>>(null);
  const reply = useRef<React.ComponentRef<typeof View>>(null);
  const client = useQueryClient();
  const active = Boolean(scope && focused && foreground);
  const query = useQuery({
    queryKey: ['scoped-notification-target', scopeKey, identity.source, identity.id],
    enabled: active,
    gcTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchInterval: active ? 15_000 : false,
    queryFn: async () => {
      if (!scope?.isCurrent()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
      const resolved = await scope.api.target(identity);
      if (resolved.kind === 'legacy') {
        const receipt = createNotificationOpenReceipt({ id: identity.id, source: resolved.item.source, ownerId: scope.userId });
        const destination = resolveNotificationDestination(resolved.item, receipt, null);
        // Other domain data cannot be opened through the unrelated production session.
        if (destination.name !== 'NotificationDetail' || resolved.item.actionTarget?.kind === 'unavailable')
          throw new Error('NURI_NOTIFICATION_UNAVAILABLE');
        return resolved;
      }
      const thread = await scope.client.ticketThread(resolved.target.ticketId, resolved.target.messageSeq - 1);
      if (!scope.isCurrent() || thread.id !== resolved.target.ticketId ||
        !thread.messages.some(message => message.seq === resolved.target.messageSeq && message.author === 'staff'))
        throw new Error('NURI_NOTIFICATION_UNAVAILABLE');
      return { ...resolved, thread };
    },
  });
  useEffect(() => navigation.addListener('transitionEnd', event => {
    if (!event.data.closing && navigation.isFocused()) setAppeared(true);
  }), [navigation]);
  const refetchTarget = query.refetch;
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      visibility.current.active = false;
      visibility.current.seen = false;
      setForeground(state === 'active');
      if (state === 'active' && scope && focused) refetchTarget().catch(() => {});
    });
    return () => listener.remove();
  }, [focused, refetchTarget, scope]);

  const presented = active && appeared && query.isSuccess && !query.isFetching;
  visibility.current.active = presented;
  const resolved = presented ? query.data : null;
  const acknowledge = async () => {
    const current = visibility.current;
    if (!scope?.isCurrent() || !current.active || !current.seen || current.pending || current.read || !resolved) return;
    current.pending = true;
    setReadError(false);
    try {
      if (resolved.kind === 'support') await scope.api.acknowledgeReply(identity.id);
      else await scope.api.command('read', identity);
      current.read = true;
      if (scope.isCurrent()) await client.invalidateQueries({ queryKey: mixedInboxKey(scope) });
    } catch {
      if (scope.isCurrent() && current.active) setReadError(true);
    } finally {
      current.pending = false;
    }
  };
  function measureReply() {
    if (!visibility.current.active || AppState.currentState !== 'active') return;
    viewport.current?.measureInWindow((_x, viewTop, _w, viewHeight) => {
      reply.current?.measureInWindow((_rx, replyTop, _rw, replyHeight) => {
        if (!visibility.current.active || !focused || AppState.currentState !== 'active' || !scope?.isCurrent()) return;
        visibility.current.seen = replyIntersectsViewport(replyTop, replyHeight, viewTop, viewHeight);
        if (visibility.current.seen) acknowledge().catch(() => {});
      });
    });
  }
  useEffect(() => {
    const current = visibility.current;
    return () => { current.active = false; };
  }, []);
  return (
    <NotificationCanvas top={top}>
      <NotificationHeader title={resolved?.kind === 'support' ? '1:1 문의' : '알림 상세'} onBack={onBack} />
      {!scope || query.isError ? <NotificationState message="현재 알림을 열 수 없어요" retry={scope ? () => { query.refetch().catch(() => {}); } : undefined} />
      : !resolved ? <NotificationState loading message="알림을 확인하고 있어요" />
      : resolved.kind === 'legacy' ? (
        <View style={styles.flex} onLayout={() => {
          if (!presented || AppState.currentState !== 'active') return;
          visibility.current.seen = true;
          acknowledge().catch(() => {});
        }}>
          <NotificationDetailDesign item={resolved.item} bottom={bottom} onAction={onBack} readError={readError} onRetryRead={acknowledge} />
        </View>
      ) : (
        <View style={styles.flex} ref={viewport} collapsable={false} onLayout={measureReply}>
          <ScrollView contentContainerStyle={[styles.thread, { paddingBottom: bottom + 20 }]} onScroll={measureReply}
            scrollEventThrottle={32} onContentSizeChange={measureReply}>
            <Copy title>{resolved.thread.title || '문의 답변'}</Copy>
            {resolved.thread.messages.map(message => {
              const target = message.seq === resolved.target.messageSeq;
              return (
                <View key={message.id} ref={target ? reply : undefined} collapsable={false} onLayout={target ? measureReply : undefined}>
                  <InquiryMessage outgoing={message.author === 'user'} name={message.author === 'user' ? '내 문의' : '누리팀 답변'}
                    date={inquiryDate(message.createdAt)} showAvatar={message.author === 'staff'}>
                    <Copy>{message.body}</Copy>
                    {message.photos.map(photo => <TicketPhotoViewer key={photo.id} photo={photo} client={scope.client}
                      onDenied={() => { query.refetch().catch(() => {}); }} />)}
                  </InquiryMessage>
                </View>
              );
            })}
            {readError ? <CtaButton role="neutral" onPress={measureReply}><CtaText>읽음 다시 확인</CtaText></CtaButton> : null}
          </ScrollView>
        </View>
      )}
    </NotificationCanvas>
  );
}
const styles = StyleSheet.create({ flex: { flex: 1 }, thread: { paddingHorizontal: 20, gap: 16 } });
