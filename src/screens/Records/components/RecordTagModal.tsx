// 파일: src/screens/Records/components/RecordTagModal.tsx
// 역할:
// - RecordCreateScreen에서 사용하는 태그 선택/추가 모달을 공통 컴포넌트로 분리
// - 추천 태그, 최근 태그, 선택 태그 제거, 직접 입력 동선을 한 컴포넌트에서 관리

import React from 'react';
import { Modal, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../../app/ui/AppText';
import { styles } from '../RecordCreateScreen.styles';

type Props = {
  visible: boolean;
  tagDraft: string;
  recentTags: string[];
  selectedTags: string[];
  suggestedTags: readonly string[];
  onClose: () => void;
  onChangeTagDraft: (value: string) => void;
  onSubmitDraftTag: () => void;
  onPressSuggestedTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onClearRecentTags: () => void;
  onConfirm: () => void;
};

export default function RecordTagModal({
  visible,
  tagDraft,
  recentTags,
  selectedTags,
  suggestedTags,
  onClose,
  onChangeTagDraft,
  onSubmitDraftTag,
  onPressSuggestedTag,
  onRemoveTag,
  onClearRecentTags,
  onConfirm,
}: Props) {
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
              <Feather name="x" size={18} color="#8E98AA" />
            </TouchableOpacity>
          </View>

          <View style={styles.tagInputRow}>
            <Feather name="hash" size={16} color="#7A71F4" />
            <TextInput
              style={styles.tagModalInput}
              value={tagDraft}
              onChangeText={onChangeTagDraft}
              placeholder="가을산책"
              placeholderTextColor="#B5BDCB"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={onSubmitDraftTag}
            />
          </View>

          <AppText preset="caption" style={styles.tagSectionTitle}>
            추천 태그
          </AppText>
          <View style={styles.tagChipGrid}>
            {suggestedTags.map(tag => (
              <TouchableOpacity
                key={tag}
                activeOpacity={0.88}
                style={styles.suggestChip}
                onPress={() => onPressSuggestedTag(tag)}
              >
                <AppText preset="caption" style={styles.suggestChipText}>
                  {tag}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.tagSectionHeaderRow}>
            <AppText preset="caption" style={styles.tagSectionTitleCompact}>
              최근 사용
            </AppText>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onClearRecentTags}
              disabled={recentTags.length === 0}
            >
              <AppText
                preset="caption"
                style={[
                  styles.clearRecentText,
                  recentTags.length === 0 ? styles.clearRecentTextDisabled : null,
                ]}
              >
                전체 지우기
              </AppText>
            </TouchableOpacity>
          </View>
          <View style={styles.recentList}>
            {recentTags.map(tag => (
              <TouchableOpacity
                key={tag}
                activeOpacity={0.88}
                style={styles.recentItem}
                onPress={() => onPressSuggestedTag(tag)}
              >
                <Feather name="rotate-ccw" size={15} color="#B6BECC" />
                <AppText preset="body" style={styles.recentItemText}>
                  {tag}
                </AppText>
              </TouchableOpacity>
            ))}
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
                    <Feather name="x" size={12} color="#6D6AF8" />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.addTagBtn}
            onPress={onConfirm}
          >
            <AppText preset="body" style={styles.addTagBtnText}>
              추가하기
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
