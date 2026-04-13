import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView as KeyboardControllerAvoidingView } from 'react-native-keyboard-controller';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import DatePickerModal from '../date-picker/DatePickerModal';
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
  const insets = useSafeAreaInsets();
  const [weightText, setWeightText] = useState('');
  const [measuredOn, setMeasuredOn] = useState(getKstYmd());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleRequestClose = useCallback(() => {
    if (keyboardVisible) {
      Keyboard.dismiss();
      return;
    }

    handleClose();
  }, [handleClose, keyboardVisible]);

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
  }, [initialLog, initialMeasuredOn, initialWeightKg, visible]);

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
    try {
      setSaving(true);

      const result = await upsertPetWeightLog({
        petId,
        measuredOn,
        weightKg: normalizeWeightInput(weightText),
        note,
        source: entrySource,
      });

      showToast({
        tone: 'success',
        title: initialLog ? '체중 기록을 고쳤어요' : '체중 기록을 남겼어요',
        message: `${petName}의 최신 몸무게가 바로 반영됐어요.`,
      });
      onCommitted?.(result);
      handleClose();
    } catch (error) {
      const { title: errorTitle, message } = getBrandedErrorMeta(error, 'pet-update');
      Alert.alert(errorTitle, message);
    } finally {
      setSaving(false);
    }
  }, [entrySource, handleClose, initialLog, measuredOn, note, onCommitted, petId, petName, weightText]);

  const handleDelete = useCallback(() => {
    if (!initialLog) return;

    Alert.alert(
      '체중 기록 삭제',
      '이 기록을 지우면 최신 몸무게도 다시 계산돼요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const result = await deletePetWeightLog({ logId: initialLog.id });
              showToast({
                tone: 'info',
                title: '체중 기록을 지웠어요',
                message: `${petName}의 최신 몸무게를 다시 정리했어요.`,
              });
              onCommitted?.(result);
              handleClose();
            } catch (error) {
              const { title: errorTitle, message } = getBrandedErrorMeta(
                error,
                'pet-update',
              );
              Alert.alert(errorTitle, message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [handleClose, initialLog, onCommitted, petName]);

  return (
    <>
      <Modal
        animationType="slide"
        transparent
        visible={visible}
        onRequestClose={handleRequestClose}
      >
        <KeyboardControllerAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          enabled
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          style={styles.modalRoot}
        >
          <Pressable style={styles.backdrop} onPress={handleClose} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <KeyboardAwareScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              enableOnAndroid
              enableAutomaticScroll
              enableResetScrollToCoords={false}
              keyboardOpeningTime={0}
              extraScrollHeight={20}
              extraHeight={84}
            >
              <View style={styles.headerRow}>
                <View style={styles.headerTextWrap}>
                  <AppText preset="titleSm">{title}</AppText>
                  <AppText
                    preset="helper"
                    color={theme.colors.textMuted}
                    style={styles.headerHelper}
                  >
                    {petName}의 최신 체중과 리포트를 같은 기준으로 맞춥니다.
                  </AppText>
                </View>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={handleClose}
                  style={[
                    styles.closeButton,
                    { backgroundColor: theme.colors.background },
                  ]}
                >
                  <Feather color={theme.colors.textMuted} name="x" size={18} />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldBlock}>
                <AppText preset="caption" style={styles.label}>
                  몸무게
                </AppText>
                <View
                  style={[
                    styles.valueInputWrap,
                    { borderColor: theme.colors.border },
                  ]}
                >
                  <TextInput
                    value={weightText}
                    onChangeText={setWeightText}
                    placeholder="0.0"
                    placeholderTextColor="#A0A7B4"
                    keyboardType="decimal-pad"
                    style={[styles.input, { color: theme.colors.textPrimary }]}
                  />
                  <AppText preset="bodySm" color={theme.colors.textMuted}>
                    kg
                  </AppText>
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <AppText preset="caption" style={styles.label}>
                  측정 날짜
                </AppText>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setDateModalVisible(true)}
                  style={[
                    styles.valueInputWrap,
                    { borderColor: theme.colors.border },
                  ]}
                >
                  <AppText preset="body">{measuredOn.replace(/-/g, '.')}</AppText>
                  <Feather color={theme.colors.textMuted} name="calendar" size={16} />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldBlock}>
                <AppText preset="caption" style={styles.label}>
                  메모
                </AppText>
                <View
                  style={[
                    styles.noteWrap,
                    { borderColor: theme.colors.border },
                  ]}
                >
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="식단 변화, 병원 방문, 컨디션 메모를 남겨둘 수 있어요."
                    placeholderTextColor="#A0A7B4"
                    multiline
                    maxLength={500}
                    style={[
                      styles.noteInput,
                      { color: theme.colors.textPrimary },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.actionRow}>
                {initialLog ? (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={handleDelete}
                    disabled={saving || deleting}
                    style={[
                      styles.deleteButton,
                      { borderColor: theme.colors.border },
                    ]}
                  >
                    <AppText preset="button" color={theme.colors.danger}>
                      {deleting ? '삭제 중...' : '삭제'}
                    </AppText>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleSave}
                  disabled={!canSubmit || saving || deleting}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor:
                        !canSubmit || saving || deleting
                          ? `${accentColor}66`
                          : accentColor,
                    },
                  ]}
                >
                  <AppText preset="button" color="#FFFFFF">
                    {saving ? '저장 중...' : '저장'}
                  </AppText>
                </TouchableOpacity>
              </View>
            </KeyboardAwareScrollView>
          </View>
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
    flex: 1,
    backgroundColor: 'rgba(11,18,32,0.44)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '82%',
  },
  headerRow: {
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
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  valueInputWrap: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
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
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noteInput: {
    minHeight: 92,
    textAlignVertical: 'top',
    fontSize: 15,
    lineHeight: 22,
  },
  actionRow: {
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
