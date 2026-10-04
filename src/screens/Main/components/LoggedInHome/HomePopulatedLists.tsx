import React, { memo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import Feather from '../../../../components/icons/NuriFeatherIcon';
import NuriSemanticIcon from '../../../../components/icons/NuriSemanticIcon';
import AppText from '../../../../app/ui/AppText';
import type { PetSchedule } from '../../../../services/supabase/schedules';
import type { HealthActivityItem } from '../../../../services/health-report/viewModel';
import {
  formatScheduleDateLabel,
  mapScheduleIconName,
} from '../../../../services/schedules/presentation';
import { formatYmdToDots, getKstDateParts } from '../../../../utils/date';
import { resolveHomePopulatedLayout } from './homePopulatedLayout';

// Emphasis follows actual future timestamps, never a fabricated rank or reordered list.
export function getNextHomeScheduleId(
  items: PetSchedule[],
  now: number,
): string | null {
  let next: PetSchedule | null = null;
  let earliest = Infinity;
  for (const item of items) {
    const timestamp = new Date(item.startsAt).getTime();
    if (
      !item.completedAt &&
      Number.isFinite(timestamp) &&
      timestamp >= now &&
      timestamp < earliest
    ) {
      next = item;
      earliest = timestamp;
    }
  }
  return next?.id ?? null;
}

const HEALTH_KIND = {
  hospital: { label: '병원', icon: 'plus-square' },
  medicine: { label: '약', icon: 'droplet' },
  checkup: { label: '검진', icon: 'clipboard' },
  vaccine: { label: '접종', icon: 'shield' },
  symptom: { label: '증상', icon: 'activity' },
  health: { label: '건강', icon: 'heart' },
} as const;

export const HomeScheduleList = memo(function HomeScheduleListView({
  items,
  activeScheduleIds,
  accentColor,
  accentTint,
  onPress,
}: {
  items: PetSchedule[];
  activeScheduleIds: ReadonlySet<string>;
  accentColor: string;
  accentTint: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const { stackedMetadata } = resolveHomePopulatedLayout(width, fontScale);
  const nextId = getNextHomeScheduleId(items, Date.now());
  return (
    <View style={styles.scheduleList}>
      {items.map((item, index) => {
        const date = getKstDateParts(item.startsAt);
        const dateLabel = formatScheduleDateLabel(item);
        const isNext = item.id === nextId;
        const ringing = activeScheduleIds.has(item.id);
        return (
          <TouchableOpacity
            key={item.id}
            testID={`home-schedule-row-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${dateLabel}, ${item.title}${
              ringing ? ', 알람 울리는 중' : ''
            }, 일정 보기`}
            onPress={onPress}
            activeOpacity={0.9}
            style={[
              styles.scheduleRow,
              index > 0 && styles.divider,
              { borderColor: theme.colors.border },
            ]}
          >
            {!stackedMetadata && date ? (
              <View
                style={[styles.dateColumn, { backgroundColor: accentTint }]}
                pointerEvents="none"
              >
                <AppText preset="caption" color={accentColor}>
                  {date.month}월
                </AppText>
                <AppText
                  preset="titleLg"
                  style={styles.day}
                  color={accentColor}
                >
                  {date.day}
                </AppText>
              </View>
            ) : null}
            <View style={styles.body} pointerEvents="none">
              <View style={styles.metadata}>
                <NuriSemanticIcon
                  family="material"
                  name={mapScheduleIconName(item.iconKey)}
                  size={17}
                  color={accentColor}
                />
                <AppText
                  preset="unifiedDate"
                  style={styles.dateText}
                  color={theme.colors.textMuted}
                >
                  {dateLabel}
                </AppText>
              </View>
              {isNext ? (
                <AppText preset="unifiedMicro" color={accentColor}>
                  다가오는 일정
                </AppText>
              ) : null}
              <AppText
                preset="cardTitle"
                style={isNext ? styles.scheduleLeadTitle : styles.title}
                color={theme.colors.textPrimary}
              >
                {item.title}
              </AppText>
              {ringing ? (
                <AppText preset="unifiedMicro" color={accentColor}>
                  알람 울리는 중
                </AppText>
              ) : null}
              <AppText
                preset="unifiedBody"
                color={theme.colors.textMuted}
                numberOfLines={2}
              >
                {item.note?.trim() ||
                  (item.allDay
                    ? '하루 일정으로 저장된 항목이에요'
                    : '예정된 일정이에요')}
              </AppText>
            </View>
            <Feather name="chevron-right" size={18} color={accentColor} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

export const HomeHealthActivityList = memo(function HomeHealthActivityListView({
  items,
  accentColor,
  onPress,
}: {
  items: HealthActivityItem[];
  accentColor: string;
  onPress: (ymd: string) => void;
}) {
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const { stackedMetadata } = resolveHomePopulatedLayout(width, fontScale);
  return (
    <View>
      {items.map((item, index) => {
        const kind = HEALTH_KIND[item.kind];
        const date = formatYmdToDots(item.ymd) ?? item.ymd;
        const title = item.title.trim() || kind.label;
        return (
          <TouchableOpacity
            key={item.id}
            testID={`home-health-row-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${date}, ${kind.label}, ${title}, ${item.subtitle}, 건강 활동 보기`}
            onPress={() => onPress(item.ymd)}
            activeOpacity={0.9}
            style={styles.activityRow}
          >
            {index < items.length - 1 ? (
              <View
                style={[
                  styles.timelineLine,
                  { backgroundColor: `${accentColor}24` },
                ]}
                pointerEvents="none"
              />
            ) : null}
            <View
              style={[
                styles.activityIcon,
                { backgroundColor: `${accentColor}14` },
              ]}
              pointerEvents="none"
            >
              <NuriSemanticIcon family="feather" name={kind.icon} size={18} color={accentColor} />
            </View>
            <View style={styles.body} pointerEvents="none">
              <View
                style={[
                  styles.activityMetadata,
                  stackedMetadata && styles.stacked,
                ]}
              >
                <AppText preset="unifiedMicro" color={accentColor}>
                  {kind.label}
                </AppText>
                <AppText
                  preset="unifiedDate"
                  style={styles.dateText}
                  color={theme.colors.textMuted}
                >
                  {date}
                </AppText>
              </View>
              <AppText
                preset="cardTitle"
                style={styles.title}
                color={theme.colors.textPrimary}
              >
                {title}
              </AppText>
              <AppText
                preset="unifiedBody"
                numberOfLines={2}
                color={theme.colors.textMuted}
              >
                {item.subtitle}
              </AppText>
            </View>
            <Feather
              name="chevron-right"
              size={16}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  scheduleList: { gap: 0 },
  scheduleRow: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  dateColumn: {
    width: 52,
    minHeight: 70,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    flexShrink: 0,
  },
  day: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  body: { flex: 1, minWidth: 0, gap: 6 },
  metadata: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dateText: { flexShrink: 1, minWidth: 0 },
  scheduleLeadTitle: { fontSize: 21, lineHeight: 29, fontWeight: '600' },
  title: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  activityRow: {
    minHeight: 100,
    paddingTop: 6,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timelineLine: {
    position: 'absolute',
    left: 18.5,
    width: 1,
    top: 44,
    bottom: 0,
  },
  activityMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  stacked: { alignItems: 'flex-start', flexDirection: 'column', gap: 2 },
});
