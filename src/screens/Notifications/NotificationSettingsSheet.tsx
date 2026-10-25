import React, { useEffect } from 'react';
import { ActivityIndicator, AppState, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useQuery } from '@tanstack/react-query';

import AppText from '../../app/ui/AppText';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import { NotificationToggle } from '../../components/common/NotificationToggle';
import { NotificationPreferenceGroup } from '../../components/common/NotificationPreferenceGroup';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { readNativePushChannelDetails } from '../../services/notifications/nativePush';
import type { ScheduleNotificationPermissionStatus, ScheduleNotificationSettings } from '../../services/schedules/notifications';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../store/uiStore';
import { notificationSettingArt as art, notificationSurface as C } from './NotificationSurfaceTokens';

export type NotificationSettingsSheetProps = {
  visible: boolean; bottomInset: number; enabled: boolean;
  permissionStatus: ScheduleNotificationPermissionStatus; settings: ScheduleNotificationSettings | null;
  loading: boolean; onClose: () => void;
  onRefreshSettings: () => Promise<void>;
  onOpenSystemSettings: () => void; onOpenExactAlarmSettings: () => void;
};
export function NotificationSettingsSheet(props: NotificationSettingsSheetProps) {
  const { visible, bottomInset, enabled, permissionStatus, settings, loading, onClose } = props;
  const { height } = useWindowDimensions();
  const owner = useAuthStore(s => s.session?.user.id ?? null);
  const { query: preferences, changing, update, displayedCategories } = useNotificationPreferences();
  const channels = useQuery({ queryKey: ['notifications-v3', owner, 'channel-details'], queryFn: readNativePushChannelDetails, enabled: visible && Platform.OS === 'android' });
  const refetchChannels = channels.refetch;
  const refetchPreferences = preferences.refetch;
  useEffect(() => {
    if (!visible) return;
    refetchChannels().catch(() => {});
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { refetchChannels().catch(() => {}); refetchPreferences().catch(() => {}); }
    });
    return () => subscription.remove();
  }, [visible, refetchChannels, refetchPreferences]);
  const pushStates = channels.data ? Object.values(channels.data.channels) : [];
  const scheduleChannel = settings?.channel;
  const ready = pushStates.length > 0 && pushStates.every(state => state === 'ready' || state === 'not-required') && (scheduleChannel === 'ready' || scheduleChannel === 'not-required');
  const blockedCount = pushStates.filter(state => state === 'blocked').length + (scheduleChannel === 'blocked' ? 1 : 0);
  const channelLabel = loading || channels.isPending ? '확인 중' : channels.isError || !channels.data ? '확인 불가'
    : blockedCount === pushStates.length + 1 ? '전체 차단' : blockedCount ? '일부 차단' : ready ? '사용 가능'
    : pushStates.some(state => state === 'missing') || scheduleChannel === 'missing' ? '아직 생성되지 않음' : '확인 불가';
  const appEnabled = channels.data?.appEnabled;
  const permissionLabel = loading ? '확인 중' : appEnabled === false || permissionStatus === 'blocked' || permissionStatus === 'denied' ? '차단됨' : permissionStatus === 'granted' && (Platform.OS !== 'android' || appEnabled === true) ? '허용됨' : '확인 불가';
  const exactLabel = loading ? '확인 중' : settings?.exactAlarm === 'granted' || settings?.exactAlarm === 'not-required' ? '허용됨' : settings?.exactAlarm === 'not-granted' ? '권한 필요' : settings?.exactAlarm === 'unsupported' ? '미지원' : '확인 불가';
  const systemRows = [
    { key: 'system', title: '앱 알림', helper: '시스템 알림 설정', status: permissionLabel, enabled: permissionLabel === '허용됨', onPress: props.onOpenSystemSettings },
    { key: 'channels', title: '알림 채널', status: channelLabel, enabled: ready, onPress: undefined },
    { key: 'clock', title: '정확한 시간 알림', helper: '정확한 시간 알림 설정', status: exactLabel, enabled: exactLabel === '허용됨', onPress: settings?.canOpenExactAlarmSettings ? props.onOpenExactAlarmSettings : undefined },
  ] as const;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        <View testID="notification-settings-sheet" accessibilityViewIsModal style={[styles.sheet, { maxHeight: height - 56, paddingBottom: Math.max(bottomInset, 12) }]}>
          <LinearGradient colors={['#FEFCFF', '#F9F6FD', '#FCFAFF']} pointerEvents="none" style={StyleSheet.absoluteFill} />
          <View style={styles.handle} />
          <View style={styles.header}>
            <AppText preset="sectionTitle" style={styles.heading}>알림 설정</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="알림 설정 닫기" onPress={onClose} style={styles.close} hitSlop={6}><NuriSemanticIcon family="feather" preserveOriginal name="x" size={25} color="#8474A5" /></Pressable>
          </View>
          <ScrollView style={[styles.scroll, { maxHeight: Math.max(160, height - bottomInset - 150) }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
            <View style={styles.intro}>
              <View style={styles.introRow}>
                <AppText preset="titleMd" style={styles.introTitle}>{'필요한 순간에,\n잊지 않도록'}</AppText>
                <Image source={art.hero} style={styles.heroArt} resizeMode="contain" />
              </View>
              <AppText preset="bodySm" style={styles.introCopy}>누리와의 일정을 편하게 챙겨보세요.</AppText>
            </View>
            <AppText preset="sectionTitle" style={[styles.sectionTitle, styles.firstSectionTitle]}>받을 알림</AppText>
            <View style={styles.card}>
              <View style={[styles.settingRow, styles.divider]}>
                <Image source={art.calendar} style={styles.icon} />
                <View style={styles.rowText}><AppText preset="bodyStrong" style={styles.rowTitle}>일정 알림</AppText><AppText preset="bodySm" style={styles.helper}>병원·약·산책 일정을 알려드려요</AppText></View>
                {!settings || !preferences.data ? loading || preferences.isPending ? <ActivityIndicator testID="notification-settings-loading" color={C.purple} style={styles.toggleSlot} /> : <AppText preset="bodySm" style={styles.status}>확인 불가</AppText> : <NotificationToggle label="일정 알림" value={displayedCategories.schedule ?? enabled} disabled={loading || changing} onChange={async value => {
                  try { await update('schedule', value); }
                  catch (error) {
                    showToast({ tone: 'warning', title: '일정 알림 설정을 확인해주세요', message: '저장된 수신 설정과 기기 권한을 다시 확인해주세요. 예약이 완료되지 않았을 수 있어요.' });
                    throw error;
                  } finally { await props.onRefreshSettings(); }
                }} />}
              </View>
              <View style={styles.settingRow}>
                <Image source={art.news} style={styles.icon} />
                <View style={styles.rowText}><AppText preset="bodyStrong" style={styles.rowTitle}>운영 알림 수신 동의</AppText><AppText preset="bodySm" style={styles.helper}>공지·계정·서비스 소식을 받아요</AppText></View>
                {!preferences.data ? preferences.isPending ? <ActivityIndicator color={C.purple} style={styles.toggleSlot} /> : <Pressable accessibilityRole="button" accessibilityLabel="알림 설정 다시 불러오기" onPress={() => { preferences.refetch().catch(() => {}); }}><AppText preset="bodySm" style={styles.status}>다시 확인</AppText></Pressable> : <NotificationToggle label="운영 알림 수신 동의" value={displayedCategories.service === true} disabled={changing} onChange={async value => {
                  try { await update('service', value); }
                  catch (error) {
                    showToast({ tone: 'error', title: '설정을 저장하지 못했어요', message: '연결을 확인하고 다시 시도해주세요.' });
                    throw error;
                  }
                }} />}
              </View>
            </View>
            <AppText preset="bodySm" style={styles.scheduleHelp}>{'일정별 알림은 기록할 때 설정할 수 있어요.\n완료하거나 알림을 끄면 예약도 해제돼요.'}</AppText>
            <AppText preset="sectionTitle" style={styles.sectionTitle}>푸시 알림 종류</AppText>
            <NotificationPreferenceGroup />
            <AppText preset="sectionTitle" style={styles.sectionTitle}>기기 알림 설정</AppText>
            <View style={styles.card}>
              {systemRows.filter(row => Platform.OS === 'android' || row.key === 'system').map((row, index, rows) => {
                const content = <>
                  <Image source={art[row.key]} style={styles.icon} />
                  <View style={styles.rowText}><AppText preset="bodyStrong" style={styles.rowTitle}>{row.title}</AppText>{'helper' in row ? <AppText preset="bodySm" style={styles.helper}>{row.helper}</AppText> : null}</View>
                  <AppText preset="bodyStrong" style={[styles.status, { color: row.enabled ? row.key === 'channels' ? C.purpleDeep : '#078C27' : C.muted }]}>{row.status}</AppText>
                  {row.onPress ? <NuriSemanticIcon family="feather" preserveOriginal name="chevron-right" size={21} color="#8B7BA9" /> : null}
                </>;
                const style = [styles.settingRow, index < rows.length - 1 && styles.divider];
                return row.onPress ? <Pressable key={row.key} testID={`notification-settings-${row.key}`} accessibilityRole="button" accessibilityLabel={`${row.title}, ${row.status}`} onPress={row.onPress} style={style}>{content}</Pressable>
                  : <View key={row.key} testID={`notification-settings-${row.key}`} accessible accessibilityRole="text" accessibilityLabel={`${row.title}, ${row.status}`} style={style}>{content}</View>;
              })}
            </View>
            <View style={styles.notice}><NuriSemanticIcon family="feather" preserveOriginal name="info" size={20} color={C.muted} /><AppText preset="bodySm" style={[styles.helper, styles.noticeText]}>{'기기 설정에 따라 알림이 오지 않을 수 있어요.\n알림이 오지 않으면 위 설정을 확인해주세요.'}</AppText></View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.backdrop, justifyContent: 'flex-end' },
  sheet: { width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: C.surface },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#D7CDEF', marginTop: 11, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 14, gap: 12 },
  heading: { color: C.ink, fontSize: 23, lineHeight: 32, fontWeight: '700' },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.control, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 16 },
  intro: { paddingHorizontal: 4, marginTop: 10, marginBottom: 12 },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  introTitle: { flex: 1, minWidth: 0, color: C.ink, fontSize: 27, lineHeight: 36, fontWeight: '700' },
  heroArt: { width: 90, height: 90, flexShrink: 0 },
  introCopy: { color: C.muted, fontSize: 14, lineHeight: 21, marginTop: 10 },
  sectionTitle: { color: C.ink, fontSize: 19, lineHeight: 28, marginHorizontal: 4, marginBottom: 10, marginTop: 18, fontWeight: '700' },
  firstSectionTitle: { marginTop: 0 },
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.55)' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 76, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  icon: { width: 44, height: 44, flexShrink: 0 },
  rowText: { flex: 1, minWidth: 0, gap: 4 },
  rowTitle: { color: C.ink, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  helper: { color: C.muted, fontSize: 12, lineHeight: 19 },
  toggleSlot: { width: 56 },
  scheduleHelp: { color: C.muted, fontSize: 13, lineHeight: 20, paddingHorizontal: 6, marginTop: 10, marginBottom: 0 },
  status: { maxWidth: 78, textAlign: 'right', fontSize: 13, lineHeight: 20, flexShrink: 0 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12, paddingHorizontal: 6 },
  noticeText: { flex: 1 },
});
