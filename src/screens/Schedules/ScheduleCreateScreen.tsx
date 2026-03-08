// 파일: src/screens/Schedules/ScheduleCreateScreen.tsx
// 역할:
// - 반려동물 일정 생성 폼과 날짜/시간/반복/알림 선택 UI를 담당
// - 홈/상세/목록 등 다른 진입점에서 들어와도 일관된 기본값으로 생성 가능하게 처리
// - 생성 성공 시 schedule store refresh와 완료 플로우 연결까지 수행

import React, { useCallback, useMemo, useState } from 'react';
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
  createSchedule,
  type ScheduleCategory,
  type ScheduleColorKey,
  type ScheduleIconKey,
  type ScheduleRepeatRule,
} from '../../services/supabase/schedules';
import {
  createScheduleDatePresets,
  formatScheduleDateSummary,
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
import { usePetStore } from '../../store/petStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { styles } from './ScheduleCreateScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScheduleCreate'>;
type Route = {
  key: string;
  name: 'ScheduleCreate';
  params?: { petId?: string; startsAt?: string };
};

export default function ScheduleCreateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const startsAtParam = route.params?.startsAt?.trim() ?? null;

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const refresh = useScheduleStore(s => s.refresh);

  const petId = useMemo(() => {
    const petIdFromParams = route.params?.petId ?? null;
    if (petIdFromParams) return petIdFromParams;
    if (selectedPetId && pets.some(p => p.id === selectedPetId)) {
      return selectedPetId;
    }
    return pets[0]?.id ?? null;
  }, [pets, route.params?.petId, selectedPetId]);

  const initialDate = useMemo(() => {
    if (startsAtParam) {
      const date = new Date(startsAtParam);
      if (!Number.isNaN(date.getTime())) return date;
    }
    return new Date();
  }, [startsAtParam]);

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dateText, setDateText] = useState(toScheduleDateInput(initialDate));
  const [timeText, setTimeText] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState<ScheduleCategory>('health');
  const [iconKey, setIconKey] = useState<ScheduleIconKey>('medical-bag');
  const [colorKey, setColorKey] = useState<ScheduleColorKey>('brand');
  const [saving, setSaving] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [draftDateText, setDraftDateText] = useState(
    toScheduleDateInput(initialDate),
  );
  const [draftTimeText, setDraftTimeText] = useState('10:00');
  const [repeatRule, setRepeatRule] = useState<ScheduleRepeatRule>('none');
  const [reminderKey, setReminderKey] =
    useState<ScheduleReminderOptionKey>('hour');

  const datePresets = useMemo(() => createScheduleDatePresets(), []);

  const onOpenDateModal = useCallback(() => {
    setDraftDateText(dateText);
    setDateModalVisible(true);
  }, [dateText]);

  const onOpenTimeModal = useCallback(() => {
    setDraftTimeText(timeText);
    setTimeModalVisible(true);
  }, [timeText]);

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
    if (!petId) {
      Alert.alert('반려동물을 찾을 수 없어요.');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('일정 제목을 입력해 주세요.');
      return;
    }

    try {
      setSaving(true);

      const normalizedDate = normalizeScheduleDateInput(dateText);
      const startsAt = allDay
        ? `${normalizedDate}T00:00:00`
        : `${normalizedDate}T${normalizeScheduleTimeInput(timeText)}:00`;

      await createSchedule({
        petId,
        title: trimmedTitle,
        note: note.trim() || null,
        startsAt: new Date(startsAt).toISOString(),
        allDay,
        category,
        subCategory: inferScheduleSubCategory(category),
        iconKey,
        colorKey,
        repeatRule,
        reminderMinutes: getReminderMinutesByKey(reminderKey),
      });

      await refresh(petId);
      navigation.replace('ScheduleList', { petId });
    } catch (error) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        error,
        'schedule-create',
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
          일정 추가
        </AppText>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.headerDoneBtn}
          onPress={onSubmit}
          disabled={saving}
        >
          <AppText preset="caption" style={styles.headerDoneText}>
            {saving ? '저장 중' : '완료'}
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
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
            onPress={onOpenDateModal}
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
                onPress={onOpenTimeModal}
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
                  style={[styles.iconCard, active ? styles.iconCardActive : null]}
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
            <Feather name="plus" size={16} color="#FFFFFF" />
            <AppText preset="body" style={styles.primaryBtnText}>
              {saving ? '일정 저장 중...' : '일정 저장하기'}
            </AppText>
          </TouchableOpacity>
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
