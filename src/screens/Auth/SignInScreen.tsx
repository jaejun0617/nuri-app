// 파일: src/screens/Auth/SignInScreen.tsx
// 목적:
// - Email/Password 로그인
// - ✅ Main이 아니라 AppTabs로 reset
// - 로그인 후 nickname 없으면 NicknameSetup로 replace

import React, { useMemo, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../services/supabase/client';
import { fetchMyNickname } from '../../services/supabase/profile';
import { useAuthStore } from '../../store/authStore';

import { styles } from './SignInScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SignInScreen() {
  const navigation = useNavigation<Nav>();

  const setSession = useAuthStore(s => s.setSession);
  const setNickname = useAuthStore(s => s.setNickname);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const disabled = useMemo(
    () => !email.trim() || password.length < 6,
    [email, password],
  );

  const onSubmit = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      await setSession(data.session ?? null);

      const nickname = await fetchMyNickname().catch(() => null);
      await setNickname(nickname);

      if (!nickname) {
        navigation.replace('NicknameSetup', { after: 'signin' });
        return;
      }

      navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
    } catch (e: any) {
      Alert.alert('로그인 실패', e?.message ?? '다시 시도해 주세요.');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>로그인</Text>

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
          <Text style={styles.primaryButtonText}>로그인</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.ghostButton}
          onPress={() => navigation.replace('SignUp')}
        >
          <Text style={styles.ghostButtonText}>회원가입으로 가기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
