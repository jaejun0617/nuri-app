import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppText from '../../app/ui/AppText';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  fetchScheduleById,
  updateSchedule,
  type PetSchedule,
  type ScheduleCategory,
  type ScheduleColorKey,
  type ScheduleIconKey,
  type ScheduleRepeatRule,
  type ScheduleSubCategory,
} from '../../services/supabase/schedules';
import { useScheduleStore } from '../../store/scheduleStore';
import { styles } from './ScheduleCreateScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScheduleEdit'>;
type Route = {
  key: string;
  name: 'ScheduleEdit';
  params: { petId?: string; scheduleId: string };
};

const CATEGORY_OPTIONS: Array<{ key: ScheduleCategory; label: string; icon: string }> = [
  { key: 'walk', label: '산책', icon: 'walk' },
  { key: 'meal', label: '식사', icon: 'silverware-fork-knife' },
  { key: 'health', label: '건강', icon: 'medical-bag' },
  { key: 'grooming', label: '미용', icon: 'content-cut' },
  { key: 'diary', label: '일기', icon: 'notebook-outline' },
  { key: 'other', label: '···', icon: 'dots-horizontal-circle-outline' },
];

const ICON_OPTIONS: Array<{ key: ScheduleIconKey; label: string; icon: string }> = [
  { key: 'walk', label: '산책', icon: 'walk' },
  { key: 'meal', label: '식사', icon: 'silverware-fork-knife' },
  { key: 'medical-bag', label: '병원', icon: 'medical-bag' },
  { key: 'syringe', label: '접종', icon: 'syringe' },
  { key: 'pill', label: '약', icon: 'pill' },
  { key: 'content-cut', label: '미용', icon: 'content-cut' },
  { key: 'shower', label: '목욕', icon: 'shower' },
  { key: 'notebook', label: '일기', icon: 'notebook-outline' },
  { key: 'heart', label: '케어', icon: 'heart' },
  { key: 'star', label: '기타', icon: 'star' },
];

const COLOR_OPTIONS: Array<{ key: ScheduleColorKey; label: string; color: string }> = [
  { key: 'brand', label: '보라', color: '#6D6AF8' },
  { key: 'blue', label: '파랑', color: '#3B82F6' },
  { key: 'green', label: '초록', color: '#22C55E' },
  { key: 'orange', label: '주황', color: '#F97316' },
  { key: 'pink', label: '핑크', color: '#EC4899' },
  { key: 'gray', label: '회색', color: '#94A3B8' },
];

const TIME_PRESETS = ['09:00', '10:00', '13:00', '15:00', '18:00', '20:00'];
const REPEAT_OPTIONS: Array<{ key: ScheduleRepeatRule; label: string }> = [
  { key: 'none', label: '반복 안 함' },
  { key: 'daily', label: '매일' },
  { key: 'weekly', label: '매주' },
  { key: 'monthly', label: '매월' },
];
const REMINDER_OPTIONS = [
  { key: 'none', label: '알림 없음', minutes: [] as number[] },
  { key: 'ten', label: '10분 전', minutes: [10] },
  { key: 'hour', label: '1시간 전', minutes: [60] },
  { key: 'day', label: '하루 전', minutes: [1440] },
] as const;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '다시 시도해 주세요.';
}

function toDateInput(date: Date) {
  return `${date.getFullYear()}.${`${date.getMonth() + 1}`.padStart(2, '0')}.${`${date.getDate()}`.padStart(2, '0')}`;
}

function normalizeDateInput(raw: string): string {
  const value = raw.trim().replace(/\./g, '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('날짜 형식은 YYYY.MM.DD 입니다.');
  }
  return value;
}

function normalizeTimeInput(raw: string): string {
  const value = raw.trim();
  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new Error('시간 형식은 HH:MM 입니다.');
  }
  return value;
}

function inferSubCategory(category: ScheduleCategory): ScheduleSubCategory | null {
  switch (category) {
    case 'grooming':
      return 'bath';
    case 'health':
      return 'checkup';
    case 'walk':
      return 'walk-routine';
    case 'meal':
      return 'meal-plan';
    case 'diary':
      return 'journal';
    case 'other':
    default:
      return 'etc';
  }
}

function createWeekRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatDateSummary(dateText: string) {
  const normalized = dateText.replace(/\./g, '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return dateText;
  const date = new Date(`${normalized}T00:00:00`);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${dateText} (${weekdays[date.getDay()]})`;
}

function createDatePresets() {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    const labels = ['오늘', '내일', '모레'];
    return {
      label: labels[index] ?? `${date.getMonth() + 1}/${date.getDate()}`,
      value: toDateInput(date),
    };
  });
}

export default function ScheduleEditScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { petId, scheduleId } = route.params;
  const refreshWeek = useScheduleStore(s => s.refreshWeek);
  const weekRange = useMemo(() => createWeekRange(), []);
  const datePresets = useMemo(() => createDatePresets(), []);

  const [schedule, setSchedule] = useState<PetSchedule | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState<ScheduleCategory>('health');
  const [iconKey, setIconKey] = useState<ScheduleIconKey>('medical-bag');
  const [colorKey, setColorKey] = useState<ScheduleColorKey>('brand');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [draftDateText, setDraftDateText] = useState('');
  const [draftTimeText, setDraftTimeText] = useState('10:00');
  const [repeatRule, setRepeatRule] = useState<ScheduleRepeatRule>('none');
  const [reminderKey, setReminderKey] =
    useState<(typeof REMINDER_OPTIONS)[number]['key']>('none');

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        const next = await fetchScheduleById(scheduleId);
        if (!mounted) return;
        const startsAt = new Date(next.startsAt);
        setSchedule(next);
        setTitle(next.title);
        setNote(next.note ?? '');
        setDateText(toDateInput(startsAt));
        setTimeText(
          `${`${startsAt.getHours()}`.padStart(2, '0')}:${`${startsAt.getMinutes()}`.padStart(2, '0')}`,
        );
        setAllDay(next.allDay);
        setCategory(next.category);
        setIconKey(next.iconKey);
        setColorKey(next.colorKey);
        setRepeatRule(next.repeatRule);
        const matchedReminder =
          REMINDER_OPTIONS.find(option =>
            JSON.stringify(option.minutes) ===
            JSON.stringify(next.reminderMinutes ?? []),
          )?.key ?? 'none';
        setReminderKey(matchedReminder);
      } catch (error) {
        if (mounted) {
          Alert.alert('일정 조회 실패', getErrorMessage(error));
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

  const onConfirmDate = useCallback(() => {
    try {
      const normalized = normalizeDateInput(draftDateText);
      setDateText(normalized.replace(/-/g, '.'));
      setDateModalVisible(false);
    } catch (error) {
      Alert.alert('날짜 확인', getErrorMessage(error));
    }
  }, [draftDateText]);

  const onConfirmTime = useCallback(() => {
    try {
      const normalized = normalizeTimeInput(draftTimeText);
      setTimeText(normalized);
      setTimeModalVisible(false);
    } catch (error) {
      Alert.alert('시간 확인', getErrorMessage(error));
    }
  }, [draftTimeText]);

  const onSubmit = useCallback(async () => {
    if (!schedule) return;
    if (!title.trim()) {
      Alert.alert('일정 제목을 입력해 주세요.');
      return;
    }

    try {
      setSaving(true);
      const normalizedDate = normalizeDateInput(dateText);
      const startsAt = allDay
        ? `${normalizedDate}T00:00:00`
        : `${normalizedDate}T${normalizeTimeInput(timeText)}:00`;

      await updateSchedule({
        scheduleId: schedule.id,
        petId: schedule.petId,
        title: title.trim(),
        note: note.trim() || null,
        startsAt: new Date(startsAt).toISOString(),
        allDay,
        category,
        subCategory: inferSubCategory(category),
        iconKey,
        colorKey,
        completedAt: schedule.completedAt,
        linkedMemoryId: schedule.linkedMemoryId,
        repeatRule,
        repeatInterval: schedule.repeatInterval,
        repeatUntil: schedule.repeatUntil,
        reminderMinutes: [
          ...(
            REMINDER_OPTIONS.find(option => option.key === reminderKey)
              ?.minutes ?? []
          ),
        ],
        source: schedule.source,
        externalCalendarId: schedule.externalCalendarId,
        externalEventId: schedule.externalEventId,
        syncStatus: schedule.syncStatus,
      });

      if (petId) {
        await refreshWeek(petId, weekRange.from, weekRange.to);
      }
      navigation.replace('ScheduleDetail', { petId, scheduleId });
    } catch (error) {
      Alert.alert('일정 수정 실패', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [
    allDay,
    category,
    colorKey,
    dateText,
    iconKey,
    navigation,
    note,
    petId,
    reminderKey,
    refreshWeek,
    repeatRule,
    schedule,
    scheduleId,
    timeText,
    title,
    weekRange.from,
    weekRange.to,
  ]);

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
          일정 수정
        </AppText>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.headerDoneBtn}
          onPress={onSubmit}
          disabled={saving || loading}
        >
          <AppText preset="caption" style={styles.headerDoneText}>
            {saving ? '저장 중' : '완료'}
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {loading ? (
            <AppText preset="body" style={styles.label}>
              일정을 불러오는 중이에요.
            </AppText>
          ) : (
            <>
              <AppText preset="caption" style={styles.label}>
                일정 이름
              </AppText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="예: 병원 정기 검진"
                placeholderTextColor="#8A94A6"
                style={styles.input}
              />

              <AppText preset="caption" style={styles.label}>
                날짜
              </AppText>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.pickerField}
                onPress={() => {
                  setDraftDateText(dateText);
                  setDateModalVisible(true);
                }}
              >
                <AppText preset="body" style={styles.pickerFieldText}>
                  {formatDateSummary(dateText)}
                </AppText>
                <Feather name="chevron-right" size={18} color="#8A94A6" />
              </TouchableOpacity>

              <View style={styles.timeRow}>
                <View style={styles.timeCol}>
                  <AppText preset="caption" style={styles.label}>
                    시간
                  </AppText>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                      styles.pickerField,
                      allDay ? styles.pickerFieldDisabled : null,
                    ]}
                    onPress={() => {
                      setDraftTimeText(timeText);
                      setTimeModalVisible(true);
                    }}
                    disabled={allDay}
                  >
                    <AppText
                      preset="body"
                      style={[
                        styles.pickerFieldText,
                        allDay ? styles.pickerFieldTextDisabled : null,
                      ]}
                    >
                      {allDay ? '하루 종일' : timeText}
                    </AppText>
                    <Feather name="clock" size={16} color="#8A94A6" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[
                    styles.allDayChip,
                    allDay ? styles.allDayChipActive : null,
                  ]}
                  onPress={() => setAllDay(prev => !prev)}
                >
                  <AppText
                    preset="caption"
                    style={[
                      styles.allDayChipText,
                      allDay ? styles.allDayChipTextActive : null,
                    ]}
                  >
                    하루 종일
                  </AppText>
                </TouchableOpacity>
              </View>

              <AppText preset="caption" style={styles.label}>
                카테고리
              </AppText>
              <View style={styles.optionRow}>
                {CATEGORY_OPTIONS.map(option => {
                  const active = category === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      activeOpacity={0.9}
                      style={[
                        styles.optionChip,
                        active ? styles.optionChipActive : null,
                      ]}
                      onPress={() => setCategory(option.key)}
                    >
                      <MaterialCommunityIcons
                        name={option.icon}
                        size={16}
                        color={active ? '#6D6AF8' : '#556070'}
                      />
                      <AppText
                        preset="caption"
                        style={[
                          styles.optionChipText,
                          active ? styles.optionChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <AppText preset="caption" style={styles.label}>
                아이콘
              </AppText>
              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map(option => {
                  const active = iconKey === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      activeOpacity={0.9}
                      style={[
                        styles.iconCard,
                        active ? styles.iconCardActive : null,
                      ]}
                      onPress={() => setIconKey(option.key)}
                    >
                      <MaterialCommunityIcons
                        name={option.icon}
                        size={18}
                        color={active ? '#6D6AF8' : '#556070'}
                      />
                      <AppText
                        preset="caption"
                        style={[
                          styles.iconLabel,
                          active ? styles.iconLabelActive : null,
                        ]}
                      >
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <AppText preset="caption" style={styles.label}>
                색상
              </AppText>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map(option => {
                  const active = colorKey === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      activeOpacity={0.9}
                      style={styles.colorItem}
                      onPress={() => setColorKey(option.key)}
                    >
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: option.color },
                          active ? styles.colorDotActive : null,
                        ]}
                      />
                      <AppText preset="caption" style={styles.colorLabel}>
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <AppText preset="caption" style={styles.label}>
                반복
              </AppText>
              <View style={styles.optionRow}>
                {REPEAT_OPTIONS.map(option => {
                  const active = repeatRule === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      activeOpacity={0.9}
                      style={[
                        styles.optionChip,
                        active ? styles.optionChipActive : null,
                      ]}
                      onPress={() => setRepeatRule(option.key)}
                    >
                      <AppText
                        preset="caption"
                        style={[
                          styles.optionChipText,
                          active ? styles.optionChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <AppText preset="caption" style={styles.label}>
                알림
              </AppText>
              <View style={styles.optionRow}>
                {REMINDER_OPTIONS.map(option => {
                  const active = reminderKey === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      activeOpacity={0.9}
                      style={[
                        styles.optionChip,
                        active ? styles.optionChipActive : null,
                      ]}
                      onPress={() => setReminderKey(option.key)}
                    >
                      <AppText
                        preset="caption"
                        style={[
                          styles.optionChipText,
                          active ? styles.optionChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <AppText preset="caption" style={styles.label}>
                메모
              </AppText>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="홈 이번 주 일정 카드에 보일 짧은 메모를 남겨보세요"
                placeholderTextColor="#8A94A6"
                style={[styles.input, styles.textarea]}
                multiline
              />

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.primaryBtn}
                onPress={onSubmit}
                disabled={saving}
              >
                <Feather name="save" size={16} color="#FFFFFF" />
                <AppText preset="body" style={styles.primaryBtnText}>
                  {saving ? '일정 수정 중...' : '일정 수정하기'}
                </AppText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={dateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDateModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDateModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <AppText preset="headline" style={styles.modalTitle}>
                날짜 선택
              </AppText>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.modalCloseBtn}
                onPress={() => setDateModalVisible(false)}
              >
                <Feather name="x" size={18} color="#556070" />
              </TouchableOpacity>
            </View>
            <View style={styles.presetRow}>
              {datePresets.map(preset => (
                <TouchableOpacity
                  key={preset.value}
                  activeOpacity={0.9}
                  style={styles.presetChip}
                  onPress={() => setDraftDateText(preset.value)}
                >
                  <AppText preset="caption" style={styles.presetChipText}>
                    {preset.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={draftDateText}
              onChangeText={setDraftDateText}
              placeholder="YYYY.MM.DD"
              placeholderTextColor="#8A94A6"
              style={styles.modalInput}
            />
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.modalConfirmBtn}
              onPress={onConfirmDate}
            >
              <AppText preset="body" style={styles.modalConfirmText}>
                날짜 적용
              </AppText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={timeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setTimeModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <AppText preset="headline" style={styles.modalTitle}>
                시간 선택
              </AppText>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.modalCloseBtn}
                onPress={() => setTimeModalVisible(false)}
              >
                <Feather name="x" size={18} color="#556070" />
              </TouchableOpacity>
            </View>
            <View style={styles.presetRow}>
              {TIME_PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset}
                  activeOpacity={0.9}
                  style={styles.presetChip}
                  onPress={() => setDraftTimeText(preset)}
                >
                  <AppText preset="caption" style={styles.presetChipText}>
                    {preset}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={draftTimeText}
              onChangeText={setDraftTimeText}
              placeholder="HH:MM"
              placeholderTextColor="#8A94A6"
              style={styles.modalInput}
            />
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.modalConfirmBtn}
              onPress={onConfirmTime}
            >
              <AppText preset="body" style={styles.modalConfirmText}>
                시간 적용
              </AppText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
