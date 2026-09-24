import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { KeyboardAvoidingView as KeyboardControllerAvoidingView } from 'react-native-keyboard-controller';
import Feather from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import AppTextInput from '../../app/ui/AppTextInput';
import type { Pet } from '../../store/petStore';

export const PET_DELETE_CONFIRMATION_TEXT = '삭제하기';

export function isPetDeleteConfirmationReady(
  consentChecked: boolean,
  confirmationText: string,
) {
  return consentChecked && confirmationText === PET_DELETE_CONFIRMATION_TEXT;
}

type Props = {
  visible: boolean;
  pet: Pet;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function PetDeleteConfirmDialogBase({
  visible,
  pet,
  deleting,
  onCancel,
  onConfirm,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [consentChecked, setConsentChecked] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const canDelete = useMemo(
    () => isPetDeleteConfirmationReady(consentChecked, confirmationText),
    [confirmationText, consentChecked],
  );

  useEffect(() => {
    if (visible) return;
    setConsentChecked(false);
    setConfirmationText('');
  }, [visible]);

  const handleCancel = () => {
    if (deleting) return;
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <KeyboardControllerAvoidingView
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        behavior="padding"
        enabled
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          disabled={deleting}
          accessibilityElementsHidden
          onPress={handleCancel}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              maxHeight: Math.max(
                320,
                window.height - Math.max(insets.top + insets.bottom + 40, 80),
              ),
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleRow}>
              <View style={styles.titleSpacer} />
              <AppText
                accessibilityRole="header"
                preset="unifiedTitle"
                style={[styles.title, { color: theme.colors.textPrimary }]}
              >
                아이 프로필을 삭제할까요?
              </AppText>
              <TouchableOpacity
                testID="pet-delete-close"
                accessibilityRole="button"
                accessibilityLabel="삭제 확인 닫기"
                accessibilityState={{ disabled: deleting }}
                activeOpacity={0.86}
                disabled={deleting}
                style={styles.iconButton}
                onPress={handleCancel}
              >
                <Feather
                  name="x"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.petTarget,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {pet.avatarUrl ? (
                <Image
                  source={{ uri: pet.avatarUrl }}
                  style={styles.petImage}
                />
              ) : (
                <View
                  style={[
                    styles.petImageFallback,
                    { backgroundColor: theme.colors.background },
                  ]}
                >
                  <Feather
                    name="heart"
                    size={22}
                    color={theme.colors.textMuted}
                  />
                </View>
              )}
              <View style={styles.petTargetCopy}>
                <AppText
                  preset="unifiedMeta"
                  style={{ color: theme.colors.textMuted }}
                >
                  삭제 대상
                </AppText>
                <AppText
                  numberOfLines={2}
                  preset="unifiedTitle"
                  style={[styles.petName, { color: theme.colors.textPrimary }]}
                >
                  {pet.name}
                </AppText>
              </View>
            </View>

            <View style={styles.warningBlock}>
              <AppText
                preset="unifiedBody"
                style={[
                  styles.warningText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                삭제한 프로필은 다시 복구할 수 없어요. 이 아이에 연결된 기록,
                일정, 건강 데이터와 사진 파일은 함께 정리됩니다. 공개 글 등 일부
                콘텐츠는 아이 연결만 해제된 채 남을 수 있어요.
              </AppText>
            </View>

            <TouchableOpacity
              testID="pet-delete-consent"
              accessibilityRole="checkbox"
              accessibilityLabel="삭제 내용을 확인했으며 동의합니다"
              accessibilityState={{
                checked: consentChecked,
                disabled: deleting,
              }}
              activeOpacity={0.86}
              disabled={deleting}
              style={[
                styles.consentRow,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: consentChecked
                    ? theme.colors.danger
                    : theme.colors.border,
                },
              ]}
              onPress={() => setConsentChecked(current => !current)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: consentChecked
                      ? theme.colors.danger
                      : theme.colors.surfaceElevated,
                    borderColor: consentChecked
                      ? theme.colors.danger
                      : theme.colors.border,
                  },
                ]}
              >
                {consentChecked ? (
                  <Feather name="check" size={14} color="#FFFFFF" />
                ) : null}
              </View>
              <AppText
                preset="unifiedLabel"
                style={[
                  styles.consentLabel,
                  { color: theme.colors.textPrimary },
                ]}
              >
                삭제 내용을 확인했으며 동의합니다.
              </AppText>
            </TouchableOpacity>

            <View style={styles.confirmField}>
              <AppText
                preset="unifiedLabel"
                style={{ color: theme.colors.textSecondary }}
              >
                확인을 위해 ‘{PET_DELETE_CONFIRMATION_TEXT}’를 입력해주세요.
              </AppText>
              <AppTextInput
                testID="pet-delete-confirmation-input"
                accessibilityLabel="삭제 확인 문구 입력"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!deleting}
                returnKeyType="done"
                value={confirmationText}
                placeholder={PET_DELETE_CONFIRMATION_TEXT}
                placeholderTextColor={theme.colors.textMuted}
                selectionColor={theme.colors.danger}
                style={[
                  styles.confirmInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
                onChangeText={setConfirmationText}
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                testID="pet-delete-cancel"
                accessibilityRole="button"
                accessibilityLabel="아이 프로필 삭제 취소"
                accessibilityState={{ disabled: deleting }}
                activeOpacity={0.9}
                disabled={deleting}
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={handleCancel}
              >
                <AppText
                  preset="unifiedLabel"
                  style={{ color: theme.colors.textSecondary }}
                >
                  취소
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                testID="pet-delete-confirm"
                accessibilityRole="button"
                accessibilityLabel={
                  deleting ? '아이 프로필 삭제 중' : '아이 프로필 삭제하기'
                }
                accessibilityState={{ disabled: deleting || !canDelete }}
                activeOpacity={0.9}
                disabled={deleting || !canDelete}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.colors.danger,
                    opacity: deleting || !canDelete ? 0.42 : 1,
                  },
                ]}
                onPress={onConfirm}
              >
                <AppText preset="unifiedLabel" style={styles.deleteButtonText}>
                  {deleting ? '삭제 중...' : '삭제하기'}
                </AppText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardControllerAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 16,
  },
  titleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleSpacer: {
    width: 44,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '900',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petTarget: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  petImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  petImageFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petTargetCopy: {
    flex: 1,
    gap: 2,
  },
  petName: {
    fontWeight: '900',
  },
  warningBlock: {
    gap: 6,
  },
  warningText: {
    lineHeight: 22,
  },
  consentRow: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentLabel: {
    flex: 1,
    fontWeight: '800',
  },
  confirmField: {
    gap: 8,
  },
  confirmInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});

const PetDeleteConfirmDialog = memo(PetDeleteConfirmDialogBase);
export default PetDeleteConfirmDialog;
