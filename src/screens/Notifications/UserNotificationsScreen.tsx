import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../app/ui/AppText';
import { useNotificationInbox } from '../../hooks/useNotificationInbox';
import { useOpenNotification } from '../../hooks/useOpenNotification';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { groupNotifications } from '../../services/notifications/notificationPresentation';
import type { UserNotificationItem } from '../../services/notifications/userNotifications';
import { openMoreDrawer, showToast } from '../../store/uiStore';
import {
  EmptyNotificationInbox,
  NotificationCanvas,
  NotificationGroup,
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
  const { list, unread, markAll, dismiss } = useNotificationInbox();
  const { open: openNotification, opening } = useOpenNotification();
  const [now, setNow] = useState(() => new Date());
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const remove = async (item: UserNotificationItem | null) => {
    if (deleting || marking) return;
    setDeleting(true);
    try {
      await dismiss(item);
    } catch {
      showToast({
        tone: 'error',
        title: '알림을 삭제하지 못했어요',
        message: '연결 상태를 확인하고 다시 시도해주세요.',
      });
    } finally {
      setDeleting(false);
    }
  };
  const confirmRemove = (item: UserNotificationItem | null) =>
    Alert.alert(
      item ? '이 알림을 삭제할까요?' : '알림을 모두 삭제할까요?',
      '알림함에서 삭제되며 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            remove(item);
          },
        },
      ],
    );
  const manage = (item: UserNotificationItem) => {
    if (deleting || marking) return;
    Alert.alert('알림 관리', undefined, [
      { text: '취소', style: 'cancel' },
      { text: '이 알림 삭제', onPress: () => confirmRemove(item) },
      {
        text: '전체 알림 삭제',
        style: 'destructive',
        onPress: () => confirmRemove(null),
      },
    ]);
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
    }, [refresh]),
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [refresh]);
  const items = useMemo(
    () => list.data?.pages.flatMap(page => page.items) ?? [],
    [list.data],
  );
  const timeZone = list.data?.pages[0]?.timeZone ?? 'Asia/Seoul';
  const groups = useMemo(
    () => groupNotifications(items, now, timeZone),
    [items, now, timeZone],
  );
  const count = unread.data ?? list.data?.pages[0]?.unreadCount ?? 0;
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
    if (marking) return;
    setMarking(true);
    try {
      await markAll();
    } catch {
      showToast({
        tone: 'error',
        title: '읽음 상태를 저장하지 못했어요',
        message: '잠시 후 다시 시도해주세요.',
      });
    } finally {
      setMarking(false);
    }
  };
  return (
    <NotificationCanvas top={insets.top}>
      <NotificationHeader
        title="알림함"
        onBack={onBack}
        empty={empty}
        count={count}
      />
      {!empty ? (
        <View style={styles.summary}>
          <AppText preset="bodyStrong" style={styles.summaryText}>
            읽지 않은 알림{' '}
            <AppText preset="bodyStrong" style={styles.count}>
              {count}개
            </AppText>
          </AppText>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={marking || deleting || count === 0}
            onPress={() => {
              onMarkAll();
            }}
            style={styles.markAll}
          >
            <AppText preset="bodyStrong" color={notificationColors.purple}>
              {marking ? '저장 중' : '모두 읽음'}
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}
      {list.isPending ? (
        <NotificationState loading message="알림을 불러오는 중이에요" />
      ) : list.isError && items.length === 0 ? (
        <NotificationState message="알림을 불러오지 못했어요" retry={refresh} />
      ) : empty ? (
        <EmptyNotificationInbox />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={group => group.key}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
          renderItem={({ item }) => (
            <NotificationGroup
              label={item.label}
              items={item.items}
              now={now}
              timeZone={timeZone}
              onManage={manage}
              disabled={deleting || marking || opening}
              onPress={notification => { openNotification({ id: notification.id, source: notification.source }).catch(() => {}); }}
            />
          )}
          refreshing={list.isRefetching && !list.isFetchingNextPage}
          onRefresh={refresh}
          onEndReached={() => {
            if (
              list.hasNextPage &&
              !list.isFetchingNextPage &&
              !list.isFetchNextPageError
            )
              list.fetchNextPage().catch(() => {});
          }}
          onEndReachedThreshold={0.4}
          initialNumToRender={4}
          windowSize={5}
          ListHeaderComponent={
            list.isError ? (
              <NotificationState
                message="저장된 알림을 보고 있어요. 최신 알림을 다시 확인해주세요."
                retry={refresh}
              />
            ) : undefined
          }
          ListFooterComponent={
            list.isFetchNextPageError ? (
              <NotificationState
                message="다음 알림을 불러오지 못했어요"
                retry={() => {
                  list.fetchNextPage().catch(() => {});
                }}
              />
            ) : list.isFetchingNextPage ? (
              <NotificationState
                loading
                message="이전 알림을 불러오는 중이에요"
              />
            ) : undefined
          }
        />
      )}
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
    flexShrink: 1,
  },
  count: { color: '#7047BD' },
  markAll: { minHeight: 44, justifyContent: 'center' },
  content: { paddingHorizontal: 20 },
});
