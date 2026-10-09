import { usePetDisplayName } from '../../hooks/usePetDisplayName';
import { formatPetCopy } from '../../utils/petDisplayName';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions,
  type TextInput,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import AppTextInput from '../../app/ui/AppTextInput';
import DatePickerModal from '../date-picker/DatePickerModal';
import ConfirmDialog from '../common/ConfirmDialog';
import ScheduleReminderNotice from '../common/ScheduleReminderNotice';
import Feather from '../icons/NuriFeatherIcon';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';
import { useScheduleCreateForm } from '../../hooks/useScheduleCreateForm';
import { useBoundedKeyboardScroll } from '../../hooks/useBoundedKeyboardScroll';
import { useKeyboardBottomPadding } from '../../hooks/useKeyboardBottomPadding';
import {
  SCHEDULE_COLOR_OPTIONS,
  SCHEDULE_ICON_OPTIONS,
  SCHEDULE_REMINDER_OPTIONS,
  SCHEDULE_REPEAT_OPTIONS,
  formatScheduleDateSummary,
} from '../../services/schedules/form';
import { mapScheduleIconName } from '../../services/schedules/presentation';
import type { SeasonKey } from '../../theme/seasonal/season';
import {
  homeCalendarDayLabel,
  homeCalendarRegistrationInstant,
  homeCalendarTimeLabel,
  type HomeScheduleOccurrence,
} from './homeScheduleCalendarModel';

type Props = {
  petId: string;
  day: string;
  occurrences: readonly HomeScheduleOccurrence[];
  initialMode: 'agenda' | 'create';
  dataState: 'ready' | 'loading' | 'error';
  season: SeasonKey;
  accentColor: string;
  accentDeepColor: string;
  onClose: () => void;
  onSaved: (ymd: string) => void;
  onDetail: (id: string) => void;
};

