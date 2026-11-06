import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import LavenderCtaFill from '../../app/ui/LavenderCtaFill';
import { LAVENDER_CTA } from '../../app/theme/tokens/productAccent';
import AppTextInput from '../../app/ui/AppTextInput';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type TextInput,
} from 'react-native';
import { NuriAlert as Alert } from '../../app/ui/NuriAlert';
import { KeyboardAvoidingView as KeyboardControllerAvoidingView } from 'react-native-keyboard-controller';
import { useBoundedKeyboardScroll } from '../../hooks/useBoundedKeyboardScroll';
import { useKeyboardBottomPadding } from '../../hooks/useKeyboardBottomPadding';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '../icons/NuriFeatherIcon';
import NuriSemanticIcon from '../icons/NuriSemanticIcon';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { healthReportColors as colors } from '../../app/theme/tokens/healthReport';
import DatePickerModal from '../date-picker/DatePickerModal';
import { MenuGlassSurface } from '../common/MenuGlassSurface';
import {
  deletePetWeightLog,
  upsertPetWeightLog,
  type PetWeightLog,
  type PetWeightLogMutationResult,
  type PetWeightLogSource,
} from '../../services/supabase/petWeightLogs';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { showToast } from '../../store/uiStore';
import { getKstYmd, safeYmd } from '../../utils/date';
import { useOwnerOperation } from '../../hooks/useOwnerOperation';

type Props = {
  visible: boolean;
  petId: string;
  petName: string;
  accentColor: string;
  entrySource: PetWeightLogSource;
  initialLog?: PetWeightLog | null;
  initialWeightKg?: number | null;
  initialMeasuredOn?: string | null;
  onClose: () => void;
  onCommitted?: (result: PetWeightLogMutationResult) => void;
};

function normalizeWeightInput(value: string): number {
  const numeric = Number(value.trim());
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 999.99) {
    throw new Error('몸무게는 0보다 크고 999.99kg 이하로 입력해 주세요.');
  }
  return Math.round(numeric * 100) / 100;
}

