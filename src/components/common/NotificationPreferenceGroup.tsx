import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import AppText from '../../app/ui/AppText';
import { useNotificationPreferences, type NotificationPreferenceKey } from '../../hooks/useNotificationPreferences';
import { notificationSettingArt, notificationSurface as C } from '../../screens/Notifications/NotificationSurfaceTokens';
import { showToast } from '../../store/uiStore';
import { NotificationToggle } from './NotificationToggle';

const rows: readonly { key: NotificationPreferenceKey; label: string; art: keyof typeof notificationSettingArt }[] = [
  { key: 'service', label: '누리 소식', art: 'news' },
  { key: 'community', label: '댓글·답글·공감', art: 'community' },
  { key: 'activity', label: '칭호·레벨', art: 'activity' },
  { key: 'record', label: '주간·월간 회고', art: 'record' },
  { key: 'anniversary', label: '생일·함께한 날', art: 'anniversary' },
  { key: 'memorial', label: '추모 기념일', art: 'memorial' },
];
export function NotificationPreferenceGroup() {
  const { query, changing, update, displayedCategories } = useNotificationPreferences();
  if (!query.data) return (
    <View style={styles.pending}>
      {query.isPending ? <ActivityIndicator color={C.purple} /> : <Pressable accessibilityRole="button" onPress={() => { query.refetch().catch(() => {}); }}><AppText preset="bodySm" style={styles.helper}>설정을 불러오지 못했어요. 다시 확인</AppText></Pressable>}
    </View>
  );
  return <View style={styles.card}>{rows.map((row, index) => (
    <View key={row.key} style={[styles.row, index < rows.length - 1 && styles.divider]}>
      <Image source={notificationSettingArt[row.art]} style={styles.icon} resizeMode="contain" />
      <AppText preset="bodyStrong" style={styles.label}>{row.label}</AppText>
      <NotificationToggle label={`${row.label} 알림`} value={displayedCategories[row.key] === true} disabled={changing} onChange={async value => {
        try { await update(row.key, value); }
        catch (error) {
          showToast({ tone: 'error', title: '설정을 저장하지 못했어요', message: '연결을 확인하고 다시 시도해주세요.' });
          throw error;
        }
      }} />
    </View>
  ))}</View>;
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.55)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68, paddingVertical: 12 },
  divider: { borderBottomColor: C.divider, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 44, height: 44, flexShrink: 0 },
  label: { color: C.ink, fontSize: 16, lineHeight: 23, flex: 1, minWidth: 0 },
  helper: { color: C.muted, fontSize: 13, lineHeight: 20 },
  pending: { minHeight: 408, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 16 },
});
