// 파일: src/screens/Notifications/UserNotificationsScreen.tsx
// 역할:
// - V1.1 알림 read path MVP 화면이다.
// - push/운영자 발송 UI 없이, 로그인 사용자 자신의 앱 내부 알림과 공지만 읽고 읽음 처리한다.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  fetchUserNotifications,
  markUserNotificationRead,
  type UserNotificationItem,
} from '../../services/notifications/userNotifications';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { showToast } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'UserNotifications'>;

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function UserNotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [items, setItems] = useState<UserNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => items.filter(item => !item.readAt).length,
    [items],
  );

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setErrorMessage(null);
    try {
      const nextItems = await fetchUserNotifications(50);
      setItems(nextItems);
    } catch (error) {
      const meta = getBrandedErrorMeta(error, 'generic');
      setErrorMessage(meta.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('AppTabs', { screen: 'HomeTab' });
  }, [navigation]);

  const onPressNotification = useCallback(async (item: UserNotificationItem) => {
    if (item.readAt) return;
    const optimisticReadAt = new Date().toISOString();
    setItems(prev =>
      prev.map(current =>
        current.id === item.id && current.source === item.source
          ? { ...current, readAt: optimisticReadAt }
          : current,
      ),
    );

    try {
      await markUserNotificationRead({ id: item.id, source: item.source });
    } catch (error) {
      setItems(prev =>
        prev.map(current =>
          current.id === item.id && current.source === item.source
            ? { ...current, readAt: null }
            : current,
        ),
      );
      const meta = getBrandedErrorMeta(error, 'generic');
      showToast({ tone: 'error', title: meta.title, message: meta.message });
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: UserNotificationItem }) => {
      const unread = !item.readAt;
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.itemCard, unread ? styles.itemCardUnread : null]}
          onPress={() => onPressNotification(item)}
        >
          <View style={styles.itemTopRow}>
            <View style={styles.itemTitleWrap}>
              <AppText preset="body" style={styles.itemTitle} numberOfLines={2}>
                {item.title}
              </AppText>
              {unread ? <View style={styles.unreadDot} /> : null}
            </View>
            <AppText preset="caption" style={styles.itemDate}>
              {formatNotificationDate(item.createdAt)}
            </AppText>
          </View>
          <AppText preset="body" style={styles.itemBody}>
            {item.body}
          </AppText>
        </TouchableOpacity>
      );
    },
    [onPressNotification],
  );

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.backButton}
          onPress={onPressBack}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Feather name="arrow-left" size={20} color="#102033" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <AppText preset="headline" style={styles.headerTitle}>
            알림함
          </AppText>
          <AppText preset="caption" style={styles.headerSubText}>
            읽지 않은 알림 {unreadCount}개
          </AppText>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: theme.colors.brand }]}>
          <AppText preset="caption" style={styles.headerBadgeText}>
            {unreadCount}
          </AppText>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator />
          <AppText preset="body" style={styles.centerText}>
            알림을 불러오는 중이에요.
          </AppText>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <AppText preset="headline" style={styles.centerTitle}>
            알림을 불러오지 못했어요
          </AppText>
          <AppText preset="body" style={styles.centerText}>
            {errorMessage}
          </AppText>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.retryButton, { backgroundColor: theme.colors.brand }]}
            onPress={() => load().catch(() => {})}
          >
            <AppText preset="body" style={styles.retryButtonText}>
              다시 불러오기
            </AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => `${item.source}:${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 ? styles.listContentEmpty : null,
            { paddingBottom: Math.max(insets.bottom, 18) + 18 },
          ]}
          refreshing={refreshing}
          onRefresh={() => load('refresh').catch(() => {})}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <View style={styles.emptyIcon}>
                <Feather name="bell" size={24} color="#7D8798" />
              </View>
              <AppText preset="headline" style={styles.centerTitle}>
                아직 새 알림이 없어요
              </AppText>
              <AppText preset="body" style={styles.centerText}>
                중요한 안내가 생기면 이곳에 차분히 모아둘게요.
              </AppText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: '#0B1220',
    fontWeight: '900',
  },
  headerSubText: {
    color: '#7D8798',
    fontWeight: '700',
  },
  headerBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 10,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  itemCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEF1F6',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8,
  },
  itemCardUnread: {
    borderColor: '#DDE5FF',
    backgroundColor: '#FAFBFF',
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  itemTitle: {
    flexShrink: 1,
    color: '#0B1220',
    fontWeight: '900',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#6D6AF8',
  },
  itemDate: {
    color: '#9AA3AF',
    fontWeight: '700',
  },
  itemBody: {
    color: '#4B5563',
    lineHeight: 21,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  centerTitle: {
    color: '#0B1220',
    fontWeight: '900',
    textAlign: 'center',
  },
  centerText: {
    color: '#667085',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: '#F3F5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
