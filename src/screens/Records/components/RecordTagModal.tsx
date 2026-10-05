// 파일: src/screens/Records/components/RecordTagModal.tsx
// 역할:
// - RecordCreateScreen에서 사용하는 태그 선택/추가 모달을 공통 컴포넌트로 분리
// - 직접 입력과 선택된 태그 제거 동선을 한 컴포넌트에서 관리

import AppTextInput from '../../../app/ui/AppTextInput';
import React from 'react';
import {
  Keyboard,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';
import { useKeyboardBottomPadding } from '../../../hooks/useKeyboardBottomPadding';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '../../../components/icons/NuriFeatherIcon';
import NuriSemanticIcon from '../../../components/icons/NuriSemanticIcon';
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

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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
  const insets = useSafeAreaInsets();
  const bottomPaddingStyle = useKeyboardBottomPadding(Math.max(insets.bottom, 18) + 6);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior="height"
        automaticOffset
        enabled
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalDismissZone}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />

        <AnimatedTouchableOpacity
          activeOpacity={1}
          style={[
            styles.tagModalCard,
            {
              maxHeight: '100%',
              flexShrink: 1,
              minHeight: 0,
            },
            bottomPaddingStyle,
          ]}
          onPress={Keyboard.dismiss}
        >
          <View style={styles.tagModalHeader}>
            <AppText typographyRole="sectionTitle" preset="unifiedTitle" style={styles.tagModalTitle}>
              태그 추가
            </AppText>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.tagModalCloseBtn, { width: 44, height: 44, borderRadius: 22 }]}
              accessibilityRole="button"
              accessibilityLabel="태그 추가 닫기"
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
            >
              <NuriSemanticIcon
                family="feather"
                name="x"
                size={24}
                color={theme.colors.textPrimary}
                preserveOriginal
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={[styles.tagModalScroll, { flexShrink: 1, minHeight: 0 }]}
            contentContainerStyle={styles.tagModalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >
          <View style={styles.tagInputRow}>
            <Feather name="hash" size={16} color={theme.colors.brand} />
            <AppTextInput
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
              <AppText preset="unifiedMeta" style={styles.tagSectionTitle}>
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
                      preset="unifiedMeta"
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
          </ScrollView>
        </AnimatedTouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
