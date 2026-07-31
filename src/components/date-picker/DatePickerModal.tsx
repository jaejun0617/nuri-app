import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView as KeyboardControllerAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import {
  clampDateParts,
  compareDateParts,
  DEFAULT_MAX_YEAR,
  DEFAULT_MIN_YEAR,
  formatDatePart,
  formatDateParts,
  getDaysInMonth,
  parseDateInputParts,
  parseInitialDate,
  partsToDate,
  type DateParts,
  validateDateParts,
} from './datePickerUtils';
import { styles } from './DatePicker.styles';

type Props = {
  visible: boolean;
  title?: string;
  initialDate?: Date | string | null;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  confirmText?: string;
  cancelText?: string;
  includeTime?: boolean;
  timeValue?: string | null;
  minimumDate?: Date | string | null;
  maximumDate?: Date | string | null;
  directInputLabel?: string;
  directInputHelper?: string;
  onChange?: (next: Date) => void;
  onConfirm: (next: Date) => void;
  onConfirmDateTime?: (next: Date, time: string) => void;
  onCancel: () => void;
};

type CalendarCell = {
  key: string;
  parts: DateParts;
  currentMonth: boolean;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
type TimePeriod = 'am' | 'pm';

function parseTimeValue(value?: string | null) {
  if (typeof value !== 'string') {
    return { period: 'am' as TimePeriod, hour: '10', minute: '00' };
  }
  const trimmed = value.trim();
  if (!/^\d{2}:\d{2}$/.test(trimmed)) {
    return { period: 'am' as TimePeriod, hour: '10', minute: '00' };
  }

  const [hour, minute] = trimmed.split(':');
  const hourNumber = Number(hour);
  const period: TimePeriod = hourNumber >= 12 ? 'pm' : 'am';
  const displayHour = hourNumber % 12 === 0 ? 12 : hourNumber % 12;
  return {
    period,
    hour: `${displayHour}`.padStart(2, '0'),
    minute: Number(minute) >= 0 && Number(minute) <= 59 ? minute : '00',
  };
}

function sanitizeTimeDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

function clampTimeInput(value: string, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `${min}`.padStart(2, '0');
  return `${Math.min(Math.max(numeric, min), max)}`.padStart(2, '0');
}

function formatTimeSelection(input: {
  period: TimePeriod;
  hour: string;
  minute: string;
}) {
  const hour12 = Number(input.hour);
  const minute = clampTimeInput(input.minute || '0', 0, 59);
  const normalizedHour12 = Math.min(Math.max(hour12 || 12, 1), 12);
  const hour24 =
    input.period === 'am'
      ? normalizedHour12 === 12
        ? 0
        : normalizedHour12
      : normalizedHour12 === 12
      ? 12
      : normalizedHour12 + 12;
  return `${`${hour24}`.padStart(2, '0')}:${minute}`;
}

function isSameDate(left: DateParts, right: DateParts) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day
  );
}

function toTodayParts(): DateParts {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
}

function addMonths(value: DateParts, delta: number): DateParts {
  const next = new Date(value.year, value.month - 1 + delta, 1);
  const year = next.getFullYear();
  const month = next.getMonth() + 1;
  return {
    year,
    month,
    day: Math.min(value.day, getDaysInMonth(year, month)),
  };
}

function buildCalendarCells(value: DateParts): CalendarCell[] {
  const firstDay = new Date(value.year, value.month - 1, 1).getDay();
  const currentMonthDays = getDaysInMonth(value.year, value.month);
  const previousMonth = addMonths({ ...value, day: 1 }, -1);
  const previousMonthDays = getDaysInMonth(
    previousMonth.year,
    previousMonth.month,
  );
  const cells: CalendarCell[] = [];

  for (let index = firstDay - 1; index >= 0; index -= 1) {
    const day = previousMonthDays - index;
    cells.push({
      key: `prev-${day}`,
      parts: { ...previousMonth, day },
      currentMonth: false,
    });
  }

  for (let day = 1; day <= currentMonthDays; day += 1) {
    cells.push({
      key: `current-${day}`,
      parts: { ...value, day },
      currentMonth: true,
    });
  }

  const nextMonth = addMonths({ ...value, day: 1 }, 1);
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const day = cells.filter(cell => cell.key.startsWith('next-')).length + 1;
    cells.push({
      key: `next-${day}`,
      parts: { ...nextMonth, day },
      currentMonth: false,
    });
  }

  return cells;
}

