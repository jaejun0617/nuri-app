// 파일: src/screens/Auth/SignUpScreen.tsx
// 목적:
// - 이메일/비밀번호 회원가입
// - 성공 시 session이 있으면 store.setSession → NicknameSetup 이동
// - 이메일 인증을 켠 경우(session null)에도 NicknameSetup은 “로그인 이후”로 유도 가능하지만
//   지금은 MVP: session이 없으면 안내 후 SignIn으로 유도

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { styles } from './SignUpScreen.styles';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { signUpWithEmail } from '../../services/supabase/auth';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return isValidEmail(email) && password.trim().length >= 6 && !loading;
  }, [email, password, loading]);

  const onSubmit = async () => {
    setErrorMsg(null);
    if (!canSubmit) return;

    try {
      setLoading(true);

      const session = await signUpWithEmail(email.trim(), password);

      if (!session) {
        // 이메일 인증 ON 케이스
        setErrorMsg(
          '회원가입은 완료됐지만 이메일 인증이 필요할 수 있어요. 인증 후 로그인해 주세요.',
        );
        return;
      }

      await useAuthStore.getState().setSession(session);
      navigation.replace('NicknameSetup', { after: 'signup' });
    } catch (e: any) {
      setErrorMsg(e?.message ?? '회원가입에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>회원가입</Text>

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
            <Text style={styles.primaryButtonText}>회원가입</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.ghostButton}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.ghostButtonText}>이미 계정이 있나요? 로그인</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
