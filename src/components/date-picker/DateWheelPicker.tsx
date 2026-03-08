import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type { ListRenderItem, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { FlatList, TouchableOpacity, View } from 'react-native';

import AppText from '../../app/ui/AppText';
import {
  clampDateParts,
  DEFAULT_MAX_YEAR,
  DEFAULT_MIN_YEAR,
  getDaysInMonth,
  type DateParts,
} from './datePickerUtils';
import {
  styles,
  WHEEL_HEIGHT,
  WHEEL_ITEM_HEIGHT,
} from './DatePicker.styles';

type Props = {
  value: DateParts;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  onChange: (next: DateParts) => void;
};

type WheelColumnProps = {
  label: string;
  items: number[];
  selectedValue: number;
  disabled?: boolean;
  compact?: boolean;
  onSelect: (value: number) => void;
};

const WheelColumn = memo(function WheelColumn({
  label,
  items,
  selectedValue,
  disabled = false,
  compact = false,
  onSelect,
}: WheelColumnProps) {
  const listRef = useRef<FlatList<number> | null>(null);
  const selectedIndex = useMemo(
    () => Math.max(items.findIndex(item => item === selectedValue), 0),
    [items, selectedValue],
  );

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    requestAnimationFrame(() => {
      list.scrollToOffset({
        offset: selectedIndex * WHEEL_ITEM_HEIGHT,
        animated: false,
      });
    });
  }, [selectedIndex]);

  const getItemLayout = useCallback(
    (_: ArrayLike<number> | null | undefined, index: number) => ({
      length: WHEEL_ITEM_HEIGHT,
      offset: WHEEL_ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback<ListRenderItem<number>>(
    ({ item }) => {
      const active = item === selectedValue;

      return (
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={disabled}
          style={styles.wheelRow}
          onPress={() => onSelect(item)}
        >
          <AppText
            preset={active ? 'body' : 'caption'}
            style={[
              styles.wheelText,
              {
                color: active ? '#FFFFFF' : 'rgba(255,255,255,0.58)',
                fontSize: active ? 17 : 13,
                fontWeight: active ? '800' : '600',
              },
            ]}
          >
            {item}
          </AppText>
        </TouchableOpacity>
      );
    },
    [disabled, onSelect, selectedValue],
  );

  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(
        event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT,
      );
      const nextValue = items[Math.min(Math.max(nextIndex, 0), items.length - 1)];
      if (typeof nextValue === 'number' && nextValue !== selectedValue) {
        onSelect(nextValue);
      }
    },
    [items, onSelect, selectedValue],
  );

  return (
    <View style={[styles.pickerColumn, compact ? styles.pickerMiniColumn : null]}>
      <AppText
        preset="caption"
        style={[
          styles.pickerLabel,
          {
            color: 'rgba(255,255,255,0.68)',
            fontSize: 11,
            fontWeight: '700',
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
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={item => `${label}-${item}`}
          renderItem={renderItem}
          style={styles.wheelList}
          contentContainerStyle={styles.wheelContent}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          bounces={false}
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={onScrollEnd}
          scrollEnabled={!disabled}
          extraData={selectedValue}
        />
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
      </View>
    </View>
  );
});

function DateWheelPickerBase({
  value,
  minYear = DEFAULT_MIN_YEAR,
  maxYear = DEFAULT_MAX_YEAR,
  disabled = false,
  onChange,
}: Props) {
  const years = useMemo(() => {
    const size = maxYear - minYear + 1;
    return Array.from({ length: size }, (_, index) => minYear + index);
  }, [maxYear, minYear]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);
  const days = useMemo(
    () =>
      Array.from(
        { length: getDaysInMonth(value.year, value.month) },
        (_, index) => index + 1,
      ),
    [value.month, value.year],
  );

  const emitDate = useCallback(
    (next: DateParts) => {
      onChange(clampDateParts(next, minYear, maxYear));
    },
    [maxYear, minYear, onChange],
  );

  const onSelectYear = useCallback(
    (year: number) => {
      emitDate({ ...value, year });
    },
    [emitDate, value],
  );

  const onSelectMonth = useCallback(
    (month: number) => {
      emitDate({ ...value, month });
    },
    [emitDate, value],
  );

  const onSelectDay = useCallback(
    (day: number) => {
      emitDate({ ...value, day });
    },
    [emitDate, value],
  );

  return (
    <View style={[styles.pickerWrap, { minHeight: WHEEL_HEIGHT }]}>
      <WheelColumn
        label="연도"
        items={years}
        selectedValue={value.year}
        disabled={disabled}
        onSelect={onSelectYear}
      />
      <WheelColumn
        label="월"
        items={months}
        selectedValue={value.month}
        disabled={disabled}
        compact
        onSelect={onSelectMonth}
      />
      <WheelColumn
        label="일"
        items={days}
        selectedValue={value.day}
        disabled={disabled}
        compact
        onSelect={onSelectDay}
      />
    </View>
  );
}

const DateWheelPicker = memo(DateWheelPickerBase);
export default DateWheelPicker;
