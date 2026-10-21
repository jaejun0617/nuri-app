import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '../../app/ui/AppText';
import RecordChoiceGrid from './RecordChoiceGrid';
import {
  getRecordCareOptions,
  type GroomingCareType,
  type RecordCareCategory,
} from '../../services/records/metadata';

/** Both care categories share the current multi-select UI and stable metadata codes. */
export default function RecordCareFields({ category, selected, legacy = [], onChange, disabled = false }: {
  category: RecordCareCategory;
  selected: GroomingCareType[];
  legacy?: readonly GroomingCareType[];
  onChange: (values: GroomingCareType[]) => void;
  disabled?: boolean;
}) {
  return <View style={styles.field} testID="record-care-fields">
    <AppText preset="unifiedBody" style={styles.label}>관리 항목 (1개 이상)</AppText>
    <RecordChoiceGrid
      options={getRecordCareOptions(category, legacy).map(option => ({ key: option.value, label: option.label }))}
      selected={selected}
      multiple
      disabled={disabled}
      onSelect={value => onChange(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value])}
    />
  </View>;
}
const styles = StyleSheet.create({
  field: { marginTop: 18 },
  label: { fontWeight: '700' },
});
