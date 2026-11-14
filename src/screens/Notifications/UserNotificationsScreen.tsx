import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, StyleSheet, TouchableOpacity, View } from 'react-native';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useOwnerOperation } from '../../hooks/useOwnerOperation';
import {
  useFocusEffect,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../app/ui/AppText';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import SupportDesignReview from '../Support/SupportDesignReview';
import MixedInboxLogin from '../SupportIsolation/MixedInboxLogin';
import { useNotificationScope } from '../../app/providers/NotificationScopeProvider';
import { useAuthStore } from '../../store/authStore';
import { useNotificationInbox } from '../../hooks/useNotificationInbox';
import { useOpenNotification } from '../../hooks/useOpenNotification';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import NotificationFeed from './NotificationFeed';
import type { InboxItem } from '../../services/notifications/mixedNotifications';
import { openMoreDrawer, showToast } from '../../store/uiStore';
import {
  EmptyNotificationInbox,
  NotificationCanvas,
  NotificationHeader,
  NotificationState,
  notificationColors,
} from './NotificationDesign';

export default function UserNotificationsScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, 'UserNotifications'>
    >();
  const route = useRoute<RootScreenRoute<'UserNotifications'>>();
  const insets = useSafeAreaInsets();
  const { list, unread, markAll, dismiss, userId } = useNotificationInbox();
  const { inbox, select } = useNotificationScope();
  const ownerSession = useAuthStore(state => state.session);
  const [showSupportAlerts, setShowSupportAlerts] = useState(false);
  const [showMixedLogin, setShowMixedLogin] = useState(false);
  const captureOwner = useOwnerOperation('notification-inbox-delete');
  const { open: openNotification, opening } = useOpenNotification();
  const [now, setNow] = useState(() => new Date());
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const busy = useRef(false);
  const [pendingDelete, setPendingDelete] = useState<{
    item: InboxItem | null;
    isCurrent: () => boolean;
  } | null>(null);
  useEffect(() => {
    setPendingDelete(null);
  }, [userId]);
  const remove = async () => {
    const operation = pendingDelete;
    if (!operation || busy.current || !operation.isCurrent()) return;
    busy.current = true;
    setDeleting(true);
    try {
      await dismiss(operation.item);
      if (operation.isCurrent()) setPendingDelete(null);
    } catch {
      if (operation.isCurrent()) {
        if (!operation.item) setPendingDelete(null);
        showToast({
          tone: 'error',
          title: operation.item
            ? '알림을 삭제하지 못했어요'
            : '전체 삭제 결과를 확인할 수 없어요',
          message: operation.item
            ? '연결 상태를 확인하고 다시 시도해주세요.'
            : '알림함을 새로고침해 남은 알림을 확인해주세요.',
        });
      }
    } finally {
      busy.current = false;
      setDeleting(false);
    }
  };
  const confirmRemove = (item: InboxItem | null) => {
    if (busy.current || opening || pendingDelete) return;
    setPendingDelete({ item, isCurrent: inbox?.isCurrent ?? captureOwner() });
  };
  const refetchList = list.refetch;
  const refetchUnread = unread.refetch;
  const refresh = useCallback(() => {
    refetchList().catch(() => {});
    refetchUnread().catch(() => {});
    setNow(new Date());
  }, [refetchList, refetchUnread]);
  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(() => {
        if (AppState.currentState === 'active') refresh();
      }, 60_000);
      const listener = AppState.addEventListener('change', state => {
        if (state === 'active') refresh();
      });
      return () => {
        clearInterval(timer);
        listener.remove();
      };
    }, [refresh]),
  );
  const items = useMemo(
    () => list.data?.pages.flatMap(page => page.items) ?? [],
    [list.data],
  );
  const timeZone = list.data?.pages[0]?.timeZone ?? 'Asia/Seoul';
  const count = unread.data ?? list.data?.pages[0]?.unreadCount;
  const empty = list.isSuccess && items.length === 0;
  const onBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: navigation.goBack,
    onMore: () => {
      navigation.goBack();
      requestAnimationFrame(() => openMoreDrawer());
    },
    onFallback: () =>
      navigation.canGoBack()
        ? navigation.goBack()
        : navigation.navigate('AppTabs', { screen: 'HomeTab' }),
  });
  const onMarkAll = async () => {
    if (busy.current || pendingDelete || opening) return;
    busy.current = true;
    setMarking(true);
    try {
      await markAll();
    } catch {
      if (!inbox || inbox.isCurrent()) showToast({
        tone: 'error',
        title: '읽음 상태를 저장하지 못했어요',
        message: '잠시 후 다시 시도해주세요.',
      });
    } finally {
      busy.current = false;
      setMarking(false);
    }
  };
  return (
    <NotificationCanvas top={insets.top}>
      <NotificationHeader
        title="알림함"
        onBack={onBack}
        empty={empty && count !== undefined}
        count={count}
      />
      {__DEV__ && !inbox ? (
        <CtaButton
          role="neutral"
          testID="support-alerts-isolated-entry"
          onPress={() => setShowSupportAlerts(true)}
        >
          <CtaText>격리 문의 알림</CtaText>
        </CtaButton>
      ) : null}
      {__DEV__ && !inbox && showSupportAlerts ? (
        <SupportDesignReview
          initialPage="isolatedReplyAlerts"
          ownerSession={ownerSession}
          ownerRole={null}
          onDismiss={() => setShowSupportAlerts(false)}
        />
      ) : null}
      {__DEV__ ? (
        <CtaButton role="neutral" testID="mixed-inbox-connection"
          onPress={() => inbox ? select(null) : setShowMixedLogin(true)}>
          <CtaText>{inbox ? '격리 알림 연결 해제' : '격리 공용 알림 연결'}</CtaText>
        </CtaButton>
      ) : null}
      {__DEV__ && showMixedLogin ? <MixedInboxLogin onClose={() => setShowMixedLogin(false)} /> : null}
      {!empty ? (
        <View style={styles.summary}>
          <AppText preset="bodyStrong" style={styles.summaryText}>
            읽지 않은 알림{' '}
            <AppText preset="bodyStrong" style={styles.count}>
              {count === undefined ? '확인 중' : `${count}개`}
            </AppText>
          </AppText>
          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={marking || deleting || !count}
              onPress={() => {
                onMarkAll();
              }}
              style={styles.markAll}
            >
              <AppText preset="bodyStrong" color={notificationColors.purple}>
                {marking ? '저장 중' : '모두 읽음'}
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              testID="notifications-delete-all"
              accessibilityRole="button"
              accessibilityLabel="알림 전체 삭제"
              disabled={marking || deleting || opening || items.length === 0}
              onPress={() => confirmRemove(null)}
              style={styles.markAll}
            >
              <AppText preset="bodyStrong" color={notificationColors.muted}>
                전체 삭제
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {list.isPending ? (
        <NotificationState loading message="알림을 불러오는 중이에요" />
      ) : list.isError && items.length === 0 ? (
        <NotificationState message="알림을 불러오지 못했어요" retry={refresh} />
      ) : empty ? (
        <View style={styles.empty}>
          <EmptyNotificationInbox />
          <AppText
            preset="caption"
            style={[styles.retention, { paddingBottom: insets.bottom + 20 }]}
          >
            알림은 도착한 날부터 30일 후 자동 삭제돼요.
          </AppText>
        </View>
      ) : (
        <NotificationFeed
          items={items}
          now={now}
          timeZone={timeZone}
          bottom={insets.bottom + 32}
          pending={list.isPending}
          error={list.isError}
          loadingMore={list.isFetchingNextPage}
          moreError={list.isFetchNextPageError}
          onDelete={confirmRemove}
          disabled={deleting || marking || opening}
          onOpen={notification => {
            if (__DEV__ && inbox?.isCurrent()) {
              navigation.dispatch(StackActions.push('ScopedNotificationDestination', {
                identity: { id: notification.id, source: notification.source },
                scopeKey: inbox.key,
              }));
              return;
            }
            if (notification.source === 'support_reply') return;
            openNotification({
              id: notification.id,
              source: notification.source,
            }).catch(() => {});
          }}
          refreshing={list.isRefetching && !list.isFetchingNextPage}
          onRefresh={refresh}
          onMore={() => {
            if (list.hasNextPage && !list.isFetchingNextPage)
              list.fetchNextPage().catch(() => {});
          }}
          footer={
            <View>
              <AppText preset="caption" style={styles.retention}>
                알림은 도착한 날부터 30일 후 자동 삭제돼요.
              </AppText>
            </View>
          }
        />
      )}
      <ConfirmDialog
        visible={pendingDelete !== null}
        title={
          pendingDelete?.item
            ? '이 알림을 삭제할까요?'
            : '알림을 모두 삭제할까요?'
        }
        message="알림함에서 삭제되며 되돌릴 수 없어요."
        confirmLabel="삭제하기"
        cancelLabel="취소"
        tone="danger"
        surfaceVariant="menuGlass"
        typographyMode="unified"
        confirmRole="destructiveConfirm"
        cancelRole="neutral"
        confirmDisabled={deleting}
        confirmLoading={deleting}
        onConfirm={() => {
          remove();
        }}
        onCancel={() => {
          if (!busy.current) setPendingDelete(null);
        }}
      />
    </NotificationCanvas>
  );
}
const styles = StyleSheet.create({
  summary: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 23,
    color: notificationColors.muted,
    flex: 1,
  },
  count: { color: '#7047BD' },
  empty: { flex: 1 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexShrink: 0,
    columnGap: 14,
  },
  retention: {
    textAlign: 'center',
    color: notificationColors.muted,
    fontSize: 12,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  markAll: { minHeight: 44, justifyContent: 'center' },
  content: { paddingHorizontal: 20 },
});
