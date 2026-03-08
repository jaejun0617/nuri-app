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
  const theme = useTheme();
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
                color: selected
                  ? theme.colors.textPrimary
                  : `${theme.colors.textSecondary}CC`,
                fontSize: selected ? 30 : 24,
                fontWeight: selected ? '800' : '600',
              },
            ]}
          >
            {item}
          </AppText>
        </View>
      );
    },
    [theme.colors.textPrimary, theme.colors.textSecondary, value],
  );

  return (
    <View style={styles.wheelColumn}>
      <AppText
        preset="caption"
        style={[
          styles.wheelLabel,
          { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 12 },
        ]}
      >
        {label}
      </AppText>

      <View
        style={[
          styles.wheelFrame,
          {
            backgroundColor:
              theme.mode === 'dark'
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.72)',
            borderColor:
              theme.mode === 'dark'
                ? 'rgba(255,255,255,0.14)'
                : 'rgba(109,106,248,0.10)',
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.wheelCenterHighlight,
            {
              backgroundColor:
                theme.mode === 'dark'
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(109,106,248,0.14)',
              borderColor:
                theme.mode === 'dark'
                  ? 'rgba(255,255,255,0.18)'
                  : 'rgba(109,106,248,0.22)',
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
              backgroundColor:
                theme.mode === 'dark'
                  ? 'rgba(22,54,93,0.34)'
                  : 'rgba(255,255,255,0.34)',
              borderColor: `${theme.colors.border}88`,
              paddingBottom: 20 + Math.max(insets.bottom, 8),
            },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={
              theme.mode === 'dark'
                ? ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)']
                : ['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.08)']
            }
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.glassGlow}
          />

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
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={onCancel}
            >
              <AppText
                preset="caption"
                style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: '600' }}
              >
                {cancelText}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={disabled}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: disabled ? theme.colors.border : theme.colors.brand,
                  opacity: disabled ? 0.65 : 1,
                },
              ]}
              onPress={handleConfirm}
            >
              <AppText
                preset="caption"
                style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}
              >
                {confirmText}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const TimePickerModal = memo(TimePickerModalBase);
export default TimePickerModal;
