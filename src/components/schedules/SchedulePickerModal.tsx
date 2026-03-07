// 파일: src/components/schedules/SchedulePickerModal.tsx
// 역할:
// - 일정 생성/수정 화면이 공유하는 날짜/시간 선택 모달을 제공
// - preset 버튼, 직접 입력, 확인 CTA 구조를 한 컴포넌트로 재사용
// - 동일한 UI 블록이 두 화면에서 복제되지 않도록 유지

import React from 'react';
import { Modal, Pressable, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { styles } from '../../screens/Schedules/ScheduleCreateScreen.styles';

type Props = {
  visible: boolean;
  title: string;
  value: string;
  placeholder: string;
  presets: Array<{ key: string; label: string; value: string }>;
  onClose: () => void;
  onChangeValue: (value: string) => void;
  onSelectPreset: (value: string) => void;
  onConfirm: () => void;
  confirmLabel: string;
};

export default function SchedulePickerModal({
  visible,
  title,
  value,
  placeholder,
  presets,
  onClose,
  onChangeValue,
  onSelectPreset,
  onConfirm,
  confirmLabel,
}: Props) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <AppText preset="headline" style={styles.modalTitle}>
              {title}
            </AppText>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.modalCloseBtn}
              onPress={onClose}
            >
              <Feather
                name="x"
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.presetRow}>
            {presets.map(preset => (
              <TouchableOpacity
                key={preset.key}
                activeOpacity={0.9}
                style={styles.presetChip}
                onPress={() => onSelectPreset(preset.value)}
              >
                <AppText preset="caption" style={styles.presetChipText}>
                  {preset.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            value={value}
            onChangeText={onChangeValue}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.modalInput}
          />

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.modalConfirmBtn}
            onPress={onConfirm}
          >
            <AppText preset="body" style={styles.modalConfirmText}>
              {confirmLabel}
            </AppText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
