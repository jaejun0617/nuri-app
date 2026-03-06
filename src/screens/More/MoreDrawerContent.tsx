// 파일: src/screens/More/MoreDrawerContent.tsx
// 역할:
// - 전체 화면형 더보기 드로어를 인사형 헤더 + 섹션 카드 구조로 렌더링
// - 반려동물/기록/정보/계정 설정 메뉴를 한 화면에서 빠르게 탐색할 수 있게 제공
// - 닉네임 수정, 비밀번호 변경 모달을 더보기 맥락 안에서 바로 처리

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import AppNavigationToolbar from '../../components/navigation/AppNavigationToolbar';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  canChangeNickname,
  getNextNicknameChangeDate,
  getNicknameChangedAt,
  saveNicknameChangedAt,
} from '../../services/local/accountPreferences';
import {
  getBrandedErrorMeta,
} from '../../services/app/errors';
import {
  performAccountDeletion,
  performLogout,
} from '../../services/auth/session';
import {
  changeMyPassword,
  isValidPasswordFormat,
} from '../../services/supabase/account';
import {
  checkNicknameAvailabilityDetailed,
  saveMyNickname,
} from '../../services/supabase/profile';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { showToast } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  onRequestClose: () => void;
};

type MenuItemSpec = {
  key: string;
  label: string;
  icon: string;
  iconTone?: 'accent' | 'muted' | 'soft';
  onPress: () => void;
  badge?: 'dot' | 'soon' | null;
};

type MenuCardProps = {
  title: string;
  items: MenuItemSpec[];
  themeColors: Record<
    'accent' | 'muted' | 'soft',
    { box: string; icon: string }
  >;
};

type MenuRowProps = Omit<MenuItemSpec, 'key'>;

type PasswordModalProps = {
  visible: boolean;
  currentPassword: string;
  nextPassword: string;
  confirmPassword: string;
  currentPasswordVisible: boolean;
  nextPasswordVisible: boolean;
  confirmPasswordVisible: boolean;
  saving: boolean;
  onClose: () => void;
  onChangeCurrentPassword: (value: string) => void;
  onChangeNextPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onToggleCurrentPasswordVisible: () => void;
  onToggleNextPasswordVisible: () => void;
  onToggleConfirmPasswordVisible: () => void;
  onSubmit: () => void;
};

type ProfileEditModalProps = {
  visible: boolean;
  nickname: string;
  helperText: string;
  helperTone: 'info' | 'error' | 'success';
  saving: boolean;
  onClose: () => void;
  onChangeNickname: (value: string) => void;
  onSubmit: () => void;
};

