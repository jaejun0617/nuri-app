// 파일: src/screens/Schedules/ScheduleEditScreen.tsx
// 역할:
// - 기존 일정을 불러와 날짜/시간/카테고리/반복/알림 정보를 수정
// - 수정 완료 시 상세 화면과 목록 화면이 바로 최신 상태를 반영하도록 연결
// - 생성 화면과 동일한 입력 경험을 유지하면서도 기존 값 초기화를 책임짐

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import SchedulePickerModal from '../../components/schedules/SchedulePickerModal';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  getBrandedErrorMeta,
  getErrorMessage,
} from '../../services/app/errors';
import {
  fetchScheduleById,
  updateSchedule,
  type PetSchedule,
  type ScheduleCategory,
  type ScheduleColorKey,
  type ScheduleIconKey,
  type ScheduleRepeatRule,
} from '../../services/supabase/schedules';
import {
  createScheduleDatePresets,
  formatScheduleDateSummary,
  getReminderKeyByMinutes,
  getReminderMinutesByKey,
  inferScheduleSubCategory,
  normalizeScheduleDateInput,
  normalizeScheduleTimeInput,
  SCHEDULE_CATEGORY_OPTIONS,
  SCHEDULE_COLOR_OPTIONS,
  SCHEDULE_ICON_OPTIONS,
  SCHEDULE_REMINDER_OPTIONS,
  SCHEDULE_REPEAT_OPTIONS,
  SCHEDULE_TIME_PRESETS,
  toScheduleDateInput,
  type ScheduleReminderOptionKey,
} from '../../services/schedules/form';
import { useScheduleStore } from '../../store/scheduleStore';
import { styles } from './ScheduleCreateScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScheduleEdit'>;
type Route = {
  key: string;
  name: 'ScheduleEdit';
  params: { petId?: string; scheduleId: string };
};

export default function ScheduleEditScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { petId, scheduleId } = route.params;
  const refresh = useScheduleStore(s => s.refresh);
  const datePresets = useMemo(() => createScheduleDatePresets(), []);

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
    useState<ScheduleReminderOptionKey>('none');

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
        setDateText(toScheduleDateInput(startsAt));
        setTimeText(
          `${`${startsAt.getHours()}`.padStart(2, '0')}:${`${startsAt.getMinutes()}`.padStart(2, '0')}`,
        );
        setAllDay(next.allDay);
        setCategory(next.category);
        setIconKey(next.iconKey);
        setColorKey(next.colorKey);
        setRepeatRule(next.repeatRule);
        setReminderKey(getReminderKeyByMinutes(next.reminderMinutes));
      } catch (error) {
        if (mounted) {
          const { title: alertTitle, message } = getBrandedErrorMeta(
            error,
            'schedule-fetch',
          );
          Alert.alert(alertTitle, message);
          navigation.goBack();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run().catch(() => {
      // handled inside run
    });
    return () => {
      mounted = false;
    };
  }, [navigation, scheduleId]);

  const onConfirmDate = useCallback(() => {
    try {
      const normalized = normalizeScheduleDateInput(draftDateText);
      setDateText(normalized.replace(/-/g, '.'));
      setDateModalVisible(false);
    } catch (error) {
      Alert.alert('날짜 확인', getErrorMessage(error));
    }
  }, [draftDateText]);

  const onConfirmTime = useCallback(() => {
    try {
      const normalized = normalizeScheduleTimeInput(draftTimeText);
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
      const normalizedDate = normalizeScheduleDateInput(dateText);
      const startsAt = allDay
        ? `${normalizedDate}T00:00:00`
        : `${normalizedDate}T${normalizeScheduleTimeInput(timeText)}:00`;

      await updateSchedule({
        scheduleId: schedule.id,
        petId: schedule.petId,
        title: title.trim(),
        note: note.trim() || null,
        startsAt: new Date(startsAt).toISOString(),
        allDay,
        category,
        subCategory: inferScheduleSubCategory(category),
        iconKey,
        colorKey,
        completedAt: schedule.completedAt,
        linkedMemoryId: schedule.linkedMemoryId,
        repeatRule,
        repeatInterval: schedule.repeatInterval,
        repeatUntil: schedule.repeatUntil,
        reminderMinutes: getReminderMinutesByKey(reminderKey),
        source: schedule.source,
        externalCalendarId: schedule.externalCalendarId,
        externalEventId: schedule.externalEventId,
        syncStatus: schedule.syncStatus,
      });

      if (petId) {
        await refresh(petId);
      }
      navigation.replace('EditDone', {
        title: '일정 수정 완료!',
        bodyLines: [
          '방금 고친 일정이 차분하게 정리됐어요.',
          '이제 전체 일정에서 바로 확인할 수 있어요.',
        ],
        buttonLabel: '전체 일정 보기',
        navigateTo: { type: 'schedule-list', petId },
      });
    } catch (error) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        error,
        'schedule-update',
      );
      Alert.alert(alertTitle, message);
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
    refresh,
    repeatRule,
    schedule,
    timeText,
    title,
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
                  {formatScheduleDateSummary(dateText)}
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
                {SCHEDULE_CATEGORY_OPTIONS.map(option => {
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
                {SCHEDULE_ICON_OPTIONS.map(option => {
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
                {SCHEDULE_COLOR_OPTIONS.map(option => {
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
                {SCHEDULE_REPEAT_OPTIONS.map(option => {
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
                {SCHEDULE_REMINDER_OPTIONS.map(option => {
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
                placeholder="홈 일정 카드에 보일 짧은 메모를 남겨보세요"
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

      <SchedulePickerModal
        visible={dateModalVisible}
        title="날짜 선택"
        value={draftDateText}
        placeholder="YYYY.MM.DD"
        presets={datePresets.map(preset => ({
          key: preset.value,
          label: preset.label,
          value: preset.value,
        }))}
        onClose={() => setDateModalVisible(false)}
        onChangeValue={setDraftDateText}
        onSelectPreset={setDraftDateText}
        onConfirm={onConfirmDate}
        confirmLabel="날짜 적용"
      />

      <SchedulePickerModal
        visible={timeModalVisible}
        title="시간 선택"
        value={draftTimeText}
        placeholder="HH:MM"
        presets={SCHEDULE_TIME_PRESETS.map(preset => ({
          key: preset,
          label: preset,
          value: preset,
        }))}
        onClose={() => setTimeModalVisible(false)}
        onChangeValue={setDraftTimeText}
        onSelectPreset={setDraftTimeText}
        onConfirm={onConfirmTime}
        confirmLabel="시간 적용"
      />
    </View>
  );
}
