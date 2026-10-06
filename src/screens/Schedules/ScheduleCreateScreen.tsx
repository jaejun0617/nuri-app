import CtaButton, { CtaText, CtaIcon } from '../../app/ui/CtaButton';
// 파일: src/screens/Schedules/ScheduleCreateScreen.tsx
// 역할:
// - 반려동물 일정 생성 폼과 날짜/시간/반복/알림 선택 UI를 담당
// - 홈/상세/목록 등 다른 진입점에서 들어와도 일관된 기본값으로 생성 가능하게 처리
// - 생성 성공 시 schedule store refresh와 완료 플로우 연결까지 수행

import AppTextInput from '../../app/ui/AppTextInput';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { BackHandler, TouchableOpacity, View } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import {
  KeyboardAwareScrollView,
  useKeyboardState,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Feather from '../../components/icons/NuriFeatherIcon';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';

import AppText from '../../app/ui/AppText';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import WaveText from '../../components/common/WaveText';
import HeaderTextActionButton from '../../components/navigation/HeaderTextActionButton';
import DatePickerModal from '../../components/date-picker/DatePickerModal';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { resolveScheduleReturnTarget } from '../../navigation/scheduleReturn';
import type { RootScreenRoute } from '../../navigation/types';
import {
  formatScheduleDateSummary,
  SCHEDULE_COLOR_OPTIONS,
  SCHEDULE_ICON_OPTIONS,
  SCHEDULE_REMINDER_OPTIONS,
  SCHEDULE_REPEAT_OPTIONS,
} from '../../services/schedules/form';
import { useScheduleCreateForm } from '../../hooks/useScheduleCreateForm';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { resolveSelectedPetId, usePetStore } from '../../store/petStore';
import { styles } from './ScheduleCreateScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScheduleCreate'>;
type Route = RootScreenRoute<'ScheduleCreate'>;

export default function ScheduleCreateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState(state => state.isVisible);
  const queryClient = useQueryClient();
  const routePetId = route.params?.petId ?? null;
  const returnTo = route.params?.returnTo;
  const resolvedReturnTo = resolveScheduleReturnTarget(
    returnTo,
    route.params?.entrySource,
  );

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);

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

  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const onSaved = useCallback(
    async ({ ymd }: { id: string; ymd: string }) => {
      if (!petId) return;
      if (resolvedReturnTo.screen === 'HealthReport') {
        await queryClient.invalidateQueries({
          queryKey: ['health-report', 'month', petId],
        });
        navigation.popTo('HealthReport', {
          petId,
          initialTab: resolvedReturnTo.initialTab ?? 'records',
          focusYmd: ymd,
          entrySource: resolvedReturnTo.entrySource,
        });
        return;
      }
      navigation.popTo('ScheduleList', {
        petId,
        entrySource: resolvedReturnTo.entrySource,
      });
    },
    [navigation, petId, queryClient, resolvedReturnTo],
  );
  const {
    title,
    setTitle,
    note,
    setNote,
    dateText,
    timeText,
    allDay,
    setAllDay,
    category,
    otherUiSubCategoryKey,
    iconKey,
    setIconKey,
    colorKey,
    setColorKey,
    saving,
    persisted,
    hasUnsavedChanges,
    dateModalVisible,
    setDateModalVisible,
    repeatRule,
    setRepeatRule,
    reminderKey,
    customReminderMinutesText,
    setCustomReminderMinutesText,
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
  } = useScheduleCreateForm({ petId, params: route.params, onSaved });

  const goBackByEntrySource = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    if (resolvedReturnTo.screen === 'HealthReport') {
      navigation.popTo('HealthReport', {
        petId: petId ?? undefined,
        initialTab: resolvedReturnTo.initialTab ?? 'records',
        entrySource: resolvedReturnTo.entrySource,
      });
      return;
    }

    navigation.popTo('ScheduleList', {
      petId: petId ?? undefined,
      entrySource: resolvedReturnTo.entrySource,
    });
  }, [navigation, petId, resolvedReturnTo]);

  const onPressBack = useCallback(() => {
    if (saving) return;
    if (hasUnsavedChanges && !persisted) {
      setExitConfirmVisible(true);
      return;
    }
    goBackByEntrySource();
  }, [goBackByEntrySource, hasUnsavedChanges, persisted, saving]);

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

  const headerTopInset = Math.max(insets.top, 12);
  const scrollRef = useRef<KeyboardAwareScrollViewRef | null>(null);
  const scrollBottomInset = keyboardVisible ? 12 : insets.bottom + 32;

  const handleFocusNote = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.assureFocusedInputVisible();
    });
  }, []);

  return (
    <SafeAreaView
      style={styles.screen}
      edges={keyboardVisible ? ['left', 'right'] : ['left', 'right', 'bottom']}
    >
      <View style={[styles.header, { paddingTop: headerTopInset + 4 }]}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.headerBackButton}
            onPress={onPressBack}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>

        <AppText
          typographyRole="screenTitle"
          preset="unifiedTitle"
          style={styles.headerTitle}
        >
          일정 추가
        </AppText>

        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]}>
          <HeaderTextActionButton
            role="primarySubtle"
            loading={saving}
            accessibilityLabel={saving ? '일정 저장 중' : '일정 저장 완료'}
            borderRadius={8}
            disabled={saving}
            label={saving ? '적는 중 🐾' : '완료'}
            onPress={onSubmit}
          />
        </View>
      </View>

      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomInset },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={styles.card}
          pointerEvents={saving || persisted ? 'none' : 'auto'}
        >
          <AppText preset="unifiedMeta" style={styles.label}>
            일정 이름
          </AppText>
          <AppTextInput
            value={title}
            editable={!saving && !persisted}
            onChangeText={setTitle}
            placeholder="예: 병원 정기 검진"
            placeholderTextColor="#8A94A6"
            style={styles.input}
          />

          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <AppText preset="unifiedMeta" style={styles.label}>
                일시
              </AppText>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.pickerField}
                onPress={onOpenDateModal}
              >
                <View style={styles.pickerTextStack}>
                  <AppText preset="unifiedBody" style={styles.pickerFieldText}>
                    {formatScheduleDateSummary(dateText)}
                  </AppText>
                  <AppText
                    preset="unifiedMeta"
                    style={[
                      styles.pickerFieldSubText,
                      allDay ? styles.pickerFieldTextDisabled : null,
                    ]}
                  >
                    {allDay ? '하루 종일' : timeText}
                  </AppText>
                </View>
                <Feather name="calendar" size={16} color="#8A94A6" />
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
                preset="unifiedMeta"
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

          <AppText preset="unifiedMeta" style={styles.label}>
            카테고리
          </AppText>
          <View style={styles.optionRow}>
            {categoryOptions.map(option => {
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
                  <NuriSemanticIcon
                    family="material"
                    name={option.icon}
                    size={16}
                    color={active ? petTheme.primary : '#556070'}
                  />
                  <AppText
                    preset="unifiedMeta"
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
              <AppText preset="unifiedMeta" style={styles.label}>
                기타 분류
              </AppText>
              <View style={styles.optionRow}>
                {otherSubCategoryOptions.map(option => {
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
                        preset="unifiedMeta"
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

          <AppText preset="unifiedMeta" style={styles.label}>
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
                  <NuriSemanticIcon
                    family="material"
                    name={option.icon}
                    size={16}
                    color={active ? petTheme.primary : '#556070'}
                  />
                  <AppText
                    preset="unifiedMeta"
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

          <AppText preset="unifiedMeta" style={styles.label}>
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
                  <AppText preset="unifiedMeta" style={styles.colorLabel}>
                    {option.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <AppText preset="unifiedMeta" style={styles.label}>
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
                    preset="unifiedMeta"
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

          <AppText preset="unifiedMeta" style={styles.label}>
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
                    preset="unifiedMeta"
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
          {reminderKey !== 'none' ? (
            <AppText preset="unifiedMeta" style={styles.helperText}>
              예약 예정: {reminderSummaryText}
            </AppText>
          ) : null}
          {reminderKey === 'custom' ? (
            <View style={styles.inlineFieldCard}>
              <AppText preset="unifiedMeta" style={styles.inlineFieldLabel}>
                직접 설정(분)
              </AppText>
              <AppTextInput
                value={customReminderMinutesText}
                editable={!saving && !persisted}
                onChangeText={setCustomReminderMinutesText}
                keyboardType="number-pad"
                placeholder="예: 1"
                placeholderTextColor="#8A94A6"
                style={styles.inlineInput}
              />
            </View>
          ) : null}
          <AppText preset="unifiedMeta" style={styles.helperText}>
            {reminderHelperText}
          </AppText>

          <AppText preset="unifiedMeta" style={styles.label}>
            메모
          </AppText>
          <AppTextInput
            value={note}
            editable={!saving && !persisted}
            onChangeText={setNote}
            onFocus={handleFocusNote}
            placeholder="홈 일정 카드에 보일 짧은 메모를 남겨보세요"
            placeholderTextColor="#8A94A6"
            style={[styles.input, styles.textarea]}
            multiline
          />
        </View>
        <CtaButton
          role="primary"
          loading={saving}
          activeOpacity={0.9}
          accessibilityLabel={saving ? '일정 저장 중' : '일정 저장 완료'}
          accessibilityHint={
            saving
              ? '일정 저장이 완료될 때까지 잠시 기다려 주세요.'
              : '두 번 탭하면 현재 일정을 저장합니다.'
          }
          style={[styles.bottomSubmitBtn, {}, { marginBottom: 0 }]}
          onPress={onSubmit}
          disabled={saving}
        >
          <CtaIcon name="plus" size={16} />
          {saving ? (
            <WaveText
              text="일정을 차곡차곡 적는 중 🐾"
              color="#FFFFFF"
              textStyle={styles.primaryBtnText}
            />
          ) : (
            <CtaText preset="unifiedBody" style={styles.primaryBtnText}>
              일정 저장하기
            </CtaText>
          )}
        </CtaButton>
      </KeyboardAwareScrollView>

      <DatePickerModal
        visible={dateModalVisible}
        title="일정 날짜와 시간"
        initialDate={dateText}
        includeTime={!allDay}
        timeValue={timeText}
        onCancel={() => setDateModalVisible(false)}
        onConfirm={onConfirmDate}
        onConfirmDateTime={onConfirmDateTime}
      />
      <ConfirmDialog
        confirmRole="destructiveConfirm"
        cancelRole="neutral"
        visible={exitConfirmVisible}
        typographyMode="unified"
        title="저장하지 않고 나갈까요?"
        message={
          '입력한 일정 내용은 아직 저장되지 않았으며\n지금 나가면 현재 화면에서 사라져요.'
        }
        cancelLabel="계속 작성하기"
        confirmLabel="나가기"
        tone="warning"
        onCancel={() => setExitConfirmVisible(false)}
        onConfirm={() => {
          setExitConfirmVisible(false);
          goBackByEntrySource();
        }}
      />
    </SafeAreaView>
  );
}
