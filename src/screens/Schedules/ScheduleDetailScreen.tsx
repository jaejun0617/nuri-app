// 파일: src/screens/Schedules/ScheduleDetailScreen.tsx
// 역할:
// - 일정 단건 상세 조회와 완료 처리, 수정 이동, 삭제를 담당
// - 서버 단건 조회 결과를 기준으로 상세 카드와 메타 정보를 렌더링
// - 변경 후에는 schedule store를 갱신해 홈/목록과의 상태 일관성을 유지

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppText from '../../app/ui/AppText';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { createLatestRequestController } from '../../services/app/async';
import { getErrorMessage } from '../../services/app/errors';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import {
  deleteSchedule,
  fetchScheduleById,
  updateSchedule,
  type PetSchedule,
} from '../../services/supabase/schedules';
import {
  clearScheduleNotification,
  upsertScheduleNotification,
} from '../../services/schedules/notifications';
import {
  formatScheduleDetailDate,
  getScheduleColorPalette,
  mapScheduleIconName,
} from '../../services/schedules/presentation';
import { usePetStore } from '../../store/petStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { styles } from './ScheduleDetailScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScheduleDetail'>;
type Route = RootScreenRoute<'ScheduleDetail'>;

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
  const insets = useSafeAreaInsets();
  const { petId, scheduleId } = route.params;

  const refresh = useScheduleStore(s => s.refresh);
  const pets = usePetStore(s => s.pets);

  const [schedule, setSchedule] = useState<PetSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const selectedPet = useMemo(
    () => pets.find(candidate => candidate.id === petId) ?? pets[0] ?? null,
    [petId, pets],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );

  useEffect(() => {
    const request = createLatestRequestController();

    async function run() {
      const requestId = request.begin();
      try {
        const next = await fetchScheduleById(scheduleId);
        if (request.isCurrent(requestId)) setSchedule(next);
      } catch (error: unknown) {
        if (request.isCurrent(requestId)) {
          Alert.alert('일정 조회 실패', getErrorMessage(error));
          navigation.goBack();
        }
      } finally {
        if (request.isCurrent(requestId)) setLoading(false);
      }
    }

    run().catch(() => {
      // handled inside run
    });
    return () => {
      request.cancel();
    };
  }, [navigation, scheduleId]);

  const onPressEdit = useCallback(() => {
    navigation.navigate('ScheduleEdit', {
      petId,
      scheduleId,
      entrySource: route.params?.entrySource,
    });
  }, [navigation, petId, route.params?.entrySource, scheduleId]);

  const onPressDelete = useCallback(() => {
    if (deleting) return;
    setDeleteConfirmVisible(true);
  }, [deleting]);

  const executeDelete = useCallback(async () => {
    try {
      setDeleting(true);
      setDeleteConfirmVisible(false);
      await deleteSchedule(scheduleId);
      clearScheduleNotification(scheduleId);
      if (petId) await refresh(petId);
      navigation.replace('ScheduleList', { petId });
    } catch (error: unknown) {
      Alert.alert('삭제 실패', getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }, [navigation, petId, refresh, scheduleId]);

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

      if (nextCompletedAt) {
        clearScheduleNotification(schedule.id);
      } else {
        await upsertScheduleNotification({
          id: schedule.id,
          petId: schedule.petId,
          title: schedule.title,
          note: schedule.note,
          startsAt: schedule.startsAt,
          repeatRule: schedule.repeatRule,
          reminderMinutes: schedule.reminderMinutes,
          completedAt: nextCompletedAt,
        });
      }

      const next = await fetchScheduleById(schedule.id);
      setSchedule(next);
      if (petId) await refresh(petId);
    } catch (error: unknown) {
      Alert.alert('상태 변경 실패', getErrorMessage(error));
    }
  }, [petId, refresh, schedule]);

  const color = getScheduleColorPalette(schedule?.colorKey ?? 'brand');
  const headerTopInset = Math.max(insets.top, 12);

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { paddingTop: headerTopInset + 4 }]}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>

        <AppText preset="headline" style={styles.headerTitle}>
          일정 상세
        </AppText>

        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]}>
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
                name={mapScheduleIconName(schedule.iconKey)}
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
              {formatScheduleDetailDate(schedule)}
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
      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="일정을 삭제할까요?"
        message={'이 일정은 목록과 홈 카드에서 함께 사라지며\n삭제 후에는 다시 되돌릴 수 없어요.'}
        cancelLabel="계속 유지하기"
        confirmLabel={deleting ? '삭제 중...' : '일정 삭제'}
        tone="danger"
        accentColor={petTheme.primary}
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={() => {
          executeDelete().catch(() => {});
        }}
      />
    </SafeAreaView>
  );
}
