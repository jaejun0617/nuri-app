import React, { memo } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import styled from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import Feather from '../../components/icons/NuriFeatherIcon';
import type {
  NotificationCategory,
  UserNotificationItem,
} from '../../services/notifications/userNotifications';
import {
  notificationDetailDate,
  notificationRelativeTime,
} from '../../services/notifications/notificationPresentation';

export const notificationColors = {
  ink: '#140D2B',
  muted: '#8C889E',
  purple: '#8057DB',
  border: '#EAE3FC',
  background: '#F9F7FD',
} as const;
export const notificationArt = {
  empty: require('../../assets/notifications/empty-inbox.png'),
  memory: require('../../assets/notifications/news-memory.png'),
  news: require('../../assets/notifications/category-news.png'),
  community: require('../../assets/notifications/category-community.png'),
  schedule: require('../../assets/notifications/category-schedule.png'),
  activity: require('../../assets/notifications/category-activity.png'),
  record: require('../../assets/notifications/category-record.png'),
};
const categoryLabels: Record<NotificationCategory, string> = {
  news: '누리 소식',
  community: '커뮤니티',
  schedule: '일정',
  activity: '활동',
  record: '기록',
};
const categoryColors: Record<NotificationCategory, string> = {
  news: '#8057DB',
  community: '#526CC6',
  schedule: '#CC4C91',
  activity: '#51883B',
  record: '#8251CA',
};
const Canvas = styled.View`
  flex: 1;
  background-color: ${notificationColors.background};
`;

