// 파일: src/screens/More/MoreScreen.tsx
// 목적:
// - 더보기 탭에서 로그인 상태/닉네임 표시
// - 로그아웃 버튼 제공
// - 로그아웃 시: Supabase signOut → store clear → Splash reset

import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ConfirmDialog from '../../components/common/ConfirmDialog';
import PremiumNoticeModal from '../../components/common/PremiumNoticeModal';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getBrandedErrorMeta } from '../../services/app/errors';
import {
  performAccountDeletion,
  performLogout,
} from '../../services/auth/session';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
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
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const selectedPet = useMemo(
    () => pets.find(candidate => candidate.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );
  const title = useMemo(() => {
    if (status === 'logged_in') return nickname ? `${nickname}님` : '로그인됨';
    return '게스트';
  }, [status, nickname]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [accountStatusNotice, setAccountStatusNotice] = useState<
    'pending' | 'unknown' | null
  >(null);
  const accountStatusNoticeConfig = useMemo(() => {
    if (accountStatusNotice === 'unknown') {
      return {
        eyebrow: 'ACCOUNT STATUS',
        titleLines: ['상태를 조금 더 확인하고 있어요 🥺'],
        bodyLines: [
          '삭제가 잘 마무리되었는지 아직 확인 중이에요.',
          '조금 뒤에 다시 확인해 주시면 더 정확한 상태를 안내해 드릴게요.',
          '이후에도 상태가 같다면 운영 확인이 필요할 수 있어요.',
        ] as const,
        accessibilityTitleLines: ['상태를 조금 더 확인하고 있어요'],
        accessibilityBodyLines: [
          '삭제가 잘 마무리되었는지 아직 확인 중이에요.',
          '조금 뒤에 다시 확인해 주시면 더 정확한 상태를 안내해 드릴게요.',
          '이후에도 상태가 같다면 운영 확인이 필요할 수 있어요.',
        ] as const,
      };
    }

    if (accountStatusNotice === 'pending') {
      return {
        eyebrow: 'ACCOUNT STATUS',
        titleLines: ['안전하게 정리하고 있어요 🧹'],
        bodyLines: [
          '계정 삭제 요청은 정상적으로 접수되었어요.',
          '남아 있는 정보와 파일은 안전한 절차에 따라 순차적으로 정리되고 있어요.',
          '최종 반영까지는 조금 더 시간이 필요할 수 있어요.',
        ] as const,
        accessibilityTitleLines: ['안전하게 정리하고 있어요'],
        accessibilityBodyLines: [
          '계정 삭제 요청은 정상적으로 접수되었어요.',
          '남아 있는 정보와 파일은 안전한 절차에 따라 순차적으로 정리되고 있어요.',
          '최종 반영까지는 조금 더 시간이 필요할 수 있어요.',
        ] as const,
      };
    }

    return null;
  }, [accountStatusNotice]);

  // ---------------------------------------------------------
  // 4) actions
  // ---------------------------------------------------------
  const executeLogout = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const result = await performLogout(1200);

      navigation.reset({
        index: 0,
        routes: [{ name: 'SignIn', params: { notice: 'logout-success' } }],
      });

      if (result.timedOut) {
        showToast({
          tone: 'info',
          title: '세션 정리 진행 중',
          message:
            '이 기기에서는 바로 로그아웃되었고 서버 세션 정리는 잠시 이어질 수 있어요.',
        });
      }
    } catch (error: unknown) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        error,
        'logout',
      );
      Alert.alert(alertTitle, message);
      showToast({ tone: 'error', title: alertTitle, message });
    } finally {
      setLoading(false);
    }
  };
  const onPressLogout = () => {
    if (loading) return;
    setLogoutConfirmVisible(true);
  };

  const executeDeleteAccount = async () => {
    if (!isLoggedIn || deleting) return;
    try {
      setDeleting(true);
      const result = await performAccountDeletion();

      if (
        result.status === 'completed' ||
        result.status === 'completed_with_cleanup_pending'
      ) {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'SignIn',
              params: { notice: 'account-deletion-success' },
            },
          ],
        });
        return;
      }

      if (result.status === 'unknown_pending_confirmation') {
        setAccountStatusNotice('unknown');
        return;
      }

      setAccountStatusNotice('pending');
    } catch (error) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        error,
        'account-delete',
      );
      Alert.alert(alertTitle, message);
      showToast({
        tone: 'error',
        title: alertTitle,
        message,
        durationMs: 3200,
      });
    } finally {
      setDeleting(false);
    }
  };
  const onPressDeleteAccount = () => {
    if (!isLoggedIn || deleting) return;
    setDeleteConfirmVisible(true);
  };

  const onPressLogin = () => {
    navigation.navigate('SignIn');
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
            <View style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>계정 관리</Text>

              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.menuRow}
                onPress={onPressLogout}
                disabled={loading}
              >
                <View>
                  <Text style={styles.menuRowTitle}>
                    {loading ? '로그아웃 중...' : '로그아웃'}
                  </Text>
                  <Text style={styles.menuRowDesc}>
                    현재 기기 세션을 정리하고 게스트 상태로 전환해요.
                  </Text>
                </View>
                <Text style={styles.menuRowArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                style={[styles.menuRow, styles.menuRowDanger]}
                onPress={onPressDeleteAccount}
                disabled={deleting}
              >
                <View>
                  <Text style={styles.menuRowDangerTitle}>
                    {deleting ? '회원탈퇴 처리 중...' : '회원탈퇴'}
                  </Text>
                  <Text style={styles.menuRowDesc}>
                    개인 콘텐츠는 삭제되고, 일부 동의/신고 이력은 식별자를 제거한 뒤 보관될 수 있어요.
                  </Text>
                </View>
                <Text style={styles.menuRowDangerArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.primary,
                { backgroundColor: petTheme.primary },
                loading ? styles.primaryDisabled : null,
              ]}
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
            style={[styles.primary, { backgroundColor: petTheme.primary }]}
            onPress={onPressLogin}
          >
            <Text style={styles.primaryText}>로그인하러 가기</Text>
          </TouchableOpacity>
        )}
      </View>
      <ConfirmDialog
        visible={logoutConfirmVisible}
        title="로그아웃할까요?"
        message={'현재 기기에서만 로그아웃되며,\n다시 로그인하면 이어서 사용할 수 있어요.'}
        cancelLabel="계속 머무르기"
        confirmLabel={loading ? '로그아웃 중...' : '로그아웃'}
        tone="warning"
        accentColor={petTheme.primary}
        onCancel={() => setLogoutConfirmVisible(false)}
        onConfirm={() => {
          setLogoutConfirmVisible(false);
          executeLogout().catch(() => {});
        }}
      />
      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="회원탈퇴를 진행할까요?"
        message={
          '개인 콘텐츠는 삭제되고, 일부 운영 이력은 식별자를 제거한 뒤 보관될 수 있어요.\n파일 정리는 비동기로 이어질 수 있으며 이후에는 되돌릴 수 없어요.'
        }
        cancelLabel="계속 유지하기"
        confirmLabel={deleting ? '회원탈퇴 처리 중...' : '회원탈퇴'}
        tone="danger"
        accentColor={petTheme.primary}
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={() => {
          setDeleteConfirmVisible(false);
          executeDeleteAccount().catch(() => {});
        }}
      />
      <PremiumNoticeModal
        visible={accountStatusNoticeConfig !== null}
        eyebrow={accountStatusNoticeConfig?.eyebrow ?? 'ACCOUNT STATUS'}
        iconName="shield"
        titleLines={accountStatusNoticeConfig?.titleLines ?? ['']}
        bodyLines={accountStatusNoticeConfig?.bodyLines ?? ['']}
        accessibilityTitleLines={accountStatusNoticeConfig?.accessibilityTitleLines}
        accessibilityBodyLines={accountStatusNoticeConfig?.accessibilityBodyLines}
        accentColor={petTheme.primary}
        confirmAccessibilityLabel="계정 삭제 상태 안내 닫기"
        onClose={() => setAccountStatusNotice(null)}
      />
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
  title: { fontSize: 16, fontWeight: '900', color: '#1D1B19', marginBottom: 8 },
  desc: { fontSize: 13, color: '#6E6660', fontWeight: '700', marginBottom: 14 },
  menuSection: {
    marginBottom: 14,
    gap: 10,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#8C837C',
  },
  menuRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECE7E2',
    backgroundColor: '#FFFEFD',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuRowDanger: {
    borderColor: '#F1C7CC',
    backgroundColor: '#FFF8F8',
  },
  menuRowTitle: {
    color: '#1D1B19',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  menuRowDangerTitle: {
    color: '#B42318',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  menuRowDesc: {
    color: '#746C66',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    maxWidth: 240,
  },
  menuRowArrow: {
    color: '#9A928C',
    fontSize: 22,
    fontWeight: '700',
  },
  menuRowDangerArrow: {
    color: '#B42318',
    fontSize: 22,
    fontWeight: '700',
  },

  primary: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#97A48D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.6 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
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
