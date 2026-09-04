import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';
import AppText from '../../../../app/ui/AppText';
import type { ActiveScheduleAlarm } from '../../../../services/schedules/activeAlarm';

type Props = {
  alarms: ActiveScheduleAlarm[];
  error: string | null;
  stoppingKeys: ReadonlySet<string>;
  onStop: (alarm: ActiveScheduleAlarm) => Promise<void>;
  onRefresh: () => Promise<void>;
};

export default function HomeActiveAlarmNotice({
  alarms,
  error,
  stoppingKeys,
  onStop,
  onRefresh,
}: Props) {
  const theme = useTheme();
  if (!alarms.length && !error) return null;
  return (
    <View style={[styles.section, { borderColor: theme.colors.border }]}>
      {alarms.map(alarm => {
        const busy = stoppingKeys.has(alarm.token);
        return (
          <View key={alarm.token} style={styles.row} testID="home-active-alarm">
            <Feather name="bell" size={20} color={theme.colors.brand} />
            <View style={styles.content}>
              <AppText
                preset="unifiedMicro"
                color={theme.colors.brand}
                accessibilityLiveRegion="polite"
              >
                알람 울리는 중
              </AppText>
              <AppText preset="unifiedLabel">{alarm.title}</AppText>
              <AppText preset="unifiedBody" color={theme.colors.textSecondary}>
                {alarm.body}
              </AppText>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${alarm.title} 알람 중지`}
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={() => {
                onStop(alarm);
              }}
              style={[styles.stop, { borderColor: theme.colors.border }]}
            >
              {busy ? (
                <ActivityIndicator color={theme.colors.brand} size="small" />
              ) : (
                <Feather
                  name="square"
                  size={16}
                  color={theme.colors.textPrimary}
                />
              )}
              <AppText preset="unifiedLabel">중지</AppText>
            </TouchableOpacity>
          </View>
        );
      })}
      {error ? (
        <View style={styles.error}>
          <AppText
            preset="unifiedBody"
            style={styles.content}
            color={theme.colors.textSecondary}
          >
            {error}
          </AppText>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="알람 상태 다시 확인"
            onPress={() => {
              onRefresh();
            }}
            style={styles.retry}
          >
            <Feather
              name="refresh-cw"
              size={20}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  content: { flex: 1, minWidth: 0, gap: 4 },
  stop: {
    minWidth: 76,
    minHeight: 48,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  error: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  retry: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