export function NotificationCanvas({
  children,
  top,
}: {
  children: React.ReactNode;
  top: number;
}) {
  return (
    <Canvas style={{ paddingTop: top }}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        pointerEvents="none"
        colors={['#FBF9FE', '#F8F6FD', '#FBF9FE']}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </Canvas>
  );
}
export function NotificationHeader({
  title,
  onBack,
  empty = false,
  count = 0,
}: {
  title: string;
  onBack: () => void;
  empty?: boolean;
  count?: number;
}) {
  return (
    <View style={[styles.header, empty && styles.emptyHeader]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="뒤로가기"
        onPress={onBack}
        style={[styles.back, empty && styles.emptyBack]}
      >
        <Feather name="arrow-left" size={24} color={notificationColors.ink} />
      </TouchableOpacity>
      <View
        style={[
          empty || title === '알림 상세'
            ? styles.leftHeading
            : styles.centerHeading,
          empty && styles.emptyHeading,
        ]}
        pointerEvents="none"
      >
        <AppText
          preset="screenTitle"
          style={[styles.headerTitle, empty && styles.emptyHeaderTitle]}
        >
          {title}
        </AppText>
        {empty ? (
          <AppText preset="bodySm" style={styles.emptySummary}>
            읽지 않은 알림 {count}개
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
export function EmptyNotificationInbox() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyBundle}>
        <Image
          source={notificationArt.empty}
          style={styles.emptyArt}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <AppText preset="titleMd" style={styles.emptyTitle}>
          아직 새 알림이 없어요
        </AppText>
        <AppText preset="bodySm" style={styles.emptyBody}>
          {'중요한 안내가 생기면\n이곳에 차분히 모아둘게요.'}
        </AppText>
      </View>
    </View>
  );
}
export const NotificationGroup = memo(function NotificationGroupView({
  label,
  items,
  now,
  timeZone,
  onPress,
  onManage,
  disabled = false,
}: {
  label: string;
  items: UserNotificationItem[];
  now: Date;
  timeZone: string;
  onPress: (item: UserNotificationItem) => void;
  onManage?: (item: UserNotificationItem) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.group}>
      <AppText preset="sectionTitle" style={styles.groupTitle}>
        {label}
      </AppText>
      <View
        style={[
          styles.groupCard,
          items.some(item => !item.readAt) && styles.unreadCard,
        ]}
      >
        {items.map((item, index) => {
          const category = item.category ?? 'news';
          return (
            <TouchableOpacity
              key={`${item.source}:${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${categoryLabels[category]}, ${item.title}${
                item.readAt ? '' : ', 읽지 않음'
              }`}
              activeOpacity={0.75}
              disabled={disabled}
              accessibilityState={{ disabled }}
              accessibilityActions={
                onManage
                  ? [{ name: 'longpress', label: '알림 관리' }]
                  : undefined
              }
              onAccessibilityAction={event => {
                if (event.nativeEvent.actionName === 'longpress')
                  onManage?.(item);
              }}
              onPress={() => onPress(item)}
              onLongPress={onManage ? () => onManage(item) : undefined}
              style={styles.row}
            >
              <Image
                source={notificationArt[category]}
                style={styles.categoryArt}
                resizeMode="contain"
              />
              <View style={styles.rowText}>
                <AppText preset="caption" style={styles.meta}>
                  <AppText
                    preset="caption"
                    style={[styles.meta, { color: categoryColors[category] }]}
                  >
                    {categoryLabels[category]}
                  </AppText>
                  {'  ·  '}
                  {notificationRelativeTime(
                    item.availableAt ?? item.createdAt,
                    now,
                    timeZone,
                  )}
                </AppText>
                <AppText preset="bodyStrong" style={styles.rowTitle}>
                  {item.title}
                </AppText>
                {item.body ? (
                  <AppText
                    preset="bodySm"
                    style={styles.preview}
                    numberOfLines={2}
                  >
                    {item.body}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.rowTrailing}>
                {!item.readAt ? (
                  <View
                    accessibilityLabel="읽지 않음"
                    style={styles.unreadDot}
                  />
                ) : null}
                <Feather name="chevron-right" size={20} color="#A5A0B7" />
              </View>
              {index < items.length - 1 ? (
                <View style={styles.divider} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});
export function NotificationState({
  message,
  retry,
  loading = false,
}: {
  message: string;
  retry?: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.state}>
      {loading ? <ActivityIndicator color={notificationColors.purple} /> : null}
      <AppText preset="bodySm" style={styles.stateText}>
        {message}
      </AppText>
      {retry ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={retry}
          style={styles.retry}
        >
          <AppText preset="bodyStrong" color={notificationColors.purple}>
            다시 불러오기
          </AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
export function NotificationDetailDesign({
  item,
  bottom,
  onAction,
  busy = false,
  readError,
  onRetryRead,
}: {
  item: UserNotificationItem;
  bottom: number;
  onAction: () => void;
  busy?: boolean;
  readError?: boolean;
  onRetryRead?: () => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const reflowIllustration = width < 340 || fontScale > 1.25;
  const payload = item.payload ?? {};
  const month =
    typeof payload.month === 'string' &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(payload.month)
      ? payload.month
      : null;
  const monthly = payload.layout === 'monthly_news' && Boolean(month);
  const monthLabel = month ? `${Number(month.slice(5))}월` : '';
  const date = notificationDetailDate(
    item.createdAt,
    item.timeZone ?? 'Asia/Seoul',
  );
  const available = item.actionTarget?.kind !== 'unavailable';
  return (
    <ScrollView
      contentContainerStyle={[
        styles.detailContent,
        { paddingBottom: bottom + 30 },
      ]}
    >
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <AppText preset="bodyStrong" color="#45317C">
            {categoryLabels[item.category ?? 'news']}
          </AppText>
        </View>
        <AppText preset="bodySm" color={notificationColors.muted}>
          {item.readAt ? '읽음' : readError ? '읽음 저장 실패' : '확인 중'}
        </AppText>
      </View>
      <AppText preset="titleLg" style={styles.detailTitle}>
        {monthly
          ? item.title.replace(' 도착했어요', '\n도착했어요')
          : item.title}
      </AppText>
      <AppText preset="bodySm" style={styles.detailDate}>
        {date}
      </AppText>
      <View style={styles.detailRule} />
      <View style={styles.bodyCard}>
        {monthly ? (
          <>
            <Image
              source={notificationArt.memory}
              style={[
                styles.memoryArt,
                reflowIllustration && styles.memoryArtFlow,
              ]}
              resizeMode="contain"
            />
            <View
              style={[
                styles.cardHeading,
                reflowIllustration && styles.cardHeadingFlow,
              ]}
            >
              <View style={styles.headingLine}>
                <AppText preset="titleMd" style={styles.cardHeadingText}>
                  누리와{' '}
                </AppText>
                <View style={styles.marker}>
                  <AppText preset="titleMd" style={styles.cardHeadingText}>
                    함께 남긴
                  </AppText>
                </View>
              </View>
              <AppText preset="titleMd" style={styles.cardHeadingText}>
                {monthLabel}의 순간들
              </AppText>
            </View>
            <AppText preset="body" style={styles.cardBody}>
              {
                '산책길에서 만난 풍경,\n집에서 함께 쉰 평범한 하루까지.\n누리와 함께 남긴 기록을 돌아보세요.'
              }
            </AppText>
            <AppText preset="bodySm" style={styles.cardSecondary}>
              {
                '타임라인에 남긴 사진과 일기를\n‘이번 달 누리 일기’에서 모아볼 수 있어요.'
              }
            </AppText>
          </>
        ) : (
          <AppText preset="body" style={styles.genericBody}>
            {item.body}
          </AppText>
        )}
      </View>
      {readError ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onRetryRead}
          style={styles.retry}
        >
          <AppText preset="bodySm" color={notificationColors.purple}>
            읽음 상태 다시 저장
          </AppText>
        </TouchableOpacity>
      ) : null}
      {available ? (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={busy}
          onPress={onAction}
          style={styles.cta}
        >
          <AppText preset="sectionTitle" color="#33205C">
            {busy
              ? '확인 중'
              : monthly
              ? '이번 달 일기 보기'
              : item.actionTarget?.kind === 'notification_detail'
              ? '확인'
              : '관련 내용 보기'}
          </AppText>
          <Feather name="chevron-right" size={22} color="#33205C" />
        </TouchableOpacity>
      ) : (
        <AppText preset="bodySm" style={styles.stateText}>
          삭제되었거나 접근할 수 없는 대상이에요.
        </AppText>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  header: { height: 62, marginHorizontal: 16, justifyContent: 'center' },
  emptyHeader: { height: 86 },
  emptyBack: { position: 'absolute', top: 3 },
  emptyHeading: { top: 12 },
  emptyHeaderTitle: { fontSize: 18, lineHeight: 24 },
  back: {
    width: 44,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  centerHeading: {
    position: 'absolute',
    left: 48,
    right: 48,
    alignItems: 'center',
  },
  leftHeading: { position: 'absolute', left: 54, right: 0 },
  headerTitle: { fontSize: 22, lineHeight: 30, letterSpacing: 0 },
  emptySummary: {
    fontSize: 12,
    lineHeight: 18,
    color: notificationColors.muted,
    marginTop: 2,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 104,
  },
  emptyBundle: { alignItems: 'center', width: '100%' },
  emptyArt: { width: 162, height: 110 },
  emptyTitle: {
    marginTop: 14,
    fontSize: 21,
    lineHeight: 30,
    textAlign: 'center',
    color: notificationColors.ink,
  },
  emptyBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: notificationColors.muted,
  },
  group: { marginBottom: 30 },
  groupTitle: {
    marginBottom: 10,
    fontSize: 18,
    lineHeight: 20,
    color: notificationColors.ink,
  },
  groupCard: {
    backgroundColor: 'rgba(255,255,255,.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: notificationColors.border,
    shadowColor: '#9379CD',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  unreadCard: { backgroundColor: '#F9F5FF' },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 83,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryArt: {
    width: 44,
    height: 44,
    marginRight: 16,
    marginTop: 2,
    borderRadius: 14,
  },
  rowText: { flex: 1, minWidth: 0 },
  meta: {
    fontSize: 11,
    lineHeight: 14,
    color: notificationColors.muted,
    marginBottom: 3,
  },
  rowTitle: { fontSize: 14, lineHeight: 19, color: notificationColors.ink },
  preview: {
    fontSize: 12,
    lineHeight: 17,
    color: notificationColors.muted,
    marginTop: 3,
  },
  rowTrailing: {
    width: 22,
    alignItems: 'flex-end',
    paddingTop: 14,
    marginLeft: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8964DB',
    position: 'absolute',
    top: 2,
    right: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE9F7',
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 0,
  },
  state: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 12,
  },
  stateText: {
    fontSize: 14,
    lineHeight: 21,
    color: notificationColors.muted,
    textAlign: 'center',
    marginVertical: 12,
  },
  retry: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  detailContent: { paddingHorizontal: 21, paddingTop: 18 },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#EEE7FF',
  },
  detailTitle: { fontSize: 24, lineHeight: 29, color: notificationColors.ink },
  detailDate: { fontSize: 13, lineHeight: 20, marginTop: 4, color: '#A19BAD' },
  detailRule: {
    height: 1,
    backgroundColor: notificationColors.border,
    marginTop: 12,
    marginBottom: 17,
  },
  bodyCard: {
    borderWidth: 1,
    borderColor: '#F0EAFD',
    backgroundColor: 'rgba(255,255,255,.72)',
    borderRadius: 24,
    padding: 22,
    minHeight: 318,
    overflow: 'hidden',
  },
  memoryArt: {
    position: 'absolute',
    width: 143,
    height: 145,
    right: 13,
    top: 47,
  },
  cardHeading: { paddingTop: 32, paddingBottom: 29 },
  cardHeadingFlow: { paddingTop: 8, paddingBottom: 24 },
  memoryArtFlow: {
    position: 'relative',
    alignSelf: 'flex-end',
    top: 0,
    right: 0,
  },
  cardHeadingText: {
    fontSize: 23,
    lineHeight: 34,
    color: notificationColors.ink,
  },
  headingLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  marker: {
    backgroundColor: '#E3D4FF',
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  cardBody: { fontSize: 15, lineHeight: 23, color: notificationColors.ink },
  cardSecondary: {
    fontSize: 13,
    lineHeight: 22,
    color: notificationColors.muted,
    marginTop: 28,
  },
  genericBody: { fontSize: 16, lineHeight: 26, color: notificationColors.ink },
  cta: {
    minHeight: 55,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 17,
    borderRadius: 40,
    backgroundColor: '#EEE6FD',
    borderWidth: 1,
    borderColor: '#E4D9FF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
});
