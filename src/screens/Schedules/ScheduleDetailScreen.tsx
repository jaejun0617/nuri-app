import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppText from '../../app/ui/AppText';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  deleteSchedule,
  fetchScheduleById,
  updateSchedule,
  type PetSchedule,
  type ScheduleColorKey,
  type ScheduleIconKey,
} from '../../services/supabase/schedules';
import { useScheduleStore } from '../../store/scheduleStore';
import { styles } from './ScheduleDetailScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScheduleDetail'>;
type Route = {
  key: string;
  name: 'ScheduleDetail';
  params: { petId?: string; scheduleId: string };
};

function formatScheduleDate(schedule: PetSchedule) {
  const date = new Date(schedule.startsAt);
  if (Number.isNaN(date.getTime())) return '';

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const base = `${date.getFullYear()}.${`${date.getMonth() + 1}`.padStart(2, '0')}.${`${date.getDate()}`.padStart(2, '0')} (${weekdays[date.getDay()]})`;

  if (schedule.allDay) return `${base} · 하루 종일`;
  return `${base} · ${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}

function mapScheduleIcon(iconKey: ScheduleIconKey): string {
  switch (iconKey) {
    case 'meal':
    case 'bowl':
      return 'silverware-fork-knife';
    case 'stethoscope':
      return 'stethoscope';
    case 'notebook':
      return 'notebook-outline';
    default:
      return iconKey;
  }
}

function mapColor(colorKey: ScheduleColorKey) {
  switch (colorKey) {
    case 'blue':
      return { bg: 'rgba(59,130,246,0.12)', fg: '#2563EB' };
    case 'green':
      return { bg: 'rgba(34,197,94,0.12)', fg: '#16A34A' };
    case 'orange':
      return { bg: 'rgba(249,115,22,0.12)', fg: '#EA580C' };
    case 'pink':
      return { bg: 'rgba(236,72,153,0.12)', fg: '#DB2777' };
    case 'yellow':
      return { bg: 'rgba(245,158,11,0.12)', fg: '#D97706' };
    case 'gray':
      return { bg: 'rgba(148,163,184,0.12)', fg: '#64748B' };
    case 'brand':
    default:
      return { bg: 'rgba(109,106,248,0.12)', fg: '#6D6AF8' };
  }
}

function formatReminder(reminderMinutes: number[]) {
  if (!reminderMinutes.length) return '알림 없음';
  const value = reminderMinutes[0];
  if (value === 10) return '10분 전';
  if (value === 60) return '1시간 전';
  if (value === 1440) return '하루 전';
  return `${value}분 전`;
}

function formatRepeatRule(rule: PetSchedule['repeatRule']) {
  switch (rule) {
    case 'daily':
      return '매일';
    case 'weekly':
      return '매주';
    case 'monthly':
      return '매월';
    case 'yearly':
      return '매년';
    case 'none':
    default:
      return '반복 안 함';
  }
}

export default function ScheduleDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { petId, scheduleId } = route.params;

  const refresh = useScheduleStore(s => s.refresh);

  const [schedule, setSchedule] = useState<PetSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const next = await fetchScheduleById(scheduleId);
        if (mounted) setSchedule(next);
      } catch (error) {
        if (mounted) {
          Alert.alert(
            '일정 조회 실패',
            error instanceof Error ? error.message : '다시 시도해 주세요.',
          );
          navigation.goBack();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void run();
    return () => {
      mounted = false;
    };
  }, [navigation, scheduleId]);

  const onPressEdit = useCallback(() => {
    navigation.navigate('ScheduleEdit', {
      petId,
      scheduleId,
    });
  }, [navigation, petId, scheduleId]);

  const onPressDelete = useCallback(() => {
    if (deleting) return;

    Alert.alert('일정 삭제', '이 일정을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteSchedule(scheduleId);
            if (petId) await refresh(petId);
            navigation.replace('ScheduleList', { petId });
          } catch (error) {
            Alert.alert(
              '삭제 실패',
              error instanceof Error ? error.message : '다시 시도해 주세요.',
            );
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [deleting, navigation, petId, refresh, scheduleId]);

  const onToggleComplete = useCallback(async () => {
    if (!schedule) return;

    try {
      const nextCompletedAt = schedule.completedAt
        ? null
        : new Date().toISOString();

      await updateSchedule({
        scheduleId: schedule.id,
        petId: schedule.petId,
        title: schedule.title,
        note: schedule.note,
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
        allDay: schedule.allDay,
        category: schedule.category,
        subCategory: schedule.subCategory,
        iconKey: schedule.iconKey,
        colorKey: schedule.colorKey,
        reminderMinutes: schedule.reminderMinutes,
        repeatRule: schedule.repeatRule,
        repeatInterval: schedule.repeatInterval,
        repeatUntil: schedule.repeatUntil,
        linkedMemoryId: schedule.linkedMemoryId,
        completedAt: nextCompletedAt,
        source: schedule.source,
        externalCalendarId: schedule.externalCalendarId,
        externalEventId: schedule.externalEventId,
        syncStatus: schedule.syncStatus,
      });

      const next = await fetchScheduleById(schedule.id);
      setSchedule(next);
      if (petId) await refresh(petId);
    } catch (error) {
      Alert.alert(
        '상태 변경 실패',
        error instanceof Error ? error.message : '다시 시도해 주세요.',
      );
    }
  }, [petId, refresh, schedule]);

  const color = mapColor(schedule?.colorKey ?? 'brand');

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.headerSideBtn}
          onPress={() => navigation.goBack()}
        >
          <AppText preset="body" style={styles.headerSideText}>
            취소
          </AppText>
        </TouchableOpacity>

        <AppText preset="headline" style={styles.headerTitle}>
          일정 상세
        </AppText>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.headerActionBtn}
          onPress={onPressEdit}
          disabled={!schedule}
        >
          <AppText preset="caption" style={styles.headerActionText}>
            수정
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!schedule || loading ? (
          <View style={styles.emptyCard}>
            <AppText preset="body" style={styles.emptyText}>
              일정을 불러오는 중이에요.
            </AppText>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: color.bg }]}>
              <MaterialCommunityIcons
                name={mapScheduleIcon(schedule.iconKey)}
                size={24}
                color={color.fg}
              />
            </View>

            <AppText preset="headline" style={styles.title}>
              {schedule.title}
            </AppText>

            <View style={styles.metaBlock}>
              <AppText preset="caption" style={styles.metaLabel}>
                일정 시간
              </AppText>
              <AppText preset="body" style={styles.metaValue}>
                {formatScheduleDate(schedule)}
              </AppText>
            </View>

            <View style={styles.metaBlock}>
              <AppText preset="caption" style={styles.metaLabel}>
                카테고리
              </AppText>
              <AppText preset="body" style={styles.metaValue}>
                {schedule.category}
                {schedule.subCategory ? ` · ${schedule.subCategory}` : ''}
              </AppText>
            </View>

            <View style={styles.metaBlock}>
              <AppText preset="caption" style={styles.metaLabel}>
                반복
              </AppText>
              <AppText preset="body" style={styles.metaValue}>
                {formatRepeatRule(schedule.repeatRule)}
              </AppText>
            </View>

            <View style={styles.metaBlock}>
              <AppText preset="caption" style={styles.metaLabel}>
                알림
              </AppText>
              <AppText preset="body" style={styles.metaValue}>
                {formatReminder(schedule.reminderMinutes)}
              </AppText>
            </View>

            <View style={styles.metaBlock}>
              <AppText preset="caption" style={styles.metaLabel}>
                완료 상태
              </AppText>
              <AppText preset="body" style={styles.metaValue}>
                {schedule.completedAt ? '완료됨' : '진행 중'}
              </AppText>
            </View>

            <View style={styles.metaBlock}>
              <AppText preset="caption" style={styles.metaLabel}>
                메모
              </AppText>
              <AppText preset="body" style={styles.metaValue}>
                {schedule.note?.trim() || '남겨둔 메모가 없어요.'}
              </AppText>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.primaryBtn}
              onPress={onPressEdit}
            >
              <Feather name="edit-2" size={16} color="#FFFFFF" />
              <AppText preset="body" style={styles.primaryBtnText}>
                일정 수정하기
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.secondaryBtn}
              onPress={onToggleComplete}
            >
              <AppText preset="body" style={styles.secondaryBtnText}>
                {schedule.completedAt ? '완료 해제' : '일정 완료 처리'}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.deleteBtn}
              onPress={onPressDelete}
            >
              <AppText preset="body" style={styles.deleteBtnText}>
                {deleting ? '삭제 중...' : '일정 삭제'}
              </AppText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
