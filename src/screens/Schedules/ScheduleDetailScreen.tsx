// 파일: src/screens/Schedules/ScheduleDetailScreen.tsx
// 역할:
// - 일정 단건 상세 조회와 완료 처리, 수정 이동, 삭제를 담당
// - 서버 단건 조회 결과를 기준으로 상세 카드와 메타 정보를 렌더링
// - 변경 후에는 schedule store를 갱신해 홈/목록과의 상태 일관성을 유지

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
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
import { formatReminderMinutesSummary } from '../../services/schedules/form';
import {
  formatScheduleCategoryLabel,
  formatScheduleDetailDate,
  mapScheduleIconName,
} from '../../services/schedules/presentation';
import { usePetStore } from '../../store/petStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { styles } from './ScheduleDetailScreen.styles';
import { getDateYmdInKst } from '../../utils/date';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScheduleDetail'>;
type Route = RootScreenRoute<'ScheduleDetail'>;
type HealthReportCacheActivity = {
  source: 'memory' | 'schedule';
  scheduleId?: string;
  ymd: string;
  completedAt?: string | null;
};
type HealthReportCache = {
  activityItems: HealthReportCacheActivity[];
  groupedActivities: Record<string, HealthReportCacheActivity[]>;
  latestActivityYmd: string | null;
};

function formatReminder(reminderMinutes: number[]) {
  return formatReminderMinutesSummary(reminderMinutes);
}

function buildScheduleCompletedAtForPersist(startsAt: string) {
  const startsAtTime = new Date(startsAt).getTime();
  const now = Date.now();
  if (Number.isNaN(startsAtTime)) {
    return new Date(now).toISOString();
  }
  return new Date(Math.max(now, startsAtTime)).toISOString();
}

function getScheduleStatusErrorMessage(error: unknown) {
  const message = getErrorMessage(error);
  if (message.includes('pet_schedules_completed_at_check')) {
    return '아직 남아 있는 시간과 관계없이 이 일정을 먼저 마친 일정으로 정리할 수 있어요.\n잠시 후 다시 한 번만 시도해 주세요.';
  }
  return message;
}

