import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { getBrandedErrorMeta, getErrorMessage } from '../services/app/errors';
import {
  createSchedule,
  type ScheduleCategory,
  type ScheduleColorKey,
  type ScheduleIconKey,
  type ScheduleRepeatRule,
} from '../services/supabase/schedules';
import {
  buildReminderMinutesFromSelection,
  buildScheduleStartsAtIso,
  formatReminderMinutesSummary,
  getAutoScheduleIconKey,
  inferScheduleSubCategory,
  normalizeScheduleDateInput,
  normalizeScheduleTimeInput,
  SCHEDULE_CATEGORY_OPTIONS,
  SCHEDULE_OTHER_UI_SUBCATEGORY_OPTIONS,
  SCHEDULE_WRITE_CATEGORY_OPTIONS,
  SCHEDULE_WRITE_OTHER_UI_SUBCATEGORY_OPTIONS,
  toScheduleDateInput,
  type ScheduleOtherUiSubCategoryKey,
  type ScheduleReminderOptionKey,
} from '../services/schedules/form';
import {
  captureScheduleNotificationLifecycle,
  checkScheduleNotificationPermission,
  getScheduleNotificationHelperText,
  getScheduleNotificationSyncFeedback,
  requestScheduleNotificationPermission,
  upsertScheduleNotification,
} from '../services/schedules/notifications';
import { useScheduleStore } from '../store/scheduleStore';
import { showToast } from '../store/uiStore';
import { useScheduleNotificationSettings } from './useScheduleNotificationSettings';

type Props = {
  petId: string | null;
  params: RootStackParamList['ScheduleCreate'];
  onSaved: (result: { id: string; ymd: string }) => void | Promise<void>;
};

