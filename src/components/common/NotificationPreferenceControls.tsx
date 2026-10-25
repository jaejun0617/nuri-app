import React, { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppText from '../../app/ui/AppText';
import { supabase } from '../../services/supabase/client';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../store/uiStore';
import { readNativePushChannelStates } from '../../services/notifications/nativePush';

const categories = [
  ['service', '누리 소식'],
  ['community', '댓글·답글·공감'],
  ['activity', '칭호·레벨'],
  ['record', '주간·월간 회고'],
  ['anniversary', '생일·함께한 날'],
  ['memorial', '추모 기념일'],
] as const;
function parse(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || !('categories' in value))
    throw new Error('NURI_NOTIFICATION_SETTINGS_INVALID');
  const raw = value.categories;
  if (!raw || typeof raw !== 'object')
    throw new Error('NURI_NOTIFICATION_SETTINGS_INVALID');
  return Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === 'boolean',
    ),
  );
}
export default function NotificationPreferenceControls() {
  const userId = useAuthStore(s => s.session?.user.id ?? null);
  const client = useQueryClient(),
    [saving, setSaving] = useState(false);
  const key = ['notifications-v3', userId, 'preferences'];
  const channels = useQuery({
    queryKey: ['notifications-v3', userId, 'android-channels'],
    queryFn: readNativePushChannelStates,
    enabled: Boolean(userId),
    staleTime: 0,
  });
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    refetchOnMount: true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'manage_user_notification_preferences_v3',
      );
      if (error) throw error;
      return parse(data);
    },
  });
  const toggle = async (name: string, value: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc(
        'manage_user_notification_preferences_v3',
        { p_categories: { [name]: value } },
      );
      if (error) throw error;
      if (useAuthStore.getState().session?.user.id === userId)
        client.setQueryData(key, parse(data));
    } catch {
      showToast({
        tone: 'error',
        title: '설정을 저장하지 못했어요',
        message: '연결 상태를 확인하고 다시 시도해주세요.',
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={styles.section}>
      <AppText preset="sectionTitle">푸시 알림 종류</AppText>
      {query.isError ? (
        <AppText
          preset="bodySm"
          onPress={() => {
            query.refetch().catch(() => {});
          }}
        >
          설정을 불러오지 못했어요. 다시 확인
        </AppText>
      ) : (
        categories.map(([name, label]) => (
          <View key={name} style={styles.row}>
            <View style={styles.label}>
              <AppText preset="bodySm">{label}</AppText>
              {channels.data?.[
                name === 'service'
                  ? 'news'
                  : name === 'community'
                  ? 'community'
                  : name === 'activity'
                  ? 'activity'
                  : 'record'
              ] === false ? (
                <AppText preset="caption">Android에서 꺼짐</AppText>
              ) : null}
            </View>
            <Switch
              accessibilityLabel={`${label} 알림`}
              disabled={saving || !query.data}
              value={query.data?.[name] === true}
              onValueChange={value => {
                toggle(name, value);
              }}
              trackColor={{ false: '#D8D5DF', true: '#A887EB' }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: 8, paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    gap: 12,
  },
  label: { flexShrink: 1 },
});
