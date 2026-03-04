import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { ASSETS } from '../../assets';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  checkNicknameAvailability,
  saveMyNickname,
} from '../../services/supabase/profile';
import { useAuthStore } from '../../store/authStore';
import { styles } from './NicknameSetupScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'NicknameSetup'>;

type ValidationState =
  | { tone: 'idle'; message: string | null }
  | { tone: 'error'; message: string }
  | { tone: 'success'; message: string };

type NicknameInputSectionProps = {
  nickname: string;
  onChangeNickname: (value: string) => void;
  canCheck: boolean;
  checking: boolean;
  onCheckDuplicate: () => void;
  onBlurNickname: () => void;
  hintText: string;
  helperMessage: ValidationState;
};

type NicknameFooterProps = {
  canSubmit: boolean;
  saving: boolean;
  onSubmit: () => void;
};

const MAX_NICKNAME_LENGTH = 8;
const NICKNAME_REGEX = /^[A-Za-z0-9가-힣]+$/;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '다시 시도해 주세요.';
}

function getNicknameValidationMessage(value: string): ValidationState {
  const trimmed = value.trim();
  if (!trimmed) return { tone: 'idle', message: null };
  if (trimmed.length > MAX_NICKNAME_LENGTH) {
    return {
      tone: 'error',
      message: '닉네임은 8자 이내로 입력해주세요',
    };
  }
  if (!NICKNAME_REGEX.test(trimmed)) {
    return {
      tone: 'error',
      message: '특수문자는 사용할수 없습니다',
    };
  }
  if (trimmed.length < 2) {
    return {
      tone: 'error',
      message: '닉네임은 2자 이상 입력해주세요',
    };
  }
  return { tone: 'idle', message: null };
}

const NicknameInputSection = memo(function NicknameInputSection({
  nickname,
  onChangeNickname,
  canCheck,
  checking,
  onCheckDuplicate,
  onBlurNickname,
  hintText,
  helperMessage,
}: NicknameInputSectionProps) {
  return (
    <View style={styles.inputBlock}>
      <View style={styles.inputRow}>
        <TextInput
          value={nickname}
          onChangeText={onChangeNickname}
          onBlur={onBlurNickname}
          placeholder="닉네임을 입력해주세요"
          placeholderTextColor="#B8C0CE"
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          maxLength={12}
          onSubmitEditing={onBlurNickname}
        />

        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.checkButton, !canCheck ? styles.checkButtonDisabled : null]}
          onPress={onCheckDuplicate}
          disabled={!canCheck}
        >
          {checking ? (
            <ActivityIndicator color="#98A1B2" size="small" />
          ) : (
            <Text style={styles.checkButtonText}>중복확인</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.underline} />
      <Text style={styles.hintText}>{hintText}</Text>

      {checking ? (
        <View style={styles.checkingRow}>
          <ActivityIndicator color="#98A1B2" size="small" />
          <Text style={styles.checkingText}>닉네임 확인중...</Text>
        </View>
      ) : null}

      {helperMessage.message ? (
        <Text
          style={[
            styles.validationText,
            helperMessage.tone === 'error'
              ? styles.validationError
              : helperMessage.tone === 'success'
                ? styles.validationSuccess
                : null,
          ]}
        >
          {helperMessage.message}
        </Text>
      ) : null}
    </View>
  );
});

const NicknameFooter = memo(function NicknameFooter({
  canSubmit,
  saving,
  onSubmit,
}: NicknameFooterProps) {
  return (
    <View style={styles.footer}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.primaryButton, !canSubmit ? styles.primaryButtonDisabled : null]}
        onPress={onSubmit}
        disabled={!canSubmit}
      >
        <Text style={styles.primaryButtonText}>{saving ? '저장 중...' : '완료'}</Text>
      </TouchableOpacity>
    </View>
  );
});

