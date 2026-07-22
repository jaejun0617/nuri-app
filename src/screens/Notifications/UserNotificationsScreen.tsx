// 파일: src/screens/Notifications/UserNotificationsScreen.tsx
// 역할:
// - V1.1 알림 read path MVP 화면이다.
// - push/운영자 발송 UI 없이, 로그인 사용자 자신의 앱 내부 알림과 공지만 읽고 읽음 처리한다.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated as RNAnimated,
  FlatList,
  LayoutAnimation,
  PanResponder,
  Platform,
  StyleSheet,
  TouchableOpacity,
  UIManager,
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
  dismissAllUserNotifications,
  dismissUserNotification,
  fetchUserNotifications,
  markUserNotificationRead,
  type UserNotificationItem,
} from '../../services/notifications/userNotifications';
import {
  getNotificationCardGestureIntent,
  shouldCaptureNotificationCardGesture,
} from '../../services/notifications/gesturePolicy';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { showToast } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'UserNotifications'>;

type NotificationSwipeItemProps = {
  item: UserNotificationItem;
  onPress: (item: UserNotificationItem) => void;
  onDismiss: (item: UserNotificationItem) => void;
  expanded: boolean;
  onToggleExpanded: (item: UserNotificationItem) => void;
  onSetExpanded: (item: UserNotificationItem, expanded: boolean) => void;
};

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const NOTIFICATION_CARD_LAYOUT_ANIMATION = {
  duration: 190,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

function getNotificationKey(item: UserNotificationItem): string {
  return `${item.source}:${item.id}`;
}

function animateNotificationCardLayout() {
  LayoutAnimation.configureNext(NOTIFICATION_CARD_LAYOUT_ANIMATION);
}

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

const NotificationSwipeItem = React.memo(function NotificationSwipeItem({
  item,
  onPress,
  onDismiss,
  expanded,
  onToggleExpanded,
  onSetExpanded,
}: NotificationSwipeItemProps) {
  const unread = !item.readAt;
  const dismiss = useCallback(() => {
    onDismiss(item);
  }, [item, onDismiss]);
  const toggleExpanded = useCallback(() => {
    onToggleExpanded(item);
  }, [item, onToggleExpanded]);
  const setExpanded = useCallback(
    (nextExpanded: boolean) => {
      onSetExpanded(item, nextExpanded);
    },
    [item, onSetExpanded],
  );
  const swipeTranslateX = useRef(new RNAnimated.Value(0)).current;
  const resetSwipePosition = useCallback(() => {
    RNAnimated.spring(swipeTranslateX, {
      toValue: 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 0,
    }).start();
  }, [swipeTranslateX]);
  const dismissWithSwipeAnimation = useCallback(
    (dx: number) => {
      const exitX = dx < 0 ? -460 : 460;
      RNAnimated.timing(swipeTranslateX, {
        toValue: exitX,
        duration: 150,
        useNativeDriver: true,
      }).start(({ finished }) => {
        swipeTranslateX.setValue(0);
        if (finished) {
          dismiss();
          return;
        }
        resetSwipePosition();
      });
    },
    [dismiss, resetSwipePosition, swipeTranslateX],
  );
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
          shouldCaptureNotificationCardGesture({
            dx: gestureState.dx,
            dy: gestureState.dy,
          }),
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          shouldCaptureNotificationCardGesture({
            dx: gestureState.dx,
            dy: gestureState.dy,
          }),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_event, gestureState) => {
          const absDx = Math.abs(gestureState.dx);
          const absDy = Math.abs(gestureState.dy);
          if (absDx > 8 && absDx > absDy * 1.15) {
            swipeTranslateX.setValue(gestureState.dx);
          }
        },
        onPanResponderRelease: (_event, gestureState) => {
          const intent = getNotificationCardGestureIntent({
            dx: gestureState.dx,
            dy: gestureState.dy,
            expanded,
          });

          if (intent === 'dismiss') {
            dismissWithSwipeAnimation(gestureState.dx);
            return;
          }
          resetSwipePosition();
          if (intent === 'expand') {
            setExpanded(true);
            return;
          }
          if (intent === 'collapse') {
            setExpanded(false);
          }
        },
        onPanResponderTerminate: resetSwipePosition,
      }),
    [
      dismissWithSwipeAnimation,
      expanded,
      resetSwipePosition,
      setExpanded,
      swipeTranslateX,
    ],
  );

  return (
    <View style={styles.swipeRow} {...panResponder.panHandlers}>
      <RNAnimated.View
        style={[
          styles.swipeCard,
          { transform: [{ translateX: swipeTranslateX }] },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.itemCard,
            unread ? styles.itemCardUnread : null,
            expanded ? styles.itemCardExpanded : null,
          ]}
          onPress={() => onPress(item)}
        >
          <View style={styles.itemMainRow}>
            <View style={styles.itemIconWrap}>
              <Feather
                name={item.actionTarget ? 'message-circle' : 'bell'}
                size={16}
                color="#4F46E5"
              />
            </View>
            <View style={styles.itemContent}>
              <View style={styles.itemTopRow}>
                <View style={styles.itemTitleWrap}>
                  {unread ? <View style={styles.unreadDot} /> : null}
                  <AppText preset="body" style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </AppText>
                </View>
              </View>
              <AppText
                preset="body"
                style={[
                  styles.itemBody,
                  expanded ? styles.itemBodyExpanded : styles.itemBodyCollapsed,
                ]}
                numberOfLines={expanded ? undefined : 1}
              >
                {item.body}
              </AppText>
              <View style={styles.itemFooterRow}>
                <AppText preset="caption" style={styles.itemDate}>
                  {formatNotificationDate(item.createdAt)}
                </AppText>
                <TouchableOpacity
                  activeOpacity={0.84}
                  accessibilityLabel={expanded ? '알림 접기' : '알림 펼치기'}
                  accessibilityRole="button"
                  style={styles.itemExpandButton}
                  onPress={toggleExpanded}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#667085"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </RNAnimated.View>
    </View>
  );
});