function formatSelectedSummary(value: DateParts) {
  const date = partsToDate(value);
  return `${formatDatePart(value.day)}. ${WEEKDAYS[date.getDay()]}`;
}

function toDatePartsFromDate(date: Date): DateParts | null {
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function toConstraintParts(value: Date | string | null | undefined) {
  if (value instanceof Date) return toDatePartsFromDate(value);
  if (typeof value === 'string') return parseDateInputParts(value);
  return null;
}

function formatDirectDateInput(raw: string) {
  const normalized = raw.trim().replace(/[./]/g, '-');
  if (normalized.includes('-')) {
    const [yearRaw = '', monthRaw = '', dayRaw = ''] = normalized.split('-');
    const year = yearRaw.replace(/\D/g, '').slice(0, 4);
    const month = monthRaw.replace(/\D/g, '').slice(0, 2);
    const day = dayRaw.replace(/\D/g, '').slice(0, 2);

    let result = year;
    if (normalized.includes('-') || month) result += `-${month}`;
    if (normalized.split('-').length >= 3 || day) result += `-${day}`;
    return result.slice(0, 10);
  }

  const digits = normalized.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function clampToConstraints(
  value: DateParts,
  minYear: number,
  maxYear: number,
  minimumParts: DateParts | null,
  maximumParts: DateParts | null,
) {
  const clamped = clampDateParts(value, minYear, maxYear);
  if (minimumParts && compareDateParts(clamped, minimumParts) < 0) {
    return minimumParts;
  }
  if (maximumParts && compareDateParts(clamped, maximumParts) > 0) {
    return maximumParts;
  }
  return clamped;
}

function validateDirectDateInput(params: {
  rawValue: string;
  minYear: number;
  maxYear: number;
  minimumParts: DateParts | null;
  maximumParts: DateParts | null;
}) {
  const rawValue = params.rawValue.trim();
  if (!rawValue) {
    return { error: '날짜를 YYYY-MM-DD 형식으로 입력해 주세요.', parts: null };
  }

  const parts = parseDateInputParts(rawValue);
  if (!parts) {
    return { error: '날짜를 YYYY-MM-DD 형식으로 입력해 주세요.', parts: null };
  }

  const partError = validateDateParts(parts);
  if (partError) return { error: partError, parts: null };

  if (parts.year < params.minYear || parts.year > params.maxYear) {
    return {
      error: `연도는 ${params.minYear}~${params.maxYear} 사이에서 입력해 주세요.`,
      parts: null,
    };
  }

  if (
    params.minimumParts &&
    compareDateParts(parts, params.minimumParts) < 0
  ) {
    return {
      error: `선택 가능한 가장 이른 날짜는 ${formatDateParts(params.minimumParts)}입니다.`,
      parts: null,
    };
  }

  if (
    params.maximumParts &&
    compareDateParts(parts, params.maximumParts) > 0
  ) {
    return {
      error: `선택 가능한 가장 늦은 날짜는 ${formatDateParts(params.maximumParts)}입니다.`,
      parts: null,
    };
  }

  return { error: null, parts };
}

function DatePickerModalBase({
  visible,
  title = '날짜 선택',
  initialDate,
  minYear = DEFAULT_MIN_YEAR,
  maxYear = DEFAULT_MAX_YEAR,
  disabled = false,
  confirmText = '적용',
  cancelText = '취소',
  includeTime = false,
  timeValue,
  minimumDate,
  maximumDate,
  directInputLabel = '직접 입력',
  directInputHelper = '예: 2010-05-12',
  onChange,
  onConfirm,
  onConfirmDateTime,
  onCancel,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const todayParts = useMemo(toTodayParts, []);
  const minimumParts = useMemo(
    () => toConstraintParts(minimumDate),
    [minimumDate],
  );
  const maximumParts = useMemo(
    () => toConstraintParts(maximumDate),
    [maximumDate],
  );
  const effectiveMinYear = minimumParts
    ? Math.max(minYear, minimumParts.year)
    : minYear;
  const effectiveMaxYear = maximumParts
    ? Math.min(maxYear, maximumParts.year)
    : maxYear;
  const initialParts = useMemo(
    () =>
      clampToConstraints(
        parseInitialDate(initialDate, effectiveMinYear, effectiveMaxYear),
        effectiveMinYear,
        effectiveMaxYear,
        minimumParts,
        maximumParts,
      ),
    [
      effectiveMaxYear,
      effectiveMinYear,
      initialDate,
      maximumParts,
      minimumParts,
    ],
  );

  const [value, setValue] = useState<DateParts>(initialParts);
  const [directInputValue, setDirectInputValue] = useState(() =>
    formatDateParts(initialParts),
  );
  const [directInputError, setDirectInputError] = useState<string | null>(null);
  const [timeSelection, setTimeSelection] = useState(() =>
    parseTimeValue(timeValue),
  );

  useEffect(() => {
    if (!visible) return;
    const nextInitialParts = clampToConstraints(
      parseInitialDate(initialDate, effectiveMinYear, effectiveMaxYear),
      effectiveMinYear,
      effectiveMaxYear,
      minimumParts,
      maximumParts,
    );
    setValue(nextInitialParts);
    setDirectInputValue(formatDateParts(nextInitialParts));
    setDirectInputError(null);
    setTimeSelection(parseTimeValue(timeValue));
  }, [
    effectiveMaxYear,
    effectiveMinYear,
    initialDate,
    maximumParts,
    minimumParts,
    timeValue,
    visible,
  ]);

  useEffect(() => {
    if (!visible || !onChange) return;
    onChange(partsToDate(value));
  }, [onChange, value, visible]);

  useEffect(() => {
    if (!visible) return;
    setDirectInputValue(formatDateParts(value));
    setDirectInputError(null);
  }, [value, visible]);

  const calendarCells = useMemo(() => buildCalendarCells(value), [value]);
  const selectedSummary = useMemo(() => formatSelectedSummary(value), [value]);
  const previewText = useMemo(() => formatDateParts(value), [value]);
  const monthTitle = `${value.year}.${value.month}`;

  const canMovePrevious = value.year > effectiveMinYear || value.month > 1;
  const canMoveNext = value.year < effectiveMaxYear || value.month < 12;

  const isDateSelectable = useCallback(
    (next: DateParts) => {
      if (next.year < effectiveMinYear || next.year > effectiveMaxYear) {
        return false;
      }
      if (minimumParts && compareDateParts(next, minimumParts) < 0) {
        return false;
      }
      if (maximumParts && compareDateParts(next, maximumParts) > 0) {
        return false;
      }
      return true;
    },
    [effectiveMaxYear, effectiveMinYear, maximumParts, minimumParts],
  );

  const moveMonth = useCallback(
    (delta: number) => {
      setValue(prev =>
        clampToConstraints(
          addMonths(prev, delta),
          effectiveMinYear,
          effectiveMaxYear,
          minimumParts,
          maximumParts,
        ),
      );
    },
    [effectiveMaxYear, effectiveMinYear, maximumParts, minimumParts],
  );

  const handleSelectDate = useCallback(
    (next: DateParts) => {
      if (disabled) return;
      if (!isDateSelectable(next)) return;
      setValue(
        clampToConstraints(
          next,
          effectiveMinYear,
          effectiveMaxYear,
          minimumParts,
          maximumParts,
        ),
      );
    },
    [
      disabled,
      effectiveMaxYear,
      effectiveMinYear,
      isDateSelectable,
      maximumParts,
      minimumParts,
    ],
  );

  const applyDirectInput = useCallback(
    (rawValue: string) => {
      const result = validateDirectDateInput({
        rawValue,
        minYear: effectiveMinYear,
        maxYear: effectiveMaxYear,
        minimumParts,
        maximumParts,
      });
      if (result.error || !result.parts) {
        setDirectInputError(result.error);
        return null;
      }

      setDirectInputError(null);
      setValue(result.parts);
      return result.parts;
    },
    [effectiveMaxYear, effectiveMinYear, maximumParts, minimumParts],
  );

  const handleDirectInputChange = useCallback(
    (text: string) => {
      const nextValue = formatDirectDateInput(text);
      setDirectInputValue(nextValue);
      if (nextValue.length === 10) {
        applyDirectInput(nextValue);
        return;
      }
      setDirectInputError(null);
    },
    [applyDirectInput],
  );

  const handleDirectInputBlur = useCallback(() => {
    if (directInputValue.length === 10) {
      applyDirectInput(directInputValue);
      return;
    }
    setDirectInputError('날짜를 YYYY-MM-DD 형식으로 입력해 주세요.');
  }, [applyDirectInput, directInputValue]);

  const handleConfirm = useCallback(() => {
    const directParts = applyDirectInput(directInputValue);
    if (!directParts) return;

    const nextDate = partsToDate(directParts);
    if (includeTime && onConfirmDateTime) {
      onConfirmDateTime(nextDate, formatTimeSelection(timeSelection));
      return;
    }
    onConfirm(nextDate);
  }, [
    includeTime,
    directInputValue,
    applyDirectInput,
    onConfirm,
    onConfirmDateTime,
    timeSelection,
  ]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardControllerAvoidingView
        behavior="padding"
        enabled
        keyboardVerticalOffset={0}
        style={styles.backdrop}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.dismissArea}
          onPress={onCancel}
        />

        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              paddingTop: 18 + Math.max(insets.top, 0),
              paddingBottom: 16 + Math.max(insets.bottom, 8),
            },
          ]}
        >
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={!canMovePrevious || disabled}
              style={[
                styles.monthButton,
                (!canMovePrevious || disabled) ? styles.disabled : null,
              ]}
              onPress={() => moveMonth(-1)}
            >
              <Feather name="chevron-left" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.monthTitleWrap}>
              <AppText preset="unifiedTitle">{monthTitle}</AppText>
              <AppText preset="unifiedMeta" color={theme.colors.textMuted}>
                {title}
              </AppText>
            </View>
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={!canMoveNext || disabled}
              style={[
                styles.monthButton,
                (!canMoveNext || disabled) ? styles.disabled : null,
              ]}
              onPress={() => moveMonth(1)}
            >
              <Feather name="chevron-right" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.calendarBodyScroll}
            contentContainerStyle={styles.calendarBodyContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((weekday, index) => (
                <AppText
                  key={weekday}
                  preset="unifiedMeta"
                  style={[
                    styles.weekdayText,
                    index === 0 ? styles.sundayText : null,
                  ]}
                >
                  {weekday}
                </AppText>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarCells.map(cell => {
                const selected = isSameDate(cell.parts, value);
                const today = isSameDate(cell.parts, todayParts);
                const dateDisabled = disabled || !isDateSelectable(cell.parts);
                return (
                  <TouchableOpacity
                    key={cell.key}
                    activeOpacity={0.86}
                    disabled={dateDisabled}
                    style={[styles.dayCell, dateDisabled ? styles.disabled : null]}
                    onPress={() => handleSelectDate(cell.parts)}
                  >
                    <View
                      style={[
                        styles.dayBadge,
                        selected
                          ? { backgroundColor: theme.colors.brand }
                          : null,
                        today && !selected ? styles.todayBadge : null,
                      ]}
                    >
                      <AppText
                        preset="unifiedMeta"
                        style={[
                          styles.dayText,
                          !cell.currentMonth ? styles.outMonthText : null,
                          selected ? styles.selectedDayText : null,
                          !selected && cell.parts.day % 7 === 0
                            ? styles.sundayText
                            : null,
                        ]}
                      >
                        {cell.parts.day}
                      </AppText>
                    </View>
                    <View
                      style={[
                        styles.dayDot,
                        !cell.currentMonth ? styles.outMonthDot : null,
                        selected ? styles.selectedDayDot : null,
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.selectedPanel}>
              <View style={styles.selectedDateLine}>
                <View style={styles.selectedDateLeft}>
                  <AppText preset="unifiedTitle">{selectedSummary}</AppText>
                  <AppText preset="unifiedMeta" color={theme.colors.textMuted}>
                    {includeTime
                      ? `${previewText} ${formatTimeSelection(timeSelection)}`
                      : previewText}
                  </AppText>
                </View>
                <Feather name="calendar" size={20} color={theme.colors.textMuted} />
              </View>

              {includeTime ? (
                <View style={styles.timePickerBlock}>
                  <View style={styles.timePickerHeader}>
                    <AppText preset="unifiedMeta" color={theme.colors.textMuted}>
                      시간
                    </AppText>
                    <AppText preset="unifiedBody" style={styles.timePreviewText}>
                      {timeSelection.period === 'am' ? '오전' : '오후'}{' '}
                      {timeSelection.hour}:{timeSelection.minute}
                    </AppText>
                  </View>
                  <View style={styles.periodRow}>
                    {(['am', 'pm'] as const).map(period => {
                      const selected = timeSelection.period === period;
                      return (
                        <TouchableOpacity
                          key={period}
                          activeOpacity={0.88}
                          disabled={disabled}
                          style={[
                            styles.periodButton,
                            selected
                              ? {
                                  backgroundColor: theme.colors.brand,
                                  borderColor: theme.colors.brand,
                                }
                              : { borderColor: theme.colors.border },
                          ]}
                          onPress={() => {
                            setTimeSelection(prev => ({ ...prev, period }));
                          }}
                        >
                          <AppText
                            preset="unifiedMeta"
                            style={[
                              styles.periodButtonText,
                              selected ? styles.periodButtonTextActive : null,
                            ]}
                          >
                            {period === 'am' ? '오전' : '오후'}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={styles.timeInputRow}>
                    <View style={styles.timeInputGroup}>
                      <AppText preset="unifiedMeta" style={styles.timeColumnLabel}>
                        시
                      </AppText>
                      <TextInput
                        value={timeSelection.hour}
                        editable={!disabled}
                        keyboardType="number-pad"
                        inputMode="numeric"
                        maxLength={2}
                        returnKeyType="next"
                        selectTextOnFocus
                        style={styles.timeInput}
                        onBlur={() => {
                          setTimeSelection(prev => ({
                            ...prev,
                            hour: clampTimeInput(prev.hour || '12', 1, 12),
                          }));
                        }}
                        onChangeText={text => {
                          setTimeSelection(prev => ({
                            ...prev,
                            hour: sanitizeTimeDigits(text, 2),
                          }));
                        }}
                      />
                    </View>
                    <AppText preset="unifiedTitle" style={styles.timeColonText}>
                      :
                    </AppText>
                    <View style={styles.timeInputGroup}>
                      <AppText preset="unifiedMeta" style={styles.timeColumnLabel}>
                        분
                      </AppText>
                      <TextInput
                        value={timeSelection.minute}
                        editable={!disabled}
                        keyboardType="number-pad"
                        inputMode="numeric"
                        maxLength={2}
                        returnKeyType="done"
                        selectTextOnFocus
                        style={styles.timeInput}
                        onBlur={() => {
                          setTimeSelection(prev => ({
                            ...prev,
                            minute: clampTimeInput(prev.minute || '0', 0, 59),
                          }));
                        }}
                        onChangeText={text => {
                          setTimeSelection(prev => ({
                            ...prev,
                            minute: sanitizeTimeDigits(text, 2),
                          }));
                        }}
                      />
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={styles.directInputBlock}>
                <View style={styles.directInputHeader}>
                  <AppText preset="unifiedMeta" color={theme.colors.textMuted}>
                    {directInputLabel}
                  </AppText>
                  <AppText preset="unifiedMeta" color={theme.colors.textMuted}>
                    {directInputHelper}
                  </AppText>
                </View>
                <TextInput
                  value={directInputValue}
                  editable={!disabled}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#A0A7B4"
                  returnKeyType="done"
                  selectTextOnFocus
                  style={[
                    styles.directInputField,
                    {
                      borderColor: directInputError
                        ? theme.colors.danger
                        : theme.colors.border,
                    },
                  ]}
                  onBlur={handleDirectInputBlur}
                  onChangeText={handleDirectInputChange}
                />
                {directInputError ? (
                  <AppText preset="unifiedMeta" style={styles.directInputError}>
                    {directInputError}
                  </AppText>
                ) : null}
              </View>
            </View>
          </ScrollView>

          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={onCancel}
            >
              <AppText preset="unifiedMeta" style={styles.secondaryButtonText}>
                {cancelText}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={disabled}
              style={[
                styles.primaryButton,
                { backgroundColor: theme.colors.brand },
                disabled ? styles.disabled : null,
              ]}
              onPress={handleConfirm}
            >
              <AppText preset="unifiedMeta" style={styles.primaryButtonText}>
                {confirmText}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardControllerAvoidingView>
    </Modal>
  );
}

const DatePickerModal = memo(DatePickerModalBase);
export default DatePickerModal;
