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
  DEFAULT_MAX_YEAR,
  DEFAULT_MIN_YEAR,
  formatDatePart,
  formatDateParts,
  getDaysInMonth,
  parseInitialDate,
  partsToDate,
  type DateParts,
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
  onChange,
  onConfirm,
  onConfirmDateTime,
  onCancel,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const todayParts = useMemo(toTodayParts, []);
  const initialParts = useMemo(
    () => parseInitialDate(initialDate, minYear, maxYear),
    [initialDate, maxYear, minYear],
  );

  const [value, setValue] = useState<DateParts>(initialParts);
  const [timeSelection, setTimeSelection] = useState(() =>
    parseTimeValue(timeValue),
  );

  useEffect(() => {
    if (!visible) return;
    setValue(parseInitialDate(initialDate, minYear, maxYear));
    setTimeSelection(parseTimeValue(timeValue));
  }, [initialDate, maxYear, minYear, timeValue, visible]);

  useEffect(() => {
    if (!visible || !onChange) return;
    onChange(partsToDate(value));
  }, [onChange, value, visible]);

  const calendarCells = useMemo(() => buildCalendarCells(value), [value]);
  const selectedSummary = useMemo(() => formatSelectedSummary(value), [value]);
  const previewText = useMemo(() => formatDateParts(value), [value]);
  const monthTitle = `${value.year}.${value.month}`;

  const canMovePrevious = value.year > minYear || value.month > 1;
  const canMoveNext = value.year < maxYear || value.month < 12;

  const moveMonth = useCallback(
    (delta: number) => {
      setValue(prev => clampDateParts(addMonths(prev, delta), minYear, maxYear));
    },
    [maxYear, minYear],
  );

  const handleSelectDate = useCallback(
    (next: DateParts) => {
      if (disabled) return;
      setValue(clampDateParts(next, minYear, maxYear));
    },
    [disabled, maxYear, minYear],
  );

  const handleConfirm = useCallback(() => {
    const nextDate = partsToDate(value);
    if (includeTime && onConfirmDateTime) {
      onConfirmDateTime(nextDate, formatTimeSelection(timeSelection));
      return;
    }
    onConfirm(nextDate);
  }, [
    includeTime,
    onConfirm,
    onConfirmDateTime,
    timeSelection,
    value,
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
        enabled={includeTime}
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
              <AppText preset="titleMd">{monthTitle}</AppText>
              <AppText preset="caption" color={theme.colors.textMuted}>
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
                  preset="caption"
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
                return (
                  <TouchableOpacity
                    key={cell.key}
                    activeOpacity={0.86}
                    disabled={disabled}
                    style={styles.dayCell}
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
                        preset="caption"
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
                  <AppText preset="titleMd">{selectedSummary}</AppText>
                  <AppText preset="caption" color={theme.colors.textMuted}>
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
                    <AppText preset="caption" color={theme.colors.textMuted}>
                      시간
                    </AppText>
                    <AppText preset="body" style={styles.timePreviewText}>
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
                            preset="caption"
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
                      <AppText preset="caption" style={styles.timeColumnLabel}>
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
                    <AppText preset="titleMd" style={styles.timeColonText}>
                      :
                    </AppText>
                    <View style={styles.timeInputGroup}>
                      <AppText preset="caption" style={styles.timeColumnLabel}>
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
              <AppText preset="caption" style={styles.secondaryButtonText}>
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
              <AppText preset="caption" style={styles.primaryButtonText}>
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
