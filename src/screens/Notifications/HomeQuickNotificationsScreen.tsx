import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

import AppText from '../../app/ui/AppText';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import { useNotificationPreview } from '../../hooks/useNotificationInbox';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { notificationRelativeTime } from '../../services/notifications/notificationPresentation';
import type { NotificationCategory, UserNotificationItem } from '../../services/notifications/userNotifications';
import { showToast } from '../../store/uiStore';
import { notificationArt } from './NotificationDesign';
import { notificationSettingArt, notificationSurface as C } from './NotificationSurfaceTokens';

const labels: Record<NotificationCategory, string> = { news: '누리 소식', community: '커뮤니티', schedule: '일정', activity: '활동', record: '기록' };

export default function HomeQuickNotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'HomeQuickNotifications'>>();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { list, unread, markAll, userId } = useNotificationPreview();
  const [marking, setMarking] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const moving = useRef(false);
  const markingRef = useRef(false);
  const initialOwner = useRef(userId);
  const items = list.data?.items ?? [];
  const count = unread.data ?? list.data?.unreadCount;
  const empty = list.isSuccess && items.length === 0;
  const loading = list.isPending;
  const failedEmpty = list.isError && items.length === 0;
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (userId !== initialOwner.current && navigation.isFocused()) navigation.goBack();
  }, [navigation, userId]);

  const openAll = () => {
    if (moving.current || userId !== initialOwner.current) return;
    moving.current = true;
    // Replace only this native transparent presentation. Home remains the Back
    // destination; there is no intermediate More route or Dialog dismissal race.
    navigation.replace('UserNotifications', { entrySource: 'home' });
  };
  const openItem = (item: UserNotificationItem) => {
    if (moving.current || userId !== initialOwner.current) return;
    moving.current = true;
    navigation.replace('NotificationDetail', { id: item.id, source: item.source });
  };
  const readAll = async () => {
    if (markingRef.current || !count) return;
    markingRef.current = true;
    setMarking(true);
    try { await markAll(); }
    catch { showToast({ tone: 'error', title: '읽음 상태를 저장하지 못했어요', message: '연결을 확인하고 다시 시도해주세요.' }); }
    finally { markingRef.current = false; setMarking(false); }
  };
  return (
    <View testID="home-quick-notifications" style={styles.root} accessibilityViewIsModal>
      <Pressable testID="home-quick-notifications-scrim" style={StyleSheet.absoluteFill} onPress={() => navigation.goBack()} accessible={false} />
      <View style={[styles.panel, { maxHeight: height - insets.top - insets.bottom - 40 }]}>
        <LinearGradient colors={['#FEFCFF', '#F8F3FD', '#FCFAFF']} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={styles.header}>
          <AppText preset="sectionTitle" style={styles.heading}>알림</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="알림 미리보기 닫기" onPress={() => navigation.goBack()} style={styles.close} hitSlop={6}>
            <NuriSemanticIcon family="feather" preserveOriginal name="x" size={23} color="#8D80A9" />
          </Pressable>
        </View>
        <View style={styles.summary}>
          <AppText preset="bodySm" style={styles.summaryText}>
            {count === undefined ? '알림을 확인하고 있어요' : <>읽지 않은 알림 <AppText preset="bodyStrong" style={styles.count}>{count}개</AppText></>}
          </AppText>
          {!empty && count !== undefined ? (
            <Pressable accessibilityRole="button" accessibilityLabel="전체 알림 모두 읽음" accessibilityState={{ disabled: !count || marking, busy: marking }} disabled={!count || marking} onPress={() => { readAll().catch(() => {}); }} style={styles.markAll}>
              {marking ? <ActivityIndicator size="small" color={C.purple} /> : <AppText preset="bodyStrong" style={[styles.markAllText, !count && styles.disabled]}>모두 읽음</AppText>}
            </Pressable>
          ) : null}
        </View>
        {list.isError && items.length > 0 ? <Pressable testID="home-quick-notifications-cached" accessibilityRole="button" onPress={() => { list.refetch().catch(() => {}); unread.refetch().catch(() => {}); }}><AppText preset="caption" style={styles.helper}>저장된 알림을 보고 있어요. 다시 확인</AppText></Pressable> : null}
        <ScrollView style={styles.body} contentContainerStyle={empty || loading || failedEmpty ? styles.centerBody : undefined} showsVerticalScrollIndicator={false}>
          {loading ? <ActivityIndicator testID="home-quick-notifications-loading" color={C.purple} /> : failedEmpty ? (
            <View style={styles.error}>
              <AppText preset="bodySm" style={styles.helper}>알림을 불러오지 못했어요</AppText>
              <Pressable accessibilityRole="button" onPress={() => { list.refetch().catch(() => {}); unread.refetch().catch(() => {}); }}><AppText preset="bodyStrong" style={styles.count}>다시 시도</AppText></Pressable>
            </View>
          ) : empty ? (
            <View testID="home-quick-notifications-empty" style={styles.empty}>
              <Image source={notificationSettingArt.empty} style={styles.emptyArt} resizeMode="contain" />
              <AppText preset="titleMd" style={styles.emptyTitle}>아직 새 알림이 없어요</AppText>
              <AppText preset="bodySm" style={styles.emptyCopy}>{'새로운 소식이 도착하면\n여기에 차분히 모아둘게요.'}</AppText>
            </View>
          ) : items.map((item, index) => {
            const category = item.category ?? 'news';
            return (
              <Pressable testID="home-quick-notification-row" key={`${item.source}:${item.id}`} accessibilityRole="button" accessibilityLabel={`${labels[category]}, ${item.title}${item.readAt ? '' : ', 읽지 않음'}`} onPress={() => openItem(item)} style={[styles.row, index < items.length - 1 && styles.rowDivider]}>
                <Image source={notificationArt[category]} style={styles.icon} resizeMode="contain" />
                <View style={styles.rowText}>
                  <AppText preset="caption" style={styles.meta} numberOfLines={1}>
                    <AppText preset="caption" style={[styles.meta, { color: C.category[category] }]}>{labels[category]}</AppText>
                    {'  ·  '}{notificationRelativeTime(item.availableAt ?? item.createdAt, now, list.data?.timeZone ?? 'Asia/Seoul')}
                  </AppText>
                  <AppText preset="bodyStrong" style={styles.rowTitle} numberOfLines={1}>{item.title}</AppText>
                  <AppText preset="bodySm" style={styles.preview} numberOfLines={1}>{item.body}</AppText>
                </View>
                <View style={styles.trailing}>
                  {!item.readAt ? <View testID="home-quick-unread-dot" style={styles.dot} /> : null}
                  <NuriSemanticIcon family="feather" preserveOriginal name="chevron-right" size={20} color="#9486AD" />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable testID="home-quick-notifications-all" accessibilityRole="button" accessibilityLabel="전체 알림 보기" onPress={openAll} style={styles.allButton}>
          <View testID="home-quick-notifications-all-content" style={styles.allContent}>
            <AppText preset="bodyStrong" style={styles.allText}>전체 알림 보기</AppText>
            <NuriSemanticIcon family="feather" preserveOriginal name="chevron-right" size={18} color={C.purpleDeep} style={styles.allArrow} accessible={false} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.backdrop, paddingHorizontal: 20 },
  panel: { width: '100%', maxWidth: 440, borderRadius: 24, borderWidth: 1, borderColor: C.border, padding: 18, overflow: 'hidden', backgroundColor: C.surface, boxShadow: '0px 8px 28px rgba(36, 23, 62, 0.12)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heading: { color: C.ink, fontSize: 21, lineHeight: 30, fontWeight: '700' },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.control, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4, marginBottom: 8, minHeight: 30 },
  summaryText: { flexShrink: 1, color: C.muted, fontSize: 13, lineHeight: 20 },
  count: { color: C.purple, fontSize: 13, lineHeight: 20 },
  markAll: { minHeight: 36, justifyContent: 'center', alignItems: 'flex-end', flexShrink: 0 },
  markAllText: { color: C.purple, fontSize: 12, lineHeight: 18 },
  disabled: { color: C.muted },
  body: { flexGrow: 0, flexShrink: 1 },
  centerBody: { minHeight: 230, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  emptyArt: { width: 164, height: 112, marginBottom: 4 },
  emptyTitle: { color: C.ink, fontSize: 18, lineHeight: 26, textAlign: 'center', fontWeight: '700' },
  emptyCopy: { color: C.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  error: { alignItems: 'center', gap: 16 },
  helper: { color: C.muted, fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, minHeight: 86 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  icon: { width: 48, height: 48, flexShrink: 0 },
  rowText: { flex: 1, minWidth: 0, gap: 4 },
  meta: { color: C.muted, fontSize: 11, lineHeight: 16 },
  rowTitle: { color: C.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  preview: { color: C.muted, fontSize: 12, lineHeight: 18 },
  trailing: { width: 18, minHeight: 48, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dot: { position: 'absolute', top: 1, left: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: C.purple },
  allButton: { marginTop: 14, minHeight: 42, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: C.control, alignItems: 'center', justifyContent: 'center' },
  allContent: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  allText: { color: C.purpleDeep, fontSize: 14, lineHeight: 20, includeFontPadding: false, textAlign: 'center', flexShrink: 1 },
  allArrow: { width: 18, lineHeight: 20, includeFontPadding: false, textAlign: 'center', flexShrink: 0 },
});
