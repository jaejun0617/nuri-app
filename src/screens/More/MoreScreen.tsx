// 파일: src/screens/More/MoreScreen.tsx
// 목적:
// - 더보기 탭에서 로그인 상태/닉네임 표시
// - 로그아웃 버튼 제공
// - 로그아웃 시: Supabase signOut → store clear → Splash reset

import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../services/supabase/client';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MoreScreen() {
  // ---------------------------------------------------------
  // 1) navigation
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();

  // ---------------------------------------------------------
  // 2) stores
  // ---------------------------------------------------------
  const status = useAuthStore(s => s.status);
  const nicknameRaw = useAuthStore(s => s.profile.nickname);
  const signOutLocal = useAuthStore(s => s.signOutLocal);

  const clearPets = usePetStore(s => s.clear);

  // recordStore clear가 있으면 호출
  const recordStoreAny = useRecordStore() as any;
  const clearRecords =
    typeof recordStoreAny.clear === 'function' ? recordStoreAny.clear : null;

  // ---------------------------------------------------------
  // 3) derived
  // ---------------------------------------------------------
  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);
  const title = useMemo(() => {
    if (status === 'logged_in') return nickname ? `${nickname}님` : '로그인됨';
    return '게스트';
  }, [status, nickname]);

  const [loading, setLoading] = useState(false);

  // ---------------------------------------------------------
  // 4) actions
  // ---------------------------------------------------------
  const onPressLogout = async () => {
    if (loading) return;

    try {
      setLoading(true);

      // 1) 서버 세션 종료(토큰 제거)
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 2) 로컬 스토어 초기화
      await signOutLocal();
      clearPets();
      if (clearRecords) clearRecords();

      // 3) Splash로 reset (Splash에서 guest로 내려가도록)
      navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
    } catch (e: any) {
      Alert.alert('로그아웃 실패', e?.message ?? '다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const onPressLogin = () => {
    navigation.navigate('AuthLanding');
  };

  // ---------------------------------------------------------
  // 5) UI
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>더보기</Text>
        <Text style={styles.desc}>현재 상태: {title}</Text>

        {status === 'logged_in' ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.primary, loading ? styles.primaryDisabled : null]}
            onPress={onPressLogout}
            disabled={loading}
          >
            <Text style={styles.primaryText}>
              {loading ? '로그아웃 중...' : '로그아웃'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.primary}
            onPress={onPressLogin}
          >
            <Text style={styles.primaryText}>로그인하러 가기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F2EE', padding: 18 },
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
  title: { fontSize: 20, fontWeight: '900', color: '#1D1B19', marginBottom: 8 },
  desc: { fontSize: 13, color: '#6E6660', fontWeight: '700', marginBottom: 14 },

  primary: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#97A48D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.6 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
});
