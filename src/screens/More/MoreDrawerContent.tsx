// 파일: src/screens/More/MoreDrawerContent.tsx
// 파일 목적:
// - 더보기 드로어 안에서 주요 메뉴 허브와 계정 관리 기능을 한 화면으로 제공한다.
// 어디서 쓰이는지:
// - MoreDrawer 컴포넌트 내부 콘텐츠로 사용되며, 하단 툴바의 전체메뉴 버튼으로 열린다.
// 핵심 역할:
// - 반려동물, 기록, 정보, 계정 관련 메뉴를 섹션별로 렌더링한다.
// - 닉네임 수정, 비밀번호 변경, 로그아웃, 계정 삭제 같은 계정 작업을 드로어 맥락에서 바로 처리한다.
// 데이터·상태 흐름:
// - authStore와 petStore를 읽어 로그인 상태, role, 현재 선택 펫을 기준으로 메뉴와 계정 액션을 분기한다.
// - 대부분의 메뉴 이동은 드로어를 닫고 RootNavigator 라우트로 넘기는 방식으로 동작한다.
// 수정 시 주의:
// - 이 파일은 실제 구현된 기능만 노출해야 하므로 placeholder 메뉴를 다시 넣을 때는 사용자 기대치와 실제 동작을 함께 검증해야 한다.
// - 계정 액션과 일반 메뉴 이동이 섞여 있어, 모달 상태와 navigation 호출 순서를 함부로 바꾸면 드로어 닫힘/복귀 UX가 어긋날 수 있다.

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  findNodeHandle,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView as KeyboardControllerAvoidingView } from 'react-native-keyboard-controller';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'styled-components/native';
import Feather from 'react-native-vector-icons/Feather';

import AppNavigationToolbar from '../../components/navigation/AppNavigationToolbar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PremiumNoticeModal from '../../components/common/PremiumNoticeModal';
import PetThemePicker from '../../components/pets/PetThemePicker';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  canChangeNickname,
  getNextNicknameChangeDate,
  getNicknameChangedAt,
  saveNicknameChangedAt,
} from '../../services/local/accountPreferences';
import { formatDateLabelFromDate } from '../../utils/date';
import {
  getBrandedErrorMeta,
} from '../../services/app/errors';
import {
  getNicknameErrorMessageByCode,
  NICKNAME_MAX_LENGTH,
  validateNicknameInput,
  type NicknamePolicyCode,
} from '../../services/profileNicknamePolicy';
import {
  performAccountDeletion,
  performLogout,
} from '../../services/auth/session';
import {
  LEGAL_DOCUMENTS,
  openLegalDocument,
} from '../../services/legal/documents';
import { fetchMyPets, updatePet } from '../../services/supabase/pets';
import {
  checkNicknameAvailabilityDetailed,
  saveMyNickname,
} from '../../services/supabase/profile';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import {
  checkScheduleNotificationPermission,
  getScheduleNotificationSettings,
  openScheduleNotificationSystemSettings,
  requestScheduleNotificationPermission,
  setScheduleNotificationEnabled,
  type ScheduleNotificationPermissionStatus,
} from '../../services/schedules/notifications';
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
  iconEmoji?: string | null;
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
  bottomInset: number;
  currentPassword: string;
  nextPassword: string;
  confirmPassword: string;
  currentPasswordVisible: boolean;
  nextPasswordVisible: boolean;
  confirmPasswordVisible: boolean;
  saving: boolean;
  accentColor: string;
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
  bottomInset: number;
  nickname: string;
  helperText: string;
  helperTone: 'info' | 'error' | 'success';
  saving: boolean;
  accentColor: string;
  onClose: () => void;
  onChangeNickname: (value: string) => void;
  onSubmit: () => void;
};

type ThemeSettingsModalProps = {
  visible: boolean;
  bottomInset: number;
  petName: string | null;
  helperText: string;
  selectedColor: string;
  accentColor: string;
  saving: boolean;
  onClose: () => void;
  onSelectColor: (color: string) => void;
  onSubmit: () => void;
};

type NotificationSettingsModalProps = {
  visible: boolean;
  bottomInset: number;
  enabled: boolean;
  permissionStatus: ScheduleNotificationPermissionStatus;
  loading: boolean;
  accentColor: string;
  onClose: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onRequestPermission: () => void;
  onOpenSystemSettings: () => void;
};

function formatDateLabel(value: Date | null): string {
  if (!value) return '지금은 변경할 수 있어요.';
  const label = formatDateLabelFromDate(value);
  return `${label || '날짜 확인 후'} 이후에 다시 변경할 수 있어요.`;
}

const MenuRow = memo(function MenuRow({
  label,
  icon,
  iconEmoji = null,
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
  const theme = useTheme();
  const tone = themeColors[iconTone];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.menuRow,
        { backgroundColor: theme.colors.surfaceElevated },
      ]}
      onPress={onPress}
    >
      <View style={styles.menuLeft}>
        <View style={[styles.menuIconBox, { backgroundColor: tone.box }]}>
          {iconEmoji ? (
            <Text style={styles.menuEmojiIcon}>{iconEmoji}</Text>
          ) : (
            <Feather name={icon as never} size={17} color={tone.icon} />
          )}
        </View>
        <Text style={[styles.menuLabel, { color: theme.colors.textPrimary }]}>
          {label}
        </Text>
      </View>

      <View style={styles.menuRight}>
        {badge === 'dot' ? <View style={styles.menuDot} /> : null}
        {badge === 'soon' ? <Text style={styles.badgeSoon}>soon</Text> : null}
        <Feather
          name="chevron-right"
          size={18}
          color={theme.colors.textMuted}
        />
      </View>
    </TouchableOpacity>
  );
});

