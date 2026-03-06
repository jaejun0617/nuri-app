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
import { getRetryableErrorMessage } from '../../services/app/errors';
import {
  performAccountDeletion,
  performLogout,
} from '../../services/auth/session';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../store/uiStore';
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
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  // ---------------------------------------------------------
  // 3) derived
  // ---------------------------------------------------------
  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);
  const title = useMemo(() => {
    if (status === 'logged_in') return nickname ? `${nickname}님` : '로그인됨';
    return '게스트';
  }, [status, nickname]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ---------------------------------------------------------
  // 4) actions
  // ---------------------------------------------------------
  const onPressLogout = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const result = await performLogout(1200);

      navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
      if (result.error && __DEV__) {
        console.warn('[logout] signOutBestEffort error:', result.error.message);
      }
      showToast({
        tone: 'success',
        title: '로그아웃 완료',
        message: result.timedOut
          ? '기기에서는 바로 로그아웃됐어요. 서버 세션 정리는 잠시 뒤 이어집니다.'
          : '안전하게 로그아웃했어요.',
      });
    } catch (e: any) {
      const message = getRetryableErrorMessage(e);
      Alert.alert('로그아웃 실패', message);
      showToast({ tone: 'error', title: '로그아웃 실패', message });
    } finally {
      setLoading(false);
    }
  };

  const onPressDeleteAccount = () => {
    if (!isLoggedIn || deleting) return;

    Alert.alert(
      '계정을 삭제할까요?',
      '반려동물, 기록, 일정, 동의 이력이 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await performAccountDeletion();
              navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
              showToast({
                tone: 'warning',
                title: '계정 삭제 완료',
                message: '계정과 연결된 로컬 상태를 모두 정리했어요.',
                durationMs: 3000,
              });
            } catch (error) {
              const message = getRetryableErrorMessage(error);
              Alert.alert('계정 삭제 실패', message);
              showToast({
                tone: 'error',
                title: '계정 삭제 실패',
                message,
                durationMs: 3200,
              });
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const onPressLogin = () => {
    navigation.navigate('SignIn');
  };

  const onPressDevTest = () => {
    navigation.navigate('DevTest');
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
          <>
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

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.dangerButton, deleting ? styles.primaryDisabled : null]}
              onPress={onPressDeleteAccount}
              disabled={deleting}
            >
              <Text style={styles.dangerButtonText}>
                {deleting ? '계정 삭제 중...' : '계정 삭제'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.primary}
            onPress={onPressLogin}
          >
            <Text style={styles.primaryText}>로그인하러 가기</Text>
          </TouchableOpacity>
        )}

        {__DEV__ ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.devButton}
            onPress={onPressDevTest}
          >
            <Text style={styles.devButtonText}>DevTest 열기</Text>
          </TouchableOpacity>
        ) : null}
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
  devButton: {
    marginTop: 10,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6D6AF8',
    backgroundColor: '#F7F6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButtonText: { color: '#6D6AF8', fontSize: 14, fontWeight: '800' },
  dangerButton: {
    marginTop: 10,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F5C2C7',
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: { color: '#B42318', fontSize: 14, fontWeight: '900' },
});