export default function WeightLogEntrySheet({
  visible,
  petId,
  petName,
  accentColor,
  entrySource,
  initialLog = null,
  initialWeightKg = null,
  initialMeasuredOn = null,
  onClose,
  onCommitted,
}: Props) {
  const theme = useTheme();
  const healthStyle = entrySource === 'health_report';
  const accent = healthStyle ? colors.accent : accentColor;
  const inputInk = healthStyle ? colors.ink : theme.colors.textPrimary;
  const fieldLabel = healthStyle ? colors.muted : undefined;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteOwner = useRef<(() => boolean) | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const bottomPaddingStyle = useKeyboardBottomPadding(
    Math.max(insets.bottom, 20),
  );
  const [weightText, setWeightText] = useState('');
  const [measuredOn, setMeasuredOn] = useState(getKstYmd());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const weightRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);
  const noteRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);
  const { scrollProps, revealInput } = useBoundedKeyboardScroll(visible);
  const captureCurrent = useOwnerOperation(
    `${petId}:${initialLog?.id ?? 'new'}:${visible}`,
  );
  const entryVersion = useRef(0);
  const mutation = useRef<symbol | null>(null);
  const captureEntry = useCallback(() => {
    const current = captureCurrent();
    const version = entryVersion.current;
    return () => visible && current() && entryVersion.current === version;
  }, [captureCurrent, visible]);

  useEffect(() => {
    entryVersion.current += 1;
    mutation.current = null;
    setSaving(false);
    setDeleting(false);
    setConfirmingDelete(false);
    setDeleteError(null);
    deleteOwner.current = null;
  }, [initialLog?.id, petId, visible]);

  const handleClose = useCallback(() => {
    // Android Back can close before the parent commits visible=false.
    entryVersion.current += 1;
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleRequestClose = useCallback(() => {
    if (confirmingDelete) {
      if (mutation.current) return;
      deleteOwner.current = null;
      setConfirmingDelete(false);
      return;
    }
    if (keyboardVisible) {
      Keyboard.dismiss();
      return;
    }

    handleClose();
  }, [confirmingDelete, handleClose, keyboardVisible]);

  useEffect(() => {
    if (!visible) return;

    const nextWeight =
      initialLog?.weightKg ??
      (typeof initialWeightKg === 'number' && Number.isFinite(initialWeightKg)
        ? initialWeightKg
        : null);
    setWeightText(nextWeight !== null ? String(nextWeight) : '');
    setMeasuredOn(
      safeYmd(initialLog?.measuredOn ?? initialMeasuredOn) ?? getKstYmd(),
    );
    setNote(initialLog?.note ?? '');
  }, [initialLog, initialMeasuredOn, initialWeightKg, petId, visible]);

  useEffect(() => {
    if (!visible) {
      setKeyboardVisible(false);
      return;
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  const title = initialLog ? '체중 기록 수정' : '체중 기록 남기기';
  const canSubmit = useMemo(
    () => weightText.trim().length > 0 && safeYmd(measuredOn) !== null,
    [measuredOn, weightText],
  );

  const handleSave = useCallback(async () => {
    const current = captureEntry();
    if (mutation.current || !current()) return;
    const operation = Symbol('weight-save');
    mutation.current = operation;
    try {
      setSaving(true);

      const result = await upsertPetWeightLog({
        petId,
        measuredOn,
        weightKg: normalizeWeightInput(weightText),
        note,
        source: entrySource,
      });
      if (!current()) return;

      showToast({
        tone: 'success',
        title: initialLog ? '체중 기록을 고쳤어요' : '체중 기록을 남겼어요',
        message: `${petName}의 최신 몸무게가 바로 반영됐어요.`,
      });
      onCommitted?.(result);
      handleClose();
    } catch (error) {
      if (!current()) return;
      const { title: errorTitle, message } = getBrandedErrorMeta(
        error,
        initialLog ? 'record-update' : 'record-create',
      );
      Alert.alert(errorTitle, message);
    } finally {
      if (mutation.current === operation) {
        mutation.current = null;
        if (captureCurrent()()) setSaving(false);
      }
    }
  }, [
    captureCurrent,
    captureEntry,
    entrySource,
    handleClose,
    initialLog,
    measuredOn,
    note,
    onCommitted,
    petId,
    petName,
    weightText,
  ]);

  const performDelete = useCallback(
    async (current: () => boolean) => {
      if (!initialLog || mutation.current || !current()) return;
      const operation = Symbol('weight-delete');
      mutation.current = operation;
      setDeleteError(null);
      try {
        setDeleting(true);
        const result = await deletePetWeightLog({ logId: initialLog.id });
        if (!current()) return;
        showToast({
          tone: 'info',
          title: '체중 기록을 지웠어요',
          message: `${petName}의 최신 몸무게를 다시 정리했어요.`,
        });
        onCommitted?.(result);
        handleClose();
      } catch (error) {
        if (!current()) return;
        const { title: errorTitle, message } = getBrandedErrorMeta(
          error,
          'record-delete',
        );
        if (healthStyle) setDeleteError(message);
        else Alert.alert(errorTitle, message);
      } finally {
        if (mutation.current === operation) {
          mutation.current = null;
          if (captureCurrent()()) setDeleting(false);
        }
      }
    },
    [
      captureCurrent,
      handleClose,
      healthStyle,
      initialLog,
      onCommitted,
      petName,
    ],
  );

  const handleDelete = useCallback(() => {
    const current = captureEntry();
    if (!initialLog || mutation.current || !current()) return;
    if (healthStyle) {
      Keyboard.dismiss();
      setDeleteError(null);
      deleteOwner.current = current;
      setConfirmingDelete(true);
    } else {
      Alert.alert(
        '체중 기록 삭제',
        '이 기록을 지우면 최신 몸무게도 다시 계산돼요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => performDelete(current),
          },
        ],
      );
    }
  }, [captureEntry, healthStyle, initialLog, performDelete]);

  const currentDelete = deleteOwner.current;

  return (
    <>
      <Modal
        animationType="slide"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        visible={visible}
        onRequestClose={handleRequestClose}
      >
        <KeyboardControllerAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          enabled
          automaticOffset
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          style={[styles.modalRoot, { paddingTop: insets.top + 12 }]}
        >
          <Pressable
            testID="weight-entry-backdrop"
            style={[
              styles.backdrop,
              healthStyle && styles.reportBackdrop,
              confirmingDelete && styles.clearBackdrop,
            ]}
            disabled={saving || deleting || confirmingDelete}
            onPress={handleClose}
          />
          <Animated.View
            testID="weight-entry-sheet"
            accessibilityElementsHidden={confirmingDelete}
            importantForAccessibility={
              confirmingDelete ? 'no-hide-descendants' : 'auto'
            }
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
              healthStyle && styles.reportSheet,
              bottomPaddingStyle,
            ]}
          >
            {/* Empty sheet space must not hand a touch to the dismiss backdrop. */}
            {healthStyle ? <MenuGlassSurface radius={0} backed /> : null}
            <Pressable
              testID="weight-entry-touch-boundary"
              accessible={false}
              style={StyleSheet.absoluteFill}
              onPress={event => event.stopPropagation()}
            />
            {healthStyle ? <View style={styles.sheetHandle} /> : null}
            <View testID="weight-entry-header" style={styles.headerRow}>
              <View style={styles.headerTextWrap}>
                <AppText
                  preset="unifiedTitle"
                  weight="800"
                  color={healthStyle ? colors.ink : undefined}
                  styleOverridesPreset={healthStyle}
                  style={healthStyle && styles.reportTitle}
                >
                  {title}
                </AppText>
                <AppText
                  preset="unifiedMeta"
                  color={healthStyle ? colors.muted : theme.colors.textMuted}
                  styleOverridesPreset={healthStyle}
                  style={[
                    styles.headerHelper,
                    healthStyle && styles.reportLabelText,
                  ]}
                >
                  {petName}
                </AppText>
              </View>
              <TouchableOpacity
                testID="weight-entry-close"
                accessibilityRole="button"
                accessibilityLabel="체중 기록 닫기"
                activeOpacity={0.88}
                disabled={saving || deleting}
                onPress={handleClose}
                style={[styles.closeButton, { backgroundColor: 'transparent' }]}
              >
                <NuriSemanticIcon
                  family="feather"
                  color={healthStyle ? '#111111' : theme.colors.textPrimary}
                  name="x"
                  size={24}
                  preserveOriginal
                />
              </TouchableOpacity>
            </View>
            <ScrollView
              {...scrollProps}
              testID="weight-entry-scroll"
              style={styles.body}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.fieldBlock}>
                <AppText
                  preset="unifiedMeta"
                  color={fieldLabel}
                  styleOverridesPreset={healthStyle}
                  style={[styles.label, healthStyle && styles.reportLabelText]}
                >
                  몸무게
                </AppText>
                <View
                  style={[
                    styles.valueInputWrap,
                    { borderColor: theme.colors.border },
                    healthStyle && styles.reportField,
                  ]}
                >
                  <AppTextInput
                    ref={weightRef}
                    testID="weight-entry-value"
                    onFocus={() => revealInput(weightRef)}
                    value={weightText}
                    onChangeText={setWeightText}
                    placeholder="0.0"
                    placeholderTextColor="#A0A7B4"
                    keyboardType="decimal-pad"
                    style={[styles.input, { color: inputInk }]}
                  />
                  <AppText
                    preset="unifiedMeta"
                    color={healthStyle ? colors.muted : theme.colors.textMuted}
                    styleOverridesPreset={healthStyle}
                    style={healthStyle && styles.reportLabelText}
                  >
                    kg
                  </AppText>
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <AppText
                  preset="unifiedMeta"
                  color={fieldLabel}
                  styleOverridesPreset={healthStyle}
                  style={[styles.label, healthStyle && styles.reportLabelText]}
                >
                  측정 날짜
                </AppText>
                <TouchableOpacity
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="측정 날짜 변경"
                  onPress={() => {
                    Keyboard.dismiss();
                    setDateModalVisible(true);
                  }}
                  style={[
                    styles.valueInputWrap,
                    { borderColor: theme.colors.border },
                    healthStyle && styles.reportField,
                  ]}
                >
                  <AppText
                    preset="unifiedBody"
                    color={healthStyle ? colors.ink : undefined}
                    styleOverridesPreset={healthStyle}
                    style={healthStyle && styles.reportDateText}
                  >
                    {measuredOn.replace(/-/g, '.')}
                  </AppText>
                  {healthStyle ? (
                    <AppText
                      preset="unifiedBody"
                      color={accent}
                      weight="600"
                      styleOverridesPreset
                      style={styles.reportLabelText}
                    >
                      변경
                    </AppText>
                  ) : (
                    <Feather
                      color={theme.colors.textMuted}
                      name="calendar"
                      size={16}
                    />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.fieldBlock}>
                <AppText
                  preset="unifiedMeta"
                  color={fieldLabel}
                  styleOverridesPreset={healthStyle}
                  style={[styles.label, healthStyle && styles.reportLabelText]}
                >
                  메모
                </AppText>
                <View
                  style={[
                    styles.noteWrap,
                    { borderColor: theme.colors.border },
                    healthStyle && styles.reportField,
                  ]}
                >
                  <AppTextInput
                    ref={noteRef}
                    testID="weight-entry-note"
                    onFocus={() => revealInput(noteRef)}
                    value={note}
                    onChangeText={setNote}
                    placeholder="식단이나 컨디션을 남겨 주세요"
                    placeholderTextColor="#A0A7B4"
                    multiline
                    maxLength={500}
                    style={[styles.noteInput, { color: inputInk }]}
                  />
                </View>
              </View>
            </ScrollView>
            <View testID="weight-entry-actions" style={styles.actionRow}>
              {initialLog ? (
                <CtaButton
                  role="destructiveEntry"
                  testID="weight-entry-delete"
                  activeOpacity={0.88}
                  onPress={handleDelete}
                  disabled={saving || deleting}
                  style={[styles.deleteButton, {}]}
                >
                  <CtaText preset="unifiedLabel">
                    {deleting ? '삭제 중...' : '삭제하기'}
                  </CtaText>
                </CtaButton>
              ) : null}

              {healthStyle ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{
                    busy: saving,
                    disabled: !canSubmit || saving || deleting,
                  }}
                  testID="weight-entry-save"
                  onPress={handleSave}
                  disabled={!canSubmit || saving || deleting}
                  style={[
                    styles.primaryButton,
                    styles.reportPrimaryButton,
                    (!canSubmit || saving || deleting) &&
                      styles.reportButtonDisabled,
                  ]}
                >
                  <LavenderCtaFill radius={styles.primaryButton.borderRadius} />
                  <AppText
                    preset="unifiedLabel"
                    color={LAVENDER_CTA.text}
                    weight="700"
                    styleOverridesPreset
                    style={styles.reportLabelText}
                  >
                    {saving ? '저장 중…' : initialLog ? '수정하기' : '기록하기'}
                  </AppText>
                </TouchableOpacity>
              ) : (
                <CtaButton
                  role="primary"
                  loading={saving}
                  testID="weight-entry-save"
                  activeOpacity={0.9}
                  onPress={handleSave}
                  disabled={!canSubmit || saving || deleting}
                  style={styles.primaryButton}
                >
                  <CtaText preset="unifiedLabel">
                    {initialLog ? '수정하기' : '기록하기'}
                  </CtaText>
                </CtaButton>
              )}
            </View>
          </Animated.View>
          {confirmingDelete && initialLog ? (
            <View
              style={[
                styles.confirmOverlay,
                {
                  paddingTop: insets.top + 16,
                  paddingBottom: insets.bottom + 16,
                },
              ]}
              accessibilityViewIsModal
            >
              <ScrollView
                style={styles.confirmScroll}
                contentContainerStyle={styles.confirmScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View
                  testID="weight-delete-confirmation"
                  style={styles.confirmPanel}
                >
                  <MenuGlassSurface radius={20} backed />
                  <AppText
                    preset="unifiedTitle"
                    color={colors.ink}
                    weight="800"
                    styleOverridesPreset
                    style={[styles.confirmTitle, styles.reportTitle]}
                  >
                    체중 기록을 삭제할까요?
                  </AppText>
                  <View style={styles.confirmSummary}>
                    <View style={styles.headerTextWrap}>
                      <AppText
                        preset="unifiedBody"
                        color={colors.ink}
                        weight="700"
                      >
                        {petName}
                      </AppText>
                      <AppText preset="unifiedMeta" color={colors.muted}>
                        {initialLog.measuredOn.replace(/-/g, '.')}
                      </AppText>
                    </View>
                    <AppText
                      preset="unifiedTitle"
                      color={colors.ink}
                      weight="800"
                    >
                      {initialLog.weightKg} kg
                    </AppText>
                  </View>
                  <AppText
                    preset="unifiedBody"
                    color={colors.muted}
                    styleOverridesPreset
                    style={[styles.confirmTitle, styles.reportLabelText]}
                  >
                    이 기록을 삭제하면 최신 몸무게가 남은 기록을 기준으로 다시
                    계산돼요.
                  </AppText>
                  {deleteError ? (
                    <AppText
                      accessibilityLiveRegion="polite"
                      preset="unifiedMeta"
                      color={colors.danger}
                    >
                      {deleteError}
                    </AppText>
                  ) : null}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      testID="weight-delete-cancel"
                      disabled={deleting}
                      onPress={() => {
                        deleteOwner.current = null;
                        setConfirmingDelete(false);
                      }}
                      style={[styles.confirmButton, styles.cancelButton]}
                    >
                      <AppText
                        preset="unifiedLabel"
                        color={colors.ink}
                        weight="700"
                      >
                        취소
                      </AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityState={{
                        busy: deleting,
                        disabled: deleting,
                      }}
                      testID="weight-delete-submit"
                      disabled={deleting}
                      onPress={() => {
                        if (
                          currentDelete &&
                          deleteOwner.current === currentDelete
                        ) {
                          return performDelete(currentDelete);
                        }
                      }}
                      style={[styles.confirmButton, styles.confirmDelete]}
                    >
                      <AppText
                        preset="unifiedLabel"
                        color="#FFFFFF"
                        weight="700"
                      >
                        {deleting ? '삭제 중…' : '삭제하기'}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          ) : null}
        </KeyboardControllerAvoidingView>
      </Modal>

      <DatePickerModal
        visible={dateModalVisible}
        title="측정 날짜"
        initialDate={measuredOn}
        onCancel={() => setDateModalVisible(false)}
        onConfirm={date => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          setMeasuredOn(`${year}-${month}-${day}`);
          setDateModalVisible(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11,18,32,0.44)',
  },
  sheet: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
    flexShrink: 1,
    minHeight: 0,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '82%',
  },
  reportBackdrop: { backgroundColor: colors.dim },
  clearBackdrop: { backgroundColor: 'transparent' },
  reportSheet: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.78)',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 9,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C9BDE0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  reportField: {
    backgroundColor: colors.field,
    borderColor: '#DACDEC',
    borderWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    minHeight: 44,
  },
  reportPrimaryButton: {
    backgroundColor: colors.button,
    borderColor: colors.button,
  },
  reportButtonDisabled: { opacity: 0.55 },
  reportTitle: { fontSize: 20, lineHeight: 26, letterSpacing: 0 },
  reportLabelText: { fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  reportDateText: { fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  confirmOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.dim,
    paddingHorizontal: 24,
  },
  confirmScroll: { flex: 1 },
  confirmScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  confirmPanel: {
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  confirmTitle: { textAlign: 'center' },
  confirmSummary: {
    backgroundColor: colors.tint,
    borderRadius: 11,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  confirmButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  cancelButton: { backgroundColor: colors.tint },
  confirmDelete: { backgroundColor: colors.danger },
  headerRow: {
    flexShrink: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerHelper: {
    marginTop: 6,
  },
  closeButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  body: { flexShrink: 1, minHeight: 0 },
  label: {
    marginBottom: 8,
  },
  valueInputWrap: {
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 48,
    fontSize: 16,
    paddingVertical: 0,
  },
  noteWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  noteInput: {
    minHeight: 92,
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 24,
  },
  actionRow: {
    flexShrink: 0,
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  deleteButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
});
