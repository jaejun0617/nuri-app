// 파일: src/screens/Auth/NicknameSetupScreen.tsx
// 목적:
// - 가입/로그인 후 닉네임 1회 설정
// - 완료 시 AppTabs로 reset

import React, { useMemo, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { saveMyNickname } from '../../services/supabase/profile';
import { useAuthStore } from '../../store/authStore';

import { styles } from './NicknameSetupScreen.styles';

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
      await saveMyNickname(trimmed);
      await setNickname(trimmed);

      navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
    } catch (e: any) {
      Alert.alert('닉네임 저장 실패', e?.message ?? '다시 시도해 주세요.');
    }
  };

  const hintText = useMemo(() => {
    if (!route.params?.after) return null;
    return route.params.after === 'signup'
      ? '회원가입 완료 후 첫 설정 단계입니다.'
      : '로그인 후 닉네임이 없어 설정이 필요합니다.';
  }, [route.params?.after]);

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
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={disabled ? undefined : onSubmit}
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
          <Text style={styles.primaryButtonText}>완료</Text>
        </TouchableOpacity>

        {hintText ? <Text style={styles.hint}>{hintText}</Text> : null}
      </View>
    </View>
  );
}
