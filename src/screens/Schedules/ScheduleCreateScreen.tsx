// 파일: src/screens/Schedules/ScheduleCreateScreen.tsx
// 역할:
// - 반려동물 일정 생성 폼과 날짜/시간/반복/알림 선택 UI를 담당
// - 홈/상세/목록 등 다른 진입점에서 들어와도 일관된 기본값으로 생성 가능하게 처리
// - 생성 성공 시 schedule store refresh와 완료 플로우 연결까지 수행

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppText from '../../app/ui/AppText';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import HeaderTextActionButton from '../../components/navigation/HeaderTextActionButton';
import DatePickerModal from '../../components/date-picker/DatePickerModal';
import TimePickerModal from '../../components/time-picker/TimePickerModal';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
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
  formatScheduleDateSummary,
  getAutoScheduleIconKey,
  getReminderMinutesByKey,
  inferScheduleSubCategory,
  normalizeScheduleDateInput,
  normalizeScheduleTimeInput,
  SCHEDULE_CATEGORY_OPTIONS,
  SCHEDULE_COLOR_OPTIONS,
  SCHEDULE_ICON_OPTIONS,
  SCHEDULE_OTHER_UI_SUBCATEGORY_OPTIONS,
  SCHEDULE_REMINDER_OPTIONS,
  SCHEDULE_REPEAT_OPTIONS,
  toScheduleDateInput,
  type ScheduleOtherUiSubCategoryKey,
  type ScheduleReminderOptionKey,
} from '../../services/schedules/form';
import {
  checkScheduleNotificationPermission,
  getScheduleNotificationHelperText,
  requestScheduleNotificationPermission,
  upsertScheduleNotification,
  type ScheduleNotificationPermissionStatus,
} from '../../services/schedules/notifications';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { resolveSelectedPetId, usePetStore } from '../../store/petStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { openMoreDrawer } from '../../store/uiStore';
import { styles } from './ScheduleCreateScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScheduleCreate'>;
type Route = RootScreenRoute<'ScheduleCreate'>;

