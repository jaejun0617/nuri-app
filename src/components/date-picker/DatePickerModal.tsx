import React, { memo, useCallback, useEffect, useState } from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import LinearGradient from 'react-native-linear-gradient';

import AppText from '../../app/ui/AppText';
import DateWheelPicker from './DateWheelPicker';
import {
  clampDateParts,
  DEFAULT_MAX_YEAR,
  DEFAULT_MIN_YEAR,
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
  onChange?: (next: Date) => void;
  onConfirm: (next: Date) => void;
  onCancel: () => void;
};

function DatePickerModalBase({
  visible,
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

  const [value, setValue] = useState<DateParts>(() =>
    parseInitialDate(initialDate, minYear, maxYear),
  );

  useEffect(() => {
    if (!visible) return;
    setValue(parseInitialDate(initialDate, minYear, maxYear));
  }, [initialDate, maxYear, minYear, visible]);

  useEffect(() => {
    if (!visible || !onChange) return;
    onChange(partsToDate(value));
  }, [onChange, value, visible]);

  const handleChange = useCallback(
    (next: DateParts) => {
      setValue(clampDateParts(next, minYear, maxYear));
    },
    [maxYear, minYear],
  );

  const handleConfirm = useCallback(() => {
    onConfirm(partsToDate(value));
  }, [onConfirm, value]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
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
            colors={['rgba(255,255,255,0.10)', 'rgba(124,137,255,0.08)', 'rgba(9,19,36,0.02)']}
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

          <DateWheelPicker
            value={value}
            minYear={minYear}
            maxYear={maxYear}
            disabled={disabled}
            onChange={handleChange}
          />

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
    </Modal>
  );
}

const DatePickerModal = memo(DatePickerModalBase);
export default DatePickerModal;
