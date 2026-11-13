import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  groupNotifications,
  type NotificationListRow,
} from '../../services/notifications/notificationPresentation';
import {
  EmptyNotificationInbox,
  NotificationGroup,
  NotificationState,
} from './NotificationDesign';

/** The common inbox's virtualized list, pagination and recovery surface.
 * Each caller supplies one authenticated scope; independent accounts are never merged. */
export default function NotificationFeed<T extends NotificationListRow>({
  items,
  now,
  timeZone,
  pending,
  error,
  refreshing,
  loadingMore,
  moreError,
  disabled,
  onOpen,
  onDelete,
  onRefresh,
  onMore,
  footer,
  bottom = 32,
}: {
  items: T[];
  now: Date;
  timeZone: string;
  pending: boolean;
  error: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  moreError: boolean;
  disabled: boolean;
  onOpen: (item: T) => void;
  onDelete?: (item: T) => void;
  onRefresh: () => void;
  onMore: () => void;
  footer?: React.ReactNode;
  bottom?: number;
}) {
  const groups = useMemo(
    () => groupNotifications(items, now, timeZone),
    [items, now, timeZone],
  );
  if (pending && !items.length)
    return <NotificationState loading message="알림을 불러오는 중이에요" />;
  if (error && !items.length)
    return (
      <NotificationState message="알림을 불러오지 못했어요" retry={onRefresh} />
    );
  return (
    <FlatList
      testID="common-notification-feed"
      data={groups}
      keyExtractor={group => group.key}
      contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
      renderItem={({ item }) => (
        <NotificationGroup
          label={item.label}
          items={item.items}
          now={now}
          timeZone={timeZone}
          disabled={disabled}
          onPress={onOpen}
          onDelete={onDelete}
        />
      )}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={() => {
        if (!moreError) onMore();
      }}
      onEndReachedThreshold={0.4}
      initialNumToRender={4}
      windowSize={5}
      ListEmptyComponent={<EmptyNotificationInbox />}
      ListHeaderComponent={
        error ? (
          <NotificationState
            message="저장된 알림을 보고 있어요. 최신 알림을 다시 확인해주세요."
            retry={onRefresh}
          />
        ) : undefined
      }
      ListFooterComponent={
        <View>
          {moreError ? (
            <NotificationState
              message="다음 알림을 불러오지 못했어요"
              retry={onMore}
            />
          ) : loadingMore ? (
            <NotificationState
              loading
              message="이전 알림을 불러오는 중이에요"
            />
          ) : null}
          {footer}
        </View>
      }
    />
  );
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, flexGrow: 1 },
});