export default function ScheduleCreateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const routePetId = route.params?.petId ?? null;
  const startsAtParam = route.params?.startsAt?.trim() ?? null;

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const refresh = useScheduleStore(s => s.refresh);

  const petId = useMemo(() => {
    return resolveSelectedPetId(pets, selectedPetId, routePetId);
  }, [pets, routePetId, selectedPetId]);
  const selectedPet = useMemo(
    () => pets.find(candidate => candidate.id === petId) ?? pets[0] ?? null,
    [petId, pets],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );

  const initialDate = useMemo(() => {
    if (startsAtParam) {
      const date = new Date(startsAtParam);
      if (!Number.isNaN(date.getTime())) return date;
    }
    return new Date();
  }, [startsAtParam]);
  const initialDateText = useMemo(() => toScheduleDateInput(initialDate), [initialDate]);

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dateText, setDateText] = useState(toScheduleDateInput(initialDate));
  const [timeText, setTimeText] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState<ScheduleCategory>('health');
  const [otherUiSubCategoryKey, setOtherUiSubCategoryKey] =
    useState<ScheduleOtherUiSubCategoryKey | null>(null);
  const [iconKey, setIconKey] = useState<ScheduleIconKey>('medical-bag');
  const [colorKey, setColorKey] = useState<ScheduleColorKey>('brand');
  const [saving, setSaving] = useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [draftTimeText, setDraftTimeText] = useState('10:00');
  const [repeatRule, setRepeatRule] = useState<ScheduleRepeatRule>('none');
  const [reminderKey, setReminderKey] =
    useState<ScheduleReminderOptionKey>('hour');
  const [notificationPermissionStatus, setNotificationPermissionStatus] =
    useState<ScheduleNotificationPermissionStatus>('unsupported');
  const hasUnsavedChanges = useMemo(
    () =>
      title.trim().length > 0 ||
      note.trim().length > 0 ||
      dateText !== initialDateText ||
      timeText !== '10:00' ||
      allDay ||
      category !== 'health' ||
      otherUiSubCategoryKey !== null ||
      iconKey !== 'medical-bag' ||
      colorKey !== 'brand' ||
      repeatRule !== 'none' ||
      reminderKey !== 'hour',
    [
      allDay,
      category,
      colorKey,
      dateText,
      iconKey,
      initialDateText,
      note,
      otherUiSubCategoryKey,
      reminderKey,
      repeatRule,
      timeText,
      title,
    ],
  );

  useEffect(() => {
    checkScheduleNotificationPermission()
      .then(setNotificationPermissionStatus)
      .catch(() => {
        setNotificationPermissionStatus('unsupported');
      });
  }, []);

  const goBackByEntrySource = useCallback(() => {
    if (route.params?.entrySource === 'home') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
      return;
    }

    if (route.params?.entrySource === 'more') {
      navigation.goBack();
      requestAnimationFrame(() => {
        openMoreDrawer();
      });
      return;
    }

    navigation.goBack();
  }, [navigation, route.params?.entrySource]);

  const onPressBack = useCallback(() => {
    if (saving) return;
    if (hasUnsavedChanges) {
      setExitConfirmVisible(true);
      return;
    }
    goBackByEntrySource();
  }, [goBackByEntrySource, hasUnsavedChanges, saving]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          onPressBack();
          return true;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [onPressBack]),
  );

  const onOpenDateModal = useCallback(() => {
    setDateModalVisible(true);
  }, []);

  const onOpenTimeModal = useCallback(() => {
    setDraftTimeText(timeText);
    setTimeModalVisible(true);
  }, [timeText]);

  const onConfirmDate = useCallback((nextDate: Date) => {
    setDateText(toScheduleDateInput(nextDate).replace(/-/g, '.'));
    setDateModalVisible(false);
  }, []);

  const onConfirmTime = useCallback(() => {
    try {
      const normalized = normalizeScheduleTimeInput(draftTimeText);
      setTimeText(normalized);
      setTimeModalVisible(false);
    } catch (error) {
      Alert.alert('시간 확인', getErrorMessage(error));
    }
  }, [draftTimeText]);

  const onSelectCategory = useCallback((nextCategory: ScheduleCategory) => {
    setCategory(nextCategory);
    if (nextCategory !== 'other') {
      setOtherUiSubCategoryKey(null);
      setIconKey(getAutoScheduleIconKey(nextCategory));
    } else {
      setOtherUiSubCategoryKey(prev => {
        const nextOtherKey = prev ?? 'etc';
        setIconKey(getAutoScheduleIconKey(nextCategory, nextOtherKey));
        return nextOtherKey;
      });
    }
  }, []);

  const onSelectOtherSubCategory = useCallback(
    (nextKey: ScheduleOtherUiSubCategoryKey) => {
      setOtherUiSubCategoryKey(nextKey);
      setIconKey(getAutoScheduleIconKey('other', nextKey));
    },
    [],
  );

  const onSelectReminder = useCallback(
    async (nextKey: ScheduleReminderOptionKey) => {
      setReminderKey(nextKey);
      if (nextKey === 'none') return;

      const currentPermission = await checkScheduleNotificationPermission();
      if (currentPermission === 'granted') {
        setNotificationPermissionStatus(currentPermission);
        return;
      }

      const requestedPermission = await requestScheduleNotificationPermission();
      setNotificationPermissionStatus(requestedPermission);

      if (requestedPermission !== 'granted') {
        Alert.alert(
          '알림 권한 필요',
          '권한이 허용되지 않으면 일정 데이터에는 저장되지만 실제 기기 알림은 오지 않아요.',
        );
      }
    },
    [],
  );

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

      const startsAtIso = new Date(startsAt).toISOString();
      const reminderMinutes = getReminderMinutesByKey(reminderKey);
      const createdScheduleId = await createSchedule({
        petId,
        title: trimmedTitle,
        note: note.trim() || null,
        startsAt: startsAtIso,
        allDay,
        category,
        subCategory: inferScheduleSubCategory(category, otherUiSubCategoryKey),
        iconKey,
        colorKey,
        repeatRule,
        reminderMinutes,
      });

      await upsertScheduleNotification({
        id: createdScheduleId,
        petId,
        title: trimmedTitle,
        note: note.trim() || null,
        startsAt: startsAtIso,
        repeatRule,
        reminderMinutes,
        completedAt: null,
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
    otherUiSubCategoryKey,
    petId,
    reminderKey,
    refresh,
    repeatRule,
    timeText,
    title,
  ]);

  const reminderMinutes = useMemo(
    () => getReminderMinutesByKey(reminderKey),
    [reminderKey],
  );
  const reminderHelperText = useMemo(
    () =>
      getScheduleNotificationHelperText(
        reminderMinutes,
        notificationPermissionStatus,
      ),
    [notificationPermissionStatus, reminderMinutes],
  );
  const headerTopInset = Math.max(insets.top, 12);

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { paddingTop: headerTopInset + 4 }]}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.headerBackButton}
            onPress={onPressBack}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>

        <AppText preset="headline" style={styles.headerTitle}>
          일정 추가
        </AppText>

        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]}>
          <HeaderTextActionButton
            accessibilityLabel={saving ? '일정 저장 중' : '일정 저장 완료'}
            backgroundColor={petTheme.tint}
            borderColor={petTheme.border}
            disabled={saving}
            label={saving ? '저장 중' : '완료'}
            onPress={onSubmit}
            textColor={petTheme.primary}
          />
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 316, 376) },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={82}
        extraHeight={228}
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
                allDay
                  ? {
                      backgroundColor: petTheme.tint,
                      borderColor: petTheme.border,
                    }
                  : null,
              ]}
              onPress={() => setAllDay(prev => !prev)}
            >
              <AppText
                preset="caption"
                style={[
                  styles.allDayChipText,
                  allDay ? styles.allDayChipTextActive : null,
                  allDay ? { color: petTheme.primary } : null,
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
                    active
                      ? {
                          backgroundColor: petTheme.tint,
                          borderColor: petTheme.border,
                        }
                      : null,
                  ]}
                  onPress={() => onSelectCategory(option.key)}
                >
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={16}
                    color={active ? petTheme.primary : '#556070'}
                  />
                  <AppText
                    preset="caption"
                    style={[
                      styles.optionChipText,
                      active ? styles.optionChipTextActive : null,
                      active ? { color: petTheme.primary } : null,
                    ]}
                  >
                    {option.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {category === 'other' ? (
            <>
              <AppText preset="caption" style={styles.label}>
                기타 분류
              </AppText>
              <View style={styles.optionRow}>
                {SCHEDULE_OTHER_UI_SUBCATEGORY_OPTIONS.map(option => {
                  const active = otherUiSubCategoryKey === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      activeOpacity={0.9}
                      style={[
                        styles.optionChip,
                        active ? styles.optionChipActive : null,
                        active
                          ? {
                              backgroundColor: petTheme.tint,
                              borderColor: petTheme.border,
                            }
                          : null,
                      ]}
                      onPress={() => onSelectOtherSubCategory(option.key)}
                    >
                      <AppText
                        preset="caption"
                        style={[
                          styles.optionChipText,
                          active ? styles.optionChipTextActive : null,
                          active ? { color: petTheme.primary } : null,
                        ]}
                      >
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

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
                    active
                      ? {
                          backgroundColor: petTheme.tint,
                          borderColor: petTheme.border,
                        }
                      : null,
                  ]}
                  onPress={() => setIconKey(option.key)}
                >
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={18}
                    color={active ? petTheme.primary : '#556070'}
                  />
                  <AppText
                    preset="caption"
                    style={[
                      styles.iconLabel,
                      active ? styles.iconLabelActive : null,
                      active ? { color: petTheme.primary } : null,
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
                      active ? { borderColor: petTheme.border } : null,
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
                    active
                      ? {
                          backgroundColor: petTheme.tint,
                          borderColor: petTheme.border,
                        }
                      : null,
                  ]}
                  onPress={() => setRepeatRule(option.key)}
                >
                  <AppText
                    preset="caption"
                    style={[
                      styles.optionChipText,
                      active ? styles.optionChipTextActive : null,
                      active ? { color: petTheme.primary } : null,
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
                    active
                      ? {
                          backgroundColor: petTheme.tint,
                          borderColor: petTheme.border,
                        }
                      : null,
                  ]}
                  onPress={() => {
                    onSelectReminder(option.key).catch(() => {
                      // permission alert is handled in the request flow
                    });
                  }}
                >
                  <AppText
                    preset="caption"
                    style={[
                      styles.optionChipText,
                      active ? styles.optionChipTextActive : null,
                      active ? { color: petTheme.primary } : null,
                    ]}
                  >
                    {option.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
          <AppText preset="caption" style={styles.helperText}>
            {reminderHelperText}
          </AppText>

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
        </View>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.bottomSubmitBtn,
            { backgroundColor: petTheme.primary },
            { marginBottom: Math.max(insets.bottom, 18) },
          ]}
          onPress={onSubmit}
          disabled={saving}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <AppText preset="body" style={styles.primaryBtnText}>
            {saving ? '일정 저장 중...' : '일정 저장하기'}
          </AppText>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <DatePickerModal
        visible={dateModalVisible}
        initialDate={dateText}
        onCancel={() => setDateModalVisible(false)}
        onConfirm={onConfirmDate}
      />

      <TimePickerModal
        visible={timeModalVisible}
        value={draftTimeText}
        onCancel={() => setTimeModalVisible(false)}
        onConfirm={onConfirmTime}
      />
      <ConfirmDialog
        visible={exitConfirmVisible}
        title="저장하지 않고 나갈까요?"
        message={
          '입력한 일정 내용은 아직 저장되지 않았으며\n지금 나가면 현재 화면에서 사라져요.'
        }
        cancelLabel="계속 작성하기"
        confirmLabel="나가기"
        tone="warning"
        accentColor={petTheme.primary}
        onCancel={() => setExitConfirmVisible(false)}
        onConfirm={() => {
          setExitConfirmVisible(false);
          goBackByEntrySource();
        }}
      />
    </SafeAreaView>
  );
}
