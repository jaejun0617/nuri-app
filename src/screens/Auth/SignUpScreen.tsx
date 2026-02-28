// 파일: src/screens/Auth/SignUpScreen.tsx
// 목적:
// - Email/Password 회원가입
// - 성공 시 NicknameSetup으로 이동(닉네임은 가입 직후 1회 설정)

import React, { useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../services/supabase/client';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SignUpScreen() {
  const navigation = useNavigation<Nav>();
  const setSession = useAuthStore(s => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const disabled = useMemo(
    () => !email.trim() || password.length < 6,
    [email, password],
  );

  const onSubmit = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      // signUp은 이메일 인증 정책에 따라 session이 null일 수도 있음
      await setSession(data.session ?? null);

      // 닉네임 설정 화면으로 이동(가입 직후 UX 고정)
      navigation.replace('NicknameSetup', { after: 'signup' });
    } catch (e: any) {
      Alert.alert('회원가입 실패', e?.message ?? '다시 시도해 주세요.');
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
          placeholder="example@email.com"
          placeholderTextColor="#B8B0A8"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="6자 이상"
          placeholderTextColor="#B8B0A8"
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primary, disabled ? styles.primaryDisabled : null]}
          disabled={disabled}
          onPress={onSubmit}
        >
          <Text style={styles.primaryText}>회원가입</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.ghost}
          onPress={() => navigation.replace('SignIn')}
        >
          <Text style={styles.ghostText}>로그인으로 가기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F2EE',
    padding: 18,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1D1B19',
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    color: '#6E6660',
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3EEE8',
    paddingHorizontal: 14,
    color: '#1D1B19',
    fontWeight: '700',
  },
  primary: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#97A48D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  ghost: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  ghostText: { color: '#7A726C', fontSize: 13, fontWeight: '700' },
});
