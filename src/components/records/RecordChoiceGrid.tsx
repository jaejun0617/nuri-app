import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';

/** Equal tracks keep short labels compact without reducing the 48dp touch target. */
export default function RecordChoiceGrid<Key extends string>({
  options,
  selected,
  onSelect,
  disabled = false,
  multiple = false,
  onClear,
}: {
  options: ReadonlyArray<{ key: Key; label: string }>;
  selected: readonly Key[];
  onSelect: (key: Key) => void;
  disabled?: boolean;
  multiple?: boolean;
  onClear?: () => void;
}) {
  const theme = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const columns = fontScale >= 1.3 || width < 360 ? 2 : 3;
  return (
    <View style={styles.root}>
      <View style={styles.grid}>
        {options.map(option => {
          const active = selected.includes(option.key);
          return (
            <TouchableOpacity
              key={option.key}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityLabel={option.label}
              accessibilityState={
                multiple
                  ? { checked: active, disabled }
                  : { selected: active, disabled }
              }
              onPress={() => onSelect(option.key)}
              disabled={disabled}
              activeOpacity={0.65}
              style={[
                styles.target,
                { width: columns === 2 ? '50%' : '33.333333%' },
                disabled && styles.disabled,
              ]}
            >
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: active
                      ? theme.colors.textPrimary
                      : theme.colors.surface,
                    borderColor: active
                      ? theme.colors.textPrimary
                      : theme.colors.border,
                  },
                ]}
              >
                <AppText
                  preset="unifiedMeta"
                  styleOverridesPreset
                  style={[
                    styles.label,
                    {
                      color: active
                        ? theme.colors.surface
                        : theme.colors.textPrimary,
                    },
                  ]}
                >
                  {option.label}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {onClear && selected.length > 0 ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="세부 분류 선택 해제"
          disabled={disabled}
          onPress={onClear}
          style={styles.clear}
        >
          <AppText preset="caption" color={theme.colors.textSecondary}>
            선택 해제
          </AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  target: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 4,
  },
  chip: {
    minHeight: 32,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  clear: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 6,
    alignSelf: 'flex-end',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
});
