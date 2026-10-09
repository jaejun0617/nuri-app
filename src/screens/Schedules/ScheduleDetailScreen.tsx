import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { shouldStackCtaPair } from '../../app/theme/ctaPalette';
// 파일: src/screens/Schedules/ScheduleDetailScreen.tsx
// 역할:
// - 일정 단건 상세 조회와 완료 처리, 수정 이동, 삭제를 담당
// - 서버 단건 조회 결과를 기준으로 상세 카드와 메타 정보를 렌더링
// - 변경 후에는 schedule store를 갱신해 홈/목록과의 상태 일관성을 유지

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  AppState,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Feather from '../../components/icons/NuriFeatherIcon';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';

import AppText from '../../app/ui/AppText';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { resolveScheduleReturnTarget } from '../../navigation/scheduleReturn';
import type { RootScreenRoute } from '../../navigation/types';
import { createLatestRequestController } from '../../services/app/async';
import { getErrorMessage } from '../../services/app/errors';
import { NEUTRAL_UI_PALETTE } from '../../services/pets/themePalette';
import {
  deleteSchedule,
  fetchScheduleById,
  setScheduleCompletedAt,
  type PetSchedule,
} from '../../services/supabase/schedules';
import {
  captureScheduleNotificationLifecycle,
  clearScheduleNotification,
  getScheduleNotificationSyncFeedback,
  upsertScheduleNotification,
  getScheduleNotificationSettings,
  openScheduleNotificationExactAlarmSettings,
  openScheduleNotificationSystemSettings,
  type ScheduleNotificationSettings,
} from '../../services/schedules/notifications';
import { formatReminderMinutesSummary } from '../../services/schedules/form';
import {
  formatScheduleCategoryLabel,
  mapScheduleIconName,
  mapScheduleToMemoryCategory,
} from '../../services/schedules/presentation';
import { usePetStore } from '../../store/petStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { openMoreDrawer, showToast } from '../../store/uiStore';
import { styles } from './ScheduleDetailScreen.styles';
import { getDateYmdInKst } from '../../utils/date';
import { useAuthStore } from '../../store/authStore';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { HomeAmbientBubbleCanvas } from '../Main/components/LoggedInHome/HomeAmbientBubbleCanvas';
import { HomeFrostedGlass } from '../../components/home/HomeFrostedGlass';
import {
  buildScheduleDetailTime,
  formatScheduleDetailRepeat,
  getScheduleAlarmNotice,
} from '../../services/schedules/detailPresentation';
import {
  fetchMemoryById,
  type MemoryRecord,
} from '../../services/supabase/memories';
import {
  clearScheduleRecordRecovery,
  loadScheduleRecordRecovery,
} from '../../services/local/recordDraft';
import { linkScheduleRecord } from '../../services/schedules/recordLink';
import { useRecordStore } from '../../store/recordStore';

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
  return items.reduce<Record<string, HealthReportCacheActivity[]>>(
    (acc, item) => {
      acc[item.ymd] = [...(acc[item.ymd] ?? []), item];
      return acc;
    },
    {},
  );
}