function groupActivitiesByYmd(items: HealthReportCacheActivity[]) {
  return items.reduce<Record<string, HealthReportCacheActivity[]>>((acc, item) => {
    acc[item.ymd] = [...(acc[item.ymd] ?? []), item];
    return acc;
  }, {});
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
  const queryClient = useQueryClient();
  const { petId, scheduleId } = route.params;

  const refresh = useScheduleStore(s => s.refresh);
  const pets = usePetStore(s => s.pets);

  const [schedule, setSchedule] = useState<PetSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [completeConfirmVisible, setCompleteConfirmVisible] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const selectedPet = useMemo(
    () => pets.find(candidate => candidate.id === petId) ?? pets[0] ?? null,
    [petId, pets],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );

  useFocusEffect(
    useCallback(() => {
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

      setLoading(true);
      run().catch(() => {
        // handled inside run
      });

      return () => {
        request.cancel();
      };
    }, [navigation, scheduleId]),
  );

  const onPressEdit = useCallback(() => {
    navigation.navigate('ScheduleEdit', {
      petId,
      scheduleId,
      entrySource: route.params?.entrySource,
      returnTo:
        route.params?.entrySource === 'more'
          ? { screen: 'HealthReport', initialTab: 'records' }
          : undefined,
    });
  }, [navigation, petId, route.params?.entrySource, scheduleId]);

  const goBackToList = useCallback(
    (focusYmd?: string | null) => {
      if (route.params?.entrySource === 'more') {
        navigation.replace('HealthReport', {
          petId: petId ?? undefined,
          initialTab: 'records',
          focusYmd: focusYmd ?? undefined,
          entrySource: 'more',
        });
        return;
      }

      navigation.replace('ScheduleList', { petId });
    },
    [navigation, petId, route.params?.entrySource],
  );

  const onPressDelete = useCallback(() => {
    if (deleting) return;
    setDeleteConfirmVisible(true);
  }, [deleting]);

  const executeDelete = useCallback(async () => {
    try {
      setDeleting(true);
      setDeleteConfirmVisible(false);
      const deletedFocusYmd = schedule ? getDateYmdInKst(schedule.startsAt) : null;
      await deleteSchedule(scheduleId);
      clearScheduleNotification(scheduleId);
      if (petId) {
        await queryClient.setQueriesData<HealthReportCache>(
          { queryKey: ['health-report', 'month', petId] },
          current => {
            if (!current) return current;
            const activityItems = current.activityItems.filter(
              item =>
                !(item.source === 'schedule' && item.scheduleId === scheduleId),
            );
            return {
              ...current,
              activityItems,
              groupedActivities: groupActivitiesByYmd(activityItems),
              latestActivityYmd: activityItems[0]?.ymd ?? null,
            };
          },
        );
        refresh(petId).catch(() => {});
      }
      goBackToList(deletedFocusYmd);
    } catch (error: unknown) {
      setFeedbackDialog({
        title: '삭제 실패',
        message: getErrorMessage(error),
      });
    } finally {
      setDeleting(false);
    }
  }, [goBackToList, petId, queryClient, refresh, schedule, scheduleId]);

  const executeToggleComplete = useCallback(async () => {
    if (!schedule) return;

    try {
      const nextCompletedAt = schedule.completedAt
        ? null
        : buildScheduleCompletedAtForPersist(schedule.startsAt);

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

      setSchedule({
        ...schedule,
        completedAt: nextCompletedAt,
      });
      if (petId) {
        await queryClient.setQueriesData<HealthReportCache>(
          { queryKey: ['health-report', 'month', petId] },
          current => {
            if (!current) return current;
            const activityItems = current.activityItems.map(item =>
              item.source === 'schedule' && item.scheduleId === schedule.id
                ? { ...item, completedAt: nextCompletedAt }
                : item,
            );
            return {
              ...current,
              activityItems,
              groupedActivities: groupActivitiesByYmd(activityItems),
            };
          },
        );
        refresh(petId).catch(() => {});
      }
      goBackToList(getDateYmdInKst(schedule.startsAt));
    } catch (error: unknown) {
      setFeedbackDialog({
        title: '상태 변경 실패',
        message: getScheduleStatusErrorMessage(error),
      });
    }
  }, [goBackToList, petId, queryClient, refresh, schedule]);

  const onToggleComplete = useCallback(() => {
    if (!schedule) return;
    if (!schedule.completedAt && new Date(schedule.startsAt).getTime() > Date.now()) {
      setCompleteConfirmVisible(true);
      return;
    }
    setCompleteConfirmVisible(false);
    executeToggleComplete().catch(() => {});
  }, [executeToggleComplete, schedule]);

  const headerTopInset = Math.max(insets.top, 12);

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { paddingTop: headerTopInset + 4 }]}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>

        <AppText preset="headline" style={styles.headerTitle}>
          일정 상세
        </AppText>

        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
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
          <>
          <View style={[styles.hero, { backgroundColor: petTheme.tint, borderColor: petTheme.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: petTheme.soft }]}>
              <MaterialCommunityIcons
                name={mapScheduleIconName(schedule.iconKey)}
                size={24}
                color={petTheme.primary}
              />
            </View>
            <View style={styles.heroTextWrap}>
              <AppText preset="headline" style={styles.title}>
                {schedule.title}
              </AppText>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: schedule.completedAt
                      ? 'rgba(34,197,94,0.12)'
                      : `${petTheme.primary}12`,
                  },
                ]}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.statusBadgeText,
                    {
                      color: schedule.completedAt ? '#15803D' : petTheme.primary,
                    },
                  ]}
                >
                  {schedule.completedAt ? '완료됨' : '진행 중'}
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.section}>
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
                {formatScheduleCategoryLabel(schedule)}
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
          </View>

          <View style={styles.section}>
            <View style={styles.metaBlock}>
              <AppText preset="caption" style={styles.metaLabel}>
                메모
              </AppText>
              <AppText preset="body" style={styles.metaValue}>
                {schedule.note?.trim() || '남겨둔 메모가 없어요.'}
              </AppText>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.primaryBtn, { backgroundColor: petTheme.primary }]}
              onPress={onPressEdit}
            >
              <Feather name="edit-2" size={16} color="#FFFFFF" />
              <AppText preset="body" style={styles.primaryBtnText}>
                일정 수정하기
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: schedule.completedAt
                    ? '#F3F4F6'
                    : petTheme.tint,
                },
              ]}
              onPress={onToggleComplete}
            >
              <AppText
                preset="body"
                style={[
                  styles.secondaryBtnText,
                  { color: schedule.completedAt ? '#475569' : petTheme.primary },
                ]}
              >
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
          </>
        )}
      </ScrollView>
      <ConfirmDialog
        visible={completeConfirmVisible}
        title="지금 일정 마침으로 정리할까요?"
        message={
          '아직 일정 시간이 남아 있어도 건강관리에서 먼저 마친 일정으로 정리할 수 있어요.\n확인을 누르면 바로 완료 상태로 바뀌고 리스트에서도 정리됩니다.'
        }
        confirmLabel="완료로 정리"
        cancelLabel="계속 보기"
        tone="warning"
        accentColor={petTheme.primary}
        onCancel={() => setCompleteConfirmVisible(false)}
        onConfirm={() => {
          setCompleteConfirmVisible(false);
          executeToggleComplete().catch(() => {});
        }}
      />
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
      <ConfirmDialog
        visible={feedbackDialog !== null}
        title={feedbackDialog?.title ?? '안내'}
        message={feedbackDialog?.message ?? ''}
        confirmLabel="확인"
        cancelLabel="닫기"
        tone="warning"
        accentColor={petTheme.primary}
        onCancel={() => setFeedbackDialog(null)}
        onConfirm={() => setFeedbackDialog(null)}
      />
    </SafeAreaView>
  );
}
