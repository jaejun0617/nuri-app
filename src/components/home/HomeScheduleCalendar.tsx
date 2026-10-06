import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import Feather from '../icons/NuriFeatherIcon';
import AppText from '../../app/ui/AppText';
import { SectionHeaderAction } from '../../app/ui/SectionHeaderAction';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';
import type { PetSchedule } from '../../services/supabase/schedules';
import {
  getScheduleColorPalette,
  mapScheduleIconName,
} from '../../services/schedules/presentation';
import { getKstYmd } from '../../utils/date';
import type { SeasonKey } from '../../theme/seasonal/season';
import { ScheduleCalendarSheet } from './ScheduleCalendarSheet';
import { HomeFrostedGlass } from './HomeFrostedGlass';
import {
  buildHomeScheduleCalendar,
  homeCalendarDayLabel,
  homeCalendarMonth,
  homeCalendarTimeLabel,
  shiftHomeCalendarMonth,
  type HomeScheduleOccurrence,
} from './homeScheduleCalendarModel';

type Props = {
  petId: string;
  items: readonly PetSchedule[];
  dataState: 'ready' | 'loading' | 'error';
  season: SeasonKey;
  activeScheduleIds: ReadonlySet<string>;
  accentColor: string;
  accentDeepColor: string;
  isFocused: boolean;
  onPressAll: () => void;
  onPressDetail: (scheduleId: string) => void;
};

