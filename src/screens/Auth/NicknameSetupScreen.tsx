// 파일: src/screens/Auth/NicknameSetupScreen.tsx
// 목적:
// - nickname 1회 설정(또는 수정)
// - 완료 시 profiles에 upsert 후 Main으로 reset

import React, { useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { upsertMyNickname } from '../../services/supabase/profile';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'NicknameSetup'>;

export default function NicknameSetupScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();

  const current = useAuthStore(s => s.profile.nickname) ?? '';
  const setNickname = useAuthStore(s => s.setNickname);

  const [nickname, setLocalNickname] = useState(current);

  const trimmed = useMemo(() => nickname.trim(), [nickname]);
  const disabled = useMemo(() => trimmed.length < 2, [trimmed]);

  const onSubmit = async () => {
    try {
      await upsertMyNickname(trimmed);
      await setNickname(trimmed);

      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e: any) {
      Alert.alert('닉네임 저장 실패', e?.message ?? '다시 시도해 주세요.');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>닉네임 설정</Text>
        <Text style={styles.subTitle}>
          홈에서 "{'{닉네임}님, 반가워요!'}"로 표시돼요.
        </Text>

        <Text style={styles.label}>닉네임</Text>
        <TextInput
          value={nickname}
          onChangeText={setLocalNickname}
          placeholder="2자 이상"
          placeholderTextColor="#B8B0A8"
          style={styles.input}
        />

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primary, disabled ? styles.primaryDisabled : null]}
          disabled={disabled}
          onPress={onSubmit}
        >
          <Text style={styles.primaryText}>완료</Text>
        </TouchableOpacity>

        {route.params?.after ? (
          <Text style={styles.hint}>
            {route.params.after === 'signup'
              ? '회원가입 완료 후 첫 설정 단계입니다.'
              : '로그인 후 닉네임이 없어 설정이 필요합니다.'}
          </Text>
        ) : null}
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
  title: { fontSize: 20, fontWeight: '900', color: '#1D1B19', marginBottom: 6 },
  subTitle: {
    fontSize: 12,
    color: '#6E6660',
    fontWeight: '600',
    lineHeight: 17,
    marginBottom: 14,
  },
  label: { fontSize: 12, color: '#6E6660', fontWeight: '800', marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3EEE8',
    paddingHorizontal: 14,
    color: '#1D1B19',
    fontWeight: '800',
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
  hint: { marginTop: 10, fontSize: 12, color: '#7A726C', fontWeight: '700' },
});