/** One native modal owns agenda, registration, dismissal and draft protection. */
export function ScheduleCalendarSheet({
  petId,
  day,
  occurrences,
  initialMode,
  dataState,
  accentColor,
  accentDeepColor,
  onClose,
  onSaved,
  onDetail,
}: Props) {
  const petName = usePetDisplayName(petId);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const [mode, setMode] = useState(initialMode);
  const [expanded, setExpanded] = useState<
    'category' | 'repeat' | 'reminder' | 'advanced' | null
  >(null);
  const [agendaHeight, setAgendaHeight] = useState<number | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [footerHeight, setFooterHeight] = useState<number | null>(null);
  const [presented, setPresented] = useState(false);
  const entryStartedRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const bottomPaddingStyle = useKeyboardBottomPadding(
    Math.max(insets.bottom, 14),
  );
  const closingRef = useRef(false);
  const completionRef = useRef<(() => void) | null>(null);
  const progress = useSharedValue(0);
  const panelHeight = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const titleRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);
  const reminderRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);
  const noteRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);
  const { scrollProps, revealInput } = useBoundedKeyboardScroll(!closing);
  const finishDismiss = useCallback(() => {
    const completion = completionRef.current;
    completionRef.current = null;
    // Keep the keyboard anchor stable until the sheet is offscreen.
    Keyboard.dismiss();
    completion?.();
  }, []);
  const dismiss = useCallback(
    (completion: () => void) => {
      if (closingRef.current) return;
      closingRef.current = true;
      completionRef.current = completion;
      setClosing(true);
      cancelAnimation(panelHeight);
      progress.value = withTiming(
        0,
        { duration: 240, easing: Easing.in(Easing.cubic) },
        finished => {
          if (finished) runOnJS(finishDismiss)();
        },
      );
    },
    [finishDismiss, panelHeight, progress],
  );
  const show = useCallback(() => {
    if (closingRef.current) return;
    setPresented(true);
  }, []);
  const saved = useCallback(
    ({ ymd }: { id: string; ymd: string }) => dismiss(() => onSaved(ymd)),
    [dismiss, onSaved],
  );
  const form = useScheduleCreateForm({
    petId,
    params: {
      petId,
      startsAt: homeCalendarRegistrationInstant(day),
      entrySource: 'home',
    },
    onSaved: saved,
  });
  const { setReminderNoticeVisible } = form;
  const close = useCallback(() => {
    if (form.saving) return;
    if (form.reminderNoticeVisible) {
      setReminderNoticeVisible(false);
      return;
    }
    if (exitConfirmVisible) {
      setExitConfirmVisible(false);
      return;
    }
    if (mode === 'create' && form.hasUnsavedChanges && !form.persisted) {
      setExitConfirmVisible(true);
      return;
    }
    dismiss(onClose);
  }, [
    dismiss,
    exitConfirmVisible,
    form.hasUnsavedChanges,
    form.persisted,
    form.reminderNoticeVisible,
    setReminderNoticeVisible,
    form.saving,
    mode,
    onClose,
  ]);
  const inputStyle = [styles.input, { color: theme.colors.textPrimary }];
  const toggle = (key: typeof expanded) =>
    setExpanded(previous => (previous === key ? null : key));
  const option = (
    key: string,
    label: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.option,
        {
          borderColor: selected ? accentColor : 'rgba(255,255,255,0.6)',
          backgroundColor: selected
            ? `${accentColor}18`
            : 'rgba(255,255,255,0.18)',
        },
      ]}
    >
      <AppText
        preset="unifiedMicro"
        color={selected ? accentDeepColor : theme.colors.textPrimary}
      >
        {label}
      </AppText>
    </Pressable>
  );
  const selector = (key: typeof expanded, label: string, value: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      accessibilityState={{ expanded: expanded === key }}
      onPress={() => toggle(key)}
      style={styles.selector}
    >
      <AppText preset="unifiedLabel" color={theme.colors.textPrimary}>
        {label}
      </AppText>
      <AppText
        preset="unifiedBody"
        color={theme.colors.textSecondary}
        style={styles.selectorValue}
      >
        {value}
      </AppText>
      <Feather
        name={expanded === key ? 'chevron-down' : 'chevron-right'}
        size={19}
        color={accentColor}
      />
    </Pressable>
  );
  const availableHeight = Math.max(180, height - insets.top - 12);
  const targetHeight = Math.min(
    availableHeight,
    mode === 'create'
      ? fontScale >= 1.3
        ? 720
        : 660
      : Math.max(
          230,
          (headerHeight ?? 64) +
            (footerHeight ?? 46) +
            81 +
            (agendaHeight ?? Math.min(occurrences.length, 4) * 84 + 10),
        ),
    mode === 'agenda' ? height * 0.76 : availableHeight,
  );
  useEffect(() => {
    if (closingRef.current) return;
    if (!entryStartedRef.current) {
      panelHeight.value = targetHeight;
      if (
        !presented ||
        headerHeight === null ||
        footerHeight === null ||
        (mode === 'agenda' && agendaHeight === null)
      )
        return;
      // Measure once before entry so list sizing cannot change its slide distance.
      entryStartedRef.current = true;
      progress.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }
    // Keep content measurement and agenda-to-form changes continuous on the UI thread.
    panelHeight.value = panelHeight.value
      ? withTiming(targetHeight, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        })
      : targetHeight;
  }, [
    agendaHeight,
    footerHeight,
    headerHeight,
    mode,
    panelHeight,
    presented,
    progress,
    targetHeight,
  ]);
  useEffect(
    () => () => {
      cancelAnimation(progress);
      cancelAnimation(panelHeight);
      completionRef.current = null;
    },
    [panelHeight, progress],
  );
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panelStyle = useAnimatedStyle(() => {
    // Explicit animated height must fit the real keyboard-reduced parent, not the screen.
    const boundedHeight = Math.min(
      panelHeight.value || targetHeight,
      viewportHeight.value || targetHeight,
    );
    return {
      height: boundedHeight,
      transform: [
        {
          translateY:
            (1 - progress.value) * (boundedHeight + insets.bottom + 12),
        },
      ],
    };
  });
  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onShow={show}
      onRequestClose={close}
    >
      <SafeAreaProvider>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
        />
        <Pressable
          testID="home-calendar-agenda-backdrop"
          accessibilityRole="button"
          accessibilityLabel="일정 창 닫기"
          style={StyleSheet.absoluteFill}
          disabled={closing || form.saving}
          onPress={close}
        />
        <SafeAreaView
          testID="home-calendar-safe-area"
          edges={['top']}
          pointerEvents="box-none"
          importantForAccessibility={
            exitConfirmVisible ? 'no-hide-descendants' : 'auto'
          }
          style={styles.safeRoot}
        >
          <KeyboardAvoidingView
            testID="home-calendar-keyboard-viewport"
            behavior="height"
            automaticOffset
            pointerEvents={closing || exitConfirmVisible ? 'none' : 'box-none'}
            style={styles.root}
            onLayout={event => {
              const measuredHeight = event.nativeEvent.layout.height;
              if (measuredHeight > 0) viewportHeight.value = measuredHeight;
            }}
          >
            <Animated.View
              testID="home-calendar-motion-panel"
              renderToHardwareTextureAndroid
              style={[styles.motionPanel, panelStyle]}
            >
              <Animated.View
                testID="home-calendar-agenda"
                style={[styles.panel, bottomPaddingStyle]}
              >
                <Pressable
                  testID="home-calendar-sheet-touch-boundary"
                  accessible={false}
                  style={StyleSheet.absoluteFill}
                  onPress={event => event.stopPropagation()}
                />
                <View
                  testID="home-calendar-reading-surface"
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, styles.readingSurface]}
                />
                <View style={styles.handle} pointerEvents="none" />
                <View
                  testID="home-calendar-sheet-header"
                  style={styles.header}
                  onLayout={event =>
                    setHeaderHeight(event.nativeEvent.layout.height)
                  }
                >
                  <View style={styles.headerBody}>
                    <AppText
                      accessibilityRole="header"
                      preset="unifiedTitle"
                      color={accentDeepColor}
                    >
                      {mode === 'create'
                        ? '일정 추가'
                        : homeCalendarDayLabel(day)}
                    </AppText>
                    <AppText
                      preset="unifiedBody"
                      color={
                        mode === 'create'
                          ? accentDeepColor
                          : theme.colors.textSecondary
                      }
                    >
                      {mode === 'create'
                        ? formatScheduleDateSummary(form.dateText)
                        : dataState === 'ready'
                        ? `일정 ${occurrences.length}개`
                        : '일정 확인 중'}
                    </AppText>
                  </View>
                  <Pressable
                    testID="home-calendar-agenda-close"
                    accessibilityRole="button"
                    accessibilityLabel="닫기"
                    disabled={form.saving || closing}
                    onPress={close}
                    style={styles.closeButton}
                  >
                    <NuriSemanticIcon
                      family="feather"
                      name="x"
                      size={24}
                      color={theme.colors.textPrimary}
                      preserveOriginal
                    />
                  </Pressable>
                </View>
                {mode === 'agenda' ? (
                  <>
                    <FlatList
                      data={occurrences}
                      keyExtractor={item => item.key}
                      style={styles.body}
                      contentContainerStyle={styles.agendaContent}
                      onContentSizeChange={(_width, contentHeight) =>
                        setAgendaHeight(contentHeight)
                      }
                      ItemSeparatorComponent={<View style={styles.divider} />}
                      ListEmptyComponent={
                        <AppText
                          preset="unifiedBody"
                          color={theme.colors.textMuted}
                        >
                          {dataState === 'ready'
                            ? formatPetCopy('우리 아이의 일정을 남겨보세요', petName)
                            : dataState === 'error'
                            ? '일정을 불러오지 못했어요'
                            : '일정을 불러오고 있어요'}
                        </AppText>
                      }
                      renderItem={({ item }) => (
                        <Pressable
                          testID={`home-calendar-agenda-${item.schedule.id}`}
                          accessibilityRole="button"
                          accessibilityLabel={`${homeCalendarTimeLabel(
                            item,
                            day,
                          )}, ${item.schedule.title}, 일정 상세 보기`}
                          onPress={() =>
                            dismiss(() => onDetail(item.schedule.id))
                          }
                          style={styles.agendaRow}
                        >
                          <NuriSemanticIcon
                            family="material"
                            name={mapScheduleIconName(item.schedule.iconKey)}
                            size={32}
                            color={accentColor}
                          />
                          <View style={styles.headerBody}>
                            <AppText
                              preset="unifiedMicro"
                              color={theme.colors.textSecondary}
                            >
                              {homeCalendarTimeLabel(item, day)}
                            </AppText>
                            <AppText
                              preset="cardTitle"
                              color={theme.colors.textPrimary}
                            >
                              {item.schedule.title}
                            </AppText>
                            <AppText
                              preset="unifiedMicro"
                              color={theme.colors.textSecondary}
                            >
                              {item.schedule.repeatRule !== 'none'
                                ? '반복 일정'
                                : item.schedule.reminderMinutes.length
                                ? '알림 일정'
                                : '일정'}
                              {item.schedule.completedAt ? ' · 완료' : ''}
                            </AppText>
                          </View>
                          <Feather
                            name="chevron-right"
                            size={20}
                            color={accentColor}
                          />
                        </Pressable>
                      )}
                    />
                    <CtaButton
                      role="primary"
                      testID="home-calendar-agenda-create"
                      accessibilityRole="button"
                      onPress={() => setMode('create')}
                      disabled={closing}
                      onLayout={event =>
                        setFooterHeight(event.nativeEvent.layout.height)
                      }
                      style={[styles.submit, {}]}
                    >
                      <CtaText preset="unifiedLabel" style={styles.centered}>
                        일정 추가하기
                      </CtaText>
                    </CtaButton>
                  </>
                ) : (
                  <>
                    <ScrollView
                      {...scrollProps}
                      testID="calendar-create-scroll"
                      style={styles.body}
                      contentContainerStyle={styles.formContent}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="none"
                      showsVerticalScrollIndicator={false}
                    >
                      <View
                        pointerEvents={
                          form.saving || form.persisted ? 'none' : 'auto'
                        }
                      >
                        <AppText
                          preset="unifiedLabel"
                          color={theme.colors.textPrimary}
                        >
                          일정 제목
                        </AppText>
                        <AppTextInput
                          ref={titleRef}
                          testID="calendar-create-title"
                          accessibilityLabel="일정 제목"
                          value={form.title}
                          onChangeText={form.setTitle}
                          editable={!form.saving && !form.persisted}
                          placeholder="일정 제목을 입력하세요"
                          placeholderTextColor={theme.colors.textSecondary}
                          style={inputStyle}
                          onFocus={() => revealInput(titleRef)}
                        />
                        <View style={styles.dateRow}>
                          <View style={styles.dateColumn}>
                            <AppText
                              preset="unifiedMicro"
                              color={theme.colors.textMuted}
                            >
                              날짜
                            </AppText>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="날짜 선택"
                              onPress={form.onOpenDateModal}
                              style={[styles.dateField, styles.input]}
                            >
                              <AppText
                                preset="unifiedBody"
                                color={theme.colors.textPrimary}
                                style={styles.selectorValue}
                              >
                                {form.dateText.replace(/-/g, '.')}
                              </AppText>
                              <Feather
                                name="calendar"
                                size={20}
                                color={theme.colors.textMuted}
                              />
                            </Pressable>
                          </View>
                          <View style={styles.dateColumn}>
                            <AppText
                              preset="unifiedMicro"
                              color={theme.colors.textMuted}
                            >
                              시간
                            </AppText>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="시간 선택"
                              disabled={form.allDay}
                              onPress={form.onOpenDateModal}
                              style={[
                                styles.dateField,
                                styles.input,
                                form.allDay && styles.disabled,
                              ]}
                            >
                              <AppText
                                preset="unifiedBody"
                                color={theme.colors.textPrimary}
                                style={styles.selectorValue}
                              >
                                {form.allDay ? '하루 종일' : form.timeText}
                              </AppText>
                              <Feather
                                name="clock"
                                size={20}
                                color={theme.colors.textMuted}
                              />
                            </Pressable>
                          </View>
                        </View>
                        <View style={styles.selector}>
                          <AppText
                            preset="unifiedLabel"
                            color={theme.colors.textPrimary}
                            style={styles.selectorValue}
                          >
                            하루 종일
                          </AppText>
                          <Switch
                            testID="calendar-create-all-day"
                            accessibilityLabel="하루 종일"
                            value={form.allDay}
                            onValueChange={form.setAllDay}
                            trackColor={{ false: '#BEC2C5', true: accentColor }}
                          />
                        </View>
                        {selector(
                          'category',
                          '분류',
                          form.categoryOptions.find(
                            item => item.key === form.category,
                          )?.label ?? '기타',
                        )}
                        {expanded === 'category' ? (
                          <View style={styles.options}>
                            {form.categoryOptions.map(item =>
                              option(
                                item.key,
                                item.label,
                                form.category === item.key,
                                () => form.onSelectCategory(item.key),
                              ),
                            )}
                            {form.category === 'other'
                              ? form.otherSubCategoryOptions.map(item =>
                                  option(
                                    item.key,
                                    item.label,
                                    form.otherUiSubCategoryKey === item.key,
                                    () =>
                                      form.onSelectOtherSubCategory(item.key),
                                  ),
                                )
                              : null}
                          </View>
                        ) : null}
                        {selector(
                          'repeat',
                          '반복',
                          SCHEDULE_REPEAT_OPTIONS.find(
                            item => item.key === form.repeatRule,
                          )?.label ?? '반복 없음',
                        )}
                        {expanded === 'repeat' ? (
                          <View style={styles.options}>
                            {SCHEDULE_REPEAT_OPTIONS.map(item =>
                              option(
                                item.key,
                                item.label,
                                form.repeatRule === item.key,
                                () => {
                                  form.setRepeatRule(item.key);
                                  setExpanded(null);
                                },
                              ),
                            )}
                          </View>
                        ) : null}
                        {selector(
                          'reminder',
                          '알림',
                          SCHEDULE_REMINDER_OPTIONS.find(
                            item => item.key === form.reminderKey,
                          )?.label ?? '알림 없음',
                        )}
                        {expanded === 'reminder' ? (
                          <View style={styles.options}>
                            {SCHEDULE_REMINDER_OPTIONS.map(item =>
                              option(
                                item.key,
                                item.label,
                                form.reminderKey === item.key,
                                () => {
                                  form.onSelectReminder(item.key);
                                  if (item.key !== 'custom') setExpanded(null);
                                },
                              ),
                            )}
                          </View>
                        ) : null}
                        {form.reminderKey === 'custom' ? (
                          <AppTextInput
                            ref={reminderRef}
                            testID="calendar-create-reminder"
                            editable={!form.saving && !form.persisted}
                            accessibilityLabel="알림 몇 분 전"
                            value={form.customReminderMinutesText}
                            onChangeText={form.setCustomReminderMinutesText}
                            keyboardType="number-pad"
                            placeholder="몇 분 전에 알릴까요?"
                            placeholderTextColor={theme.colors.textSecondary}
                            style={inputStyle}
                            onFocus={() => revealInput(reminderRef)}
                          />
                        ) : null}
                        {form.reminderKey !== 'none' ? (
                          <AppText
                            preset="unifiedMicro"
                            color={theme.colors.textMuted}
                          >
                            {form.reminderHelperText}
                          </AppText>
                        ) : null}
                        <AppText
                          preset="unifiedLabel"
                          color={theme.colors.textPrimary}
                          style={styles.noteLabel}
                        >
                          메모
                        </AppText>
                        <AppTextInput
                          ref={noteRef}
                          testID="calendar-create-note"
                          accessibilityLabel="메모"
                          value={form.note}
                          onChangeText={form.setNote}
                          editable={!form.saving && !form.persisted}
                          placeholder="메모를 남겨보세요"
                          placeholderTextColor={theme.colors.textSecondary}
                          style={[inputStyle, styles.note]}
                          multiline
                          onFocus={() => revealInput(noteRef)}
                        />
                        {selector('advanced', '추가 설정', '')}
                        {expanded === 'advanced' ? (
                          <>
                            <AppText
                              preset="unifiedLabel"
                              color={theme.colors.textPrimary}
                            >
                              아이콘
                            </AppText>
                            <View style={styles.options}>
                              {SCHEDULE_ICON_OPTIONS.map(item => (
                                <Pressable
                                  key={item.key}
                                  accessibilityRole="button"
                                  accessibilityLabel={item.label}
                                  accessibilityState={{
                                    selected: form.iconKey === item.key,
                                  }}
                                  onPress={() => form.setIconKey(item.key)}
                                  style={[
                                    styles.option,
                                    {
                                      borderColor:
                                        form.iconKey === item.key
                                          ? accentColor
                                          : 'transparent',
                                    },
                                  ]}
                                >
                                  <NuriSemanticIcon
                                    family="material"
                                    name={item.icon}
                                    size={28}
                                    color={accentColor}
                                  />
                                  <AppText
                                    preset="unifiedMicro"
                                    color={theme.colors.textPrimary}
                                  >
                                    {item.label}
                                  </AppText>
                                </Pressable>
                              ))}
                            </View>
                            <AppText
                              preset="unifiedLabel"
                              color={theme.colors.textPrimary}
                            >
                              색상
                            </AppText>
                            <View style={styles.options}>
                              {SCHEDULE_COLOR_OPTIONS.map(item => (
                                <Pressable
                                  key={item.key}
                                  accessibilityRole="button"
                                  accessibilityLabel={item.label}
                                  accessibilityState={{
                                    selected: form.colorKey === item.key,
                                  }}
                                  onPress={() => form.setColorKey(item.key)}
                                  style={styles.option}
                                >
                                  <View
                                    style={[
                                      styles.swatch,
                                      {
                                        backgroundColor: item.color,
                                        borderColor:
                                          form.colorKey === item.key
                                            ? accentColor
                                            : 'transparent',
                                      },
                                    ]}
                                  />
                                  <AppText
                                    preset="unifiedMicro"
                                    color={theme.colors.textPrimary}
                                  >
                                    {item.label}
                                  </AppText>
                                </Pressable>
                              ))}
                            </View>
                          </>
                        ) : null}
                      </View>
                    </ScrollView>
                    <CtaButton
                      role="primary"
                      loading={form.saving}
                      testID="calendar-create-save"
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: form.saving || !form.title.trim(),
                      }}
                      disabled={form.saving || !form.title.trim()}
                      onPress={form.onSubmit}
                      onLayout={event =>
                        setFooterHeight(event.nativeEvent.layout.height)
                      }
                      style={[
                        styles.submit,
                        {},
                        (form.saving || !form.title.trim()) && styles.disabled,
                      ]}
                    >
                      <CtaText preset="unifiedLabel" style={styles.centered}>
                        {form.saving ? '저장 중' : '일정 저장하기'}
                      </CtaText>
                    </CtaButton>
                  </>
                )}
              </Animated.View>
            </Animated.View>
          </KeyboardAvoidingView>
        </SafeAreaView>
        <ScheduleReminderNotice embedded visible={form.reminderNoticeVisible} onClose={() => form.setReminderNoticeVisible(false)} />
        <ConfirmDialog
          confirmRole="destructiveConfirm"
          cancelRole="neutral"
          embedded
          keyboardAware
          visible={exitConfirmVisible}
          typographyMode="unified"
          title="저장하지 않고 나갈까요?"
          message={
            '작성한 일정은 아직 저장되지 않았어요.\n계속 작성하면 입력한 내용을 이어갈 수 있어요.'
          }
          cancelLabel="계속 작성하기"
          confirmLabel="나가기"
          tone="warning"
          onCancel={() => setExitConfirmVisible(false)}
          onConfirm={() => {
            setExitConfirmVisible(false);
            dismiss(onClose);
          }}
        />
        <DatePickerModal
          visible={form.dateModalVisible}
          title="일정 날짜와 시간"
          initialDate={form.dateText}
          includeTime={!form.allDay}
          timeValue={form.timeText}
          onCancel={() => form.setDateModalVisible(false)}
          onConfirm={form.onConfirmDate}
          onConfirmDateTime={form.onConfirmDateTime}
        />
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeRoot: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(20,23,32,0.25)' },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  motionPanel: {
    width: '100%',
    maxHeight: '100%',
    flexShrink: 1,
    minHeight: 0,
  },
  panel: {
    marginTop: 0,
    padding: 14,
    width: '100%',
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(117,87,68,0.18)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  readingSurface: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(125,88,67,0.18)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerBody: { flex: 1, minWidth: 0, gap: 4 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(85,96,112,0.24)',
    backgroundColor: 'rgba(255,255,255,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minHeight: 0 },
  agendaContent: { paddingBottom: 10 },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  divider: { height: 1, backgroundColor: 'rgba(117,87,68,0.12)' },
  formContent: { paddingBottom: 16 },
  input: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(154,133,125,0.20)',
    backgroundColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
  dateRow: { flexDirection: 'row', gap: 10, marginVertical: 10 },
  dateColumn: { flex: 1, minWidth: 0 },
  dateField: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 46,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(117,87,68,0.12)',
  },
  selectorValue: { flex: 1, minWidth: 0 },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  option: {
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  noteLabel: { marginTop: 12 },
  note: { minHeight: 58, textAlignVertical: 'top' },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  submit: {
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: { textAlign: 'center' },
  disabled: { opacity: 0.45 },
});
