// 파일: src/screens/Records/components/RecordDateModal.tsx
// 역할:
// - RecordCreateScreen에서 사용하는 날짜 선택 모달을 공통 컴포넌트로 분리
// - 날짜 단축 선택, 직접 입력, 적용/닫기 액션을 한 곳에서 관리

import React from 'react';
import { Modal, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import { styles } from '../RecordCreateScreen.styles';

type Props = {
  visible: boolean;
  selectedDateShortcut: 'today' | 'yesterday';
  dateDraft: string;
  onClose: () => void;
  onPressDateShortcut: (key: 'today' | 'yesterday') => void;
  onChangeDateDraft: (value: string) => void;
  onApplyDate: () => void;
};

export default function RecordDateModal({
  visible,
  selectedDateShortcut,
  dateDraft,
  onClose,
  onPressDateShortcut,
  onChangeDateDraft,
  onApplyDate,
}: Props) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalDismissZone}
          onPress={onClose}
        />

        <View style={styles.tagModalCard}>
          <View style={styles.tagModalHeader}>
            <AppText preset="headline" style={styles.tagModalTitle}>
              날짜 선택
            </AppText>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.tagModalCloseBtn}
              onPress={onClose}
            >
              <Feather
                name="x"
                size={18}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.dateShortcutRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.dateShortcutChip,
                selectedDateShortcut === 'today'
                  ? styles.dateShortcutChipActive
                  : null,
              ]}
              onPress={() => onPressDateShortcut('today')}
            >
              <AppText
                preset="caption"
                style={[
                  styles.dateShortcutText,
                  selectedDateShortcut === 'today'
                    ? styles.dateShortcutTextActive
                    : null,
                ]}
              >
                오늘
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.dateShortcutChip,
                selectedDateShortcut === 'yesterday'
                  ? styles.dateShortcutChipActive
                  : null,
              ]}
              onPress={() => onPressDateShortcut('yesterday')}
            >
              <AppText
                preset="caption"
                style={[
                  styles.dateShortcutText,
                  selectedDateShortcut === 'yesterday'
                    ? styles.dateShortcutTextActive
                    : null,
                ]}
              >
                어제
              </AppText>
            </TouchableOpacity>
          </View>

          <AppText preset="caption" style={styles.tagSectionTitle}>
            직접 입력
          </AppText>
          <TextInput
            style={styles.dateInput}
            value={dateDraft}
            onChangeText={onChangeDateDraft}
            autoCapitalize="none"
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.textMuted}
          />
          <AppText preset="caption" style={styles.helperText}>
            `YYYY-MM-DD` 형식으로 기록 날짜를 저장합니다.
          </AppText>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.addTagBtn}
            onPress={onApplyDate}
          >
            <AppText preset="body" style={styles.addTagBtnText}>
              날짜 적용
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
