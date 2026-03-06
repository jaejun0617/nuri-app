// 파일: src/screens/More/MoreDrawerContent.tsx
// 역할:
// - 전체 화면형 더보기 드로어를 렌더링
// - 상단 프로필 카드, 섹션형 메뉴, 계정 설정 모달(내 정보 수정/비밀번호 변경)을 제공
// - 간격 규칙을 통일해 화면 전체가 플랫하고 정리된 인상으로 보이도록 유지

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  canChangeNickname,
  getNextNicknameChangeDate,
  getNicknameChangedAt,
  saveNicknameChangedAt,
} from '../../services/local/accountPreferences';
import { getRetryableErrorMessage } from '../../services/app/errors';
import {
  performAccountDeletion,
  performLogout,
} from '../../services/auth/session';
import { changeMyPassword, isValidPasswordFormat } from '../../services/supabase/account';
import {
  checkNicknameAvailabilityDetailed,
  saveMyNickname,
} from '../../services/supabase/profile';
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
  iconTone?: 'purple' | 'slate' | 'peach';
  onPress: () => void;
  dot?: boolean;
};

type MenuSectionProps = {
  title: string;
  items: MenuItemSpec[];
};

type MenuRowProps = MenuItemSpec;

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

type SuccessModalProps = {
  visible: boolean;
  onClose: () => void;
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

const ICON_TONES = {
  purple: {
    box: '#F4EEFF',
    icon: '#9B6DFF',
  },
  slate: {
    box: '#F3F5F8',
    icon: '#667085',
  },
  peach: {
    box: '#FFF1EE',
    icon: '#FF8A7A',
  },
} as const;

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
  iconTone = 'purple',
  onPress,
  dot = false,
}: MenuRowProps) {
  const tone = ICON_TONES[iconTone];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.menuRow}
      onPress={onPress}
    >
      <View style={styles.menuRowLeft}>
        <View style={[styles.menuIconBox, { backgroundColor: tone.box }]}>
          <Feather name={icon as never} size={18} color={tone.icon} />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>

      <View style={styles.menuRowRight}>
        {dot ? <View style={styles.menuDot} /> : null}
        <Feather name="chevron-right" size={18} color="#C5CCD8" />
      </View>
    </TouchableOpacity>
  );
});

