// 파일: src/screens/Auth/SignInScreen.tsx
// 목적:
// - 이메일/비밀번호 로그인
// - 성공 시: store.setSession(session) → profiles에서 nickname fetch → store.setNickname
// - nickname 없으면: NicknameSetup으로 이동
// - nickname 있으면: Main으로 reset

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { styles } from './SignInScreen.styles';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { signInWithEmail } from '../../services/supabase/auth';
import { fetchMyNickname } from '../../services/supabase/profile';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function SignInScreen({ navigation }: Props) {
  // ---------------------------------------------------------
  // 1) 입력 상태
  // ---------------------------------------------------------
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ---------------------------------------------------------
  // 2) UI 상태
  // ---------------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return isValidEmail(email) && password.trim().length >= 6 && !loading;
  }, [email, password, loading]);

  // ---------------------------------------------------------
  // 3) 액션
  // ---------------------------------------------------------
  const onSubmit = async () => {
    setErrorMsg(null);
    if (!canSubmit) return;

    try {
      setLoading(true);

      const session = await signInWithEmail(email.trim(), password);
      if (!session) {
        // 이메일 인증 케이스 등 (로그인은 보통 session 존재)
        setErrorMsg('로그인 세션을 생성할 수 없어요. 설정을 확인해 주세요.');
        return;
      }

      await useAuthStore.getState().setSession(session);

      // nickname fetch → store 반영
      const nickname = await fetchMyNickname();
      await useAuthStore.getState().setNickname(nickname);

      if (!nickname) {
        navigation.replace('NicknameSetup', { after: 'signin' });
        return;
      }

      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e: any) {
      setErrorMsg(e?.message ?? '로그인에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // 4) UI
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>로그인</Text>

        <Text style={styles.label}>이메일</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="example@nuri.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="6자 이상"
          secureTextEntry
          style={styles.input}
        />

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.primaryButton,
            !canSubmit ? styles.primaryButtonDisabled : null,
          ]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.primaryButtonText}>로그인</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.ghostButton}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.ghostButtonText}>
            아직 계정이 없나요? 회원가입
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
