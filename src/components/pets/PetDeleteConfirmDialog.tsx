import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { KeyboardAvoidingView as KeyboardControllerAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import AppText from '../../app/ui/AppText';
import PetDeletionRecoveryMarker from './PetDeletionRecoveryMarker';
import {
  useAppFontPreference,
  useTypographyScope,
} from '../../app/providers/AppFontPreferenceProvider';
import { resolveAppFontMode } from '../../app/typography/appFontMode';
import { useBoundedKeyboardScroll } from '../../hooks/useBoundedKeyboardScroll';
import type { Pet } from '../../store/petStore';
import {
  PET_MANAGEMENT_COLORS as colors,
  PET_MANAGEMENT_TYPE as type,
  getPetDeleteLayout,
} from '../../theme/pets/management';
import { getPetDisplayName } from '../../utils/petDisplayName';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';

export const PET_DELETE_CONFIRMATION_TEXT = '삭제하기';
export function isPetDeleteConfirmationReady(
  consentChecked: boolean,
  confirmationText: string,
) {
  return consentChecked && confirmationText === PET_DELETE_CONFIRMATION_TEXT;
}
export type PetDeleteConfirmation = {
  petId: string;
  consentChecked: boolean;
  confirmationText: string;
};
type Props = {
  visible: boolean;
  pet: Pet;
  deleting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: (confirmation: PetDeleteConfirmation) => void;
};

const TargetPhoto = memo(function PetDeletionTargetPhoto({
  uri,
  name,
}: {
  uri: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={styles.petImage}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
          accessibilityLabel={`${name} 프로필 사진`}
          onError={() => setFailed(true)}
        />
      ) : (
        <NuriSemanticIcon
          family="feather"
          name="heart"
          preserveOriginal
          size={24}
          color={colors.muted}
        />
      )}
    </View>
  );
});

