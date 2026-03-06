// 파일: src/screens/More/MoreDrawerContent.tsx
// 목적:
// - MoreDrawer 내부 컨텐츠
// - 로그인 상태/닉네임 표시
// - 로그아웃 버튼
// - 닫기(×)
// - ✅ SafeArea(top) 적용: StatusBar 아래로 자연스럽게 내려오게

import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  // ---------------------------------------------------------
  // 3) derived
  // ---------------------------------------------------------
  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);
  const headerTitle = useMemo(() => {
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

      onRequestClose();
      navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
      if (result.error && __DEV__) {
        console.warn('[logout] signOutBestEffort error:', result.error.message);
      }
      showToast({
        tone: 'success',
        title: '로그아웃 완료',
        message: result.timedOut
          ? '기기에서는 바로 로그아웃됐어요. 서버 세션 정리는 이어서 진행됩니다.'
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
              onRequestClose();
              navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
              showToast({
                tone: 'warning',
                title: '계정 삭제 완료',
                message: '계정과 연결된 로컬 상태를 정리했어요.',
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
    onRequestClose();
    navigation.navigate('SignIn');
  };

  const onPressDevTest = () => {
    onRequestClose();
    navigation.navigate('DevTest');
  };

  // ---------------------------------------------------------
  // 5) render
  // ---------------------------------------------------------
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

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

  devButton: {
    marginTop: 10,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6D6AF8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F6FF',
  },
  devButtonText: {
    color: '#6D6AF8',
    fontSize: 14,
    fontWeight: '800',
  },
  dangerButton: {
    marginTop: 10,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F5C2C7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
  },
  dangerButtonText: {
    color: '#B42318',
    fontSize: 14,
    fontWeight: '900',
  },
});
