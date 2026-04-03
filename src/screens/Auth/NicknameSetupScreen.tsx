// 파일: src/screens/Auth/NicknameSetupScreen.tsx
// 파일 목적:
// - 회원가입/로그인 직후 닉네임을 확정해 본격적인 앱 사용 전 마지막 사용자 식별 정보를 채운다.
// 어디서 쓰이는지:
// - RootNavigator의 `NicknameSetup` 라우트에서 사용되며, SignUp 이후 또는 로그인 후 닉네임 미설정 가드로 진입한다.
// 핵심 역할:
// - 닉네임 입력, 정책 검증, 중복 확인 RPC 호출, 최종 저장을 담당한다.
// - 입력 중단 시 draft를 복구하고, 완료 후 PetCreate 단계로 이동시킨다.
// 데이터·상태 흐름:
// - 저장 성공 시 Supabase profile 업데이트와 authStore nickname 반영이 이어지고, 이후 펫 생성 온보딩이 시작된다.
// 수정 시 주의:
// - 닉네임 검증 규칙과 availability 메시지는 서버 RPC 정책과 어긋나지 않아야 한다.
// - 비로그인 상태 fallback과 draft 복구 타이밍을 바꾸면 온보딩 진입 흐름이 쉽게 깨진다.

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
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { ASSETS } from '../../assets';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getBrandedErrorMeta } from '../../services/app/errors';
import {
  getNicknameErrorMessageByCode,
  NICKNAME_MAX_LENGTH,
  validateNicknameInput,
  type NicknamePolicyCode,
} from '../../services/profileNicknamePolicy';
import {
  checkNicknameAvailabilityDetailed,
  saveMyNickname,
} from '../../services/supabase/profile';
import {
  clearNicknameDraft,
  loadNicknameDraft,
  saveNicknameDraft,
} from '../../services/local/onboardingDraft';
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

function getNicknameValidationMessage(value: string): ValidationState {
  const validation = validateNicknameInput(value);
  if (validation.code === 'empty' || validation.code === 'ok') {
    return { tone: 'idle', message: null };
  }

  return {
    tone: 'error',
    message:
      validation.message ??
      getNicknameErrorMessageByCode(validation.code) ??
      '닉네임을 다시 확인해 주세요.',
  };
}

function mapAvailabilityCodeToMessage(
  code: NicknamePolicyCode,
): ValidationState {
  const message = getNicknameErrorMessageByCode(code);
  if (!message) return { tone: 'idle', message: null };

  return code === 'ok'
    ? { tone: 'success', message }
    : { tone: 'error', message };
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
          maxLength={NICKNAME_MAX_LENGTH}
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
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<KeyboardAwareScrollViewRef | null>(null);
  const after = route.params?.after ?? 'signup';

  const current = useAuthStore(s => s.profile.nickname) ?? '';
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const setNickname = useAuthStore(s => s.setNickname);

  const [nickname, setLocalNickname] = useState(after === 'signup' ? '' : current);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [validationState, setValidationState] = useState<ValidationState>({
    tone: 'idle',
    message: null,
  });
  const lastCheckedNicknameRef = useRef<string | null>(null);
  const checkSeqRef = useRef(0);
  const draftHydratedRef = useRef(false);

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

  useEffect(() => {
    let mounted = true;

    async function hydrateNicknameDraft() {
      const draft = await loadNicknameDraft();
      if (!mounted || draftHydratedRef.current) return;
      draftHydratedRef.current = true;

      if (draft && !nickname.trim()) {
        setLocalNickname(draft);
      }
    }

    hydrateNicknameDraft().catch(() => {
      // ignore draft hydrate errors
    });
    return () => {
      mounted = false;
    };
  }, [nickname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveNicknameDraft(nickname).catch(() => {
        // ignore draft persist errors
      });
    }, 220);
    return () => clearTimeout(timer);
  }, [nickname]);

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
      checkSeqRef.current += 1;
      const seq = checkSeqRef.current;
      setChecking(true);
      const result = await checkNicknameAvailabilityDetailed(trimmed);
      if (seq !== checkSeqRef.current) return;

      lastCheckedNicknameRef.current = trimmed;
      const mapped = mapAvailabilityCodeToMessage(result.code);

      if (!result.available) {
        setAvailabilityChecked(false);
        setValidationState(mapped);
        return;
      }

      setAvailabilityChecked(true);
      setValidationState(mapped);
    } catch (error) {
      setAvailabilityChecked(false);
      lastCheckedNicknameRef.current = null;
      setValidationState({
        tone: 'error',
        message: getBrandedErrorMeta(error, 'nickname').message,
      });
    } finally {
      setChecking(false);
    }
  }, [trimmed, validationState.tone]);

  const onBlurNickname = useCallback(() => {
    if (checking || saving) return;
    runAvailabilityCheck().catch(() => {
      // handled inside runAvailabilityCheck
    });
  }, [checking, runAvailabilityCheck, saving]);

  const onCheckDuplicate = useCallback(() => {
    if (checking || saving) return;
    runAvailabilityCheck().catch(() => {
      // handled inside runAvailabilityCheck
    });
  }, [checking, runAvailabilityCheck, saving]);

  useEffect(() => {
    if (checking || saving) return;
    if (localValidation.tone === 'error') return;
    if (trimmed.length < 2) return;
    if (lastCheckedNicknameRef.current === trimmed && validationState.tone !== 'idle') {
      return;
    }

    const timer = setTimeout(() => {
      runAvailabilityCheck().catch(() => {
        // handled inside runAvailabilityCheck
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [
    checking,
    localValidation.tone,
    runAvailabilityCheck,
    saving,
    trimmed,
    validationState.tone,
  ]);

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;

    try {
      setSaving(true);
      await saveMyNickname(trimmed);
      await setNickname(trimmed);
      await clearNicknameDraft();

      navigation.navigate('PetCreate', { from: 'auto' });
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'nickname');
      Alert.alert(title, message);
    } finally {
      setSaving(false);
    }
  }, [canSubmit, navigation, setNickname, trimmed]);

  const hintText = useMemo(() => {
    if (!after) return '홈에서 표시될 닉네임을 설정해주세요';
    return after === 'signup'
      ? '홈에서 표시될 닉네임을 설정해주세요'
      : '계속하려면 닉네임 설정이 필요합니다';
  }, [after]);

  useEffect(() => {
    if (isLoggedIn) return;

    navigation.reset({
      index: 0,
      routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
    });
  }, [isLoggedIn, navigation]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.keyboardView}
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

        <NicknameFooter
          canSubmit={canSubmit}
          saving={saving}
          onSubmit={onSubmit}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
