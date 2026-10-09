import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '../../app/ui/AppText';
import AppTextInput from '../../app/ui/AppTextInput';
import type {
  HealthCareDetails,
  HealthCareKind,
} from '../../services/records/metadata';

const KINDS: ReadonlyArray<{ key: HealthCareKind; label: string }> = [
  { key: 'condition', label: '컨디션' },
  { key: 'hospital', label: '병원·진단' },
  { key: 'medicine', label: '약·복약' },
];
const FIELDS = [
  { key: 'hospitalName', label: '병원명', limit: 100 },
  { key: 'diagnosis', label: '진단·진료 내용', limit: 240 },
  { key: 'medication', label: '약 이름·복약 내용', limit: 240 },
] as const;

/** Create/edit share the same optional medical details; price remains the single total. */
export default function MedicalRecordFields({
  value,
  onChange,
  onFocus,
  disabled = false,
}: {
  value: HealthCareDetails;
  onChange: (value: HealthCareDetails) => void;
  onFocus?: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.root} testID="medical-record-fields">
      <AppText preset="unifiedLabel" style={styles.label}>
        건강 기록
      </AppText>
      <View style={styles.kinds}>
        {KINDS.map(kind => (
          <Pressable
            key={kind.key}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={kind.label}
            accessibilityState={{ checked: value.kind === kind.key, disabled }}
            onPress={() => onChange({ ...value, kind: kind.key })}
            style={[styles.kind, value.kind === kind.key && styles.selected]}
          >
            <AppText preset="unifiedBody" color="#303840">
              {kind.label}
            </AppText>
          </Pressable>
        ))}
      </View>
      {FIELDS.map(field => (
        <View key={field.key} style={styles.field}>
          <AppText preset="unifiedMeta" color="#556070">
            {field.label} (선택)
          </AppText>
          <AppTextInput
            value={value[field.key]}
            accessibilityLabel={field.label}
            editable={!disabled}
            maxLength={field.limit}
            style={styles.input}
            placeholder={field.label}
            placeholderTextColor="#7A838D"
            onFocus={onFocus}
            onChangeText={text => onChange({ ...value, [field.key]: text })}
          />
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { marginTop: 24, gap: 14 },
  label: { color: '#20252C', fontWeight: '600' },
  kinds: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderColor: '#D1D6DC',
  },
  kind: {
    minHeight: 48,
    padding: 12,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  selected: { borderBottomColor: '#303840' },
  field: { gap: 6 },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D6DC',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#20252C',
    fontSize: 15,
  },
});
