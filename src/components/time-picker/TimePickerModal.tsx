import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import {
  styles,
  TIME_WHEEL_ITEM_HEIGHT,
} from './TimePicker.styles';

type Props = {
  visible: boolean;
  title?: string;
  helperText?: string;
  value?: string | null;
  disabled?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

const HOURS = Array.from({ length: 24 }, (_, index) =>
  `${index}`.padStart(2, '0'),
);
const MINUTES = Array.from({ length: 60 }, (_, index) =>
  `${index}`.padStart(2, '0'),
);

function parseTimeValue(value?: string | null) {
  if (typeof value !== 'string') {
    return { hour: '10', minute: '00' };
  }

  const trimmed = value.trim();
  if (!/^\d{2}:\d{2}$/.test(trimmed)) {
    return { hour: '10', minute: '00' };
  }

  const [hour, minute] = trimmed.split(':');
  return {
    hour: HOURS.includes(hour) ? hour : '10',
    minute: MINUTES.includes(minute) ? minute : '00',
  };
}

function TimeWheel({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  disabled: boolean;
  onChange: (next: string) => void;
}) {
  const listRef = useRef<FlatList<string>>(null);
  const selectedIndex = useMemo(
    () => Math.max(0, options.indexOf(value)),
    [options, value],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: selectedIndex * TIME_WHEEL_ITEM_HEIGHT,
        animated: false,
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [selectedIndex]);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(
        event.nativeEvent.contentOffset.y / TIME_WHEEL_ITEM_HEIGHT,
      );
      const nextValue = options[Math.max(0, Math.min(nextIndex, options.length - 1))];
      if (nextValue && nextValue !== value) {
        onChange(nextValue);
      }
    },
    [onChange, options, value],
  );

  const renderItem = useCallback(
    ({ item }: { item: string }) => {
      const selected = item === value;

      return (
        <View style={styles.wheelRow}>
          <AppText
            preset="body"
            style={[
              styles.wheelText,
              {
                color: selected ? '#FFFFFF' : 'rgba(255,255,255,0.58)',
                fontSize: selected ? 28 : 22,
                fontWeight: selected ? '800' : '600',
              },
            ]}
          >
            {item}
          </AppText>
        </View>
      );
    },
    [value],
  );

  return (
    <View style={styles.wheelColumn}>
      <AppText
        preset="caption"
        style={[
          styles.wheelLabel,
          {
            color: 'rgba(255,255,255,0.68)',
            fontWeight: '700',
            fontSize: 11,
            letterSpacing: 0.2,
          },
        ]}
      >
        {label}
      </AppText>

      <View
        style={[
          styles.wheelFrame,
          {
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderColor: 'rgba(255,255,255,0.10)',
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.wheelCenterHighlight,
            {
              backgroundColor: 'rgba(124,137,255,0.20)',
              borderColor: 'rgba(167,182,255,0.34)',
            },
          ]}
        />

        <FlatList
          ref={listRef}
          data={options}
          keyExtractor={item => item}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEnabled={!disabled}
          style={styles.wheelList}
          contentContainerStyle={styles.wheelContent}
          snapToInterval={TIME_WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: TIME_WHEEL_ITEM_HEIGHT,
            offset: TIME_WHEEL_ITEM_HEIGHT * index,
            index,
          })}
        />
      </View>
    </View>
  );
}

function TimePickerModalBase({
  visible,
  title = '시간 설정',
  helperText = '휠을 움직여 정확한 시간을 정해 주세요.',
  value,
  disabled = false,
  confirmText = '적용',
  cancelText = '취소',
  onConfirm,
  onCancel,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [selection, setSelection] = useState(() => parseTimeValue(value));

  useEffect(() => {
    if (!visible) return;
    setSelection(parseTimeValue(value));
  }, [value, visible]);

  const onChangeHour = useCallback((hour: string) => {
    setSelection(prev => (prev.hour === hour ? prev : { ...prev, hour }));
  }, []);

  const onChangeMinute = useCallback((minute: string) => {
    setSelection(prev => (prev.minute === minute ? prev : { ...prev, minute }));
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(`${selection.hour}:${selection.minute}`);
  }, [onConfirm, selection.hour, selection.minute]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <TouchableOpacity activeOpacity={1} style={styles.dismissArea} onPress={onCancel} />

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
              {helperText}
            </AppText>
            <AppText
              preset="body"
              style={[
                styles.previewText,
                { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
              ]}
            >
              {selection.hour}:{selection.minute}
            </AppText>
          </View>

          <View style={styles.pickerRow}>
            <TimeWheel
              label="시"
              options={HOURS}
              value={selection.hour}
              disabled={disabled}
              onChange={onChangeHour}
            />

            <AppText
              preset="body"
              style={[styles.colonText, { color: theme.colors.textPrimary }]}
            >
              :
            </AppText>

            <TimeWheel
              label="분"
              options={MINUTES}
              value={selection.minute}
              disabled={disabled}
              onChange={onChangeMinute}
            />
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
                  { width: '100%', borderRadius: 8 },
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

const TimePickerModal = memo(TimePickerModalBase);
export default TimePickerModal;