export default function UserNotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [items, setItems] = useState<UserNotificationItem[]>([]);
  const [expandedItemKeys, setExpandedItemKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
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
    if (item.actionTarget?.kind === 'community_comment') {
      navigation.navigate('CommunityDetail', {
        postId: item.actionTarget.postId,
        commentId: item.actionTarget.commentId,
      });
    }

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
  }, [navigation]);

  const onDismissNotification = useCallback(
    async (item: UserNotificationItem) => {
      setExpandedItemKeys(prev => {
        const next = new Set(prev);
        next.delete(getNotificationKey(item));
        return next;
      });
      setItems(prev =>
        prev.filter(
          current =>
            !(current.id === item.id && current.source === item.source),
        ),
      );

      try {
        await dismissUserNotification({ id: item.id, source: item.source });
      } catch (error) {
        setItems(prev => {
          const exists = prev.some(
            current =>
              current.id === item.id && current.source === item.source,
          );
          return exists ? prev : [item, ...prev];
        });
        const meta = getBrandedErrorMeta(error, 'generic');
        showToast({ tone: 'error', title: meta.title, message: meta.message });
      }
    },
    [],
  );

  const onDismissAllNotifications = useCallback(async () => {
    if (items.length === 0) return;
    const previousItems = items;
    setExpandedItemKeys(new Set());
    setItems([]);

    try {
      await dismissAllUserNotifications();
    } catch (error) {
      setItems(previousItems);
      const meta = getBrandedErrorMeta(error, 'generic');
      showToast({ tone: 'error', title: meta.title, message: meta.message });
    }
  }, [items]);

  const onToggleExpandedNotification = useCallback(
    (item: UserNotificationItem) => {
      animateNotificationCardLayout();
      setExpandedItemKeys(prev => {
        const key = getNotificationKey(item);
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [],
  );

  const onSetExpandedNotification = useCallback(
    (item: UserNotificationItem, expanded: boolean) => {
      animateNotificationCardLayout();
      setExpandedItemKeys(prev => {
        const key = getNotificationKey(item);
        const next = new Set(prev);
        if (expanded) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: UserNotificationItem }) => (
      <NotificationSwipeItem
        item={item}
        onPress={onPressNotification}
        onDismiss={onDismissNotification}
        expanded={expandedItemKeys.has(getNotificationKey(item))}
        onToggleExpanded={onToggleExpandedNotification}
        onSetExpanded={onSetExpandedNotification}
      />
    ),
    [
      expandedItemKeys,
      onDismissNotification,
      onPressNotification,
      onSetExpandedNotification,
      onToggleExpandedNotification,
    ],
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
        {items.length > 0 && !loading ? (
          <TouchableOpacity
            activeOpacity={0.86}
            accessibilityLabel="알림 전체삭제"
            accessibilityRole="button"
            style={styles.headerClearButton}
            onPress={onDismissAllNotifications}
          >
            <AppText preset="caption" style={styles.headerClearText}>
              전체삭제
            </AppText>
          </TouchableOpacity>
        ) : null}
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
  headerClearButton: {
    minHeight: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.14)',
  },
  headerClearText: {
    color: '#D84C4C',
    fontWeight: '900',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 7,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  swipeRow: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
  },
  swipeCard: {
    transform: [{ translateX: 0 }],
  },
  itemCard: {
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,32,51,0.08)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  itemCardUnread: {
    borderColor: '#DDE5FF',
    backgroundColor: '#FAFBFF',
  },
  itemCardExpanded: {
    minHeight: 108,
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79,70,229,0.08)',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#6D6AF8',
  },
  itemDate: {
    flex: 1,
    color: '#9AA3AF',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    textAlign: 'left',
  },
  itemMeta: {
    alignItems: 'flex-end',
    gap: 7,
  },
  itemDeleteButton: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,32,51,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(16,32,51,0.06)',
  },
  itemBody: {
    color: '#4B5563',
    fontSize: 12,
    lineHeight: 17,
  },
  itemBodyCollapsed: {
    minHeight: 17,
  },
  itemBodyExpanded: {
    color: '#364053',
  },
  itemFooterRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemExpandButton: {
    width: 30,
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#F7F8FB',
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