const MenuCard = memo(function MenuCard({
  title,
  items,
  themeColors,
}: MenuCardProps) {
  const theme = useTheme();
  return (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
        {title}
      </Text>
      <View
        style={[
          styles.menuCard,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {items.map(({ key, ...item }, index) => (
          <View key={key}>
            {index > 0 ? (
              <View
                style={[
                  styles.menuDivider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
            ) : null}
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
  inputRef,
  onFocus,
}: {
  label: string;
  value: string;
  placeholder: string;
  secureTextEntry: boolean;
  onChangeText: (value: string) => void;
  onToggleSecure: () => void;
  helper?: string | null;
  inputRef?: React.RefObject<TextInput | null>;
  onFocus?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.modalField}>
      <Text style={styles.modalLabel}>{label}</Text>
      <View style={[styles.inputShell, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={[styles.inputText, { color: theme.colors.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
          ref={inputRef}
          onFocus={onFocus}
        />
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.eyeButton}
          onPress={onToggleSecure}
        >
          <Feather
            name={secureTextEntry ? 'eye' : 'eye-off'}
            size={18}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>
      </View>
      {helper ? (
        <Text style={[styles.modalHelper, { color: theme.colors.textMuted }]}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
});

export const PasswordChangeModal = memo(function PasswordChangeModal({
  visible,
  bottomInset,
  currentPassword,
  nextPassword,
  confirmPassword,
  currentPasswordVisible,
  nextPasswordVisible,
  confirmPasswordVisible,
  saving,
  accentColor,
  onClose,
  onChangeCurrentPassword,
  onChangeNextPassword,
  onChangeConfirmPassword,
  onToggleCurrentPasswordVisible,
  onToggleNextPasswordVisible,
  onToggleConfirmPasswordVisible,
  onSubmit,
}: PasswordModalProps) {
  const theme = useTheme();
  const scrollRef = useRef<KeyboardAwareScrollView | null>(null);
  const currentPasswordRef = useRef<TextInput | null>(null);
  const nextPasswordRef = useRef<TextInput | null>(null);
  const confirmPasswordRef = useRef<TextInput | null>(null);

  const scrollToInput = useCallback((ref: React.RefObject<TextInput | null>) => {
    requestAnimationFrame(() => {
      const node = findNodeHandle(ref.current);
      if (!node) return;
      scrollRef.current?.scrollToFocusedInput?.(node);
    });
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardControllerAvoidingView
        style={[
          styles.modalBackdropCentered,
          { backgroundColor: theme.colors.overlay },
        ]}
        behavior="padding"
        enabled
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <Pressable
          style={styles.modalScrim}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />
        <View style={styles.centeredModalWrap} pointerEvents="box-none">
          <Pressable
            style={[
              styles.centeredSheetCard,
              {
                backgroundColor: theme.colors.surfaceElevated,
                paddingBottom: 18 + bottomInset,
              },
            ]}
            onPress={Keyboard.dismiss}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
                비밀번호 변경
              </Text>
              <TouchableOpacity
                activeOpacity={0.88}
                style={[styles.sheetClose, { backgroundColor: theme.colors.surface }]}
                onPress={onClose}
              >
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView
              innerRef={ref => {
                scrollRef.current = ref;
              }}
              style={styles.modalContentScroll}
              contentContainerStyle={styles.modalContentContainer}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              enableOnAndroid
              enableAutomaticScroll
              enableResetScrollToCoords={false}
              keyboardOpeningTime={0}
              extraScrollHeight={32}
              extraHeight={84}
            >
              <View style={styles.modalCardBody}>
                <PasswordField
                  label="현재 비밀번호"
                  value={currentPassword}
                  placeholder="현재 비밀번호를 입력해 주세요"
                  secureTextEntry={!currentPasswordVisible}
                  onChangeText={onChangeCurrentPassword}
                  onToggleSecure={onToggleCurrentPasswordVisible}
                  inputRef={currentPasswordRef}
                  onFocus={() => scrollToInput(currentPasswordRef)}
                />

                <PasswordField
                  label="새 비밀번호"
                  value={nextPassword}
                  placeholder="새 비밀번호를 입력해 주세요"
                  secureTextEntry={!nextPasswordVisible}
                  onChangeText={onChangeNextPassword}
                  onToggleSecure={onToggleNextPasswordVisible}
                  helper="영문, 숫자, 특수문자 포함 8자 이상 입력해주세요"
                  inputRef={nextPasswordRef}
                  onFocus={() => scrollToInput(nextPasswordRef)}
                />

                <PasswordField
                  label="새 비밀번호 확인"
                  value={confirmPassword}
                  placeholder="새 비밀번호를 한 번 더 입력해 주세요"
                  secureTextEntry={!confirmPasswordVisible}
                  onChangeText={onChangeConfirmPassword}
                  onToggleSecure={onToggleConfirmPasswordVisible}
                  inputRef={confirmPasswordRef}
                  onFocus={() => scrollToInput(confirmPasswordRef)}
                />
              </View>

              <View style={styles.modalCardFooter}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={[
                    styles.primaryButton,
                    styles.modalPrimaryButton,
                    { backgroundColor: accentColor },
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
            </KeyboardAwareScrollView>
          </Pressable>
        </View>
      </KeyboardControllerAvoidingView>
    </Modal>
  );
});

const ThemeSettingsModal = memo(function ThemeSettingsModal({
  visible,
  bottomInset,
  petName,
  helperText,
  selectedColor,
  accentColor,
  saving,
  onClose,
  onSelectColor,
  onSubmit,
}: ThemeSettingsModalProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View
          style={[
            styles.sheetCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              paddingBottom: Math.max(bottomInset + 18, 26),
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
              테마 설정
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.sheetClose, { backgroundColor: theme.colors.surface }]}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.themeInfoBlock}>
            <Text style={[styles.themeInfoTitle, { color: theme.colors.textPrimary }]}>
              {petName ? `${petName}의 테마를 바꿔볼까요?` : '현재 아이의 테마를 바꿔볼까요?'}
            </Text>
            <Text style={[styles.themeInfoBody, { color: theme.colors.textSecondary }]}>
              {helperText}
            </Text>
          </View>

          <PetThemePicker
            selectedColor={selectedColor}
            helperText="홈 카드, 기록, 일정, 더보기의 강조색에 함께 반영돼요."
            onSelectColor={onSelectColor}
          />

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.primaryButton,
              { backgroundColor: accentColor },
              saving ? styles.disabledButton : null,
            ]}
            onPress={onSubmit}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? '저장 중...' : '테마 적용하기'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

function getNotificationPermissionLabel(
  status: ScheduleNotificationPermissionStatus,
) {
  switch (status) {
    case 'granted':
      return '허용됨';
    case 'blocked':
      return '시스템 설정에서 꺼짐';
    case 'denied':
      return '권한 필요';
    case 'unsupported':
    default:
      return '지원 상태 확인 중';
  }
}

const NotificationSettingsModal = memo(function NotificationSettingsModal({
  visible,
  bottomInset,
  enabled,
  permissionStatus,
  loading,
  accentColor,
  onClose,
  onToggleEnabled,
  onRequestPermission,
  onOpenSystemSettings,
}: NotificationSettingsModalProps) {
  const theme = useTheme();
  const permissionGranted = permissionStatus === 'granted';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View
          style={[
            styles.sheetCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              paddingBottom: Math.max(bottomInset + 18, 26),
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
              알림 설정
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.sheetClose, { backgroundColor: theme.colors.surface }]}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.notificationInfoBlock}>
            <Text style={[styles.themeInfoTitle, { color: theme.colors.textPrimary }]}>
              중요한 병원, 약 시간을 놓치지 않게 도와드릴게요.
            </Text>
            <Text style={[styles.themeInfoBody, { color: theme.colors.textSecondary }]}>
              일정 추가에서 알림을 선택하면 이 기기에 로컬 알림으로 예약됩니다.
              완료 처리하거나 알림을 끄면 예약도 함께 정리됩니다.
            </Text>
          </View>

          <View
            style={[
              styles.notificationSettingRow,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.notificationSettingText}>
              <Text style={[styles.modalLabel, { color: theme.colors.textPrimary }]}>
                일정 알림
              </Text>
              <Text style={[styles.notificationSettingHelper, { color: theme.colors.textMuted }]}>
                병원, 약, 산책 등 일정 알림 예약 허용
              </Text>
            </View>
            <Switch
              value={enabled}
              disabled={loading}
              onValueChange={onToggleEnabled}
              trackColor={{ false: '#D7DEE8', true: `${accentColor}66` }}
              thumbColor={enabled ? accentColor : '#FFFFFF'}
            />
          </View>

          <View
            style={[
              styles.notificationStatusBox,
              {
                backgroundColor: permissionGranted
                  ? 'rgba(34,197,94,0.10)'
                  : 'rgba(249,115,22,0.10)',
                borderColor: permissionGranted
                  ? 'rgba(34,197,94,0.22)'
                  : 'rgba(249,115,22,0.22)',
              },
            ]}
          >
            <Text
              style={[
                styles.notificationStatusTitle,
                { color: permissionGranted ? '#15803D' : '#C2410C' },
              ]}
            >
              기기 권한: {getNotificationPermissionLabel(permissionStatus)}
            </Text>
            <Text style={[styles.notificationSettingHelper, { color: theme.colors.textMuted }]}>
              권한이 꺼져 있으면 일정에는 알림값이 저장되지만 실제 기기 알림은 오지 않아요.
            </Text>
          </View>

          {permissionGranted ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
              onPress={onOpenSystemSettings}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.textPrimary }]}>
                시스템 알림 설정 열기
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.primaryButton, { backgroundColor: accentColor }]}
              onPress={onRequestPermission}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? '확인 중...' : '알림 권한 허용하기'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
});

export const PasswordChangeSuccessModal = memo(function PasswordChangeSuccessModal({
  visible,
  onClose,
  accentColor,
}: {
  visible: boolean;
  onClose: () => void;
  accentColor: string;
}) {
  const theme = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.successBackdrop, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.successCard, { backgroundColor: theme.colors.surfaceElevated }]}>
          <View style={[styles.successHalo, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.successIcon, { backgroundColor: theme.colors.success }]}>
              <Feather name="check" size={26} color="#FFFFFF" />
            </View>
          </View>
          <Text style={[styles.successTitle, { color: theme.colors.textPrimary }]}>
            비밀번호 변경 완료
          </Text>
          <Text style={[styles.successBody, { color: theme.colors.textSecondary }]}>
            비밀번호가 성공적으로{'\n'}변경되었습니다.
          </Text>
          <TouchableOpacity
            activeOpacity={0.92}
            style={[styles.primaryButton, { backgroundColor: accentColor }]}
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
  bottomInset,
  nickname,
  helperText,
  helperTone,
  saving,
  accentColor,
  onClose,
  onChangeNickname,
  onSubmit,
}: ProfileEditModalProps) {
  const theme = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardControllerAvoidingView
        style={[
          styles.modalBackdropCentered,
          { backgroundColor: theme.colors.overlay },
        ]}
        behavior="padding"
        enabled
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <Pressable
          style={styles.modalScrim}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />
        <View style={styles.centeredModalWrap} pointerEvents="box-none">
          <Pressable
            style={[
              styles.centeredSheetCard,
              {
                backgroundColor: theme.colors.surfaceElevated,
                paddingBottom: 18 + bottomInset,
              },
            ]}
            onPress={Keyboard.dismiss}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
                닉네임 수정
              </Text>
              <TouchableOpacity
                activeOpacity={0.88}
                style={[styles.sheetClose, { backgroundColor: theme.colors.surface }]}
                onPress={onClose}
              >
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.colors.textPrimary }]}>
                닉네임
              </Text>
              <TextInput
                value={nickname}
                onChangeText={onChangeNickname}
                style={[
                  styles.nicknameInput,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="닉네임을 입력해 주세요"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={NICKNAME_MAX_LENGTH}
              />
              <Text
                style={[
                  styles.profileHelper,
                  helperTone === 'error'
                    ? { color: theme.colors.danger }
                    : helperTone === 'success'
                    ? { color: accentColor }
                    : { color: theme.colors.textMuted },
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

            <View style={styles.modalCardFooter}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={[
                  styles.primaryButton,
                  styles.modalPrimaryButton,
                  { backgroundColor: accentColor },
                  saving ? styles.disabledButton : null,
                ]}
                onPress={onSubmit}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? '저장 중...' : '수정 완료'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      </KeyboardControllerAvoidingView>
    </Modal>
  );
});

export default function MoreDrawerContent({ onRequestClose }: Props) {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const nicknameRaw = useAuthStore(s => s.profile.nickname);
  const role = useAuthStore(s => s.profile.role ?? 'user');
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const session = useAuthStore(s => s.session);
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const setPets = usePetStore(s => s.setPets);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [notificationSettingsLoading, setNotificationSettingsLoading] =
    useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notificationPermissionStatus, setNotificationPermissionStatus] =
    useState<ScheduleNotificationPermissionStatus>('unsupported');
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
  const [profileSaving, setProfileSaving] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);
  const [draftNickname, setDraftNickname] = useState('');
  const [draftThemeColor, setDraftThemeColor] = useState<string | null>(null);
  const [nicknameChangedAt, setNicknameChangedAt] = useState<string | null>(
    null,
  );
  const [openingDeletionGuide, setOpeningDeletionGuide] = useState(false);

  const nickname = useMemo(() => nicknameRaw?.trim() || null, [nicknameRaw]);
  const selectedPet = useMemo(
    () => pets.find(p => p.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const accentThemeColor = useMemo(
    () => (isLoggedIn ? selectedPet?.themeColor : theme.colors.brand),
    [isLoggedIn, selectedPet?.themeColor, theme.colors.brand],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(accentThemeColor),
    [accentThemeColor],
  );
  const draftThemePalette = useMemo(
    () => buildPetThemePalette(draftThemeColor ?? accentThemeColor),
    [accentThemeColor, draftThemeColor],
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
  const canShowLogout = Boolean(session?.user?.id) && isLoggedIn;
  const headerTitle = useMemo(
    () =>
      isLoggedIn ? `안녕하세요, ${greetingName}` : 'NURI에 오신 것을\n환영합니다.',
    [greetingName, isLoggedIn],
  );
  const headerSubtitle = useMemo(
    () =>
      isLoggedIn
        ? '반가운 오늘, 아이들은 어땠나요?'
        : '로그인하고 더 많은 여정을\n함께하세요.',
    [isLoggedIn],
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

    const validation = validateNicknameInput(draftNickname);
    if (validation.code !== 'empty' && validation.code !== 'ok') {
      return {
        text:
          validation.message ??
          getNicknameErrorMessageByCode(validation.code) ??
          '닉네임을 다시 확인해 주세요.',
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
      try {
        onRequestClose();
        navigate();
      } catch (error) {
        const { title, message } = getBrandedErrorMeta(error, 'generic');
        showToast({
          tone: 'error',
          title,
          message,
          durationMs: 2800,
        });
      }
    },
    [onRequestClose],
  );

  const openPetManagement = useCallback(() => {
    closeAndNavigate(() =>
      navigation.navigate('PetManagement', {
        entrySource: 'more',
      }),
    );
  }, [closeAndNavigate, navigation]);

  const openScheduleList = useCallback(() => {
    closeAndNavigate(() =>
      navigation.navigate('ScheduleList', {
        petId: selectedPet?.id ?? undefined,
        entrySource: 'more',
      }),
    );
  }, [closeAndNavigate, navigation, selectedPet?.id]);

  const openTimeline = useCallback(() => {
    closeAndNavigate(() =>
      navigation.navigate('AppTabs', {
        screen: 'TimelineTab',
        params: {
          screen: 'TimelineMain',
          params: { mainCategory: 'all', entrySource: 'more' },
        },
      }),
    );
  }, [closeAndNavigate, navigation]);

  const openGuideList = useCallback(() => {
    closeAndNavigate(() => navigation.navigate('GuideList', { entrySource: 'more' }));
  }, [closeAndNavigate, navigation]);

  const openCommunity = useCallback(() => {
    closeAndNavigate(() =>
      navigation.navigate('CommunityList', { entrySource: 'more' }),
    );
  }, [closeAndNavigate, navigation]);

  const openGuideAdmin = useCallback(() => {
    closeAndNavigate(() =>
      navigation.navigate('GuideAdminList', { entrySource: 'more' }),
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

  const openThemeModal = useCallback(() => {
    if (!selectedPet) {
      showToast({
        tone: 'info',
        title: '먼저 아이를 등록해 주세요',
        message: '테마 설정은 반려동물 프로필이 있어야 적용할 수 있어요.',
      });
      return;
    }

    setDraftThemeColor(selectedPet.themeColor ?? petTheme.primary);
    setThemeModalVisible(true);
  }, [petTheme.primary, selectedPet]);

  const closeThemeModal = useCallback(() => {
    if (themeSaving) return;
    setThemeModalVisible(false);
    setDraftThemeColor(null);
  }, [themeSaving]);

  const refreshNotificationSettings = useCallback(async () => {
    setNotificationSettingsLoading(true);
    try {
      const [permissionStatus, settings] = await Promise.all([
        checkScheduleNotificationPermission(),
        getScheduleNotificationSettings(),
      ]);
      setNotificationPermissionStatus(permissionStatus);
      setNotificationEnabled(settings.enabled);
    } catch {
      setNotificationPermissionStatus('unsupported');
    } finally {
      setNotificationSettingsLoading(false);
    }
  }, []);

  const openNotificationModal = useCallback(() => {
    setNotificationModalVisible(true);
    refreshNotificationSettings().catch(() => {});
  }, [refreshNotificationSettings]);

  const closeNotificationModal = useCallback(() => {
    if (notificationSettingsLoading) return;
    setNotificationModalVisible(false);
  }, [notificationSettingsLoading]);

  const onToggleNotificationEnabled = useCallback(
    async (enabled: boolean) => {
      setNotificationSettingsLoading(true);
      try {
        const settings = await setScheduleNotificationEnabled(enabled);
        setNotificationEnabled(settings.enabled);
        showToast({
          tone: settings.enabled ? 'success' : 'info',
          title: settings.enabled ? '일정 알림 켜짐' : '일정 알림 꺼짐',
          message: settings.enabled
            ? '새로 저장하는 일정 알림이 기기에 예약됩니다.'
            : '예약된 일정 알림을 정리하고 새 알림 예약을 멈췄어요.',
        });
      } catch (error) {
        const { title, message } = getBrandedErrorMeta(error, 'generic');
        showToast({ tone: 'error', title, message });
      } finally {
        setNotificationSettingsLoading(false);
      }
    },
    [],
  );

  const onRequestNotificationPermission = useCallback(async () => {
    setNotificationSettingsLoading(true);
    try {
      const permissionStatus = await requestScheduleNotificationPermission();
      setNotificationPermissionStatus(permissionStatus);
      showToast({
        tone: permissionStatus === 'granted' ? 'success' : 'warning',
        title: permissionStatus === 'granted' ? '알림 권한 허용됨' : '알림 권한 필요',
        message:
          permissionStatus === 'granted'
            ? '이제 알림을 선택한 일정은 기기에 예약됩니다.'
            : '권한이 꺼져 있으면 일정에는 저장되지만 실제 알림은 오지 않아요.',
      });
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'generic');
      showToast({ tone: 'error', title, message });
    } finally {
      setNotificationSettingsLoading(false);
    }
  }, []);

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
          getNicknameErrorMessageByCode(availability.code as NicknamePolicyCode) ??
          '닉네임을 다시 확인해 주세요.';
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

  const executeLogout = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);
      setLogoutConfirmVisible(false);
      const result = await performLogout(1200);

      onRequestClose();
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
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'logout');
      Alert.alert(title, message);
      showToast({ tone: 'error', title, message });
    } finally {
      setLoading(false);
    }
  }, [loading, navigation, onRequestClose]);

  const onPressLogout = useCallback(() => {
    if (loading) return;
    setLogoutConfirmVisible(true);
  }, [loading]);

  const executeDeleteAccount = useCallback(async () => {
    if (!isLoggedIn || deleting) return;

    try {
      setDeleting(true);
      setDeleteConfirmVisible(false);
      const result = await performAccountDeletion();

      if (
        result.status === 'completed' ||
        result.status === 'completed_with_cleanup_pending'
      ) {
        onRequestClose();
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
  }, [deleting, isLoggedIn, navigation, onRequestClose]);

  const onPressDeleteAccount = useCallback(() => {
    if (!isLoggedIn || deleting) return;
    setDeleteConfirmVisible(true);
  }, [deleting, isLoggedIn]);

  const onPressDeletionGuide = useCallback(async () => {
    if (openingDeletionGuide) return;

    try {
      setOpeningDeletionGuide(true);
      const result = await openLegalDocument('accountDeletion');

      if (!result.ok) {
        if (result.reason === 'failed') {
          Alert.alert(result.document.title, result.message);
        }

        showToast({
          tone: result.reason === 'failed' ? 'error' : 'info',
          title: result.document.title,
          message: result.message,
          durationMs: 3400,
        });
      }
    } finally {
      setOpeningDeletionGuide(false);
    }
  }, [openingDeletionGuide]);

  const onPressLogin = useCallback(() => {
    closeAndNavigate(() => navigation.navigate('SignIn'));
  }, [closeAndNavigate, navigation]);

  const onSubmitTheme = useCallback(async () => {
    if (!selectedPet || themeSaving) return;

    const nextThemeColor = draftThemeColor ?? selectedPet.themeColor ?? petTheme.primary;
    if (nextThemeColor === (selectedPet.themeColor ?? null)) {
      setThemeModalVisible(false);
      return;
    }

    try {
      setThemeSaving(true);

      await updatePet({
        petId: selectedPet.id,
        name: selectedPet.name,
        species: selectedPet.species ?? 'other',
        speciesDetailKey: selectedPet.speciesDetailKey ?? null,
        speciesDisplayName: selectedPet.speciesDisplayName ?? null,
        themeColor: nextThemeColor,
        birthDate: selectedPet.birthDate ?? null,
        adoptionDate: selectedPet.adoptionDate ?? null,
        deathDate: selectedPet.deathDate ?? null,
        weightKg: selectedPet.weightKg ?? null,
        breed: selectedPet.breed ?? null,
        gender: selectedPet.gender ?? 'unknown',
        neutered: selectedPet.neutered ?? null,
        hobbies: selectedPet.hobbies ?? [],
        likes: selectedPet.likes ?? [],
        dislikes: selectedPet.dislikes ?? [],
        tags: selectedPet.tags ?? [],
        avatarPath: selectedPet.avatarPath ?? null,
      });

      const userId = session?.user?.id ?? null;
      const refreshedPets = await fetchMyPets(userId ?? undefined);
      setPets(refreshedPets, { userId, preferredPetId: selectedPet.id });

      setThemeModalVisible(false);
      setDraftThemeColor(null);
      showToast({
        tone: 'success',
        title: '테마 적용 완료',
        message: '현재 아이의 강조색을 새 테마로 바꿨어요.',
      });
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'pet-update');
      showToast({
        tone: 'error',
        title,
        message,
        durationMs: 3200,
      });
    } finally {
      setThemeSaving(false);
    }
  }, [
    draftThemeColor,
    petTheme.primary,
    setPets,
    selectedPet,
    session?.user?.id,
    themeSaving,
  ]);

  const openIndoorActivities = useCallback(() => {
    closeAndNavigate(() =>
      navigation.navigate('IndoorActivityRecommendations', {
        entrySource: 'more',
      }),
    );
  }, [closeAndNavigate, navigation]);

  const openWalkDiscovery = useCallback(() => {
    closeAndNavigate(() =>
      navigation.navigate('WalkSpotList', { entrySource: 'more' }),
    );
  }, [closeAndNavigate, navigation]);

  const openPetTravel = useCallback(() => {
    closeAndNavigate(() =>
      navigation.navigate('PetTravelList', { entrySource: 'more' }),
    );
  }, [closeAndNavigate, navigation]);

  const openHealthReport = useCallback(() => {
    closeAndNavigate(() =>
      navigation.navigate('HealthReport', {
        petId: selectedPet?.id ?? undefined,
        initialTab: 'records',
        entrySource: 'more',
      }),
    );
  }, [closeAndNavigate, navigation, selectedPet?.id]);

  const petItems = useMemo<MenuItemSpec[]>(
    () => [
      {
        key: 'pet-manage',
        label: '아이들 프로필 관리',
        icon: 'user',
        iconTone: 'accent',
        onPress: isLoggedIn ? openPetManagement : onPressLogin,
      },
      {
        key: 'important-schedule',
        label: '중요 일정 & 기념일',
        icon: 'calendar',
        iconTone: 'accent',
        onPress: isLoggedIn ? openScheduleList : onPressLogin,
      },
    ],
    [isLoggedIn, onPressLogin, openPetManagement, openScheduleList],
  );

  const activityItems = useMemo<MenuItemSpec[]>(
    () => [
      {
        key: 'memory-diary',
        label: '추억 다이어리',
        icon: 'book-open',
        iconTone: 'accent',
        onPress: isLoggedIn ? openTimeline : onPressLogin,
      },
      {
        key: 'health-report',
        label: '건강관리',
        icon: 'clipboard',
        iconTone: 'accent',
        onPress: isLoggedIn ? openHealthReport : onPressLogin,
      },
      {
        key: 'indoor-activities',
        label: '실내 놀이 추천',
        icon: 'sun',
        iconTone: 'accent',
        onPress: isLoggedIn ? openIndoorActivities : onPressLogin,
      },
      {
        key: 'walk-nearby',
        label: '우리동네 산책 장소 찾기',
        icon: 'map',
        iconTone: 'accent',
        onPress: isLoggedIn ? openWalkDiscovery : onPressLogin,
      },
    ],
    [
      isLoggedIn,
      openHealthReport,
      openIndoorActivities,
      onPressLogin,
      openTimeline,
      openWalkDiscovery,
    ],
  );

  const infoItems = useMemo<MenuItemSpec[]>(
    () => [
      {
        key: 'pet-travel',
        label: '반려동물과 여행',
        icon: 'compass',
        iconTone: 'muted',
        onPress: openPetTravel,
      },
      {
        key: 'community',
        label: '커뮤니티',
        icon: 'message-circle',
        iconTone: 'muted',
        onPress: openCommunity,
      },
      {
        key: 'tips',
        label: '집사 꿀팁 가이드',
        icon: 'map-pin',
        iconTone: 'muted',
        onPress: openGuideList,
      },
    ],
    [openCommunity, openGuideList, openPetTravel],
  );

  const serviceItems = useMemo<MenuItemSpec[]>(() => {
    if (!isLoggedIn) {
      return [
        {
          key: 'login',
          label: '로그인하고 더 많은 여정 보기',
          icon: 'log-in',
          iconTone: 'accent',
          onPress: onPressLogin,
        },
      ];
    }

    const items: MenuItemSpec[] = [
      {
        key: 'notification',
        label: '알림 설정',
        icon: 'bell',
        iconTone: 'accent',
        onPress: openNotificationModal,
      },
      {
        key: 'theme',
        label: '테마 설정',
        icon: 'palette',
        iconEmoji: '🎨',
        iconTone: 'accent',
        onPress: openThemeModal,
      },
      {
        key: 'logout',
        label: loading ? '로그아웃 중...' : '로그아웃',
        icon: 'log-out',
        iconTone: 'accent',
        onPress: onPressLogout,
      }
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

    if (!canShowLogout) {
      return items.filter(item => item.key !== 'logout');
    }

    return items;
  }, [
    canShowLogout,
    isLoggedIn,
    loading,
    onPressLogin,
    onPressLogout,
    openNotificationModal,
    openProfileEditModal,
    openThemeModal,
  ]);

  const adminItems = useMemo<MenuItemSpec[]>(
    () => [
      {
        key: 'guide-admin',
        label: '가이드 운영',
        icon: 'edit',
        iconTone: 'soft',
        onPress: openGuideAdmin,
      },
    ],
    [openGuideAdmin],
  );

  const isGuideAdmin = role === 'admin' || role === 'super_admin';

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text
              style={[
                styles.headerTitle,
                !isLoggedIn ? styles.guestHeaderTitle : null,
                { color: isLoggedIn ? theme.colors.textPrimary : theme.colors.brand },
              ]}
            >
              {headerTitle}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                !isLoggedIn ? styles.guestHeaderSubtitle : null,
                { color: isLoggedIn ? theme.colors.textMuted : petTheme.deep },
              ]}
            >
              {headerSubtitle}
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
                <Text
                  style={[
                    styles.headerAvatarFallbackText,
                    { color: petTheme.deep },
                  ]}
                >
                  {avatarFallback}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.headerAvatarBadge,
                {
                  backgroundColor: petTheme.primary,
                  borderColor: theme.colors.background,
                },
              ]}
            >
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
          {isGuideAdmin ? (
            <MenuCard
              title="운영"
              items={adminItems}
              themeColors={menuThemeColors}
            />
          ) : null}

          {session?.user?.email ? (
            <View style={styles.accountMeta}>
              <Text
                style={[styles.accountMetaEmail, { color: theme.colors.textSecondary }]}
              >
                {session.user.email}
              </Text>
              <Text
                style={[styles.accountMetaText, { color: theme.colors.textMuted }]}
              >
                닉네임은 월 1회 변경할 수 있어요.
              </Text>
            </View>
          ) : null}

          {isLoggedIn ? (
            <View style={styles.bottomActions}>
              <View
                style={[
                  styles.deleteSection,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: 'rgba(224, 90, 104, 0.16)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.deleteSectionTitle,
                    { color: theme.colors.danger },
                  ]}
                >
                  계정 삭제
                </Text>
                <Text
                  style={[
                    styles.deleteSectionBody,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  회원탈퇴는 삭제 요청을 보내는 단계예요. 실제 정리 완료 시점과
                  파일 정리 완료 시점은 즉시 아닐 수 있어요.
                </Text>
                <Text
                  style={[
                    styles.deleteSectionNote,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  개인 콘텐츠는 삭제되고, 일부 동의/신고 이력은 식별자를 제거한 뒤
                  보관될 수 있어요.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.88}
                  disabled={openingDeletionGuide}
                  onPress={() => {
                    onPressDeletionGuide().catch(() => {});
                  }}
                  style={[
                    styles.deleteGuideButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.deleteGuideButtonLabel,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {openingDeletionGuide ? '안내 상태 확인 중...' : '삭제 안내 상태 확인'}
                  </Text>
                  <Text
                    style={[
                      styles.deleteGuideButtonMeta,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {LEGAL_DOCUMENTS.accountDeletion.status === 'external'
                      ? '공식 안내 문서 연결 완료'
                      : '안내 문서 미정, 현재는 상태 안내만 제공'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[
                    styles.bottomDangerButton,
                    { backgroundColor: 'rgba(224, 90, 104, 0.12)' },
                  ]}
                  onPress={onPressDeleteAccount}
                  disabled={deleting}
                >
                  <Text
                    style={[
                      styles.bottomDangerButtonLabel,
                      { color: theme.colors.danger },
                    ]}
                  >
                    {deleting ? '회원탈퇴 처리 중...' : '회원탈퇴'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.loginButton,
                { backgroundColor: petTheme.primary },
              ]}
              onPress={onPressLogin}
            >
              <Text style={styles.loginButtonLabel}>로그인하러 가기</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <AppNavigationToolbar activeKey="more" onBeforeNavigate={onRequestClose} />
      </View>

      <ProfileEditModal
        visible={profileModalVisible}
        bottomInset={Math.max(insets.bottom, 6)}
        nickname={draftNickname}
        helperText={profileHelper.text}
        helperTone={profileHelper.tone}
        saving={profileSaving}
        accentColor={petTheme.primary}
        onClose={closeProfileEditModal}
        onChangeNickname={setDraftNickname}
        onSubmit={onSubmitProfile}
      />

      <ThemeSettingsModal
        visible={themeModalVisible}
        bottomInset={Math.max(insets.bottom, 6)}
        petName={selectedPet?.name ?? null}
        helperText="현재 선택한 아이의 강조색을 바꾸는 설정이에요. 홈과 주요 버튼의 포인트 컬러에 함께 반영돼요."
        selectedColor={draftThemeColor ?? selectedPet?.themeColor ?? petTheme.primary}
        accentColor={draftThemePalette.primary}
        saving={themeSaving}
        onClose={closeThemeModal}
        onSelectColor={setDraftThemeColor}
        onSubmit={() => {
          onSubmitTheme().catch(() => {});
        }}
      />
      <NotificationSettingsModal
        visible={notificationModalVisible}
        bottomInset={Math.max(insets.bottom, 6)}
        enabled={notificationEnabled}
        permissionStatus={notificationPermissionStatus}
        loading={notificationSettingsLoading}
        accentColor={petTheme.primary}
        onClose={closeNotificationModal}
        onToggleEnabled={onToggleNotificationEnabled}
        onRequestPermission={onRequestNotificationPermission}
        onOpenSystemSettings={openScheduleNotificationSystemSettings}
      />
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
          executeLogout().catch(() => {});
        }}
      />
      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="정말 NURI를 떠나시겠어요? 🥺"
        message={
          '탈퇴를 요청하시면 고객님의 프로필과 작성하신 모든 기록은\n다른 사람들에게 즉시 [비노출 처리]되어 안전하게 보호됩니다.\n\n요청일로부터 7일의 유예기간이 지나면,\n복구할 수 없도록 모든 데이터가 영구적으로 완전 삭제됩니다.'
        }
        cancelLabel="취소"
        confirmLabel={deleting ? '탈퇴 요청 중...' : '탈퇴 요청하기'}
        tone="danger"
        accentColor={petTheme.primary}
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={() => {
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
    fontSize: 16,
    lineHeight: 22,
    color: '#182133',
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#A0A8B8',
    fontWeight: '500',
  },
  guestHeaderTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  guestHeaderSubtitle: {
    fontSize: 12,
    lineHeight: 18,
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
    fontSize: 16,
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
  menuEmojiIcon: {
    fontSize: 17,
    lineHeight: 20,
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
    gap: 14,
    paddingTop: 6,
  },
  deleteSection: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
  },
  deleteSectionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  deleteSectionBody: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  deleteSectionNote: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  deleteGuideButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  deleteGuideButtonLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  deleteGuideButtonMeta: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  bottomDangerButton: {
    minHeight: 44,
    width: '100%',
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDangerButtonLabel: {
    fontSize: 14,
    color: '#C3AEB0',
    fontWeight: '800',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.34)',
    justifyContent: 'flex-end',
  },
  modalBackdropCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.34)',
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  centeredModalWrap: {
    width: '100%',
    maxWidth: 420,
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
  centeredSheetCard: {
    width: '100%',
    maxHeight: '88%',
    minHeight: 312,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
    gap: 16,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 16,
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
  themeInfoBlock: {
    gap: 6,
  },
  notificationInfoBlock: {
    gap: 6,
  },
  themeInfoTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
  },
  themeInfoBody: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
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
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  notificationSettingRow: {
    minHeight: 74,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  notificationSettingText: {
    flex: 1,
    gap: 4,
  },
  notificationSettingHelper: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  notificationStatusBox: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  notificationStatusTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  modalContentScroll: {
    maxHeight: 360,
  },
  modalContentContainer: {
    paddingBottom: 4,
  },
  modalCardBody: {
    gap: 16,
  },
  modalCardFooter: {
    paddingTop: 4,
  },
  modalPrimaryButton: {
    marginTop: 0,
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
    fontSize: 16,
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
