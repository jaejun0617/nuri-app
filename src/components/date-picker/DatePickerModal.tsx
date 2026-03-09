import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import LinearGradient from 'react-native-linear-gradient';

import AppText from '../../app/ui/AppText';
import DateWheelPicker from './DateWheelPicker';
import {
  clampDateParts,
  DEFAULT_MAX_YEAR,
  DEFAULT_MIN_YEAR,
  formatDatePart,
  formatDateParts,
  parseInitialDate,
  partsToDate,
  validateDateParts,
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
  onChange?: (next: Date) => void;
  onConfirm: (next: Date) => void;
  onCancel: () => void;
};

type DateDraft = {
  year: string;
  month: string;
  day: string;
};

type DraftField = keyof DateDraft;

function toDraft(value: DateParts): DateDraft {
  return {
    year: formatDatePart(value.year, 4),
    month: formatDatePart(value.month),
    day: formatDatePart(value.day),
  };
}

function sanitizeDraftValue(field: DraftField, raw: string) {
  const digitsOnly = raw.replace(/\D/g, '');
  const maxLength = field === 'year' ? 4 : 2;
  return digitsOnly.slice(0, maxLength);
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
  onChange,
  onConfirm,
  onCancel,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const initialParts = useMemo(
    () => parseInitialDate(initialDate, minYear, maxYear),
    [initialDate, maxYear, minYear],
  );

  const [value, setValue] = useState<DateParts>(initialParts);
  const [draft, setDraft] = useState<DateDraft>(() => toDraft(initialParts));
  const draftRef = useRef<DateDraft>(toDraft(initialParts));
  const [focusedField, setFocusedField] = useState<DraftField | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const syncDraft = useCallback((nextDraft: DateDraft) => {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const nextValue = parseInitialDate(initialDate, minYear, maxYear);
    setValue(nextValue);
    syncDraft(toDraft(nextValue));
    setFocusedField(null);
    setErrorMessage(null);
  }, [initialDate, maxYear, minYear, syncDraft, visible]);

  useEffect(() => {
    if (!visible || !onChange) return;
    onChange(partsToDate(value));
  }, [onChange, value, visible]);

  const previewText = useMemo(() => formatDateParts(value), [value]);

  const applyValue = useCallback(
    (next: DateParts) => {
      const clamped = clampDateParts(next, minYear, maxYear);
      const validationMessage = validateDateParts(clamped);
      setValue(clamped);
      syncDraft(toDraft(clamped));
      setErrorMessage(validationMessage);
      return !validationMessage;
    },
    [maxYear, minYear, syncDraft],
  );

  const commitDraft = useCallback(
    (nextDraft: DateDraft) => {
      const year = Number(nextDraft.year);
      const month = Number(nextDraft.month);
      const day = Number(nextDraft.day);

      if (!nextDraft.year || `${year}`.length !== 4) {
        setErrorMessage('연도는 4자리로 입력해 주세요.');
        return false;
      }
      if (!nextDraft.month) {
        setErrorMessage('월을 입력해 주세요.');
        return false;
      }
      if (!nextDraft.day) {
        setErrorMessage('일을 입력해 주세요.');
        return false;
      }

      if (!Number.isInteger(month) || month < 1 || month > 12) {
        setErrorMessage('월은 1~12 사이에서 입력해 주세요.');
        return false;
      }

      const maxDay = new Date(year, month, 0).getDate();
      if (!Number.isInteger(day) || day < 1 || day > maxDay) {
        setErrorMessage(
          `일은 ${formatDatePart(month)}월 기준 1~${maxDay} 사이여야 합니다.`,
        );
        return false;
      }

      setErrorMessage(null);
      return applyValue({ year, month, day });
    },
    [applyValue],
  );

  const handleWheelChange = useCallback(
    (next: DateParts) => {
      setFocusedField(null);
      setErrorMessage(null);
      applyValue(next);
    },
    [applyValue],
  );

  const handleInputChange = useCallback(
    (field: DraftField, raw: string) => {
      const sanitized = sanitizeDraftValue(field, raw);
      const nextDraft = { ...draftRef.current, [field]: sanitized };
      syncDraft(nextDraft);

      if (!sanitized) {
        setErrorMessage(`${field === 'year' ? '연도' : field === 'month' ? '월' : '일'}를 입력해 주세요.`);
        return;
      }

      if (field === 'year' && sanitized.length < 4) {
        setErrorMessage('연도는 4자리로 입력해 주세요.');
        return;
      }

      if (field !== 'year') {
        const numeric = Number(sanitized);
        if (field === 'month' && (numeric < 1 || numeric > 12)) {
          setErrorMessage('월은 1~12 사이에서 입력해 주세요.');
          return;
        }

        const year = Number(nextDraft.year || value.year);
        const month = Number(field === 'month' ? sanitized : nextDraft.month || value.month);
        const maxDay = month >= 1 && month <= 12 ? new Date(year, month, 0).getDate() : 31;
        if (field === 'day' && (numeric < 1 || numeric > maxDay)) {
          setErrorMessage(
            `일은 ${month >= 1 && month <= 12 ? formatDatePart(month) : '--'}월 기준 1~${maxDay} 사이여야 합니다.`,
          );
          return;
        }
      }

      const yearReady = nextDraft.year.length === 4;
      const monthReady = nextDraft.month.length >= 1;
      const dayReady = nextDraft.day.length >= 1;

      if (yearReady && monthReady && dayReady) {
        commitDraft(nextDraft);
      } else {
        setErrorMessage(null);
      }
    },
    [commitDraft, syncDraft, value.month, value.year],
  );

  const handleInputFocus = useCallback((field: DraftField) => {
    setFocusedField(field);
    setErrorMessage(null);
  }, []);

  const handleInputBlur = useCallback(() => {
    setFocusedField(null);
    const committed = commitDraft(draftRef.current);
    if (!committed) {
      syncDraft(toDraft(value));
      setErrorMessage(null);
    }
  }, [commitDraft, syncDraft, value]);

  const handleConfirm = useCallback(() => {
    setFocusedField(null);
    const committed = commitDraft(draftRef.current);
    if (!committed) return;
    const nextDraft = draftRef.current;
    onConfirm(
      partsToDate(
        clampDateParts(
          {
            year: Number(nextDraft.year),
            month: Number(nextDraft.month),
            day: Number(nextDraft.day),
          },
          minYear,
          maxYear,
        ),
      ),
    );
  }, [commitDraft, maxYear, minYear, onConfirm]);

  const renderInput = useCallback(
    (field: DraftField, label: string, placeholder: string) => (
      <View style={styles.inputGroup}>
        <AppText
          preset="caption"
          style={{
            color: 'rgba(255,255,255,0.72)',
            fontSize: 11,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {label}
        </AppText>
        <TextInput
          value={draft[field]}
          onChangeText={text => handleInputChange(field, text)}
          onFocus={() => handleInputFocus(field)}
            onBlur={handleInputBlur}
            editable={!disabled}
            keyboardType="number-pad"
            inputMode="numeric"
            returnKeyType="done"
          maxLength={field === 'year' ? 4 : 2}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.34)"
          style={[
            styles.inputField,
            {
              backgroundColor:
                focusedField === field
                  ? 'rgba(124,137,255,0.18)'
                  : 'rgba(255,255,255,0.08)',
              borderColor:
                focusedField === field
                  ? 'rgba(167,182,255,0.50)'
                  : 'rgba(255,255,255,0.12)',
              opacity: disabled ? 0.55 : 1,
            },
          ]}
          textAlignVertical="center"
        />
      </View>
    ),
    [
      disabled,
      draft,
      focusedField,
      handleInputBlur,
      handleInputChange,
      handleInputFocus,
    ],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.backdrop}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.dismissArea}
            onPress={onCancel}
          />

          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: 'rgba(14, 24, 46, 0.78)',
                borderColor: 'rgba(255,255,255,0.14)',
                paddingBottom: 20 + Math.max(insets.bottom, 8),
              },
            ]}
          >
            <LinearGradient
              pointerEvents="none"
              colors={[
                'rgba(255,255,255,0.10)',
                'rgba(124,137,255,0.08)',
                'rgba(9,19,36,0.02)',
              ]}
              start={{ x: 0.08, y: 0 }}
              end={{ x: 0.92, y: 1 }}
              style={styles.glassTint}
            />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.02)']}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={styles.glassGlow}
            />

            <View style={styles.headerBlock}>
              <AppText
                preset="body"
                style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}
              >
                {title}
              </AppText>
              <AppText
                preset="caption"
                style={[
                  styles.helperText,
                  { color: 'rgba(255,255,255,0.62)', fontSize: 12 },
                ]}
              >
                휠로 고르거나 직접 입력할 수 있어요.
              </AppText>
              <AppText
                preset="body"
                style={[
                  styles.previewText,
                  { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
                ]}
              >
                {previewText}
              </AppText>
            </View>

            <DateWheelPicker
              value={value}
              minYear={minYear}
              maxYear={maxYear}
              disabled={disabled}
              onChange={handleWheelChange}
            />

            <View style={styles.inputSection}>
              <View style={styles.inputRow}>
                {renderInput('year', '년도', 'YYYY')}
                {renderInput('month', '월', 'MM')}
                {renderInput('day', '일', 'DD')}
              </View>

              <View style={styles.inputHintRow}>
                <AppText
                  preset="caption"
                  style={[
                    styles.errorText,
                    {
                      color: errorMessage ? '#FFC9C9' : 'rgba(255,255,255,0.52)',
                      fontSize: 12,
                    },
                  ]}
                >
                  {errorMessage ?? '월/일은 1자리 입력도 가능하고 적용 시 2자리로 정리됩니다.'}
                </AppText>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.88}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.12)',
                  },
                ]}
                onPress={onCancel}
              >
                <AppText
                  preset="caption"
                  style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}
                >
                  {cancelText}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                disabled={disabled}
                style={[styles.primaryButton, { opacity: disabled ? 0.65 : 1 }]}
                onPress={handleConfirm}
              >
                <LinearGradient
                  colors={
                    disabled
                      ? [theme.colors.border, theme.colors.border]
                      : ['#7C89FF', theme.colors.brand]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.primaryButton,
                    { width: '100%', borderRadius: 16 },
                  ]}
                >
                  <AppText
                    preset="caption"
                    style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}
                  >
                    {confirmText}
                  </AppText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const DatePickerModal = memo(DatePickerModalBase);
export default DatePickerModal;
