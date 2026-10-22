import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import AppText from '../../app/ui/AppText';
import TimelineArtwork from './TimelineArtwork';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';
import { TIMELINE_DESIGN as C, TIMELINE_TYPE as T } from '../../theme/timelineDesign';
import { RecordFieldGlass, type RecordSurfaceVariant } from './TimelineFormSurface';

/** Equal tracks keep short labels compact without reducing the 48dp touch target. */
export default function RecordChoiceGrid<Key extends string>({
  options,
  selected,
  onSelect,
  disabled = false,
  multiple = false,
  onClear,
  columns: requestedColumns,
  surfaceVariant = 'plain',
  renderIcon,
}: {
  options: ReadonlyArray<{ key: Key; label: string }>;
  selected: readonly Key[];
  onSelect: (key: Key) => void;
  disabled?: boolean;
  multiple?: boolean;
  onClear?: () => void;
  columns?: 3 | 4;
  surfaceVariant?: RecordSurfaceVariant;
  renderIcon?: (key: Key, selected: boolean) => React.ReactNode;
}) {
  const { fontScale, width } = useWindowDimensions();
  const columns = fontScale >= 1.3 || width < 360 ? 2 : requestedColumns ?? 3;
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
                { width: columns === 2 ? '50%' : columns === 4 ? '25%' : '33.333333%' },
                disabled && styles.disabled,
              ]}
            >
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: surfaceVariant === 'homeGlass' ? 'transparent' : active ? C.selected : C.surface,
                    borderColor: surfaceVariant === 'homeGlass' ? 'transparent' : active ? C.primary : C.border,
                  },
                ]}
              >
                {surfaceVariant === 'homeGlass' ? <RecordFieldGlass selected={active} /> : null}
                {multiple ? (
                  <View style={[styles.check, active && styles.checked]}>
                    {active ? (
                      <NuriSemanticIcon family="feather" name="check" preserveOriginal
                        size={11} color={C.surface} testID="record-care-check"
                        style={styles.checkGlyph} accessible={false} />
                    ) : null}
                  </View>
                ) : renderIcon ? renderIcon(option.key, active) : (
                  <TimelineArtwork name={option.key} color={active ? C.primary : C.muted} />
                )}
                <AppText
                  preset="unifiedMeta"
                  styleOverridesPreset
                  style={[
                    styles.label,
                    {
                      color: active ? C.primary : C.muted,
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
          <AppText preset="caption" color={C.muted}>
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
    minHeight: 60,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    ...T.meta,
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
  check: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#BAB3D2', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  checkGlyph: { lineHeight: 12, includeFontPadding: false, textAlign: 'center' },
  checked: { backgroundColor: C.primary, borderColor: C.primary },
});