function formatDateLabel(value: Date | null): string {
  if (!value) return '지금은 변경할 수 있어요.';

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}.${month}.${day} 이후에 다시 변경할 수 있어요.`;
}

const MenuRow = memo(function MenuRow({
  label,
  icon,
  iconTone = 'accent',
  onPress,
  badge = null,
  themeColors,
}: MenuRowProps & {
  themeColors: Record<
    'accent' | 'muted' | 'soft',
    { box: string; icon: string }
  >;
}) {
  const tone = themeColors[iconTone];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.menuRow}
      onPress={onPress}
    >
      <View style={styles.menuLeft}>
        <View style={[styles.menuIconBox, { backgroundColor: tone.box }]}>
          <Feather name={icon as never} size={17} color={tone.icon} />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>

      <View style={styles.menuRight}>
        {badge === 'dot' ? <View style={styles.menuDot} /> : null}
        {badge === 'soon' ? <Text style={styles.badgeSoon}>soon</Text> : null}
        <Feather name="chevron-right" size={18} color="#C2CBD8" />
      </View>
    </TouchableOpacity>
  );
});

const MenuCard = memo(function MenuCard({
  title,
  items,
  themeColors,
}: MenuCardProps) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.menuCard}>
        {items.map(({ key, ...item }, index) => (
          <View key={key}>
            {index > 0 ? <View style={styles.menuDivider} /> : null}
            <MenuRow {...item} themeColors={themeColors} />
          </View>
        ))}
      </View>
    </View>
  );
});

const PasswordField = memo(function PasswordField({
  label,
  value,
  placeholder,
  secureTextEntry,
  onChangeText,
  onToggleSecure,
  helper,
}: {
  label: string;
  value: string;
  placeholder: string;
  secureTextEntry: boolean;
  onChangeText: (value: string) => void;
  onToggleSecure: () => void;
  helper?: string | null;
}) {
  return (
    <View style={styles.modalField}>
      <Text style={styles.modalLabel}>{label}</Text>
      <View style={styles.inputShell}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.inputText}
          placeholder={placeholder}
          placeholderTextColor="#B7C0D0"
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.eyeButton}
          onPress={onToggleSecure}
        >
          <Feather
            name={secureTextEntry ? 'eye' : 'eye-off'}
            size={18}
            color="#A5AFC0"
          />
        </TouchableOpacity>
      </View>
      {helper ? <Text style={styles.modalHelper}>{helper}</Text> : null}
    </View>
  );
});

const PasswordChangeModal = memo(function PasswordChangeModal({
  visible,
  currentPassword,
  nextPassword,
  confirmPassword,
  currentPasswordVisible,
  nextPasswordVisible,
  confirmPasswordVisible,
  saving,
  onClose,
  onChangeCurrentPassword,
  onChangeNextPassword,
  onChangeConfirmPassword,
  onToggleCurrentPasswordVisible,
  onToggleNextPasswordVisible,
  onToggleConfirmPasswordVisible,
  onSubmit,
}: PasswordModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View style={styles.sheetCard}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>비밀번호 변경</Text>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.sheetClose}
              onPress={onClose}
            >
              <Feather name="x" size={20} color="#A6B0C1" />
            </TouchableOpacity>
          </View>

          <PasswordField
            label="현재 비밀번호"
            value={currentPassword}
            placeholder="현재 비밀번호를 입력해 주세요"
            secureTextEntry={!currentPasswordVisible}
            onChangeText={onChangeCurrentPassword}
            onToggleSecure={onToggleCurrentPasswordVisible}
          />

          <PasswordField
            label="새 비밀번호"
            value={nextPassword}
            placeholder="새 비밀번호를 입력해 주세요"
            secureTextEntry={!nextPasswordVisible}
            onChangeText={onChangeNextPassword}
            onToggleSecure={onToggleNextPasswordVisible}
            helper="영문, 숫자, 특수문자 포함 8자 이상 입력해주세요"
          />

          <PasswordField
            label="새 비밀번호 확인"
            value={confirmPassword}
            placeholder="새 비밀번호를 한 번 더 입력해 주세요"
            secureTextEntry={!confirmPasswordVisible}
            onChangeText={onChangeConfirmPassword}
            onToggleSecure={onToggleConfirmPasswordVisible}
          />

          <TouchableOpacity
            activeOpacity={0.92}
            style={[
              styles.primaryButton,
              saving ? styles.disabledButton : null,
            ]}
            onPress={onSubmit}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? '변경 중...' : '변경하기'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const PasswordChangeSuccessModal = memo(function PasswordChangeSuccessModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.successBackdrop}>
        <View style={styles.successCard}>
          <View style={styles.successHalo}>
            <View style={styles.successIcon}>
              <Feather name="check" size={26} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.successTitle}>비밀번호 변경 완료</Text>
          <Text style={styles.successBody}>
            비밀번호가 성공적으로{'\n'}변경되었습니다.
          </Text>
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.primaryButton}
            onPress={onClose}
          >
            <Text style={styles.primaryButtonText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const ProfileEditModal = memo(function ProfileEditModal({
  visible,
  nickname,
  helperText,
  helperTone,
  saving,
  onClose,
  onChangeNickname,
  onSubmit,
}: ProfileEditModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View style={styles.sheetCard}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>닉네임 수정</Text>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.sheetClose}
              onPress={onClose}
            >
              <Feather name="x" size={20} color="#A6B0C1" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalField}>
            <Text style={styles.modalLabel}>닉네임</Text>
            <TextInput
              value={nickname}
              onChangeText={onChangeNickname}
              style={styles.nicknameInput}
              placeholder="닉네임을 입력해 주세요"
              placeholderTextColor="#B7C0D0"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={8}
            />
            <Text
              style={[
                styles.profileHelper,
                helperTone === 'error'
                  ? styles.profileHelperError
                  : helperTone === 'success'
                  ? styles.profileHelperSuccess
                  : null,
              ]}
            >
              {helperText}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.92}
            style={[
              styles.primaryButton,
              saving ? styles.disabledButton : null,
            ]}
            onPress={onSubmit}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? '저장 중...' : '저장하기'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

export default function MoreDrawerContent({ onRequestClose }: Props) {
  const navigation = useNavigation<Nav>();
  const nicknameRaw = useAuthStore(s => s.profile.nickname);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const session = useAuthStore(s => s.session);
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordDoneVisible, setPasswordDoneVisible] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [draftNickname, setDraftNickname] = useState('');
  const [nicknameChangedAt, setNicknameChangedAt] = useState<string | null>(
    null,
  );
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [nextPasswordVisible, setNextPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);
  const selectedPet = useMemo(
    () => pets.find(p => p.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );
  const menuThemeColors = useMemo(
    () => ({
      accent: {
        box: petTheme.tint,
        icon: petTheme.primary,
      },
      muted: {
        box: petTheme.soft,
        icon: petTheme.deep,
      },
      soft: {
        box: petTheme.glow,
        icon: petTheme.primary,
      },
    }),
    [petTheme],
  );
  const avatarUri = useMemo(
    () => selectedPet?.avatarUrl?.trim() || null,
    [selectedPet?.avatarUrl],
  );
  const greetingName = useMemo(
    () => (nickname ? `${nickname}님!` : '반가워요!'),
    [nickname],
  );
  const avatarFallback = useMemo(
    () => selectedPet?.name?.trim()?.charAt(0) || 'N',
    [selectedPet?.name],
  );
  const canEditNicknameNow = useMemo(
    () => canChangeNickname(nicknameChangedAt),
    [nicknameChangedAt],
  );
  const nextNicknameDate = useMemo(
    () => getNextNicknameChangeDate(nicknameChangedAt),
    [nicknameChangedAt],
  );

  const profileHelper = useMemo(() => {
    if (!isLoggedIn) {
      return {
        text: '로그인 후 내 정보를 수정할 수 있어요.',
        tone: 'info' as const,
      };
    }

    if (!draftNickname.trim()) {
      return {
        text: canEditNicknameNow
          ? '닉네임은 월 1회 변경할 수 있어요.'
          : formatDateLabel(nextNicknameDate),
        tone: 'info' as const,
      };
    }

    if (!canEditNicknameNow) {
      return {
        text: `닉네임은 월 1회만 변경할 수 있어요. ${formatDateLabel(
          nextNicknameDate,
        )}`,
        tone: 'error' as const,
      };
    }

    if (draftNickname.trim().length < 2) {
      return {
        text: '닉네임은 2자 이상 입력해 주세요.',
        tone: 'error' as const,
      };
    }

    if (draftNickname.trim().length > 8) {
      return {
        text: '닉네임은 8자 이내로 입력해 주세요.',
        tone: 'error' as const,
      };
    }

    return {
      text: '저장하면 홈과 더보기의 이름이 함께 바뀌어요.',
      tone: 'success' as const,
    };
  }, [canEditNicknameNow, draftNickname, isLoggedIn, nextNicknameDate]);

  useEffect(() => {
    getNicknameChangedAt()
      .then(setNicknameChangedAt)
      .catch(() => setNicknameChangedAt(null));
  }, []);

  const closeAndNavigate = useCallback(
    (navigate: () => void) => {
      onRequestClose();
      navigate();
    },
    [onRequestClose],
  );

  const showPreparingToast = useCallback((label: string) => {
    showToast({
      tone: 'info',
      title: '준비 중',
      message: `${label} 메뉴는 다음 업데이트에서 열릴 예정이에요.`,
    });
  }, []);

  const openPetProfile = useCallback(() => {
    if (selectedPet?.id) {
      closeAndNavigate(() =>
        navigation.navigate('PetProfileEdit', { petId: selectedPet.id }),
      );
      return;
    }

    closeAndNavigate(() =>
      navigation.navigate('PetCreate', { from: 'header_plus' }),
    );
  }, [closeAndNavigate, navigation, selectedPet?.id]);

  const openScheduleList = useCallback(() => {
    closeAndNavigate(() =>
      navigation.navigate('ScheduleList', {
        petId: selectedPet?.id ?? undefined,
      }),
    );
  }, [closeAndNavigate, navigation, selectedPet?.id]);

  const openTimeline = useCallback(() => {
    closeAndNavigate(() =>
      navigation.navigate('AppTabs', {
        screen: 'TimelineTab',
        params: {
          screen: 'TimelineMain',
          params: { mainCategory: 'all' },
        },
      }),
    );
  }, [closeAndNavigate, navigation]);

  const openProfileEditModal = useCallback(() => {
    setDraftNickname(nickname ?? '');
    setProfileModalVisible(true);
  }, [nickname]);

  const closeProfileEditModal = useCallback(() => {
    setProfileModalVisible(false);
    setDraftNickname(nickname ?? '');
  }, [nickname]);

  const openPasswordModal = useCallback(() => {
    setPasswordModalVisible(true);
  }, []);

  const closePasswordModal = useCallback(() => {
    if (passwordSaving) return;
    setPasswordModalVisible(false);
    setCurrentPassword('');
    setNextPassword('');
    setConfirmPassword('');
    setCurrentPasswordVisible(false);
    setNextPasswordVisible(false);
    setConfirmPasswordVisible(false);
  }, [passwordSaving]);

  const onSubmitProfile = useCallback(async () => {
    if (profileSaving) return;

    const trimmed = draftNickname.trim();
    if (!trimmed) {
      showToast({
        tone: 'error',
        title: '닉네임 입력 필요',
        message: '닉네임을 입력해 주세요.',
      });
      return;
    }

    if (!canEditNicknameNow) {
      showToast({
        tone: 'warning',
        title: '닉네임 변경 제한',
        message: `닉네임은 월 1회만 변경할 수 있어요. ${formatDateLabel(
          nextNicknameDate,
        )}`,
      });
      return;
    }

    if (trimmed === (nickname ?? '')) {
      setProfileModalVisible(false);
      return;
    }

    try {
      setProfileSaving(true);

      const availability = await checkNicknameAvailabilityDetailed(trimmed);
      if (!availability.available) {
        const codeMessage =
          availability.code === 'taken'
            ? '이미 사용중인 닉네임 입니다.'
            : availability.code === 'too_short'
            ? '닉네임은 2자 이상 입력해주세요'
            : availability.code === 'too_long'
            ? '닉네임은 8자 이내로 입력해주세요'
            : availability.code === 'blocked'
            ? '사용할 수 없는 닉네임입니다'
            : '닉네임을 다시 확인해 주세요.';
        throw new Error(codeMessage);
      }

      await saveMyNickname(trimmed);
      await useAuthStore.getState().setNickname(trimmed);

      const nowIso = new Date().toISOString();
      await saveNicknameChangedAt(nowIso);
      setNicknameChangedAt(nowIso);
      setProfileModalVisible(false);
      showToast({
        tone: 'success',
        title: '닉네임 수정 완료',
        message: '닉네임이 새로운 이름으로 저장됐어요.',
      });
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'nickname');
      showToast({
        tone: 'error',
        title,
        message,
        durationMs: 3200,
      });
    } finally {
      setProfileSaving(false);
    }
  }, [
    canEditNicknameNow,
    draftNickname,
    nextNicknameDate,
    nickname,
    profileSaving,
  ]);

  const onSubmitPasswordChange = useCallback(async () => {
    if (passwordSaving) return;

    const trimmedCurrent = currentPassword.trim();
    const trimmedNext = nextPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedCurrent) {
      showToast({
        tone: 'error',
        title: '현재 비밀번호 필요',
        message: '현재 비밀번호를 입력해 주세요.',
      });
      return;
    }

    if (!isValidPasswordFormat(trimmedNext)) {
      showToast({
        tone: 'error',
        title: '비밀번호 형식 확인',
        message: '영문, 숫자, 특수문자를 포함한 8자 이상으로 입력해 주세요.',
      });
      return;
    }

    if (trimmedNext !== trimmedConfirm) {
      showToast({
        tone: 'error',
        title: '비밀번호 확인 필요',
        message: '새 비밀번호와 확인 값이 일치하지 않습니다.',
      });
      return;
    }

    try {
      setPasswordSaving(true);
      await changeMyPassword({
        currentPassword: trimmedCurrent,
        nextPassword: trimmedNext,
      });
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      setPasswordDoneVisible(true);
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'password-change');
      showToast({
        tone: 'error',
        title,
        message,
        durationMs: 3200,
      });
    } finally {
      setPasswordSaving(false);
    }
  }, [confirmPassword, currentPassword, nextPassword, passwordSaving]);

  const onPressLogout = useCallback(async () => {
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
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'logout');
      Alert.alert(title, message);
      showToast({ tone: 'error', title, message });
    } finally {
      setLoading(false);
    }
  }, [loading, navigation, onRequestClose]);

  const onPressDeleteAccount = useCallback(() => {
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
              const { title, message } = getBrandedErrorMeta(
                error,
                'account-delete',
              );
              Alert.alert(title, message);
              showToast({
                tone: 'error',
                title,
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
  }, [deleting, isLoggedIn, navigation, onRequestClose]);

  const onPressLogin = useCallback(() => {
    closeAndNavigate(() => navigation.navigate('SignIn'));
  }, [closeAndNavigate, navigation]);

  const onPressDevTest = useCallback(() => {
    closeAndNavigate(() => navigation.navigate('DevTest'));
  }, [closeAndNavigate, navigation]);

  const openIndoorActivities = useCallback(() => {
    closeAndNavigate(() => navigation.navigate('IndoorActivityRecommendations'));
  }, [closeAndNavigate, navigation]);

  const petItems = useMemo<MenuItemSpec[]>(
    () => [
      {
        key: 'pet-manage',
        label: '아이들 프로필 관리',
        icon: 'user',
        iconTone: 'accent',
        onPress: openPetProfile,
      },
      {
        key: 'important-schedule',
        label: '중요 일정 & 기념일',
        icon: 'calendar',
        iconTone: 'accent',
        onPress: openScheduleList,
      },
    ],
    [openPetProfile, openScheduleList],
  );

  const activityItems = useMemo<MenuItemSpec[]>(
    () => [
      {
        key: 'memory-diary',
        label: '추억 다이어리',
        icon: 'book-open',
        iconTone: 'accent',
        onPress: openTimeline,
      },
      {
        key: 'health-report',
        label: '건강 기록 리포트',
        icon: 'clipboard',
        iconTone: 'accent',
        onPress: () => showPreparingToast('건강 기록 리포트'),
        badge: 'soon',
      },
      {
        key: 'indoor-activities',
        label: '실내 놀이 추천',
        icon: 'sun',
        iconTone: 'accent',
        onPress: openIndoorActivities,
      },
      {
        key: 'walk-route',
        label: '산책 코스 보관함',
        icon: 'map',
        iconTone: 'accent',
        onPress: () => showPreparingToast('산책 코스 보관함'),
        badge: 'soon',
      },
    ],
    [openIndoorActivities, openTimeline, showPreparingToast],
  );

  const infoItems = useMemo<MenuItemSpec[]>(
    () => [
      {
        key: 'community',
        label: '커뮤니티',
        icon: 'message-circle',
        iconTone: 'muted',
        onPress: () => showPreparingToast('커뮤니티'),
        badge: 'soon',
      },
      {
        key: 'tips',
        label: '집사 꿀팁 가이드',
        icon: 'map-pin',
        iconTone: 'muted',
        onPress: () => showPreparingToast('집사 꿀팁 가이드'),
        badge: 'soon',
      },
    ],
    [showPreparingToast],
  );

  const serviceItems = useMemo<MenuItemSpec[]>(() => {
    const items: MenuItemSpec[] = [
      {
        key: 'notification',
        label: '알림 설정',
        icon: 'bell',
        iconTone: 'accent',
        onPress: () => showPreparingToast('알림 설정'),
        badge: 'soon',
      },
      {
        key: 'security',
        label: '보안 및 개인정보',
        icon: 'shield',
        iconTone: 'accent',
        onPress: openPasswordModal,
      },
      {
        key: 'theme',
        label: '테마 설정',
        icon: 'moon',
        iconTone: 'accent',
        onPress: openPetProfile,
      },
    ];

    if (isLoggedIn) {
      items.unshift({
        key: 'my-profile',
        label: '닉네임 수정',
        icon: 'edit-3',
        iconTone: 'accent',
        onPress: openProfileEditModal,
      });
    }

    return items;
  }, [
    isLoggedIn,
    openPasswordModal,
    openPetProfile,
    openProfileEditModal,
    showPreparingToast,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>안녕하세요, {greetingName}</Text>
            <Text style={styles.headerSubtitle}>
              반가운 오늘, 아이들은 어땠나요?
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.headerAvatarButton}
            onPress={isLoggedIn ? openProfileEditModal : onPressLogin}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.headerAvatarImage}
              />
            ) : (
              <View
                style={[styles.headerAvatarImage, styles.headerAvatarFallback]}
              >
                <Text style={styles.headerAvatarFallbackText}>
                  {avatarFallback}
                </Text>
              </View>
            )}
            <View style={styles.headerAvatarBadge}>
              <Feather name="edit-3" size={10} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <MenuCard
            title="나의 반려동물"
            items={petItems}
            themeColors={menuThemeColors}
          />
          <MenuCard
            title="활동 및 기록"
            items={activityItems}
            themeColors={menuThemeColors}
          />
          <MenuCard
            title="소통 및 정보"
            items={infoItems}
            themeColors={menuThemeColors}
          />
          <MenuCard
            title="앱 서비스 설정"
            items={serviceItems}
            themeColors={menuThemeColors}
          />

          {session?.user?.email ? (
            <View style={styles.accountMeta}>
              <Text style={styles.accountMetaEmail}>{session.user.email}</Text>
              <Text style={styles.accountMetaText}>
                닉네임은 월 1회, 비밀번호는 필요할 때 바로 변경할 수 있어요.
              </Text>
            </View>
          ) : null}

          {isLoggedIn ? (
            <View style={styles.bottomActions}>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.bottomTextButton}
                onPress={onPressLogout}
                disabled={loading}
              >
                <Text style={styles.bottomTextButtonLabel}>
                  {loading ? '로그아웃 중...' : '로그아웃'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.bottomDangerButton}
                onPress={onPressDeleteAccount}
                disabled={deleting}
              >
                <Text style={styles.bottomDangerButtonLabel}>
                  {deleting ? '회원탈퇴 처리 중...' : '회원탈퇴'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.loginButton}
              onPress={onPressLogin}
            >
              <Text style={styles.loginButtonLabel}>로그인하러 가기</Text>
            </TouchableOpacity>
          )}

          {__DEV__ ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.devButton}
              onPress={onPressDevTest}
            >
              <Text style={styles.devButtonLabel}>DevTest 열기</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        <AppNavigationToolbar activeKey="more" onBeforeNavigate={onRequestClose} />
      </View>

      <ProfileEditModal
        visible={profileModalVisible}
        nickname={draftNickname}
        helperText={profileHelper.text}
        helperTone={profileHelper.tone}
        saving={profileSaving}
        onClose={closeProfileEditModal}
        onChangeNickname={setDraftNickname}
        onSubmit={onSubmitProfile}
      />

      <PasswordChangeModal
        visible={passwordModalVisible}
        currentPassword={currentPassword}
        nextPassword={nextPassword}
        confirmPassword={confirmPassword}
        currentPasswordVisible={currentPasswordVisible}
        nextPasswordVisible={nextPasswordVisible}
        confirmPasswordVisible={confirmPasswordVisible}
        saving={passwordSaving}
        onClose={closePasswordModal}
        onChangeCurrentPassword={setCurrentPassword}
        onChangeNextPassword={setNextPassword}
        onChangeConfirmPassword={setConfirmPassword}
        onToggleCurrentPasswordVisible={() =>
          setCurrentPasswordVisible(prev => !prev)
        }
        onToggleNextPasswordVisible={() =>
          setNextPasswordVisible(prev => !prev)
        }
        onToggleConfirmPasswordVisible={() =>
          setConfirmPasswordVisible(prev => !prev)
        }
        onSubmit={onSubmitPasswordChange}
      />

      <PasswordChangeSuccessModal
        visible={passwordDoneVisible}
        onClose={() => setPasswordDoneVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F8FB',
  },
  screen: {
    flex: 1,
    backgroundColor: '#F7F8FB',
  },
  headerRow: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerTextWrap: {
    flex: 1,
    gap: 5,
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 32,
    color: '#182133',
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#A0A8B8',
    fontWeight: '500',
  },
  headerAvatarButton: {
    width: 88,
    height: 88,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerAvatarImage: {
    width: 88,
    height: 88,
    borderRadius: 33,
    backgroundColor: '#F1E1D0',
  },
  headerAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarFallbackText: {
    fontSize: 20,
    color: '#8B5E3C',
    fontWeight: '700',
  },
  headerAvatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8C8AA',
    borderWidth: 2,
    borderColor: '#F7F8FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 118,
    gap: 18,
  },
  sectionWrap: {
    gap: 10,
  },
  sectionTitle: {
    paddingHorizontal: 6,
    fontSize: 12,
    lineHeight: 16,
    color: '#A9B2C1',
    fontWeight: '600',
  },
  menuCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDF0F5',
    overflow: 'hidden',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F2F4F8',
    marginLeft: 64,
  },
  menuRow: {
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: '#2C3445',
    fontWeight: '600',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 14,
  },
  menuDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F29A98',
  },
  badgeSoon: {
    fontSize: 11,
    color: '#C3A4FF',
    fontWeight: '600',
  },
  accountMeta: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  accountMetaEmail: {
    fontSize: 12,
    color: '#98A1B2',
    fontWeight: '500',
  },
  accountMetaText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#B0B8C6',
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomActions: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  bottomTextButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTextButtonLabel: {
    fontSize: 13,
    color: '#A0A8B8',
    fontWeight: '600',
  },
  bottomDangerButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDangerButtonLabel: {
    fontSize: 12,
    color: '#C3AEB0',
    fontWeight: '500',
  },
  loginButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  devButton: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2DBFF',
    backgroundColor: '#F7F5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButtonLabel: {
    fontSize: 14,
    color: '#7A57E8',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.34)',
    justifyContent: 'flex-end',
  },
  modalScrim: {
    flex: 1,
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 26,
    gap: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 17,
    color: '#202633',
    fontWeight: '700',
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalField: {
    gap: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: '#263041',
    fontWeight: '700',
  },
  inputShell: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#F7F9FC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 10,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  eyeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHelper: {
    fontSize: 12,
    lineHeight: 18,
    color: '#A0A9B8',
    fontWeight: '500',
  },
  nicknameInput: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  profileHelper: {
    fontSize: 12,
    lineHeight: 18,
    color: '#97A2B4',
    fontWeight: '500',
  },
  profileHelperError: {
    color: '#E05A68',
  },
  profileHelperSuccess: {
    color: '#7A57E8',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  primaryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  successBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  successCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
  },
  successHalo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EAF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#21C47B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 18,
    color: '#172033',
    fontWeight: '800',
    marginBottom: 10,
  },
  successBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#99A3B5',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 26,
  },
});