/** Full-screen and calendar-sheet entry points share validation, writes and alarm lifecycle. */
export function useScheduleCreateForm({ petId, params, onSaved }: Props) {
  const initialTitle = params?.initialTitle ?? '';
  const initialCategory = params?.initialCategory ?? 'other';
  const initialOtherUiSubCategoryKey =
    params?.initialOtherUiSubCategoryKey ?? null;
  const initialIconKey = params?.initialIconKey ?? 'medical-bag';
  const initialColorKey = params?.initialColorKey ?? 'brand';
  const isHealthManagementEntry = params?.returnTo?.screen === 'HealthReport';
  const initialDateText = useMemo(() => {
    const date = params?.startsAt ? new Date(params.startsAt) : new Date();
    return toScheduleDateInput(
      Number.isNaN(date.getTime()) ? new Date() : date,
    );
  }, [params?.startsAt]);
  const [title, setTitle] = useState(initialTitle);
  const [note, setNote] = useState('');
  const [dateText, setDateText] = useState(initialDateText);
  const [timeText, setTimeText] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState<ScheduleCategory>(initialCategory);
  const [otherUiSubCategoryKey, setOtherUiSubCategoryKey] =
    useState<ScheduleOtherUiSubCategoryKey | null>(
      initialOtherUiSubCategoryKey,
    );
  const [iconKey, setIconKey] = useState<ScheduleIconKey>(initialIconKey);
  const [colorKey, setColorKey] = useState<ScheduleColorKey>(initialColorKey);
  const [repeatRule, setRepeatRule] = useState<ScheduleRepeatRule>('none');
  const [reminderKey, setReminderKey] =
    useState<ScheduleReminderOptionKey>('none');
  const [customReminderMinutesText, setCustomReminderMinutesText] =
    useState('');
  const [saving, setSaving] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [reminderNoticeVisible, setReminderNoticeVisible] = useState(false);
  const savingRef = useRef(false);
  const completed = useRef(false);
  const mounted = useRef(true);
  // If cache refresh fails after insertion, retry that completion, not the server insert.
  const inserted = useRef<{
    id: string;
    ymd: string;
    notification: Parameters<typeof upsertScheduleNotification>[0];
    lifecycle: ReturnType<typeof captureScheduleNotificationLifecycle>;
    notificationSynced: boolean;
  } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = useScheduleStore(state => state.refresh);
  const {
    settings: notificationSettings,
    refresh: refreshNotificationSettings,
  } = useScheduleNotificationSettings();
  const categoryOptions = useMemo(
    () =>
      isHealthManagementEntry || category === 'health'
        ? SCHEDULE_CATEGORY_OPTIONS
        : SCHEDULE_WRITE_CATEGORY_OPTIONS,
    [category, isHealthManagementEntry],
  );
  const otherSubCategoryOptions = useMemo(
    () =>
      isHealthManagementEntry || otherUiSubCategoryKey === 'hospital'
        ? SCHEDULE_OTHER_UI_SUBCATEGORY_OPTIONS
        : SCHEDULE_WRITE_OTHER_UI_SUBCATEGORY_OPTIONS,
    [isHealthManagementEntry, otherUiSubCategoryKey],
  );
  const hasUnsavedChanges =
    title.trim() !== initialTitle.trim() ||
    note.trim().length > 0 ||
    dateText !== initialDateText ||
    timeText !== '10:00' ||
    allDay ||
    category !== initialCategory ||
    otherUiSubCategoryKey !== initialOtherUiSubCategoryKey ||
    iconKey !== initialIconKey ||
    colorKey !== initialColorKey ||
    repeatRule !== 'none' ||
    reminderKey !== 'none' ||
    customReminderMinutesText.trim().length > 0;
  const onOpenDateModal = useCallback(() => setDateModalVisible(true), []);
  const onConfirmDate = useCallback((date: Date) => {
    setDateText(toScheduleDateInput(date).replace(/-/g, '.'));
    setDateModalVisible(false);
  }, []);
  const onConfirmDateTime = useCallback((date: Date, time: string) => {
    try {
      setTimeText(normalizeScheduleTimeInput(time));
      setDateText(toScheduleDateInput(date).replace(/-/g, '.'));
      setDateModalVisible(false);
    } catch (error) {
      Alert.alert('시간 확인', getErrorMessage(error));
    }
  }, []);
  const onSelectCategory = useCallback((next: ScheduleCategory) => {
    setCategory(next);
    if (next !== 'other') {
      setOtherUiSubCategoryKey(null);
      setIconKey(getAutoScheduleIconKey(next));
    } else {
      setOtherUiSubCategoryKey(previous => {
        const other = previous ?? 'etc';
        setIconKey(getAutoScheduleIconKey(next, other));
        return other;
      });
    }
  }, []);
  const onSelectOtherSubCategory = useCallback(
    (next: ScheduleOtherUiSubCategoryKey) => {
      setOtherUiSubCategoryKey(next);
      setIconKey(getAutoScheduleIconKey('other', next));
    },
    [],
  );
  const onSelectReminder = useCallback(
    async (next: ScheduleReminderOptionKey) => {
      setReminderKey(next);
      if (next === 'none') {
        setCustomReminderMinutesText('');
        return;
      }
      try {
        const current = await checkScheduleNotificationPermission();
        if (current === 'granted') {
          await refreshNotificationSettings();
          return;
        }
        const permission = await requestScheduleNotificationPermission();
        await refreshNotificationSettings();
        if (mounted.current && permission !== 'granted') {
          Alert.alert(
            '알림 권한 필요',
            '권한이 허용되지 않으면 일정 데이터에는 저장되지만 실제 기기 알림은 오지 않아요.',
          );
        }
      } catch (error) {
        if (mounted.current)
          Alert.alert('알림 권한 확인', getErrorMessage(error));
      }
    },
    [refreshNotificationSettings],
  );

  const onSubmit = useCallback(async () => {
    if (savingRef.current || completed.current) return;
    if (!petId) {
      Alert.alert('반려동물을 찾을 수 없어요.');
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('일정 제목을 입력해 주세요.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      if (!inserted.current) {
        const ymd = normalizeScheduleDateInput(dateText);
        const startsAt = buildScheduleStartsAtIso(ymd, timeText, allDay);
        const reminderMinutes = buildReminderMinutesFromSelection({
          reminderKey,
          customReminderMinutesText,
          startsAt,
        });
        if (reminderKey !== 'none' && !reminderMinutes.length) {
          setReminderNoticeVisible(true);
          return;
        }
        const lifecycle = captureScheduleNotificationLifecycle();
        const id = await createSchedule({
          petId,
          title: trimmedTitle,
          note: note.trim() || null,
          startsAt,
          allDay,
          category,
          subCategory:
            category === 'health' && params?.initialHealthSubCategory
              ? params.initialHealthSubCategory
              : inferScheduleSubCategory(category, otherUiSubCategoryKey),
          iconKey,
          colorKey,
          repeatRule,
          reminderMinutes,
        });
        inserted.current = {
          id,
          ymd,
          lifecycle,
          notificationSynced: false,
          notification: {
            id,
            petId,
            title: trimmedTitle,
            note: note.trim() || null,
            startsAt,
            repeatRule,
            reminderMinutes,
            completedAt: null,
          },
        };
        if (mounted.current) setPersisted(true);
      }
      if (!inserted.current.notificationSynced) {
        const notification = await upsertScheduleNotification(
          inserted.current.notification,
          inserted.current.lifecycle,
        );
        inserted.current.notificationSynced = true;
        const feedback = getScheduleNotificationSyncFeedback(notification);
        if (feedback) showToast(feedback);
      }
      await refresh(petId);
      if (mounted.current) {
        await onSaved({ id: inserted.current.id, ymd: inserted.current.ymd });
        completed.current = true;
      }
    } catch (error) {
      if (mounted.current) {
        const meta = getBrandedErrorMeta(error, 'schedule-create');
        Alert.alert(meta.title, meta.message);
      }
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  }, [
    allDay,
    category,
    colorKey,
    customReminderMinutesText,
    dateText,
    iconKey,
    note,
    onSaved,
    otherUiSubCategoryKey,
    params?.initialHealthSubCategory,
    petId,
    refresh,
    reminderKey,
    repeatRule,
    timeText,
    title,
  ]);
  const reminderMinutes = useMemo(() => {
    if (reminderKey === 'none') return [];
    try {
      return buildReminderMinutesFromSelection({
        reminderKey,
        customReminderMinutesText,
        startsAt: buildScheduleStartsAtIso(
          normalizeScheduleDateInput(dateText),
          timeText,
          allDay,
        ),
      });
    } catch {
      return [];
    }
  }, [allDay, customReminderMinutesText, dateText, reminderKey, timeText]);
  const reminderHelperText = getScheduleNotificationHelperText(
    reminderMinutes,
    notificationSettings?.permission ?? 'unsupported',
    notificationSettings,
  );
  const reminderSummaryText = formatReminderMinutesSummary(reminderMinutes);

  return {
    reminderNoticeVisible,
    setReminderNoticeVisible,
    title,
    setTitle,
    note,
    setNote,
    dateText,
    setDateText,
    timeText,
    setTimeText,
    allDay,
    setAllDay,
    category,
    iconKey,
    setIconKey,
    colorKey,
    setColorKey,
    otherUiSubCategoryKey,
    repeatRule,
    setRepeatRule,
    reminderKey,
    customReminderMinutesText,
    setCustomReminderMinutesText,
    saving,
    persisted,
    hasUnsavedChanges,
    dateModalVisible,
    setDateModalVisible,
    categoryOptions,
    otherSubCategoryOptions,
    onOpenDateModal,
    onConfirmDate,
    onConfirmDateTime,
    onSelectCategory,
    onSelectOtherSubCategory,
    onSelectReminder,
    onSubmit,
    reminderHelperText,
    reminderSummaryText,
  };
}