function PetDeleteConfirmDialog({
  visible,
  pet,
  deleting,
  errorMessage,
  onCancel,
  onConfirm,
}: Props) {
  const theme = useTheme();
  const { mode } = useAppFontPreference();
  const scope = useTypographyScope();
  const fontMode = resolveAppFontMode({ mode, scope });
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const layout = getPetDeleteLayout(window.height, insets.top, insets.bottom);
  const [draft, setDraft] = useState<PetDeleteConfirmation>({
    petId: pet.id,
    consentChecked: false,
    confirmationText: '',
  });
  const [inputFocused, setInputFocused] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(layout.maxHeight);
  const [cardHeight, setCardHeight] = useState(0);
  const confirmationRef = useRef<React.ComponentRef<typeof TextInput> | null>(
    null,
  );
  const submitted = useRef(false);
  const { scrollProps, revealInput } = useBoundedKeyboardScroll(visible);
  const currentDraft = draft.petId === pet.id;
  const ready =
    currentDraft &&
    isPetDeleteConfirmationReady(draft.consentChecked, draft.confirmationText);
  const blocked = deleting || !visible || !pet.id.trim() || !ready;
  const name = getPetDisplayName(pet.name);
  const uri = pet.avatarUrl?.trim() || null;
  useEffect(() => {
    submitted.current = false;
    setDraft({ petId: pet.id, consentChecked: false, confirmationText: '' });
    setInputFocused(false);
  }, [visible, pet.id]);
  useEffect(() => {
    if (!deleting) submitted.current = false;
  }, [deleting, errorMessage]);

  const handleCancel = () => {
    if (!deleting && !submitted.current) onCancel();
  };
  const handleBack = () => {
    if (deleting || submitted.current) return;
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
      return;
    }
    onCancel();
  };
  const submit = () => {
    // Native disabled state is not a security gate: recheck the explicit target and both inputs.
    if (blocked || submitted.current) return;
    submitted.current = true;
    onConfirm({ ...draft });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleBack}
    >
      <KeyboardControllerAvoidingView
        style={styles.backdrop}
        behavior="padding"
        enabled
        automaticOffset
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          disabled={deleting}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={handleCancel}
        />
        <View
          style={[
            styles.viewport,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
          ]}
          onLayout={event =>
            setViewportHeight(
              Math.max(
                0,
                event.nativeEvent.layout.height -
                  insets.top -
                  insets.bottom -
                  24,
              ),
            )
          }
        >
          <View
            testID="pet-delete-card"
            accessibilityViewIsModal
            importantForAccessibility="yes"
            onLayout={event => setCardHeight(event.nativeEvent.layout.height)}
            style={[
              styles.card,
              {
                maxHeight: Math.min(
                  layout.maxHeight,
                  viewportHeight || layout.maxHeight,
                ),
                top: Math.min(
                  32,
                  Math.max(0, (viewportHeight - cardHeight) / 2 - 12),
                ),
              },
            ]}
          >
            <View testID="pet-delete-header" style={styles.header}>
              <AppText
                preset="title1"
                accessibilityRole="header"
                style={styles.title}
              >
                {'아이 프로필을\n삭제할까요?'}
              </AppText>
              <TouchableOpacity
                testID="pet-delete-close"
                accessibilityRole="button"
                accessibilityLabel="삭제 확인 닫기"
                accessibilityState={{ disabled: deleting }}
                disabled={deleting}
                style={styles.close}
                onPress={handleCancel}
              >
                <NuriSemanticIcon
                  family="feather"
                  name="x"
                  preserveOriginal
                  size={24}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>
            <ScrollView
              {...scrollProps}
              testID="pet-delete-scroll"
              style={styles.body}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.target}>
                <TargetPhoto
                  key={`${pet.id}:${uri ?? 'none'}`}
                  uri={uri}
                  name={name}
                />
                <View style={styles.targetCopy}>
                  <AppText preset="bodySm" style={styles.targetLabel}>
                    삭제할 아이
                  </AppText>
                  <AppText preset="titleLg" style={styles.petName}>
                    {name}
                  </AppText>
                </View>
              </View>
              <View style={styles.warning}>
                <AppText preset="titleMd" style={styles.warningText}>
                  삭제한 프로필은{' '}
                </AppText>
                <PetDeletionRecoveryMarker />
              </View>
              <View style={styles.policy}>
                <AppText preset="bodySm" style={styles.policyLabel}>
                  함께 삭제되는 정보
                </AppText>
                <AppText preset="body" style={styles.policyValue}>
                  기록 · 일정 · 건강 데이터 · 사진
                </AppText>
                <AppText preset="bodySm" style={styles.exception}>
                  {
                    '공개 글 등 일부 콘텐츠는\n아이 연결이 해제된 채 남을 수 있어요.'
                  }
                </AppText>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity
                testID="pet-delete-consent"
                accessibilityRole="checkbox"
                accessibilityLabel="삭제 내용을 확인했으며 동의합니다"
                accessibilityState={{
                  checked: currentDraft && draft.consentChecked,
                  disabled: deleting,
                }}
                disabled={deleting}
                style={styles.consent}
                onPress={() => {
                  if (!deleting && !submitted.current)
                    setDraft(previous => ({
                      ...previous,
                      consentChecked: !previous.consentChecked,
                    }));
                }}
              >
                <View
                  style={[
                    styles.checkbox,
                    draft.consentChecked && currentDraft && styles.checked,
                  ]}
                >
                  {draft.consentChecked && currentDraft ? (
                    <NuriSemanticIcon
                      family="feather"
                      name="check"
                      preserveOriginal
                      size={20}
                      color={colors.white}
                    />
                  ) : null}
                </View>
                <AppText preset="body" style={styles.consentText}>
                  삭제 내용을 확인했으며 동의합니다.
                </AppText>
              </TouchableOpacity>
              <View style={styles.field}>
                <AppText preset="bodySm" style={styles.fieldLabel}>
                  확인을 위해 ‘삭제하기’를 입력해주세요.
                </AppText>
                <View
                  style={[
                    styles.inputFrame,
                    inputFocused && styles.inputFocused,
                    errorMessage ? styles.inputError : null,
                  ]}
                >
                  <TextInput
                    ref={confirmationRef}
                    testID="pet-delete-confirmation-input"
                    accessibilityLabel="삭제 확인 문구 입력"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!deleting}
                    returnKeyType="done"
                    allowFontScaling
                    maxFontSizeMultiplier={2}
                    value={currentDraft ? draft.confirmationText : ''}
                    placeholder={PET_DELETE_CONFIRMATION_TEXT}
                    placeholderTextColor={colors.muted}
                    selectionColor={colors.accent}
                    onFocus={() => {
                      setInputFocused(true);
                      revealInput(confirmationRef);
                    }}
                    onBlur={() => setInputFocused(false)}
                    style={[
                      styles.input,
                      theme.typography.preset.body,
                      fontMode ? theme.typography.appFontMode[fontMode] : null,
                      type.dialogAction,
                    ]}
                    onChangeText={text => {
                      if (!deleting && !submitted.current)
                        setDraft(previous => ({
                          ...previous,
                          confirmationText: text,
                        }));
                    }}
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  {currentDraft &&
                  draft.confirmationText === PET_DELETE_CONFIRMATION_TEXT ? (
                    <View style={styles.inputCheck}>
                      <NuriSemanticIcon
                        family="feather"
                        name="check"
                        preserveOriginal
                        size={13}
                        color={colors.white}
                      />
                    </View>
                  ) : null}
                </View>
                {errorMessage ? (
                  <AppText
                    testID="pet-delete-error"
                    preset="bodySm"
                    accessibilityLiveRegion="polite"
                    style={styles.error}
                  >
                    {errorMessage}
                  </AppText>
                ) : null}
              </View>
            </ScrollView>
            <View testID="pet-delete-actions" style={styles.actions}>
              <TouchableOpacity
                testID="pet-delete-cancel"
                accessibilityRole="button"
                accessibilityLabel="아이 프로필 삭제 취소"
                accessibilityState={{ disabled: deleting }}
                disabled={deleting}
                style={[styles.button, styles.cancel]}
                onPress={handleCancel}
              >
                <AppText preset="button" style={styles.cancelText}>
                  취소
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                testID="pet-delete-confirm"
                accessibilityRole="button"
                accessibilityLabel={
                  deleting ? '아이 프로필 삭제 중' : '아이 프로필 삭제하기'
                }
                accessibilityState={{ disabled: blocked, busy: deleting }}
                disabled={blocked}
                style={[
                  styles.button,
                  styles.delete,
                  blocked && styles.disabled,
                ]}
                onPress={submit}
              >
                <AppText preset="button" style={styles.deleteText}>
                  {deleting ? '삭제 중…' : '프로필 삭제'}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardControllerAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.dim },
  viewport: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  card: {
    flexShrink: 1,
    minHeight: 0,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    elevation: 4,
  },
  header: {
    paddingLeft: 30,
    paddingRight: 20,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  title: { ...type.title, color: colors.ink, flex: 1, minWidth: 0 },
  close: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
    marginRight: -8,
  },
  body: { flexShrink: 1, minHeight: 0 },
  scrollContent: { paddingHorizontal: 20 },
  target: {
    minHeight: 88,
    borderRadius: 17,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: colors.canvas,
  },
  petImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: colors.subtle,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetCopy: { flex: 1, minWidth: 0, gap: 4 },
  targetLabel: { ...type.label, color: colors.muted },
  petName: { ...type.dialogName, color: colors.ink },
  warning: {
    marginTop: 14,
    marginHorizontal: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  warningText: { ...type.warning, color: colors.ink },
  policy: { marginTop: 16, marginHorizontal: 10, gap: 4 },
  policyLabel: { ...type.dialogBody, color: colors.muted },
  policyValue: { ...type.dialogBody, color: colors.ink },
  exception: { ...type.meta, color: colors.muted, marginTop: 4 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 16,
    marginBottom: 8,
  },
  consent: {
    minHeight: 48,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.accent, borderColor: colors.accent },
  consentText: { ...type.dialogBody, color: colors.ink, flex: 1 },
  field: { marginTop: 12, paddingBottom: 2, gap: 8 },
  fieldLabel: { ...type.meta, color: colors.muted, marginHorizontal: 10 },
  inputFrame: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    backgroundColor: colors.canvas,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
  },
  inputFocused: { borderColor: colors.accent },
  inputError: { borderColor: colors.danger },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.ink,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    includeFontPadding: false,
  },
  inputCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.65,
  },
  error: { ...type.meta, color: colors.danger },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    flexShrink: 0,
  },
  button: {
    flex: 1,
    minWidth: 0,
    minHeight: 57,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  cancel: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
  },
  delete: { backgroundColor: colors.danger },
  disabled: { opacity: 0.4 },
  cancelText: {
    ...type.dialogAction,
    color: colors.ink,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  deleteText: {
    ...type.dialogAction,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: colors.white,
    textAlign: 'center',
  },
});
export default memo(PetDeleteConfirmDialog);
