// 파일: src/screens/More/MoreDrawerContent.tsx
// 목적:
// - MoreDrawer 내부 컨텐츠
// - 로그인 상태/닉네임 표시
// - 로그아웃 버튼
// - 닫기(×)

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

type Props = {
  onRequestClose: () => void;
};

export default function MoreDrawerContent({ onRequestClose }: Props) {
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

  const recordAny = useRecordStore() as any;
  const clearRecords =
    typeof recordAny.clear === 'function' ? recordAny.clear : null;

  // ---------------------------------------------------------
  // 3) derived
  // ---------------------------------------------------------
  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);
  const headerTitle = useMemo(() => {
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

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      await signOutLocal();
      clearPets();
      if (clearRecords) clearRecords();

      onRequestClose();

      navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
    } catch (e: any) {
      Alert.alert('로그아웃 실패', e?.message ?? '다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const onPressLogin = () => {
    onRequestClose();
    navigation.navigate('AuthLanding');
  };

  // ---------------------------------------------------------
  // 5) render
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      <View style={styles.topRow}>
        <Text style={styles.title}>더보기</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onRequestClose}
          style={styles.closeBtn}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.stateText}>현재 상태</Text>
        <Text style={styles.stateValue}>{headerTitle}</Text>

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
  screen: { flex: 1, padding: 16, backgroundColor: '#FFFFFF' },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '900', color: '#000000' },

  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  closeText: { fontSize: 16, fontWeight: '900', color: '#000000' },

  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },

  stateText: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '800',
    marginBottom: 6,
  },
  stateValue: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '900',
    marginBottom: 14,
  },

  primary: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.6 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
});