export default function NicknameSetupScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();

  const current = useAuthStore(s => s.profile.nickname) ?? '';
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const setNickname = useAuthStore(s => s.setNickname);

  const [nickname, setLocalNickname] = useState(
    route.params?.after === 'signup' ? '' : current,
  );
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [validationState, setValidationState] = useState<ValidationState>({
    tone: 'idle',
    message: null,
  });
  const lastCheckedNicknameRef = useRef<string | null>(null);

  const trimmed = useMemo(() => nickname.trim(), [nickname]);
  const localValidation = useMemo(
    () => getNicknameValidationMessage(trimmed),
    [trimmed],
  );

  const helperMessage = useMemo(() => {
    if (validationState.tone !== 'idle') return validationState;
    return localValidation;
  }, [localValidation, validationState]);

  const isAvailable = useMemo(
    () => validationState.tone === 'success',
    [validationState.tone],
  );

  const canCheck = useMemo(() => {
    if (checking || saving) return false;
    return localValidation.tone !== 'error' && trimmed.length >= 2;
  }, [checking, localValidation.tone, saving, trimmed.length]);

  const canSubmit = useMemo(() => {
    if (saving || checking) return false;
    return isAvailable && availabilityChecked;
  }, [availabilityChecked, checking, isAvailable, saving]);

  const onChangeNickname = useCallback((value: string) => {
    setLocalNickname(value);
    setAvailabilityChecked(false);
    setValidationState({ tone: 'idle', message: null });
    lastCheckedNicknameRef.current = null;
  }, []);

  const runAvailabilityCheck = useCallback(async () => {
    const syncValidation = getNicknameValidationMessage(trimmed);
    if (syncValidation.tone === 'error') {
      setAvailabilityChecked(false);
      setValidationState(syncValidation);
      return;
    }

    if (lastCheckedNicknameRef.current === trimmed && validationState.tone !== 'idle') {
      return;
    }

    try {
      setChecking(true);
      const available = await checkNicknameAvailability(trimmed);
      lastCheckedNicknameRef.current = trimmed;

      if (!available) {
        setAvailabilityChecked(false);
        setValidationState({
          tone: 'error',
          message: '이미 사용중인 닉네임 입니다.',
        });
        return;
      }

      setAvailabilityChecked(true);
      setValidationState({
        tone: 'success',
        message: '사용 가능한 닉네임입니다',
      });
    } catch (error) {
      setAvailabilityChecked(false);
      lastCheckedNicknameRef.current = null;
      setValidationState({
        tone: 'error',
        message: getErrorMessage(error),
      });
    } finally {
      setChecking(false);
    }
  }, [trimmed, validationState.tone]);

  const onBlurNickname = useCallback(() => {
    if (checking || saving) return;
    void runAvailabilityCheck();
  }, [checking, runAvailabilityCheck, saving]);

  const onCheckDuplicate = useCallback(() => {
    if (checking || saving) return;
    void runAvailabilityCheck();
  }, [checking, runAvailabilityCheck, saving]);

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;

    try {
      setSaving(true);
      await saveMyNickname(trimmed);
      await setNickname(trimmed);

      navigation.reset({ index: 0, routes: [{ name: 'PetCreate' }] });
    } catch (error) {
      Alert.alert('닉네임 저장 실패', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [canSubmit, navigation, setNickname, trimmed]);

  const hintText = useMemo(() => {
    if (!route.params?.after) return '홈에서 표시될 닉네임을 설정해주세요';
    return route.params.after === 'signup'
      ? '홈에서 표시될 닉네임을 설정해주세요'
      : '계속하려면 닉네임 설정이 필요합니다';
  }, [route.params?.after]);

  useEffect(() => {
    if (isLoggedIn) return;

    navigation.reset({
      index: 0,
      routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
    });
  }, [isLoggedIn, navigation]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.content}>
        <Image source={ASSETS.logo} style={styles.logo} resizeMode="contain" />

        <NicknameInputSection
          nickname={nickname}
          onChangeNickname={onChangeNickname}
          canCheck={canCheck}
          checking={checking}
          onCheckDuplicate={onCheckDuplicate}
          onBlurNickname={onBlurNickname}
          hintText={hintText}
          helperMessage={helperMessage}
        />
      </View>

      <NicknameFooter canSubmit={canSubmit} saving={saving} onSubmit={onSubmit} />
    </SafeAreaView>
  );
}