export default function ScheduleDetailScreen() {
  const theme = useTheme();
  const season = useEffectiveSeason();
  const { height, width, fontScale } = useWindowDimensions();
  const compactMeta = width < 360 || fontScale >= 1.3;
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { petId, scheduleId } = route.params;
  const returnTo = resolveScheduleReturnTarget(
    route.params.returnTo,
    route.params.entrySource,
  );

  const refresh = useScheduleStore(s => s.refresh);
  const pets = usePetStore(s => s.pets);
  const userId = useAuthStore(s => s.session?.user?.id ?? null);

  const [schedule, setSchedule] = useState<PetSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const scheduleRequest = useMemo(
    () => ({ scheduleId, revision: reload }),
    [scheduleId, reload],
  );
  const [now, setNow] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const alarmRequest = useRef(createLatestRequestController());
  const [notificationSettings, setNotificationSettings] =
    useState<ScheduleNotificationSettings | null>(null);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [linkedRecord, setLinkedRecord] = useState<MemoryRecord | null>(null);
  const [pendingMemoryId, setPendingMemoryId] = useState<string | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [completeConfirmVisible, setCompleteConfirmVisible] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const selectedPet = useMemo(
    () =>
      pets.find(candidate => candidate.id === (schedule?.petId ?? petId)) ??
      null,
    [petId, pets, schedule?.petId],
  );
  const petTheme = NEUTRAL_UI_PALETTE;
  const draftScope = useMemo(
    () =>
      userId && schedule
        ? { userId, petId: schedule.petId, scheduleId: schedule.id }
        : undefined,
    [userId, schedule],
  );
  const scheduleTime = schedule ? buildScheduleDetailTime(schedule, now) : null;
  const alarmNotice =
    schedule && !notificationLoading
      ? getScheduleAlarmNotice(schedule, notificationSettings)
      : null;

  const readAlarmSettings = useCallback(async () => {
    const requestId = alarmRequest.current.begin();
    setNotificationLoading(true);
    try {
      const settings = await getScheduleNotificationSettings();
      if (alarmRequest.current.isCurrent(requestId))
        setNotificationSettings(settings);
    } catch {
      if (alarmRequest.current.isCurrent(requestId))
        setNotificationSettings(null);
    } finally {
      if (alarmRequest.current.isCurrent(requestId))
        setNotificationLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const update = () => {
        if (!active) return;
        setNow(new Date());
        readAlarmSettings().catch(() => {});
      };
      update();
      const timer = setInterval(() => setNow(new Date()), 60000);
      const subscription = AppState.addEventListener('change', state => {
        if (state === 'active') update();
      });
      return () => {
        active = false;
        alarmRequest.current.cancel();
        clearInterval(timer);
        subscription.remove();
      };
    }, [readAlarmSettings]),
  );

  useFocusEffect(
    useCallback(() => {
      const request = createLatestRequestController();

      async function run() {
        const requestId = request.begin();
        try {
          const next = await fetchScheduleById(scheduleRequest.scheduleId);
          if (petId && next.petId !== petId)
            throw new Error('이 아이의 일정을 확인하지 못했어요.');
          if (request.isCurrent(requestId)) setSchedule(next);
        } catch (error: unknown) {
          if (request.isCurrent(requestId)) {
            setLoadError(getErrorMessage(error));
          }
        } finally {
          if (request.isCurrent(requestId)) setLoading(false);
        }
      }

      setLoading(true);
      setLoadError(null);
      setSchedule(null);
      run().catch(() => {
        // handled inside run
      });

      return () => {
        request.cancel();
      };
    }, [petId, scheduleRequest]),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLinkedRecord(null);
      setPendingMemoryId(null);
      setRecordError(false);
      if (!schedule || !draftScope)
        return () => {
          active = false;
        };
      setRecordLoading(true);
      const run = async () => {
        const pending = await loadScheduleRecordRecovery(draftScope);
        if (!active) return;
        setPendingMemoryId(schedule.linkedMemoryId ? null : pending);
        const memoryId = schedule.linkedMemoryId ?? pending;
        if (memoryId) {
          const record = await fetchMemoryById(memoryId);
          if (record.petId !== schedule.petId)
            throw new Error('다른 아이의 기록이에요.');
          if (active) setLinkedRecord(record);
        }
        if (schedule.linkedMemoryId && pending)
          await clearScheduleRecordRecovery(draftScope);
      };
      run()
        .catch(() => {
          if (active) setRecordError(true);
        })
        .finally(() => {
          if (active) setRecordLoading(false);
        });
      return () => {
        active = false;
      };
    }, [draftScope, schedule]),
  );

  const scheduleContext = schedule
    ? {
        petId: schedule.petId,
        scheduleId: schedule.id,
        entrySource: route.params.entrySource,
        returnTo,
      }
    : null;

  const onPressRecord = async () => {
    if (!schedule || !scheduleContext || busyRef.current || recordLoading)
      return;
    if (recordError) {
      setReload(value => value + 1);
      return;
    }
    if (schedule.linkedMemoryId && linkedRecord) {
      useRecordStore.getState().upsertOneLocal(schedule.petId, linkedRecord);
      navigation.navigate('AppTabs', {
        screen: 'TimelineTab',
        params: {
          screen: 'RecordDetail',
          params: {
            petId: schedule.petId,
            memoryId: linkedRecord.id,
            scheduleReturn: scheduleContext,
          },
        },
      });
      return;
    }
    if (!schedule.completedAt || !draftScope) return;
    if (pendingMemoryId) {
      busyRef.current = true;
      setBusy(true);
      try {
        await linkScheduleRecord({
          petId: schedule.petId,
          scheduleId: schedule.id,
          memoryId: pendingMemoryId,
        });
        await clearScheduleRecordRecovery(draftScope);
        await queryClient.invalidateQueries({
          queryKey: ['health-report', 'month', schedule.petId],
        });
        refresh(schedule.petId).catch(() => {});
        setReload(value => value + 1);
      } catch (error: unknown) {
        setFeedbackDialog({
          title: '기록은 보존돼요',
          message: getErrorMessage(error),
        });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
      return;
    }
    const category = mapScheduleToMemoryCategory(schedule);
    navigation.navigate('RecordCreate', {
      petId: schedule.petId,
      initialMainCategory: category.mainCategory,
      initialOtherSubCategory: category.otherSubCategory ?? null,
      returnTo: { tab: 'ScheduleDetail', params: scheduleContext },
    });
  };

  const onPressAlarmSettings = async () => {
    if (!alarmNotice) return;
    if (alarmNotice.action === 'retry') {
      await readAlarmSettings();
      return;
    }
    if (alarmNotice.action === 'app') {
      navigation.navigate('AppTabs', { screen: 'HomeTab' });
      openMoreDrawer();
    } else if (alarmNotice.action === 'exact') {
      const opened = await openScheduleNotificationExactAlarmSettings();
      if (!opened) openScheduleNotificationSystemSettings();
    } else if (alarmNotice.action === 'system') {
      openScheduleNotificationSystemSettings();
    }
  };

  const onPressEdit = useCallback(() => {
    navigation.navigate('ScheduleEdit', {
      petId,
      scheduleId,
      entrySource: route.params?.entrySource,
      returnTo,
    });
  }, [navigation, petId, returnTo, route.params?.entrySource, scheduleId]);

  const returnToScheduleParent = useCallback(
    (focusYmd?: string | null) => {
      if (returnTo.screen === 'HealthReport') {
        navigation.popTo('HealthReport', {
          petId: petId ?? undefined,
          initialTab: returnTo.initialTab ?? 'records',
          focusYmd: focusYmd ?? undefined,
          entrySource: returnTo.entrySource,
        });
        return;
      }

      navigation.popTo('ScheduleList', {
        petId,
        entrySource: returnTo.entrySource,
      });
    },
    [navigation, petId, returnTo],
  );

  const onPressDelete = useCallback(() => {
    if (busyRef.current) return;
    setDeleteConfirmVisible(true);
  }, []);

  const executeDelete = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      setDeleting(true);
      setDeleteConfirmVisible(false);
      const deletedFocusYmd = schedule
        ? getDateYmdInKst(schedule.startsAt)
        : null;
      await deleteSchedule(scheduleId);
      const notificationResult = clearScheduleNotification(scheduleId);
      const notificationFeedback =
        getScheduleNotificationSyncFeedback(notificationResult);
      if (notificationFeedback) showToast(notificationFeedback);
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
      returnToScheduleParent(deletedFocusYmd);
    } catch (error: unknown) {
      setFeedbackDialog({
        title: '삭제 실패',
        message: getErrorMessage(error),
      });
    } finally {
      setDeleting(false);
      busyRef.current = false;
      setBusy(false);
    }
  }, [
    petId,
    queryClient,
    refresh,
    returnToScheduleParent,
    schedule,
    scheduleId,
  ]);

  const executeToggleComplete = useCallback(async () => {
    if (!schedule || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);

    try {
      const nextCompletedAt = schedule.completedAt
        ? null
        : buildScheduleCompletedAtForPersist(schedule.startsAt);
      const notificationLifecycle = captureScheduleNotificationLifecycle();

      const updated = await setScheduleCompletedAt({
        scheduleId: schedule.id,
        petId: schedule.petId,
        completedAt: nextCompletedAt,
      });
      setSchedule(updated);

      try {
        if (nextCompletedAt) {
          const notificationResult = clearScheduleNotification(schedule.id);
          const notificationFeedback =
            getScheduleNotificationSyncFeedback(notificationResult);
          if (notificationFeedback) showToast(notificationFeedback);
        } else {
          const notificationResult = await upsertScheduleNotification(
            {
              id: updated.id,
              petId: updated.petId,
              title: updated.title,
              note: updated.note,
              startsAt: updated.startsAt,
              repeatRule: updated.repeatRule,
              reminderMinutes: updated.reminderMinutes,
              completedAt: updated.completedAt,
            },
            notificationLifecycle,
          );
          const notificationFeedback =
            getScheduleNotificationSyncFeedback(notificationResult);
          if (notificationFeedback) showToast(notificationFeedback);
        }
      } catch {
        showToast({
          tone: 'warning',
          title: '일정 상태는 반영됐어요',
          message: '기기 알림 동기화는 다시 확인해 주세요.',
        });
      }
      await queryClient.setQueriesData<HealthReportCache>(
        { queryKey: ['health-report', 'month', updated.petId] },
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
      refresh(updated.petId).catch(() => {});
      showToast({
        tone: 'success',
        title: nextCompletedAt ? '완료로 표시했어요' : '미완료로 변경했어요',
        message: '일정 상태를 반영했어요.',
      });
    } catch (error: unknown) {
      setFeedbackDialog({
        title: '상태 변경 실패',
        message: getScheduleStatusErrorMessage(error),
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [queryClient, refresh, schedule]);

  const onToggleComplete = useCallback(() => {
    if (!schedule) return;
    if (
      !schedule.completedAt &&
      new Date(schedule.startsAt).getTime() > Date.now()
    ) {
      setCompleteConfirmVisible(true);
      return;
    }
    setCompleteConfirmVisible(false);
    executeToggleComplete().catch(() => {});
  }, [executeToggleComplete, schedule]);

  const headerTopInset = Math.max(insets.top, 12);

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <View pointerEvents="none" style={styles.ambient}>
        <HomeAmbientBubbleCanvas
          heroHeight={height}
          season={season}
          decorationMode="reading"
        />
      </View>
      <View style={[styles.header, { paddingTop: headerTopInset + 4 }]}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="뒤로"
            disabled={busy}
            activeOpacity={0.88}
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Feather name="arrow-left" size={20} color={petTheme.deep} />
          </TouchableOpacity>
        </View>

        <AppText
          typographyRole="screenTitle"
          preset="unifiedTitle"
          color={theme.colors.textPrimary}
          style={styles.headerTitle}
        >
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
            <AppText preset="unifiedBody" color={theme.colors.textSecondary}>
              {loadError ?? '일정을 불러오는 중이에요.'}
            </AppText>
            {loadError ? (
              <CtaButton
                role="primary"
                accessibilityRole="button"
                style={styles.alarmAction}
                onPress={() => setReload(value => value + 1)}
              >
                <CtaText preset="unifiedLabel">다시 확인</CtaText>
              </CtaButton>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <View style={styles.iconWrap}>
                <NuriSemanticIcon
                  family="material"
                  name={mapScheduleIconName(schedule.iconKey)}
                  size={40}
                  color={petTheme.primary}
                />
              </View>
              <View style={styles.heroTextWrap}>
                <AppText
                  preset="unifiedMeta"
                  color={theme.colors.textSecondary}
                >
                  {selectedPet?.name?.trim()
                    ? `${selectedPet.name.trim()}의 일정`
                    : '반려동물의 일정'}
                </AppText>
                <AppText
                  preset="cardTitle"
                  color={theme.colors.textPrimary}
                  style={styles.title}
                >
                  {schedule.title}
                </AppText>
                <AppText
                  preset="unifiedMeta"
                  color={
                    schedule.completedAt
                      ? theme.colors.textSecondary
                      : petTheme.deep
                  }
                >
                  {schedule.completedAt ? '완료됨' : '미완료'}
                </AppText>
              </View>
            </View>

            <HomeFrostedGlass
              testID="schedule-detail-glass"
              season={season}
              style={styles.glass}
            >
              <View style={styles.dateBlock}>
                <AppText
                  preset="unifiedMeta"
                  color={theme.colors.textSecondary}
                >
                  {scheduleTime?.context ?? '일정 시간'}
                </AppText>
                <AppText
                  preset="unifiedTitle"
                  color={theme.colors.textPrimary}
                  style={styles.dateTitle}
                >
                  {scheduleTime?.date ?? '날짜 확인 필요'}
                </AppText>
                <AppText
                  preset="cardTitle"
                  color={theme.colors.textPrimary}
                  style={styles.timeTitle}
                >
                  {scheduleTime?.time ?? '시간 확인 필요'}
                </AppText>
                {scheduleTime ? (
                  <AppText
                    preset="unifiedMeta"
                    color={theme.colors.textSecondary}
                  >
                    {scheduleTime.year}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.divider} />
              {[
                {
                  label: '분류',
                  value: formatScheduleCategoryLabel(schedule, {
                    omitDuplicate: true,
                  }),
                },
                { label: '반복', value: formatScheduleDetailRepeat(schedule) },
                {
                  label: '알림',
                  value: formatReminder(schedule.reminderMinutes),
                },
              ].map(item => (
                <View
                  key={item.label}
                  style={[styles.metaRow, compactMeta && styles.metaRowCompact]}
                >
                  <AppText
                    preset="unifiedMeta"
                    color={theme.colors.textSecondary}
                    style={styles.metaLabel}
                  >
                    {item.label}
                  </AppText>
                  <AppText
                    preset="unifiedBody"
                    color={theme.colors.textPrimary}
                    style={[
                      styles.metaValue,
                      compactMeta && styles.metaValueCompact,
                    ]}
                  >
                    {item.value}
                  </AppText>
                </View>
              ))}
              {alarmNotice ? (
                <View
                  style={styles.alarmNotice}
                  accessibilityLiveRegion="polite"
                >
                  <AppText preset="unifiedMeta" color={petTheme.deep}>
                    {alarmNotice.message}
                  </AppText>
                  {alarmNotice.action ? (
                    <CtaButton
                      role="secondary"
                      accessibilityRole="button"
                      testID="schedule-detail-alarm-settings"
                      style={styles.alarmAction}
                      onPress={() => {
                        onPressAlarmSettings().catch(() =>
                          setFeedbackDialog({
                            title: '알림 설정 확인',
                            message:
                              '설정을 열지 못했어요. 잠시 후 다시 확인해 주세요.',
                          }),
                        );
                      }}
                    >
                      <CtaText preset="unifiedLabel">
                        {alarmNotice.action === 'app'
                          ? '전체메뉴에서 알림 설정 확인'
                          : '알림 설정 확인'}
                      </CtaText>
                    </CtaButton>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.divider} />
              <View style={styles.memo}>
                <AppText
                  preset="unifiedMeta"
                  color={theme.colors.textSecondary}
                >
                  메모
                </AppText>
                <AppText preset="unifiedBody" color={theme.colors.textPrimary}>
                  {schedule.note?.trim() || '남겨둔 메모가 없어요.'}
                </AppText>
              </View>
            </HomeFrostedGlass>

            {schedule.completedAt ||
            schedule.linkedMemoryId ||
            pendingMemoryId ? (
              <View style={styles.linkedSection}>
                <AppText
                  preset="unifiedLabel"
                  color={theme.colors.textSecondary}
                >
                  연결된 기록
                </AppText>
                <CtaButton
                  role="secondary"
                  loading={recordLoading}
                  testID="schedule-detail-record"
                  accessibilityRole="button"
                  disabled={
                    busy ||
                    recordLoading ||
                    (!schedule.completedAt && !schedule.linkedMemoryId)
                  }
                  style={[
                    styles.linkedAction,
                    (busy || recordLoading) && styles.disabled,
                  ]}
                  onPress={() => {
                    onPressRecord().catch(() =>
                      setFeedbackDialog({
                        title: '기록 확인',
                        message:
                          '기록을 열지 못했어요. 잠시 후 다시 확인해 주세요.',
                      }),
                    );
                  }}
                >
                  <View style={styles.linkedText}>
                    <CtaText preset="unifiedLabel">
                      {recordLoading
                        ? '기록 확인 중'
                        : recordError
                        ? '연결된 기록 다시 확인'
                        : schedule.linkedMemoryId
                        ? '기록 보기'
                        : pendingMemoryId
                        ? '기록 연결 다시 시도'
                        : '기록으로 남기기'}
                    </CtaText>
                    <CtaText preset="unifiedMeta">
                      {recordError
                        ? '기록을 불러오지 못했어요.'
                        : linkedRecord?.title ??
                          (pendingMemoryId
                            ? '저장한 기록은 보존돼요.'
                            : '아직 연결된 기록이 없어요.')}
                    </CtaText>
                  </View>
                </CtaButton>
              </View>
            ) : null}

            <View style={styles.actions}>
              <CtaButton
                role="primary"
                testID="schedule-detail-edit"
                accessibilityRole="button"
                disabled={busy}
                activeOpacity={0.9}
                style={styles.primaryBtn}
                onPress={onPressEdit}
              >
                <CtaText preset="unifiedBody" style={styles.primaryBtnText}>
                  일정 수정하기
                </CtaText>
              </CtaButton>

              <View
                testID="schedule-detail-secondary-actions"
                style={[
                  styles.actionPair,
                  shouldStackCtaPair(width, fontScale) &&
                    styles.actionPairStack,
                ]}
              >
                <CtaButton
                  role="secondary"
                  loading={busy}
                  testID="schedule-detail-complete"
                  accessibilityRole="button"
                  disabled={busy}
                  activeOpacity={0.9}
                  style={[
                    styles.secondaryBtn,
                    !shouldStackCtaPair(width, fontScale) && styles.pairButton,
                  ]}
                  onPress={onToggleComplete}
                >
                  <CtaText preset="unifiedBody" style={styles.secondaryBtnText}>
                    {busy
                      ? '반영 중...'
                      : schedule.completedAt
                      ? '미완료로 변경'
                      : '완료로 표시'}
                  </CtaText>
                </CtaButton>

                <CtaButton
                  role="destructiveEntry"
                  loading={deleting}
                  testID="schedule-detail-delete"
                  accessibilityRole="button"
                  disabled={busy}
                  activeOpacity={0.9}
                  style={[
                    styles.deleteBtn,
                    !shouldStackCtaPair(width, fontScale) && styles.pairButton,
                  ]}
                  onPress={onPressDelete}
                >
                  <CtaText preset="unifiedBody" style={styles.deleteBtnText}>
                    {deleting ? '삭제 중...' : '일정 삭제'}
                  </CtaText>
                </CtaButton>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <ConfirmDialog
        confirmRole="primary"
        cancelRole="neutral"
        visible={completeConfirmVisible}
        typographyMode="unified"
        title="지금 일정 마침으로 정리할까요?"
        message={
          '아직 일정 시간이 남아 있어요. 먼저 마친 일정이라면 완료로 표시할 수 있어요.\n예약된 일정 알림은 해제되며, 기록은 자동으로 생성되지 않아요.'
        }
        confirmLabel="완료로 정리"
        cancelLabel="계속 보기"
        tone="warning"
        onCancel={() => setCompleteConfirmVisible(false)}
        onConfirm={() => {
          setCompleteConfirmVisible(false);
          executeToggleComplete().catch(() => {});
        }}
      />
      <ConfirmDialog
        confirmRole="destructiveConfirm"
        cancelRole="neutral"
        confirmLoading={deleting}
        visible={deleteConfirmVisible}
        typographyMode="unified"
        title="일정을 삭제할까요?"
        message={
          '이 일정은 목록과 홈 카드에서 함께 사라지며\n삭제 후에는 다시 되돌릴 수 없어요.'
        }
        cancelLabel="계속 유지하기"
        confirmLabel={deleting ? '삭제 중...' : '일정 삭제'}
        tone="danger"
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={() => {
          executeDelete().catch(() => {});
        }}
      />
      <ConfirmDialog
        confirmRole="primary"
        cancelRole="neutral"
        visible={feedbackDialog !== null}
        typographyMode="unified"
        title={feedbackDialog?.title ?? '안내'}
        message={feedbackDialog?.message ?? ''}
        confirmLabel="확인"
        cancelLabel="닫기"
        tone="warning"
        onCancel={() => setFeedbackDialog(null)}
        onConfirm={() => setFeedbackDialog(null)}
      />
    </SafeAreaView>
  );
}
