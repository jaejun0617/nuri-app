// 파일: src/screens/Records/components/RecordTagModal.tsx
// 역할:
// - RecordCreateScreen에서 사용하는 태그 선택/추가 모달을 공통 컴포넌트로 분리
// - 직접 입력과 선택된 태그 제거 동선을 한 컴포넌트에서 관리

import React from 'react';
import { Modal, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../../app/ui/AppText';
import { styles } from '../RecordCreateScreen.styles';

type Props = {
  visible: boolean;
  tagDraft: string;
  selectedTags: string[];
  onClose: () => void;
  onChangeTagDraft: (value: string) => void;
  onSubmitDraftTag: () => void;
  onRemoveTag: (tag: string) => void;
};

export default function RecordTagModal({
  visible,
  tagDraft,
  selectedTags,
  onClose,
  onChangeTagDraft,
  onSubmitDraftTag,
  onRemoveTag,
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
              태그 추가
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

          <View style={styles.tagInputRow}>
            <Feather name="hash" size={16} color={theme.colors.brand} />
            <TextInput
              style={styles.tagModalInput}
              value={tagDraft}
              onChangeText={onChangeTagDraft}
              placeholder="가을산책"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={onSubmitDraftTag}
            />
          </View>

          {selectedTags.length ? (
            <>
              <AppText preset="caption" style={styles.tagSectionTitle}>
                선택된 태그
              </AppText>
              <View style={styles.tagChipGrid}>
                {selectedTags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    activeOpacity={0.88}
                    style={styles.selectedModalChip}
                    onPress={() => onRemoveTag(tag)}
                  >
                    <AppText
                      preset="caption"
                      style={styles.selectedModalChipText}
                    >
                      {tag}
                    </AppText>
                    <Feather name="x" size={12} color={theme.colors.brand} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