/** Calendar, one-row Home preview and a bounded day agenda share one read-only model. */
export const HomeScheduleCalendar = memo(function HomeScheduleCalendarView({
  petId,
  items,
  dataState,
  season,
  activeScheduleIds,
  accentColor,
  accentDeepColor,
  isFocused,
  onPressAll,
  onPressDetail,
}: Props) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const [today, setToday] = useState(() => getKstYmd());
  const [month, setMonth] = useState(() => homeCalendarMonth(today));
  const [selectedDay, setSelectedDay] = useState(today);
  const [sheetMode, setSheetMode] = useState<'agenda' | 'create' | null>(null);
  useEffect(() => {
    if (!isFocused) {
      setSheetMode(null);
      return;
    }
    const refreshDay = () => setToday(getKstYmd());
    refreshDay();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshDay();
    });
    const timer = setInterval(refreshDay, 60000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [isFocused]);
  const days = useMemo(
    () => buildHomeScheduleCalendar(month, items),
    [month, items],
  );
  const selected = days.find(day => day.ymd === selectedDay);
  const agenda = selected?.occurrences ?? [];
  const canConfirmEmpty = dataState === 'ready';
  const rowHeight = fontScale >= 1.3 ? 54 : 44;
  const monthLabel = `${Number(month.slice(0, 4))}년 ${Number(
    month.slice(5, 7),
  )}월`;
  const navigateMonth = (amount: number) => {
    const next = shiftHomeCalendarMonth(month, amount);
    setMonth(next);
    setSelectedDay(next);
  };
  const openDay = (ymd: string) => {
    setSelectedDay(ymd);
    setMonth(homeCalendarMonth(ymd));
    const found = days.find(day => day.ymd === ymd);
    setSheetMode(
      dataState === 'ready' && !found?.occurrences.length ? 'create' : 'agenda',
    );
  };
  const create = () => {
    setSheetMode('create');
  };
  const detail = (id: string) => {
    setSheetMode(null);
    onPressDetail(id);
  };
  const renderOccurrence = (item: HomeScheduleOccurrence, preview = false) => (
    <Pressable
      testID={`home-calendar-${preview ? 'preview' : 'agenda'}-${
        item.schedule.id
      }`}
      accessibilityRole="button"
      accessibilityLabel={`${homeCalendarTimeLabel(item, selectedDay)}, ${
        item.schedule.title
      }, 일정 상세 보기`}
      onPress={() => detail(item.schedule.id)}
      style={({ pressed }) => [
        styles.agendaRow,
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <NuriSemanticIcon
        family="material"
        name={mapScheduleIconName(item.schedule.iconKey)}
        size={32}
        color={accentColor}
      />
      <View style={styles.agendaBody}>
        <AppText preset="unifiedMicro" color={theme.colors.textMuted}>
          {homeCalendarTimeLabel(item, selectedDay)}
          {item.schedule.repeatRule !== 'none' ? ' · 반복' : ''}
          {item.schedule.completedAt ? ' · 완료' : ''}
        </AppText>
        <AppText
          preset="cardTitle"
          color={theme.colors.textPrimary}
          numberOfLines={preview ? 2 : undefined}
        >
          {item.schedule.title}
        </AppText>
        {activeScheduleIds.has(item.schedule.id) ? (
          <AppText preset="unifiedMicro" color={accentColor}>
            알람 울리는 중
          </AppText>
        ) : null}
        {!preview && item.schedule.note?.trim() ? (
          <AppText preset="unifiedBody" color={theme.colors.textMuted}>
            {item.schedule.note}
          </AppText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={accentColor} />
    </Pressable>
  );
  const statusText =
    dataState === 'error'
      ? '일정을 불러오지 못했어요'
      : dataState === 'loading'
      ? '일정을 불러오고 있어요'
      : '';
  return (
    <HomeFrostedGlass
      testID="home-glass-schedule"
      season={season}
      style={styles.section}
    >
      <View style={[styles.header, fontScale >= 1.3 && styles.stackedHeader]}>
        <AppText
          accessibilityRole="header"
          preset="unifiedTitle"
          styleOverridesPreset
          color={accentDeepColor}
          style={[
            styles.headerTitle,
            fontScale >= 1.3 && styles.stackedHeaderTitle,
          ]}
        >
          우리 아이 일정
        </AppText>
        {!(canConfirmEmpty && items.length === 0) ? (
          <SectionHeaderAction
            label="전체 일정"
            color={accentDeepColor}
            onPress={onPressAll}
            accessibilityLabel="전체 일정 목록 보기"
            size="compact"
            textPreset="unifiedMicro"
          />
        ) : null}
      </View>
      <View style={styles.monthBar}>
        <Pressable
          testID="home-calendar-previous"
          accessibilityRole="button"
          accessibilityLabel="이전 달"
          onPress={() => navigateMonth(-1)}
          style={styles.iconButton}
        >
          <Feather name="chevron-left" size={20} color={accentDeepColor} />
        </Pressable>
        <AppText
          accessibilityRole="header"
          preset="cardTitle"
          color={theme.colors.textPrimary}
          style={styles.monthTitle}
        >
          {monthLabel}
        </AppText>
        <Pressable
          testID="home-calendar-next"
          accessibilityRole="button"
          accessibilityLabel="다음 달"
          onPress={() => navigateMonth(1)}
          style={styles.iconButton}
        >
          <Feather name="chevron-right" size={20} color={accentDeepColor} />
        </Pressable>
      </View>
      <View
        style={styles.weekdays}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {['일', '월', '화', '수', '목', '금', '토'].map((label, index) => (
          <View key={label} style={styles.column}>
            <AppText
              preset="unifiedMicro"
              color={
                index === 0
                  ? '#C45955'
                  : index === 6
                  ? '#5377B5'
                  : theme.colors.textMuted
              }
            >
              {label}
            </AppText>
          </View>
        ))}
      </View>
      <View testID="home-calendar-grid" style={styles.grid}>
        {days.map(day => {
          const isSelected = day.ymd === selectedDay;
          const isToday = day.ymd === today;
          const color = isSelected
            ? '#FFFFFF'
            : !day.inMonth
            ? theme.colors.textMuted
            : day.weekday === 0
            ? '#C45955'
            : day.weekday === 6
            ? '#5377B5'
            : theme.colors.textPrimary;
          return (
            <Pressable
              key={day.ymd}
              testID={`home-calendar-day-${day.ymd}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${homeCalendarDayLabel(day.ymd)}${
                isToday ? ', 오늘' : ''
              }, ${
                dataState === 'ready'
                  ? `일정 ${day.occurrences.length}개`
                  : '일정 확인 중'
              }, 날짜별 일정 보기`}
              onPress={() => openDay(day.ymd)}
              style={[styles.cell, { minHeight: rowHeight }]}
            >
              <View
                style={[
                  styles.dayNumber,
                  {
                    backgroundColor: isSelected ? accentColor : 'transparent',
                    borderColor: isToday ? accentColor : 'transparent',
                    opacity: day.inMonth ? 1 : 0.58,
                  },
                ]}
              >
                <AppText preset="unifiedLabel" color={color}>
                  {day.day}
                </AppText>
              </View>
              <View style={styles.dots} pointerEvents="none">
                {day.occurrences.slice(0, 3).map(item => (
                  <View
                    key={item.key}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: getScheduleColorPalette(
                          item.schedule.colorKey,
                        ).fg,
                      },
                    ]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.preview, { borderColor: `${accentColor}20` }]}>
        <View style={styles.previewHeader}>
          <AppText preset="unifiedLabel" color={accentDeepColor}>
            {homeCalendarDayLabel(selectedDay)}
          </AppText>
          {canConfirmEmpty ? (
            <AppText preset="unifiedMicro" color={theme.colors.textMuted}>
              일정 {agenda.length}개
            </AppText>
          ) : null}
        </View>
        {statusText ? (
          <AppText
            accessibilityLiveRegion="polite"
            preset="unifiedMicro"
            color={theme.colors.textMuted}
          >
            {statusText}
          </AppText>
        ) : null}
        {agenda[0] ? (
          renderOccurrence(agenda[0], true)
        ) : canConfirmEmpty ? (
          <AppText preset="unifiedBody" color={theme.colors.textMuted}>
            아직 등록된 일정이 없어요
          </AppText>
        ) : null}
        {agenda.length > 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="선택 날짜의 모든 일정 보기"
            onPress={() => setSheetMode('agenda')}
            style={styles.moreDay}
          >
            <AppText preset="unifiedMicro" color={accentDeepColor}>
              이날 일정 {agenda.length}개 보기
            </AppText>
            <Feather name="chevron-right" size={14} color={accentDeepColor} />
          </Pressable>
        ) : null}
        <CtaButton
          role="primary"
          visuallyHidden={sheetMode !== null}
          testID="home-calendar-create"
          accessibilityRole="button"
          accessibilityLabel={`${homeCalendarDayLabel(selectedDay)} 일정 등록`}
          onPress={create}
          disabled={sheetMode !== null}
          accessibilityElementsHidden={sheetMode !== null}
          importantForAccessibility={
            sheetMode !== null ? 'no-hide-descendants' : 'auto'
          }
          style={() => [
            styles.createButton,
            {
              opacity: sheetMode !== null ? 0 : 1,
            },
          ]}
        >
          <CtaText preset="unifiedLabel" style={styles.centeredText}>
            일정 등록하기
          </CtaText>
        </CtaButton>
      </View>
      {sheetMode ? (
        <ScheduleCalendarSheet
          key={selectedDay}
          petId={petId}
          day={selectedDay}
          occurrences={agenda}
          initialMode={sheetMode}
          dataState={dataState}
          season={season}
          accentColor={accentColor}
          accentDeepColor={accentDeepColor}
          onClose={() => setSheetMode(null)}
          onSaved={ymd => {
            setSelectedDay(ymd);
            setMonth(homeCalendarMonth(ymd));
            setSheetMode(null);
          }}
          onDetail={detail}
        />
      ) : null}
    </HomeFrostedGlass>
  );
});

const styles = StyleSheet.create({
  section: { padding: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: 0,
  },
  stackedHeader: { flexDirection: 'column', alignItems: 'flex-end' },
  stackedHeaderTitle: { width: '100%', flex: 0 },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: { flex: 1, minWidth: 0, textAlign: 'center' },
  weekdays: { flexDirection: 'row', marginBottom: 6 },
  column: { width: '14.285714%', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.285714%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  dayNumber: {
    minWidth: 34,
    minHeight: 28,
    paddingHorizontal: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    height: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  dot: { width: 4, height: 4, borderRadius: 2 },
  preview: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 8 },
  previewHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  agendaBody: { flex: 1, minWidth: 0, gap: 4 },
  moreDay: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  createButton: {
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: { textAlign: 'center' },
});