const MenuSection = memo(function MenuSection({
  title,
  items,
}: MenuSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>
        {items.map(({ key, ...item }) => (
          <MenuRow key={key} {...item} />
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
    <View style={styles.modalFieldBlock}>
      <Text style={styles.modalFieldLabel}>{label}</Text>
      <View style={styles.passwordInputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.passwordInput}
          placeholder={placeholder}
          placeholderTextColor="#B6C0D1"
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
            color="#A6B1C2"
          />
        </TouchableOpacity>
      </View>
      {helper ? <Text style={styles.modalHelperText}>{helper}</Text> : null}
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
        <View style={styles.bottomSheetCard}>
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>비밀번호 변경</Text>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.bottomSheetClose}
              onPress={onClose}
            >
              <Feather name="x" size={20} color="#A2ABBC" />
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
            style={[styles.primaryActionButton, saving ? styles.buttonDisabled : null]}
            onPress={onSubmit}
            disabled={saving}
          >
            <Text style={styles.primaryActionButtonText}>
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
}: SuccessModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.successBackdrop}>
        <View style={styles.successCard}>
          <View style={styles.successIconHalo}>
            <View style={styles.successIconCircle}>
              <Feather name="check" size={28} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.successTitle}>비밀번호 변경 완료</Text>
          <Text style={styles.successBody}>
            비밀번호가 성공적으로 변경되었습니다.
          </Text>

          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.primaryActionButton}
            onPress={onClose}
          >
            <Text style={styles.primaryActionButtonText}>확인</Text>
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
        <View style={styles.bottomSheetCard}>
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>내 정보 수정</Text>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.bottomSheetClose}
              onPress={onClose}
            >
              <Feather name="x" size={20} color="#A2ABBC" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalFieldBlock}>
            <Text style={styles.modalFieldLabel}>닉네임</Text>
            <TextInput
              value={nickname}
              onChangeText={onChangeNickname}
              style={styles.nicknameInput}
              placeholder="닉네임을 입력해 주세요"
              placeholderTextColor="#B6C0D1"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={8}
            />
            <Text
              style={[
                styles.profileHelperText,
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
            style={[styles.primaryActionButton, saving ? styles.buttonDisabled : null]}
            onPress={onSubmit}
            disabled={saving}
          >
            <Text style={styles.primaryActionButtonText}>
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

  const status = useAuthStore(s => s.status);
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
  const [nicknameChangedAt, setNicknameChangedAt] = useState<string | null>(null);
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
  const avatarUri = useMemo(
    () => selectedPet?.avatarUrl?.trim() || null,
    [selectedPet?.avatarUrl],
  );
  const displayName = useMemo(() => {
    if (status === 'logged_in') return nickname ? `${nickname}님` : '반가워요';
    return '게스트';
  }, [nickname, status]);
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
        text: `닉네임은 월 1회만 변경할 수 있어요. ${formatDateLabel(nextNicknameDate)}`,
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
      message: `${label} 메뉴는 다음 단계에서 열릴 예정이에요.`,
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
        message: `닉네임은 월 1회만 변경할 수 있어요. ${formatDateLabel(nextNicknameDate)}`,
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
        title: '내 정보 수정 완료',
        message: '닉네임이 새로운 이름으로 저장됐어요.',
      });
    } catch (error) {
      const message = getRetryableErrorMessage(error);
      showToast({
        tone: 'error',
        title: '닉네임 저장 실패',
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
      const message = getRetryableErrorMessage(error);
      showToast({
        tone: 'error',
        title: '비밀번호 변경 실패',
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
    } catch (e: any) {
      const message = getRetryableErrorMessage(e);
      Alert.alert('로그아웃 실패', message);
      showToast({ tone: 'error', title: '로그아웃 실패', message });
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
  }, [deleting, isLoggedIn, navigation, onRequestClose]);

  const onPressLogin = useCallback(() => {
    closeAndNavigate(() => navigation.navigate('SignIn'));
  }, [closeAndNavigate, navigation]);

  const onPressDevTest = useCallback(() => {
    closeAndNavigate(() => navigation.navigate('DevTest'));
  }, [closeAndNavigate, navigation]);

  const petManagementItems = useMemo<MenuItemSpec[]>(
    () => [
      {
        key: 'pet-manage',
        label: '반려동물 관리',
        icon: 'heart',
        onPress: openPetProfile,
      },
      {
        key: 'vaccine',
        label: '예방접종 기록',
        icon: 'clipboard',
        onPress: openScheduleList,
      },
      {
        key: 'health-note',
        label: '건강 수첩',
        icon: 'book-open',
        onPress: openTimeline,
      },
    ],
    [openPetProfile, openScheduleList, openTimeline],
  );

  const communityItems = useMemo<MenuItemSpec[]>(
    () => [
      {
        key: 'friends',
        label: '내 친구들',
        icon: 'users',
        iconTone: 'slate',
        onPress: () => showPreparingToast('내 친구들'),
      },
      {
        key: 'popular',
        label: '인기 게시글',
        icon: 'trending-up',
        iconTone: 'slate',
        onPress: () => showPreparingToast('인기 게시글'),
      },
      {
        key: 'event',
        label: '이벤트',
        icon: 'zap',
        iconTone: 'slate',
        onPress: () => showPreparingToast('이벤트'),
        dot: true,
      },
    ],
    [showPreparingToast],
  );

  const accountItems = useMemo<MenuItemSpec[]>(() => {
    if (!isLoggedIn) {
      return [
        {
          key: 'login',
          label: '로그인하기',
          icon: 'log-in',
          iconTone: 'peach',
          onPress: onPressLogin,
        },
      ];
    }

    return [
      {
        key: 'my-profile',
        label: '내 정보 수정',
        icon: 'user',
        iconTone: 'peach',
        onPress: openProfileEditModal,
      },
      {
        key: 'password',
        label: '비밀번호 변경',
        icon: 'lock',
        iconTone: 'peach',
        onPress: openPasswordModal,
      },
      {
        key: 'logout',
        label: loading ? '로그아웃 중...' : '로그아웃',
        icon: 'log-out',
        iconTone: 'peach',
        onPress: onPressLogout,
      },
      {
        key: 'delete-account',
        label: deleting ? '회원탈퇴 처리 중...' : '회원탈퇴',
        icon: 'user-minus',
        iconTone: 'peach',
        onPress: onPressDeleteAccount,
      },
    ];
  }, [
    deleting,
    isLoggedIn,
    loading,
    onPressDeleteAccount,
    onPressLogin,
    onPressLogout,
    openPasswordModal,
    openProfileEditModal,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>더보기</Text>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onRequestClose}
            style={styles.closeButton}
          >
            <Feather name="x" size={22} color="#8E97A8" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.profileCard}
            onPress={openPetProfile}
          >
            <View style={styles.profileAvatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.profileAvatar} />
              ) : (
                <View style={[styles.profileAvatar, styles.profileAvatarFallback]}>
                  <Text style={styles.profileAvatarFallbackText}>
                    {avatarFallback}
                  </Text>
                </View>
              )}

              <View style={styles.profileBadge}>
                <MaterialCommunityIcons name="paw" size={13} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              <View style={styles.profileEditRow}>
                <Text style={styles.profileEditText}>프로필 수정</Text>
                <Feather name="chevron-right" size={14} color="#A8B0C2" />
              </View>
            </View>
          </TouchableOpacity>

          <MenuSection title="반려동물 관리" items={petManagementItems} />
          <MenuSection title="커뮤니티" items={communityItems} />
          <MenuSection title="내 계정" items={accountItems} />

          {session?.user?.email ? (
            <View style={styles.accountHintCard}>
              <Text style={styles.accountHintTitle}>지금 로그인된 계정</Text>
              <Text style={styles.accountHintValue}>{session.user.email}</Text>
              <Text style={styles.accountHintBody}>
                닉네임은 월 1회, 비밀번호는 필요할 때 바로 변경할 수 있어요.
              </Text>
            </View>
          ) : null}

          {__DEV__ ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.devButton}
              onPress={onPressDevTest}
            >
              <Text style={styles.devButtonText}>DevTest 열기</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
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
        onToggleNextPasswordVisible={() => setNextPasswordVisible(prev => !prev)}
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
    backgroundColor: '#FFFFFF',
  },
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    gap: 24,
  },
  profileCard: {
    borderWidth: 1,
    borderColor: '#ECEEF4',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
  },
  profileAvatarWrap: {
    position: 'relative',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F6E8D8',
  },
  profileAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarFallbackText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#8B5E3C',
  },
  profileBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#9B6DFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#202633',
  },
  profileEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  profileEditText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#A3ACC0',
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#B5BED0',
    letterSpacing: 0.2,
  },
  sectionBody: {
    gap: 4,
  },
  menuRow: {
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A3140',
  },
  menuRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 12,
  },
  menuDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F29A98',
  },
  accountHintCard: {
    marginTop: 2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEF1F6',
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 6,
  },
  accountHintTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#A0AAB9',
  },
  accountHintValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  accountHintBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#909AA9',
    fontWeight: '700',
  },
  devButton: {
    marginTop: 2,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#F7F6FF',
    borderWidth: 1,
    borderColor: '#E6DFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#7A57E8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.34)',
    justifyContent: 'flex-end',
  },
  modalScrim: {
    flex: 1,
  },
  bottomSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 26,
    gap: 18,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomSheetTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#202633',
  },
  bottomSheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFieldBlock: {
    gap: 8,
  },
  modalFieldLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#263041',
  },
  passwordInputWrap: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#F7F9FC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  eyeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHelperText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#A0A9B8',
    fontWeight: '700',
  },
  nicknameInput: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  profileHelperText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#97A2B4',
    fontWeight: '700',
  },
  profileHelperError: {
    color: '#E05A68',
  },
  profileHelperSuccess: {
    color: '#7A57E8',
  },
  primaryActionButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  primaryActionButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  buttonDisabled: {
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
  successIconHalo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EAF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#21C47B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#172033',
    marginBottom: 10,
  },
  successBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#99A3B5',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 26,
  },
});
