// 파일: src/screens/Auth/SignUpScreen.tsx
// 목적:
// - Email/Password 회원가입
// - 세션이 즉시 생기면 NicknameSetup으로 이동
// - 이메일 인증 등으로 세션이 없으면 로그인 유도

import React, { useMemo, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../services/supabase/client';
import { useAuthStore } from '../../store/authStore';

import { styles } from './SignUpScreen.styles';

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

      await setSession(data.session ?? null);

      if (!data.session) {
        Alert.alert(
          '이메일 확인 필요',
          '회원가입이 완료되었습니다. 이메일 인증 후 로그인해주세요.',
          [
            {
              text: '확인',
              onPress: () => navigation.replace('SignIn'),
            },
          ],
        );
        return;
      }

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
          style={[
            styles.primaryButton,
            disabled ? styles.primaryButtonDisabled : null,
          ]}
          disabled={disabled}
          onPress={onSubmit}
        >
          <Text style={styles.primaryButtonText}>회원가입</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.ghostButton}
          onPress={() => navigation.replace('SignIn')}
        >
          <Text style={styles.ghostButtonText}>로그인으로 가기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
