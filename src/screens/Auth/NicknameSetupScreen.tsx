// 파일: src/screens/Auth/NicknameSetupScreen.tsx
// 목적:
// - 회원가입/로그인 직후 nickname이 없을 때 최초 1회 설정
// - profiles에 upsert → store.setNickname → Main으로 reset

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { styles } from './NicknameSetupScreen.styles';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { upsertMyNickname } from '../../services/supabase/profile';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'NicknameSetup'>;

export default function NicknameSetupScreen({ navigation }: Props) {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      nickname.trim().length >= 2 &&
      nickname.trim().length <= 10 &&
      !loading &&
      isLoggedIn
    );
  }, [nickname, loading, isLoggedIn]);

  const onSubmit = async () => {
    setErrorMsg(null);
    if (!canSubmit) return;

    try {
      setLoading(true);

      const next = nickname.trim();
      await upsertMyNickname(next);
      await useAuthStore.getState().setNickname(next);

      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e: any) {
      setErrorMsg(e?.message ?? '닉네임 저장에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  const goMainAnyway = () => {
    // 정책: nickname 없이도 Main은 가능 (하지만 greeting 개인화는 없음)
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>닉네임을 설정해 주세요</Text>
        <Text style={styles.subTitle}>
          로그인 후 홈에서 “{`{닉네임}`}님, 반가워요!”가 표시돼요.
        </Text>

        <Text style={styles.label}>닉네임</Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder="예: 누리야사랑해"
          autoCapitalize="none"
          style={styles.input}
          maxLength={10}
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
            <Text style={styles.primaryButtonText}>저장하고 시작하기</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.ghostButton}
          onPress={goMainAnyway}
        >
          <Text style={styles.ghostButtonText}>나중에 할게요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
