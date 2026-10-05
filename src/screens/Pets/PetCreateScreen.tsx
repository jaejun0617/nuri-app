// 파일: src/screens/Pets/PetCreateScreen.tsx
// 파일 목적:
// - 로그인 직후 또는 추가 등록 시 반려동물 프로필을 생성하는 온보딩 핵심 화면이다.
// 어디서 쓰이는지:
// - RootNavigator의 `PetCreate` 라우트에서 사용되며, 닉네임 완료 후 자동 진입하거나 More/홈 CTA로도 열린다.
// 핵심 역할:
// - 2단계 폼으로 펫 기본 정보, 성향 정보, 추모 정보, 이미지 업로드를 수집해 `createPet`으로 저장한다.
// - 작성 중 draft 저장/복원, 성공 후 펫 목록 refresh와 welcome 흐름 연결까지 담당한다.
// 데이터·상태 흐름:
// - 입력값은 local onboarding draft에 저장되고, 최종 저장 후 Supabase pets/storage와 petStore가 함께 갱신된다.
// - 선택 펫은 생성 직후 새 펫으로 맞춰져 홈과 다른 도메인 컨텍스트가 이어진다.
// 수정 시 주의:
// - 온보딩 가드가 이 화면을 강제 진입시키므로, 취소/뒤로가기/성공 후 이동 흐름을 함부로 바꾸면 첫 사용 흐름이 깨진다.
// - draft 필드와 폼 state 계약은 타입과 UX가 함께 얽혀 있어 optional 값 처리 변경 시 복원 로직을 같이 봐야 한다.

import AppTextInput from '../../app/ui/AppTextInput';
import AppText from '../../app/ui/AppText';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  BackHandler,
  Image,
  Keyboard,
  type LayoutChangeEvent,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  KeyboardStickyView,
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Feather from '../../components/icons/NuriFeatherIcon';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { ASSETS } from '../../assets';
import { spacing } from '../../app/theme/tokens/spacing';
import { useAppFontPreference } from '../../app/providers/AppFontPreferenceProvider';
import {
  FIRST_PET_PRESELECTED_FONT_MODE,
  getAppFontModeLabel,
  type AppFontMode,
} from '../../app/typography/appFontMode';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import FirstPetFontSelectorModal from '../../components/onboarding/FirstPetFontSelectorModal';
import AppFontSettingsModal from '../../components/settings/AppFontSettingsModal';
import WaveText from '../../components/common/WaveText';
import DatePickerModal from '../../components/date-picker/DatePickerModal';
import PhotoAddCard from '../../components/media/PhotoAddCard';
import PetThemePicker from '../../components/pets/PetThemePicker';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  getBrandedErrorMeta,
  getErrorMessage,
} from '../../services/app/errors';
import { readFileAsBase64 } from '../../services/files/readFileAsBase64';
import { pickPhotoAssets } from '../../services/media/photoPicker';
import { supabase } from '../../services/supabase/client';
import {
  clearPetCreateDraft,
  loadPetCreateDraft,
  savePetCreateDraft,
} from '../../services/local/onboardingDraft';
import { shouldShowFirstPetFontSelector } from '../../services/local/appFontPreference';
import {
  isFirstPetOnboardingEntry,
  markFirstPetWelcomePending,
} from '../../services/local/firstPetWelcome';
import { captureMonitoringException } from '../../services/monitoring/sentry';
import {
  buildPetThemePalette,
  recommendPetThemeColor,
} from '../../services/pets/themePalette';
import {
  getPetMemorialChoice,
  PET_MEMORIAL_OPTIONS,
  type PetMemorialChoice,
} from '../../services/pets/memorial';
import {
  buildPetSpeciesSelection,
  deriveRepresentativeSpeciesKey,
  getPetSpeciesQuickDetailOptions,
  getRepresentativeSpeciesOption,
  PET_REPRESENTATIVE_SPECIES_OPTIONS,
  resolveSubtypeAfterSpeciesChange,
  type PetRepresentativeSpeciesKey,
} from '../../services/pets/species';
import { normalizeDateInput } from '../../components/date-picker/datePickerUtils';
import {
  createPet,
  fetchMyPets,
  toPublicPetAvatarUrl,
} from '../../services/supabase/pets';
import { upsertPetWeightLog } from '../../services/supabase/petWeightLogs';
import { uploadPetAvatar } from '../../services/supabase/storagePets';
import { usePetStore } from '../../store/petStore';
import { showToast } from '../../store/uiStore';
import { getKstYmd } from '../../utils/date';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import {
  buildRegistrationActionLayout,
  clampRegistrationScrollOffset,
  getRegistrationAddedItemScrollOffset,
  getProfileRegistrationSeasonalPresentation,
  type ProfileRegistrationSeasonalPresentation,
} from './profileRegistrationPresentation';
import { styles } from './PetCreateScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PetCreate'>;
type PetCreateRoute = RouteProp<RootStackParamList, 'PetCreate'>;
type Step = 1 | 2;
type PetGender = 'male' | 'female' | 'unknown';

const MAX_MULTI_ITEMS = 10;
const PROFILE_STATUS_COPY: Record<
  PetMemorialChoice,
  { title: string; description: string }
> = {
  together: {
    title: '함께하고 있어요',
    description: '현재 프로필로 계속 사용해요',
  },
  memorial: {
    title: '추억으로 함께해요',
    description: '추모 프로필과 무지개다리 날짜를 함께 기록해요',
  },
};

function buildRegistrationSeasonalStyles(
  palette: ProfileRegistrationSeasonalPresentation['palette'],
) {
  return {
    screen: { backgroundColor: palette.pageBackgroundColor },
    ambient: { backgroundColor: palette.ambientOverlayColor },
    section: {
      backgroundColor: palette.sectionSurfaceColor,
      borderColor: palette.sectionBorderColor,
    },
    control: {
      backgroundColor: palette.controlSurfaceColor,
      borderColor: palette.controlBorderColor,
    },
    sticky: {
      backgroundColor: palette.stickySurfaceColor,
      borderTopColor: palette.stickyBorderColor,
    },
    primaryText: { color: palette.primaryTextColor },
    secondaryText: { color: palette.secondaryTextColor },
    placeholderTextColor: palette.placeholderTextColor,
    neutralIconColor: palette.neutralIconColor,
  };
}

type RegistrationSeasonalStyles = ReturnType<
  typeof buildRegistrationSeasonalStyles
>;

const RegistrationSeasonalStyleContext =
  React.createContext<RegistrationSeasonalStyles | null>(null);

function useRegistrationSeasonalStyles(): RegistrationSeasonalStyles {
  const value = React.useContext(RegistrationSeasonalStyleContext);

  if (!value) {
    throw new Error('Registration seasonal styles must be provided.');
  }

  return value;
}

function normalizeTextItem(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function normalizeWeightOrNull(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('몸무게는 0보다 큰 숫자여야 합니다.');
  }

  return numeric;
}

function formatYmdDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function normalizeYmdOrNull(raw: string): string | null {
  const normalized = normalizeDateInput(raw);
  if (!raw.trim()) return null;
  if (!normalized) throw new Error('올바른 날짜를 입력해 주세요.');
  return normalized;
}

function ensureMinOne(list: string[], label: string) {
  if (list.length < 1) {
    throw new Error(`${label}은(는) 최소 1개 이상 입력해 주세요.`);
  }
}

function createTagLabel(raw: string): string {
  const base = normalizeTextItem(raw).replace(/^#/, '');
  return base ? `#${base}` : '';
}

function buildDateHint(value: string): string {
  if (!value) return 'YYYY-MM-DD 또는 YYYYMMDD';
  if (value.includes('-')) return value;
  return formatYmdDigits(value);
}

type MultiInputRevealHandler = (
  field: React.ComponentRef<typeof View>,
  input: React.ComponentRef<typeof TextInput>,
) => void;

type MultiInputSectionProps = {
  label: string;
  list: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onFocusInput?: () => void;
  onItemsAdded: MultiInputRevealHandler;
  onAdd: () => void;
  onRemove: (value: string) => void;
  placeholder: string;
  hint?: string;
};

const MultiInputSection = memo(function MultiInputSectionComponent({
  label,
  list,
  draft,
  onDraftChange,
  onFocusInput,
  onItemsAdded,
  onAdd,
  onRemove,
  placeholder,
  hint,
}: MultiInputSectionProps) {
  const seasonalStyles = useRegistrationSeasonalStyles();
  const inputRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);
  const fieldRef = useRef<React.ComponentRef<typeof View> | null>(null);
  const pendingAddLengthRef = useRef<number | null>(null);
  const addAndContinue = useCallback(() => {
    pendingAddLengthRef.current = list.length;
    onAdd();
    // Keep the same field ready for the next item after the chip is added.
    inputRef.current?.focus();
  }, [list.length, onAdd]);

  useEffect(() => {
    const previousLength = pendingAddLengthRef.current;
    pendingAddLengthRef.current = null;
    if (previousLength === null || list.length <= previousLength) return;

    // Wait for the committed chip layout, not a guessed keyboard delay.
    const frame = requestAnimationFrame(() => {
      const field = fieldRef.current;
      const input = inputRef.current;
      if (field && input?.isFocused()) onItemsAdded(field, input);
    });
    return () => cancelAnimationFrame(frame);
  }, [draft, list.length, onItemsAdded]);

  return (
    <View ref={fieldRef} collapsable={false} style={styles.fieldBlock}>
      <View style={styles.fieldLabelRow}>
        <AppText
          preset="unifiedLabel"
          style={[styles.label, seasonalStyles.primaryText]}
        >
          {label}
        </AppText>
        <AppText
          preset="unifiedLabel"
          style={[styles.countText, seasonalStyles.secondaryText]}
        >
          {list.length}/{MAX_MULTI_ITEMS}
        </AppText>
      </View>

      <View style={styles.tagInputRow}>
        <AppTextInput
          ref={inputRef}
          accessibilityLabel={label}
          value={draft}
          onChangeText={onDraftChange}
          onFocus={onFocusInput}
          placeholder={placeholder}
          placeholderTextColor={seasonalStyles.placeholderTextColor}
          style={[
            styles.input,
            styles.tagInput,
            seasonalStyles.control,
            seasonalStyles.primaryText,
          ]}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={addAndContinue}
        />
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.inlineAddButton}
          accessibilityRole="button"
          accessibilityLabel={`${label} 추가`}
          onPress={addAndContinue}
        >
          <AppText preset="unifiedLabel" style={styles.inlineAddButtonText}>
            추가
          </AppText>
        </TouchableOpacity>
      </View>

      {hint ? (
        <AppText
          preset="unifiedBody"
          style={[styles.inputHint, seasonalStyles.secondaryText]}
        >
          {hint}
        </AppText>
      ) : null}

      <View style={styles.pillRow}>
        {list.map(item => (
          <TouchableOpacity
            key={item}
            activeOpacity={0.88}
            style={styles.pill}
            onPress={() => onRemove(item)}
          >
            <AppText preset="unifiedLabel" style={styles.pillText}>
              {item}
            </AppText>
            <AppText preset="unifiedLabel" style={styles.pillX}>
              ×
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

type RegistrationFontFieldProps = {
  fontLabel: string;
  fontSettingsDisabled: boolean;
  onOpenFontSettings: () => void;
};

/** The persisted app-wide preference is selectable beside registration fields. */
const RegistrationFontField = memo(function RegistrationFontFieldComponent({
  fontLabel,
  fontSettingsDisabled,
  onOpenFontSettings,
}: RegistrationFontFieldProps) {
  const seasonalStyles = useRegistrationSeasonalStyles();
  return (
    <View style={styles.fieldBlock} testID="pet-create-font-field">
      <AppText
        preset="unifiedLabel"
        style={[styles.label, seasonalStyles.primaryText]}
      >
        앱 글꼴
      </AppText>
      <TouchableOpacity
        testID="pet-create-font-settings"
        accessibilityRole="button"
        accessibilityLabel="앱 글꼴 선택"
        accessibilityValue={{ text: fontLabel }}
        accessibilityState={{ disabled: fontSettingsDisabled }}
        activeOpacity={0.85}
        disabled={fontSettingsDisabled}
        style={[
          styles.iconInputWrap,
          styles.fontSelectField,
          seasonalStyles.control,
        ]}
        onPress={onOpenFontSettings}
      >
        <AppText
          preset="unifiedBody"
          style={[styles.fontSelectValue, seasonalStyles.primaryText]}
        >
          {fontLabel}
        </AppText>
        <Feather
          name="chevron-down"
          size={18}
          color={seasonalStyles.neutralIconColor}
        />
      </TouchableOpacity>
    </View>
  );
});

type StepOneFormProps = RegistrationFontFieldProps & {
  imageUri: string | null;
  onPickImage: () => void;
  selectedThemeColor: string;
  onSelectThemeColor: (color: string) => void;
  memorialChoice: PetMemorialChoice;
  deathDate: string;
  onChangeMemorialChoice: (choice: PetMemorialChoice) => void;
  onDeathDateChange: (value: string) => void;
  onDeathDateBlur: () => void;
  onOpenDeathDateModal: () => void;
  name: string;
  onNameChange: (value: string) => void;
  birthDate: string;
  onBirthDateChange: (value: string) => void;
  onBirthDateBlur: () => void;
  onOpenBirthModal: () => void;
  adoptionDate: string;
  onAdoptionDateChange: (value: string) => void;
  onAdoptionDateBlur: () => void;
  onOpenAdoptionModal: () => void;
  representativeSpecies: PetRepresentativeSpeciesKey;
  onRepresentativeSpeciesChange: (value: PetRepresentativeSpeciesKey) => void;
  speciesDetailKey: string;
  onSpeciesDetailKeyChange: (value: string) => void;
  onSpeciesDetailFocus: () => void;
  speciesDetailInputRef: React.RefObject<React.ComponentRef<
    typeof TextInput
  > | null>;
  gender: PetGender;
  onGenderChange: (value: PetGender) => void;
  neutered: boolean | null;
  onNeuteredChange: (value: boolean) => void;
};

const StepOneForm = memo(function StepOneFormComponent({
  fontLabel,
  fontSettingsDisabled,
  onOpenFontSettings,
  imageUri,
  onPickImage,
  selectedThemeColor,
  onSelectThemeColor,
  memorialChoice,
  deathDate,
  onChangeMemorialChoice,
  onDeathDateChange,
  onDeathDateBlur,
  onOpenDeathDateModal,
  name,
  onNameChange,
  birthDate,
  onBirthDateChange,
  onBirthDateBlur,
  onOpenBirthModal,
  adoptionDate,
  onAdoptionDateChange,
  onAdoptionDateBlur,
  onOpenAdoptionModal,
  representativeSpecies,
  onRepresentativeSpeciesChange,
  speciesDetailKey,
  onSpeciesDetailKeyChange,
  onSpeciesDetailFocus,
  speciesDetailInputRef,
  gender,
  onGenderChange,
  neutered,
  onNeuteredChange,
}: StepOneFormProps) {
  const seasonalStyles = useRegistrationSeasonalStyles();
  const selectedTheme = buildPetThemePalette(selectedThemeColor);
  const representativeOption = getRepresentativeSpeciesOption(
    representativeSpecies,
  );
  const quickDetailOptions = getPetSpeciesQuickDetailOptions(
    representativeSpecies,
  );

  return (
    <>
      <View style={styles.avatarSection}>
        <View
          style={[
            styles.avatarHalo,
            {
              backgroundColor: selectedTheme.glow,
              shadowColor: selectedTheme.primary,
            },
          ]}
        >
          <PhotoAddCard
            imageUri={imageUri}
            onPress={onPickImage}
            containerStyle={[
              styles.avatarCircle,
              { borderColor: selectedTheme.primary },
            ]}
            imageStyle={styles.avatarImage}
            placeholderStyle={styles.avatarPlaceholder}
            placeholderIconColor={selectedTheme.primary}
            placeholderIconSize={22}
            placeholderText="사진 추가"
            placeholderTextStyle={[
              styles.avatarPlaceholderText,
              { color: selectedTheme.deep },
            ]}
            editButtonStyle={[
              styles.avatarEditButton,
              { backgroundColor: selectedTheme.primary },
            ]}
            editIconName="camera"
            editIconSize={14}
            editIconColor={selectedTheme.onPrimary}
            showEditButton={false}
          />
        </View>
        <AppText typographyRole="heroCopy"
          preset="unifiedTitle"
          style={[styles.heroCopy, seasonalStyles.primaryText]}
        >
          우리 아이의 첫 프로필을 만들어볼까요?
        </AppText>
        <AppText
          preset="unifiedBody"
          style={[styles.heroHelper, seasonalStyles.secondaryText]}
        >
          사진과 기본 정보를 차근차근 알려주세요.
        </AppText>
      </View>

      <View style={[styles.sectionGlass, seasonalStyles.section]}>
        <PetThemePicker
          embedded
          selectedColor={selectedThemeColor}
          title="프로필 컬러"
          helperText="홈과 위젯의 강조색으로 사용돼요."
          onSelectColor={onSelectThemeColor}
        />
        <RegistrationFontField
          fontLabel={fontLabel}
          fontSettingsDisabled={fontSettingsDisabled}
          onOpenFontSettings={onOpenFontSettings}
        />
      </View>

      <View style={[styles.sectionGlass, seasonalStyles.section]}>
        <View style={styles.sectionHeader}>
          <AppText typographyRole="sectionTitle"
            preset="unifiedTitle"
            style={[styles.sectionTitle, seasonalStyles.primaryText]}
          >
            프로필 상태
          </AppText>
          <AppText
            preset="unifiedBody"
            style={[styles.sectionHelper, seasonalStyles.secondaryText]}
          >
            우리 아이와 함께하는 방식을 선택해 주세요.
          </AppText>
        </View>
        <View style={styles.memorialOptionRow}>
          {PET_MEMORIAL_OPTIONS.map(option => {
            const active = option.key === memorialChoice;
            const copy = PROFILE_STATUS_COPY[option.key];

            return (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.9}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[
                  styles.memorialOption,
                  active
                    ? {
                        backgroundColor: selectedTheme.tint,
                        borderColor: selectedTheme.primary,
                      }
                    : seasonalStyles.control,
                ]}
                onPress={() => onChangeMemorialChoice(option.key)}
              >
                <Feather
                  name="heart"
                  size={18}
                  color={
                    active
                      ? selectedTheme.primary
                      : seasonalStyles.neutralIconColor
                  }
                />
                <AppText
                  preset="unifiedLabel"
                  style={[
                    styles.memorialTitle,
                    active ? { color: selectedTheme.deep } : null,
                  ]}
                >
                  {copy.title}
                </AppText>
                <AppText
                  preset="unifiedMeta"
                  style={[
                    styles.memorialDescription,
                    seasonalStyles.secondaryText,
                  ]}
                >
                  {copy.description}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {memorialChoice === 'memorial' ? (
          <View style={styles.fieldBlock}>
            <AppText
              preset="unifiedLabel"
              style={[styles.label, seasonalStyles.primaryText]}
            >
              무지개다리를 건넌 날짜
            </AppText>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.iconInputWrap, seasonalStyles.control]}
              onPress={onOpenDeathDateModal}
            >
              <AppTextInput
                editable={false}
                pointerEvents="none"
                value={deathDate}
                onChangeText={onDeathDateChange}
                onBlur={onDeathDateBlur}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={seasonalStyles.placeholderTextColor}
                style={[styles.iconInput, seasonalStyles.primaryText]}
              />
              <Feather
                color={seasonalStyles.neutralIconColor}
                name="calendar"
                size={16}
              />
            </TouchableOpacity>
            <AppText
              preset="unifiedBody"
              style={[styles.inputHint, seasonalStyles.secondaryText]}
            >
              {buildDateHint(deathDate)}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={[styles.sectionGlass, seasonalStyles.section]}>
        <View style={styles.sectionHeader}>
          <AppText typographyRole="sectionTitle"
            preset="unifiedTitle"
            style={[styles.sectionTitle, seasonalStyles.primaryText]}
          >
            기본 정보
          </AppText>
          <AppText
            preset="unifiedBody"
            style={[styles.sectionHelper, seasonalStyles.secondaryText]}
          >
            우리 아이의 기본 정보를 알려주세요.
          </AppText>
        </View>

        <View style={styles.fieldBlock}>
          <AppText
            preset="unifiedLabel"
            style={[styles.label, seasonalStyles.primaryText]}
          >
            반려동물 이름
          </AppText>
          <AppTextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="이름을 입력해 주세요"
            placeholderTextColor={seasonalStyles.placeholderTextColor}
            style={[
              styles.input,
              seasonalStyles.control,
              seasonalStyles.primaryText,
            ]}
            returnKeyType="done"
          />
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <AppText
              preset="unifiedLabel"
              style={[styles.label, seasonalStyles.primaryText]}
            >
              생일
            </AppText>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.iconInputWrap, seasonalStyles.control]}
              onPress={onOpenBirthModal}
            >
              <AppTextInput
                value={birthDate}
                onChangeText={onBirthDateChange}
                onBlur={onBirthDateBlur}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={seasonalStyles.placeholderTextColor}
                style={[styles.iconInput, seasonalStyles.primaryText]}
                editable={false}
                pointerEvents="none"
              />
              <Feather
                color={seasonalStyles.neutralIconColor}
                name="calendar"
                size={15}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.col}>
            <AppText
              preset="unifiedLabel"
              style={[styles.label, seasonalStyles.primaryText]}
            >
              입양일
            </AppText>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.iconInputWrap, seasonalStyles.control]}
              onPress={onOpenAdoptionModal}
            >
              <AppTextInput
                value={adoptionDate}
                onChangeText={onAdoptionDateChange}
                onBlur={onAdoptionDateBlur}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={seasonalStyles.placeholderTextColor}
                style={[styles.iconInput, seasonalStyles.primaryText]}
                editable={false}
                pointerEvents="none"
              />
              <Feather
                color={seasonalStyles.neutralIconColor}
                name="calendar"
                size={15}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <AppText
            preset="unifiedLabel"
            style={[styles.label, seasonalStyles.primaryText]}
          >
            대표 동물
          </AppText>
          <View style={styles.segmentWrap}>
            {PET_REPRESENTATIVE_SPECIES_OPTIONS.map(option => {
              const active = representativeSpecies === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.88}
                  style={[
                    styles.segmentChip,
                    styles.segmentChipWide,
                    active
                      ? {
                          backgroundColor: selectedTheme.tint,
                          borderColor: selectedTheme.primary,
                        }
                      : seasonalStyles.control,
                  ]}
                  onPress={() => onRepresentativeSpeciesChange(option.key)}
                >
                  <AppText
                    preset="unifiedLabel"
                    style={[
                      styles.segmentChipText,
                      active ? { color: selectedTheme.deep } : null,
                    ]}
                  >
                    {option.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
          <AppText
            preset="unifiedBody"
            style={[styles.inputHint, seasonalStyles.secondaryText]}
          >
            {representativeOption.description}
          </AppText>
        </View>

        <View style={styles.fieldBlock}>
          <AppText
            preset="unifiedLabel"
            style={[styles.label, seasonalStyles.primaryText]}
          >
            {representativeOption.detailLabel}
          </AppText>
          {quickDetailOptions.length > 0 ? (
            <View style={styles.segmentWrap}>
              {quickDetailOptions.map(option => {
                const active = speciesDetailKey.trim() === option.label;
                return (
                  <TouchableOpacity
                    key={option.detailKey}
                    activeOpacity={0.88}
                    style={[
                      styles.quickChip,
                      active
                        ? {
                            backgroundColor: selectedTheme.tint,
                            borderColor: selectedTheme.primary,
                          }
                        : seasonalStyles.control,
                    ]}
                    onPress={() => onSpeciesDetailKeyChange(option.label)}
                  >
                    <AppText
                      preset="unifiedLabel"
                      style={[
                        styles.quickChipText,
                        active ? { color: selectedTheme.deep } : null,
                      ]}
                    >
                      {option.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          <View style={[styles.iconInputWrap, seasonalStyles.control]}>
            <AppTextInput
              ref={speciesDetailInputRef}
              value={speciesDetailKey}
              onChangeText={onSpeciesDetailKeyChange}
              onFocus={onSpeciesDetailFocus}
              placeholder={representativeOption.placeholders.detail}
              placeholderTextColor={seasonalStyles.placeholderTextColor}
              style={[styles.iconInput, seasonalStyles.primaryText]}
              autoCapitalize="none"
              returnKeyType="done"
            />
            <Feather
              color={seasonalStyles.neutralIconColor}
              name="search"
              size={16}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <AppText
              preset="unifiedLabel"
              style={[styles.label, seasonalStyles.primaryText]}
            >
              성별
            </AppText>
            <View style={styles.segmentRow}>
              {(['female', 'male'] as const).map(value => {
                const active = gender === value;
                return (
                  <TouchableOpacity
                    key={value}
                    activeOpacity={0.88}
                    style={[
                      styles.segmentChip,
                      active
                        ? {
                            backgroundColor: selectedTheme.tint,
                            borderColor: selectedTheme.primary,
                          }
                        : seasonalStyles.control,
                    ]}
                    onPress={() => onGenderChange(value)}
                  >
                    <AppText
                      preset="unifiedLabel"
                      style={[
                        styles.segmentChipText,
                        active ? { color: selectedTheme.deep } : null,
                      ]}
                    >
                      {value === 'female' ? '여아' : '남아'}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.col}>
            <AppText
              preset="unifiedLabel"
              style={[styles.label, seasonalStyles.primaryText]}
            >
              중성화 여부
            </AppText>
            <View style={styles.segmentRow}>
              {([true, false] as const).map(value => {
                const active = neutered === value;
                return (
                  <TouchableOpacity
                    key={String(value)}
                    activeOpacity={0.88}
                    style={[
                      styles.segmentChip,
                      active
                        ? {
                            backgroundColor: selectedTheme.tint,
                            borderColor: selectedTheme.primary,
                          }
                        : seasonalStyles.control,
                    ]}
                    onPress={() => onNeuteredChange(value)}
                  >
                    <AppText
                      preset="unifiedLabel"
                      style={[
                        styles.segmentChipText,
                        active ? { color: selectedTheme.deep } : null,
                      ]}
                    >
                      {value ? '예' : '아니오'}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </>
  );
});

type StepTwoFormProps = RegistrationFontFieldProps & {
  weightKg: string;
  onWeightChange: (value: string) => void;
  onFieldFocus: () => void;
  onItemsAdded: MultiInputRevealHandler;
  likes: string[];
  draftLike: string;
  onDraftLikeChange: (value: string) => void;
  onAddLike: () => void;
  onRemoveLike: (value: string) => void;
  dislikes: string[];
  draftDislike: string;
  onDraftDislikeChange: (value: string) => void;
  onAddDislike: () => void;
  onRemoveDislike: (value: string) => void;
  hobbies: string[];
  draftHobby: string;
  onDraftHobbyChange: (value: string) => void;
  onAddHobby: () => void;
  onRemoveHobby: (value: string) => void;
  tags: string[];
  draftTag: string;
  onDraftTagChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (value: string) => void;
};

const StepTwoForm = memo(function StepTwoFormComponent({
  fontLabel,
  fontSettingsDisabled,
  onOpenFontSettings,
  weightKg,
  onWeightChange,
  onFieldFocus,
  onItemsAdded,
  likes,
  draftLike,
  onDraftLikeChange,
  onAddLike,
  onRemoveLike,
  dislikes,
  draftDislike,
  onDraftDislikeChange,
  onAddDislike,
  onRemoveDislike,
  hobbies,
  draftHobby,
  onDraftHobbyChange,
  onAddHobby,
  onRemoveHobby,
  tags,
  draftTag,
  onDraftTagChange,
  onAddTag,
  onRemoveTag,
}: StepTwoFormProps) {
  const seasonalStyles = useRegistrationSeasonalStyles();

  return (
    <>
      <View style={styles.continuationIntro}>
        <AppText typographyRole="screenTitle"
          preset="unifiedTitle"
          style={[styles.continuationTitle, seasonalStyles.primaryText]}
        >
          마지막으로, 우리 아이의 취향을 알려주세요
        </AppText>
        <AppText
          preset="unifiedBody"
          style={[styles.continuationBody, seasonalStyles.secondaryText]}
        >
          입력한 정보는 맞춤 기록과 추억을 정리하는 데 사용돼요.
        </AppText>
      </View>

      <View style={[styles.sectionGlass, seasonalStyles.section]}>
        <View style={styles.sectionHeader}>
          <AppText typographyRole="sectionTitle"
            preset="unifiedTitle"
            style={[styles.sectionTitle, seasonalStyles.primaryText]}
          >
            상세 정보
          </AppText>
          <AppText
            preset="unifiedBody"
            style={[styles.sectionHelper, seasonalStyles.secondaryText]}
          >
            체중과 평소 취향을 간단히 기록해 주세요.
          </AppText>
        </View>

        <RegistrationFontField
          fontLabel={fontLabel}
          fontSettingsDisabled={fontSettingsDisabled}
          onOpenFontSettings={onOpenFontSettings}
        />

        <View style={styles.fieldBlock}>
          <AppText
            preset="unifiedLabel"
            style={[styles.label, seasonalStyles.primaryText]}
          >
            몸무게
          </AppText>
          <View style={[styles.iconInputWrap, seasonalStyles.control]}>
            <AppTextInput
              value={weightKg}
              onChangeText={onWeightChange}
              onFocus={onFieldFocus}
              placeholder="0.0"
              placeholderTextColor={seasonalStyles.placeholderTextColor}
              style={[styles.iconInput, seasonalStyles.primaryText]}
              keyboardType="decimal-pad"
            />
            <AppText
              preset="unifiedLabel"
              style={[styles.trailingUnit, seasonalStyles.secondaryText]}
            >
              kg
            </AppText>
          </View>
        </View>

        <MultiInputSection
          label="좋아하는 것 (최소 1개)"
          list={likes}
          draft={draftLike}
          onDraftChange={onDraftLikeChange}
          onFocusInput={onFieldFocus}
          onItemsAdded={onItemsAdded}
          onAdd={onAddLike}
          onRemove={onRemoveLike}
          placeholder="좋아하는 간식, 장난감 등"
        />

        <MultiInputSection
          label="싫어하는 것 (최소 1개)"
          list={dislikes}
          draft={draftDislike}
          onDraftChange={onDraftDislikeChange}
          onFocusInput={onFieldFocus}
          onItemsAdded={onItemsAdded}
          onAdd={onAddDislike}
          onRemove={onRemoveDislike}
          placeholder="싫어하는 소리, 행동 등"
        />

        <MultiInputSection
          label="취미 (최소 1개)"
          list={hobbies}
          draft={draftHobby}
          onDraftChange={onDraftHobbyChange}
          onFocusInput={onFieldFocus}
          onItemsAdded={onItemsAdded}
          onAdd={onAddHobby}
          onRemove={onRemoveHobby}
          placeholder="산책하기, 낮잠자기 등"
        />
      </View>

      <View style={[styles.sectionGlass, seasonalStyles.section]}>
        <View style={styles.sectionHeader}>
          <AppText typographyRole="sectionTitle"
            preset="unifiedTitle"
            style={[styles.sectionTitle, seasonalStyles.primaryText]}
          >
            태그
          </AppText>
          <AppText
            preset="unifiedBody"
            style={[styles.sectionHelper, seasonalStyles.secondaryText]}
          >
            우리 아이를 잘 보여주는 키워드를 남겨주세요.
          </AppText>
        </View>
        <MultiInputSection
          label="태그 (최소 1개)"
          list={tags}
          draft={draftTag}
          onDraftChange={onDraftTagChange}
          onFocusInput={onFieldFocus}
          onItemsAdded={onItemsAdded}
          onAdd={onAddTag}
          onRemove={onRemoveTag}
          placeholder="우리 아이를 표현해 주세요"
          hint="태그는 저장 시 #이 자동으로 붙습니다."
        />
      </View>
    </>
  );
});

export default function PetCreateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PetCreateRoute>();
  const routeFrom = route.params?.from ?? null;
  const currentRouteIndex = navigation
    .getState()
    .routes.findIndex(candidate => candidate.key === route.key);
  const previousRouteName =
    currentRouteIndex > 0
      ? navigation.getState().routes[currentRouteIndex - 1]?.name ?? null
      : null;
  const isFirstOnboardingCompletionRef = useRef(
    isFirstPetOnboardingEntry({
      entrySource: routeFrom,
      previousRouteName,
    }),
  );
  const {
    mode: appFontMode,
    hydrated: fontPreferenceHydrated,
    hasStoredPreference,
    setMode: setAppFontMode,
  } = useAppFontPreference();
  const insets = useSafeAreaInsets();
  const { progress: keyboardProgress } = useReanimatedKeyboardAnimation();
  const setPets = usePetStore(s => s.setPets);
  const upsertPet = usePetStore(s => s.upsertPet);
  const updatePetAvatar = usePetStore(s => s.updatePetAvatar);

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [fontSelectionSaving, setFontSelectionSaving] = useState(false);
  const [fontSettingsVisible, setFontSettingsVisible] = useState(false);
  const [selectedFontMode, setSelectedFontMode] = useState<AppFontMode>(
    FIRST_PET_PRESELECTED_FONT_MODE,
  );

  const [name, setName] = useState('');
  const [representativeSpecies, setRepresentativeSpecies] =
    useState<PetRepresentativeSpeciesKey>('OTHER');
  const [speciesDetailKey, setSpeciesDetailKey] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [adoptionDate, setAdoptionDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [memorialChoice, setMemorialChoice] =
    useState<PetMemorialChoice>('together');
  const [gender, setGender] = useState<PetGender>('unknown');
  const [neutered, setNeutered] = useState<boolean | null>(null);

  const [weightKg, setWeightKg] = useState('');
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const [draftLike, setDraftLike] = useState('');
  const [draftDislike, setDraftDislike] = useState('');
  const [draftHobby, setDraftHobby] = useState('');
  const [draftTag, setDraftTag] = useState('');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState<string | null>(null);
  const [createdPetName, setCreatedPetName] = useState<string | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [dateModalTarget, setDateModalTarget] = useState<
    'birth' | 'adoption' | 'death' | null
  >(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [actionZoneHeight, setActionZoneHeight] = useState(0);
  const draftLoadOnceRef = useRef(false);
  const showFirstPetFontSelector = shouldShowFirstPetFontSelector({
    hydrated: fontPreferenceHydrated,
    hasStoredPreference,
    isFirstPetOnboardingEntry: isFirstOnboardingCompletionRef.current,
  });

  const confirmFirstPetFontSelection = useCallback(async () => {
    if (fontSelectionSaving) return;

    setFontSelectionSaving(true);
    try {
      await setAppFontMode(selectedFontMode);
    } catch (error) {
      captureMonitoringException(error);
      showToast({
        tone: 'error',
        title: '글꼴을 저장하지 못했어요',
        message: '잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setFontSelectionSaving(false);
    }
  }, [fontSelectionSaving, selectedFontMode, setAppFontMode]);
  const keyboardScrollRef = useRef<KeyboardAwareScrollViewRef | null>(null);
  const scrollMetricsRef = useRef({
    contentHeight: 0,
    offsetY: 0,
    viewportHeight: 0,
  });
  const speciesDetailInputRef = useRef<React.ComponentRef<
    typeof TextInput
  > | null>(null);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const canGoNext = useMemo(() => {
    if (trimmedName.length < 1) return false;
    return true;
  }, [trimmedName]);
  const showStepOneExitButton = useMemo(
    () => routeFrom === 'header_plus',
    [routeFrom],
  );

  const canSubmit = useMemo(() => {
    if (saving) return false;
    if (trimmedName.length < 1) return false;
    if (likes.length < 1) return false;
    if (dislikes.length < 1) return false;
    if (hobbies.length < 1) return false;
    if (tags.length < 1) return false;
    return true;
  }, [
    dislikes.length,
    hobbies.length,
    likes.length,
    saving,
    tags.length,
    trimmedName.length,
  ]);

  const syncDateInput = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string>>, raw: string) => {
      const sanitized = raw.replace(/[^\d-]/g, '');
      const hasManualDaySeparator =
        sanitized.split('-').length >= 3 || sanitized.endsWith('-');

      if (sanitized.includes('-') && hasManualDaySeparator) {
        const [y = '', m = '', d = ''] = sanitized.split('-');
        const year = y.replace(/\D/g, '').slice(0, 4);
        const month = m.replace(/\D/g, '').slice(0, 2);
        const day = d.replace(/\D/g, '').slice(0, 2);

        let composed = year;
        if (sanitized.includes('-') || month) composed += `-${month}`;
        if (sanitized.split('-').length >= 3 || day) composed += `-${day}`;

        setter(composed.slice(0, 10));
        return;
      }

      const digits = sanitized.replace(/\D/g, '').slice(0, 8);
      setter(formatYmdDigits(digits));
    },
    [],
  );

  const finalizeDateInput = useCallback(
    (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      try {
        const normalized = normalizeYmdOrNull(trimmed);
        setter(normalized ?? '');
      } catch {
        // 입력 중간 단계에서는 사용자가 수정할 수 있도록 값을 유지한다.
      }
    },
    [],
  );

  const pickImage = useCallback(async () => {
    try {
      const result = await pickPhotoAssets({
        selectionLimit: 1,
        quality: 0.9,
      });
      if (result.status === 'cancelled') return;

      const asset = result.assets[0];

      setImageUri(asset.uri);
      setImageType(asset.mimeType);
      try {
        const base64 = await readFileAsBase64(asset.uri);
        setThemeColor(
          recommendPetThemeColor({
            imageBase64: base64,
            name: trimmedName,
          }),
        );
      } catch {
        setThemeColor(
          recommendPetThemeColor({
            name: trimmedName,
          }),
        );
      }
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'image-pick');
      showToast({ tone: 'error', title, message });
    }
  }, [trimmedName]);

  const openDateModal = useCallback(
    (target: 'birth' | 'adoption' | 'death') => {
      setDateModalTarget(target);
    },
    [],
  );

  const closeDateModal = useCallback(() => {
    setDateModalTarget(null);
  }, []);

  const dateModalInitialValue = useMemo(() => {
    if (dateModalTarget === 'birth') return birthDate;
    if (dateModalTarget === 'adoption') return adoptionDate;
    if (dateModalTarget === 'death') return deathDate;
    return null;
  }, [adoptionDate, birthDate, dateModalTarget, deathDate]);

  const dateModalTitle = useMemo(() => {
    if (dateModalTarget === 'birth') return '생일 선택';
    if (dateModalTarget === 'adoption') return '입양일 선택';
    if (dateModalTarget === 'death') return '추모 날짜 선택';
    return '날짜 선택';
  }, [dateModalTarget]);

  const onConfirmDateModal = useCallback(
    (date: Date) => {
      try {
        const normalized = normalizeYmdOrNull(
          `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(
            2,
            '0',
          )}-${`${date.getDate()}`.padStart(2, '0')}`,
        );
        if (dateModalTarget === 'birth') {
          setBirthDate(normalized ?? '');
        }
        if (dateModalTarget === 'adoption') {
          setAdoptionDate(normalized ?? '');
        }
        if (dateModalTarget === 'death') {
          setDeathDate(normalized ?? '');
        }
        setDateModalTarget(null);
      } catch (error) {
        Alert.alert('날짜 확인', getErrorMessage(error));
      }
    },
    [dateModalTarget],
  );
  const selectedThemeColor = useMemo(
    () =>
      themeColor ??
      recommendPetThemeColor({
        name: trimmedName,
      }),
    [themeColor, trimmedName],
  );
  const selectedTheme = useMemo(
    () => buildPetThemePalette(selectedThemeColor),
    [selectedThemeColor],
  );
  const effectiveSeason = useEffectiveSeason();
  const registrationPresentation = useMemo(
    () =>
      getProfileRegistrationSeasonalPresentation(
        effectiveSeason,
      ),
    [effectiveSeason],
  );
  const seasonalStyles = useMemo(
    () => buildRegistrationSeasonalStyles(registrationPresentation.palette),
    [registrationPresentation],
  );
  const actionLayout = useMemo(
    () =>
      buildRegistrationActionLayout({
        safeAreaBottom: insets.bottom,
        actionZonePadding: spacing.md,
        measuredActionZoneHeight: actionZoneHeight,
      }),
    [actionZoneHeight, insets.bottom],
  );
  const stickyActionInsetStyle = useAnimatedStyle(
    () => ({
      paddingBottom: interpolate(
        keyboardProgress.value,
        [0, 1],
        [actionLayout.closedBottom, actionLayout.openBottom],
      ),
    }),
    [actionLayout.closedBottom, actionLayout.openBottom],
  );

  const clampScrollToContentBounds = useCallback(() => {
    const nextOffsetY = clampRegistrationScrollOffset(scrollMetricsRef.current);

    if (nextOffsetY === scrollMetricsRef.current.offsetY) return;

    scrollMetricsRef.current.offsetY = nextOffsetY;
    keyboardScrollRef.current?.scrollTo({
      x: 0,
      y: nextOffsetY,
      animated: false,
    });
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollMetricsRef.current.offsetY = Math.max(
        0,
        event.nativeEvent.contentOffset.y,
      );
    },
    [],
  );

  const handleScrollLayout = useCallback((event: LayoutChangeEvent) => {
    scrollMetricsRef.current.viewportHeight = event.nativeEvent.layout.height;
  }, []);

  const handleScrollContentSizeChange = useCallback(
    (_width: number, height: number) => {
      const previousHeight = scrollMetricsRef.current.contentHeight;
      scrollMetricsRef.current.contentHeight = height;

      if (height < previousHeight) {
        requestAnimationFrame(clampScrollToContentBounds);
      }
    },
    [clampScrollToContentBounds],
  );

  const handleScrollEnd = useCallback(() => {
    requestAnimationFrame(clampScrollToContentBounds);
  }, [clampScrollToContentBounds]);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      requestAnimationFrame(clampScrollToContentBounds);
    });

    return () => subscription.remove();
  }, [clampScrollToContentBounds]);

  useEffect(() => {
    if (imageUri) return;
    setThemeColor(
      recommendPetThemeColor({
        name: trimmedName,
      }),
    );
  }, [imageUri, trimmedName]);

  useEffect(() => {
    if (memorialChoice === 'memorial') return;
    if (!deathDate) return;
    setDeathDate('');
  }, [deathDate, memorialChoice]);

  useEffect(() => {
    let mounted = true;

    async function hydrateDraft() {
      if (draftLoadOnceRef.current) return;
      draftLoadOnceRef.current = true;
      try {
        const draft = await loadPetCreateDraft();
        if (!mounted) return;

        if (draft) {
          setStep(draft.step);
          setName(draft.name);
          setRepresentativeSpecies(
            deriveRepresentativeSpeciesKey({
              species: draft.species ?? 'other',
              speciesKey: draft.speciesKey,
              speciesDetailKey: draft.speciesDetailKey,
              speciesDisplayName: draft.speciesDisplayName,
            }),
          );
          setSpeciesDetailKey(
            draft.speciesDisplayName ?? draft.speciesDetailKey ?? '',
          );
          setBirthDate(draft.birthDate);
          setAdoptionDate(draft.adoptionDate);
          setDeathDate(draft.deathDate ?? '');
          setThemeColor(draft.themeColor ?? null);
          setGender(draft.gender);
          setMemorialChoice(
            draft.memorialChoice ?? getPetMemorialChoice(draft.deathDate),
          );
          setNeutered(draft.neutered);

          setWeightKg(draft.weightKg);
          setLikes(Array.isArray(draft.likes) ? draft.likes : []);
          setDislikes(Array.isArray(draft.dislikes) ? draft.dislikes : []);
          setHobbies(Array.isArray(draft.hobbies) ? draft.hobbies : []);
          setTags(Array.isArray(draft.tags) ? draft.tags : []);

          setDraftLike(draft.draftLike);
          setDraftDislike(draft.draftDislike);
          setDraftHobby(draft.draftHobby);
          setDraftTag(draft.draftTag);

          setImageUri(draft.imageUri);
          setImageType(draft.imageType);
        }
      } finally {
        if (mounted) setDraftHydrated(true);
      }
    }

    hydrateDraft().catch(() => {
      if (mounted) setDraftHydrated(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!draftHydrated || saving || successModalVisible) return;

    const timer = setTimeout(() => {
      const speciesSelection = buildPetSpeciesSelection(
        representativeSpecies,
        speciesDetailKey,
      );

      savePetCreateDraft({
        step,
        name,
        species: speciesSelection.species,
        speciesKey: speciesSelection.speciesKey,
        speciesDetailKey,
        speciesDisplayName: speciesSelection.speciesDisplayName,
        birthDate,
        adoptionDate,
        deathDate,
        themeColor: selectedThemeColor,
        gender,
        memorialChoice,
        neutered,
        weightKg,
        likes,
        dislikes,
        hobbies,
        tags,
        draftLike,
        draftDislike,
        draftHobby,
        draftTag,
        imageUri,
        imageType,
      }).catch(() => {
        // ignore draft persist errors
      });
    }, 260);

    return () => clearTimeout(timer);
  }, [
    adoptionDate,
    birthDate,
    deathDate,
    representativeSpecies,
    speciesDetailKey,
    dislikes,
    draftDislike,
    draftHobby,
    draftHydrated,
    draftLike,
    draftTag,
    gender,
    hobbies,
    imageType,
    imageUri,
    likes,
    name,
    neutered,
    saving,
    selectedThemeColor,
    step,
    successModalVisible,
    memorialChoice,
    tags,
    weightKg,
  ]);

  const pushUniqueValue = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<string[]>>,
      raw: string,
      transform?: (value: string) => string,
    ) => {
      const normalizedBase = normalizeTextItem(raw);
      if (!normalizedBase) return;

      const value = transform ? transform(normalizedBase) : normalizedBase;
      if (!value) return;

      setter(prev => {
        if (prev.includes(value)) return prev;
        return [...prev, value].slice(0, MAX_MULTI_ITEMS);
      });
    },
    [],
  );

  const addItem = useCallback(
    (kind: 'likes' | 'dislikes' | 'hobbies' | 'tags') => {
      if (kind === 'likes') {
        pushUniqueValue(setLikes, draftLike);
        setDraftLike('');
        return;
      }
      if (kind === 'dislikes') {
        pushUniqueValue(setDislikes, draftDislike);
        setDraftDislike('');
        return;
      }
      if (kind === 'hobbies') {
        pushUniqueValue(setHobbies, draftHobby);
        setDraftHobby('');
        return;
      }

      pushUniqueValue(setTags, draftTag, createTagLabel);
      setDraftTag('');
    },
    [draftDislike, draftHobby, draftLike, draftTag, pushUniqueValue],
  );

  const removeItem = useCallback(
    (kind: 'likes' | 'dislikes' | 'hobbies' | 'tags', value: string) => {
      const filterOut = (
        setter: React.Dispatch<React.SetStateAction<string[]>>,
      ) => {
        setter(prev => prev.filter(item => item !== value));
      };

      if (kind === 'likes') filterOut(setLikes);
      if (kind === 'dislikes') filterOut(setDislikes);
      if (kind === 'hobbies') filterOut(setHobbies);
      if (kind === 'tags') filterOut(setTags);
    },
    [],
  );

  const goNext = useCallback(() => {
    try {
      if (!trimmedName) {
        throw new Error('반려동물 이름을 입력해 주세요.');
      }

      if (birthDate.trim()) {
        const normalizedBirth = normalizeYmdOrNull(birthDate);
        setBirthDate(normalizedBirth ?? '');
      }

      if (adoptionDate.trim()) {
        const normalizedAdoption = normalizeYmdOrNull(adoptionDate);
        setAdoptionDate(normalizedAdoption ?? '');
      }

      if (memorialChoice === 'memorial') {
        const normalizedDeath = normalizeYmdOrNull(deathDate);
        setDeathDate(normalizedDeath ?? '');
      }

      Keyboard.dismiss();
      setStep(2);
      requestAnimationFrame(() => {
        keyboardScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
      });
    } catch (error) {
      Alert.alert('기본 정보 확인', getErrorMessage(error));
    }
  }, [adoptionDate, birthDate, deathDate, memorialChoice, trimmedName]);

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;

    try {
      setSaving(true);

      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id ?? null;
      if (!userId) throw new Error('로그인 정보가 없습니다.');

      const normalizedBirthDate = normalizeYmdOrNull(birthDate);
      const normalizedAdoptionDate = normalizeYmdOrNull(adoptionDate);
      const normalizedDeathDate =
        memorialChoice === 'memorial' ? normalizeYmdOrNull(deathDate) : null;
      const normalizedWeight = normalizeWeightOrNull(weightKg);
      const speciesSelection = buildPetSpeciesSelection(
        representativeSpecies,
        speciesDetailKey,
      );

      ensureMinOne(likes, '좋아하는 것');
      ensureMinOne(dislikes, '싫어하는 것');
      ensureMinOne(hobbies, '취미');
      ensureMinOne(tags, '태그');

      const createdPet = await createPet({
        name: trimmedName,
        species: speciesSelection.species,
        speciesKey: speciesSelection.speciesKey,
        speciesDetailKey: speciesSelection.speciesDetailKey,
        speciesDisplayName: speciesSelection.speciesDisplayName,
        themeColor: selectedThemeColor,
        birthDate: normalizedBirthDate,
        adoptionDate: normalizedAdoptionDate,
        deathDate: normalizedDeathDate,
        weightKg: normalizedWeight,
        breed:
          speciesSelection.speciesDisplayName.trim() ||
          speciesSelection.speciesDetailKey.trim() ||
          null,
        gender,
        neutered,
        likes,
        dislikes,
        hobbies,
        tags,
        avatarPath: null,
      });

      if (normalizedWeight !== null) {
        try {
          await upsertPetWeightLog({
            petId: createdPet.id,
            measuredOn: getKstYmd(),
            weightKg: normalizedWeight,
            source: 'pet_create',
          });
        } catch {
          showToast({
            tone: 'info',
            title: '체중 히스토리 동기화가 조금 늦어요',
            message:
              '프로필 등록은 완료됐고, 체중 기록은 건강 리포트에서 다시 한 번 남길 수 있어요.',
            durationMs: 2800,
          });
        }
      }

      upsertPet(createdPet, { userId, select: true });
      setCreatedPetName(createdPet.name?.trim() || trimmedName);

      if (imageUri) {
        try {
          const { path } = await uploadPetAvatar({
            userId,
            petId: createdPet.id,
            fileUri: imageUri,
            mimeType: imageType,
          });

          const { error } = await supabase
            .from('pets')
            .update({ profile_image_url: path })
            .eq('id', createdPet.id);

          if (error) throw error;

          updatePetAvatar(
            createdPet.id,
            {
              avatarPath: path,
              avatarUrl: toPublicPetAvatarUrl(path),
            },
            { userId },
          );
        } catch {
          Alert.alert(
            '이미지 업로드 실패',
            '반려동물 등록은 완료되었고, 사진은 나중에 프로필 수정에서 다시 등록할 수 있어요.',
          );
        }
      }

      const refreshedPets = await fetchMyPets(userId);
      const currentPets = usePetStore.getState().pets;
      const includesCreatedPet = refreshedPets.some(
        p => p.id === createdPet.id,
      );

      if (refreshedPets.length === 0 && currentPets.length > 0) {
        showToast({
          tone: 'info',
          title: '프로필 동기화 중',
          message: '새로 등록한 반려동물 정보를 먼저 보여드리고 있어요.',
          durationMs: 2200,
        });
      } else if (
        includesCreatedPet ||
        refreshedPets.length >= currentPets.length
      ) {
        setPets(refreshedPets, { userId, preferredPetId: createdPet.id });
      }

      if (isFirstOnboardingCompletionRef.current) {
        try {
          await markFirstPetWelcomePending({
            userId,
            petId: createdPet.id,
            petName: createdPet.name?.trim() || trimmedName,
          });
        } catch (error) {
          // 펫 생성 성공을 presentation 상태 저장 실패로 되돌리지는 않는다.
          captureMonitoringException(error);
        }
      }

      await clearPetCreateDraft();

      setSuccessModalVisible(true);
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'pet-create');
      Alert.alert(title, message);
    } finally {
      setSaving(false);
    }
  }, [
    adoptionDate,
    birthDate,
    deathDate,
    canSubmit,
    dislikes,
    gender,
    hobbies,
    imageType,
    imageUri,
    likes,
    memorialChoice,
    neutered,
    representativeSpecies,
    selectedThemeColor,
    speciesDetailKey,
    setPets,
    updatePetAvatar,
    upsertPet,
    tags,
    trimmedName,
    weightKg,
  ]);
  const goPrevStep = useCallback(() => {
    Keyboard.dismiss();
    setStep(1);
    requestAnimationFrame(() => {
      keyboardScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    });
  }, []);

  const handleBirthDateChange = useCallback(
    (text: string) => syncDateInput(setBirthDate, text),
    [syncDateInput],
  );
  const handleBirthDateBlur = useCallback(
    () => finalizeDateInput(birthDate, setBirthDate),
    [birthDate, finalizeDateInput],
  );
  const handleAdoptionDateChange = useCallback(
    (text: string) => syncDateInput(setAdoptionDate, text),
    [syncDateInput],
  );
  const handleAdoptionDateBlur = useCallback(
    () => finalizeDateInput(adoptionDate, setAdoptionDate),
    [adoptionDate, finalizeDateInput],
  );
  const handleRepresentativeSpeciesChange = useCallback(
    (value: PetRepresentativeSpeciesKey) => {
      setRepresentativeSpecies(value);
      // A subtype from a different species must never leak into the saved record.
      setSpeciesDetailKey(currentSubtype =>
        resolveSubtypeAfterSpeciesChange({
          previousSpeciesKey: representativeSpecies,
          nextSpeciesKey: value,
          currentSubtype,
        }),
      );
    },
    [representativeSpecies],
  );
  const handleDeathDateChange = useCallback(
    (text: string) => syncDateInput(setDeathDate, text),
    [syncDateInput],
  );
  const handleDeathDateBlur = useCallback(
    () => finalizeDateInput(deathDate, setDeathDate),
    [deathDate, finalizeDateInput],
  );
  const openBirthDateModal = useCallback(
    () => openDateModal('birth'),
    [openDateModal],
  );
  const openAdoptionDateModal = useCallback(
    () => openDateModal('adoption'),
    [openDateModal],
  );
  const openDeathDateModal = useCallback(
    () => openDateModal('death'),
    [openDateModal],
  );
  const handleFocusVisibleInput = useCallback(() => {
    requestAnimationFrame(() => {
      keyboardScrollRef.current?.assureFocusedInputVisible();
    });
  }, []);
  const handleOpenFontSettings = useCallback(() => {
    Keyboard.dismiss();
    setFontSettingsVisible(true);
  }, []);
  const handleRevealAddedItems = useCallback<MultiInputRevealHandler>(
    (field, input) => {
      const scroll = keyboardScrollRef.current;
      if (!scroll || !Keyboard.isVisible()) return;

      scroll.measureInWindow((_scrollX, viewportTop) => {
        field.measureInWindow((_fieldX, fieldTop, _fieldWidth, fieldHeight) => {
          input.measureInWindow((_inputX, inputTop) => {
            const keyboard = Keyboard.metrics();
            if (!keyboard || !input.isFocused()) return;
            const offsetY = scrollMetricsRef.current.offsetY;
            const nextOffsetY = getRegistrationAddedItemScrollOffset({
              offsetY,
              inputTop,
              viewportTop,
              fieldBottom: fieldTop + fieldHeight,
              visibleBottom:
                keyboard.screenY - actionLayout.focusedInputBottomOffset,
              previewGap: spacing.md,
            });
            if (nextOffsetY <= offsetY) return;

            // One native animated scroll; keep keyboard/focus and avoid resets.
            scroll.scrollTo({ x: 0, y: nextOffsetY, animated: true });
          });
        });
      });
    },
    [actionLayout.focusedInputBottomOffset],
  );
  const handleActionZoneLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height) + spacing.md;
    setActionZoneHeight(currentHeight =>
      currentHeight === nextHeight ? currentHeight : nextHeight,
    );
  }, []);

  const addLike = useCallback(() => addItem('likes'), [addItem]);
  const addDislike = useCallback(() => addItem('dislikes'), [addItem]);
  const addHobby = useCallback(() => addItem('hobbies'), [addItem]);
  const addTag = useCallback(() => addItem('tags'), [addItem]);

  const removeLike = useCallback(
    (value: string) => removeItem('likes', value),
    [removeItem],
  );
  const removeDislike = useCallback(
    (value: string) => removeItem('dislikes', value),
    [removeItem],
  );
  const removeHobby = useCallback(
    (value: string) => removeItem('hobbies', value),
    [removeItem],
  );
  const removeTag = useCallback(
    (value: string) => removeItem('tags', value),
    [removeItem],
  );
  const goToWelcomeTransition = useCallback(() => {
    setSuccessModalVisible(false);
    clearPetCreateDraft().catch(() => {
      // ignore draft clear errors
    });
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'WelcomeTransition',
          params: createdPetName ? { petName: createdPetName } : undefined,
        },
      ],
    });
  }, [createdPetName, navigation]);

  const onPressExitToPrevious = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
    });
  }, [navigation]);

  const onPressRequestExit = useCallback(() => {
    if (!showStepOneExitButton || saving || successModalVisible) return;
    setExitConfirmVisible(true);
  }, [saving, showStepOneExitButton, successModalVisible]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showFirstPetFontSelector) {
          return true;
        }
        if (!showStepOneExitButton || saving || successModalVisible) {
          return true;
        }
        setExitConfirmVisible(true);
        return true;
      });
      return () => sub.remove();
    }, [
      saving,
      showFirstPetFontSelector,
      showStepOneExitButton,
      successModalVisible,
    ]),
  );

  return (
    <RegistrationSeasonalStyleContext.Provider value={seasonalStyles}>
      <View style={[styles.screen, seasonalStyles.screen]}>
        {step === 1 ? (
          <Image
            accessibilityIgnoresInvertColors
            pointerEvents="none"
            resizeMode="cover"
            source={registrationPresentation.backgroundSource}
            style={styles.backgroundImage}
          />
        ) : (
          <LinearGradient
            pointerEvents="none"
            colors={registrationPresentation.continuationColors}
            locations={[0, 0.34, 0.72, 1]}
            style={styles.continuationCanvas}
          />
        )}
        <View
          pointerEvents="none"
          style={[styles.backgroundWarmth, seasonalStyles.ambient]}
        />
        {step === 1 ? (
          <LinearGradient
            pointerEvents="none"
            colors={registrationPresentation.readabilityVeilColors}
            locations={[0, 0.38, 0.76, 1]}
            style={styles.topReadabilityVeil}
          />
        ) : null}

        <View
          style={[
            styles.topChrome,
            { paddingTop: Math.max(insets.top + 4, 12) },
          ]}
        >
          <View style={styles.header}>
            <AppText typographyRole="screenTitle"
              preset="unifiedTitle"
              style={[styles.headerTitle, seasonalStyles.primaryText]}
            >
              프로필 등록 ({step}/2)
            </AppText>

          </View>

          <View style={styles.progressHeader}>
            <View style={styles.progressMetaRow}>
              <AppText
                preset="unifiedLabel"
                style={[styles.progressLabel, seasonalStyles.primaryText]}
              >
                {step === 1 ? '기본 정보 입력' : '상세 정보 입력'}
              </AppText>
              <AppText preset="unifiedLabel" style={styles.progressStepText}>
                {step}/2
              </AppText>
            </View>
            <View style={styles.progressMain}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    step === 1
                      ? styles.progressFillHalf
                      : styles.progressFillFull,
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        <KeyboardAwareScrollView
          ref={keyboardScrollRef}
          bottomOffset={actionLayout.focusedInputBottomOffset}
          disableScrollOnKeyboardHide={false}
          mode="layout"
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={handleScrollContentSizeChange}
          onLayout={handleScrollLayout}
          onMomentumScrollEnd={handleScrollEnd}
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEnd}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {step === 1 ? (
            <StepOneForm
              fontLabel={getAppFontModeLabel(appFontMode)}
              fontSettingsDisabled={!fontPreferenceHydrated || saving}
              onOpenFontSettings={handleOpenFontSettings}
              imageUri={imageUri}
              onPickImage={pickImage}
              selectedThemeColor={selectedThemeColor}
              onSelectThemeColor={setThemeColor}
              memorialChoice={memorialChoice}
              deathDate={deathDate}
              onChangeMemorialChoice={setMemorialChoice}
              onDeathDateChange={handleDeathDateChange}
              onDeathDateBlur={handleDeathDateBlur}
              onOpenDeathDateModal={openDeathDateModal}
              name={name}
              onNameChange={setName}
              birthDate={birthDate}
              onBirthDateChange={handleBirthDateChange}
              onBirthDateBlur={handleBirthDateBlur}
              onOpenBirthModal={openBirthDateModal}
              adoptionDate={adoptionDate}
              onAdoptionDateChange={handleAdoptionDateChange}
              onAdoptionDateBlur={handleAdoptionDateBlur}
              onOpenAdoptionModal={openAdoptionDateModal}
              representativeSpecies={representativeSpecies}
              onRepresentativeSpeciesChange={handleRepresentativeSpeciesChange}
              speciesDetailKey={speciesDetailKey}
              onSpeciesDetailKeyChange={setSpeciesDetailKey}
              onSpeciesDetailFocus={handleFocusVisibleInput}
              speciesDetailInputRef={speciesDetailInputRef}
              gender={gender}
              onGenderChange={setGender}
              neutered={neutered}
              onNeuteredChange={setNeutered}
            />
          ) : (
            <StepTwoForm
              fontLabel={getAppFontModeLabel(appFontMode)}
              fontSettingsDisabled={!fontPreferenceHydrated || saving}
              onOpenFontSettings={handleOpenFontSettings}
              weightKg={weightKg}
              onWeightChange={setWeightKg}
              onFieldFocus={handleFocusVisibleInput}
              onItemsAdded={handleRevealAddedItems}
              likes={likes}
              draftLike={draftLike}
              onDraftLikeChange={setDraftLike}
              onAddLike={addLike}
              onRemoveLike={removeLike}
              dislikes={dislikes}
              draftDislike={draftDislike}
              onDraftDislikeChange={setDraftDislike}
              onAddDislike={addDislike}
              onRemoveDislike={removeDislike}
              hobbies={hobbies}
              draftHobby={draftHobby}
              onDraftHobbyChange={setDraftHobby}
              onAddHobby={addHobby}
              onRemoveHobby={removeHobby}
              tags={tags}
              draftTag={draftTag}
              onDraftTagChange={setDraftTag}
              onAddTag={addTag}
              onRemoveTag={removeTag}
            />
          )}
        </KeyboardAwareScrollView>

        <KeyboardStickyView>
          <Animated.View
            style={[
              styles.actionZone,
              seasonalStyles.sticky,
              stickyActionInsetStyle,
            ]}
          >
            <View style={styles.actionRow} onLayout={handleActionZoneLayout}>
              {step === 1 && showStepOneExitButton ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[styles.secondaryButton, seasonalStyles.control]}
                  onPress={onPressRequestExit}
                >
                  <AppText
                    preset="unifiedLabel"
                    style={[
                      styles.secondaryButtonText,
                      seasonalStyles.primaryText,
                    ]}
                  >
                    돌아가기
                  </AppText>
                </TouchableOpacity>
              ) : null}

              {step === 2 ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[styles.secondaryButton, seasonalStyles.control]}
                  onPress={goPrevStep}
                >
                  <AppText
                    preset="unifiedLabel"
                    style={[
                      styles.secondaryButtonText,
                      seasonalStyles.primaryText,
                    ]}
                  >
                    이전 단계로
                  </AppText>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.9}
                disabled={step === 1 ? !canGoNext : !canSubmit}
                accessibilityLabel={
                  step === 1
                    ? '다음 등록 단계로 이동'
                    : saving
                    ? '반려동물 등록 중'
                    : '반려동물 등록 완료'
                }
                accessibilityHint={
                  step === 1
                    ? '두 번 탭하면 상세 정보 입력 단계로 이동합니다.'
                    : saving
                    ? '반려동물 등록을 완료할 때까지 잠시 기다려 주세요.'
                    : '두 번 탭하면 반려동물 등록을 완료합니다.'
                }
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: selectedTheme.primary,
                    shadowColor: selectedTheme.primary,
                  },
                  (step === 1 ? !canGoNext : !canSubmit)
                    ? styles.buttonDisabled
                    : null,
                ]}
                onPress={step === 1 ? goNext : onSubmit}
              >
                {step === 2 && saving ? (
                  <WaveText
                    text="소중한 가족을 맞이하는 중 💖"
                    color={selectedTheme.onPrimary}
                    textStyle={styles.primaryButtonText}
                  />
                ) : (
                  <AppText
                    preset="unifiedLabel"
                    style={[
                      styles.primaryButtonText,
                      { color: selectedTheme.onPrimary },
                    ]}
                  >
                    {step === 1 ? '다음으로' : '등록 완료'}
                  </AppText>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardStickyView>

        <FirstPetFontSelectorModal
          visible={showFirstPetFontSelector}
          selectedMode={selectedFontMode}
          saving={fontSelectionSaving}
          onSelect={setSelectedFontMode}
          onConfirm={() => {
            confirmFirstPetFontSelection().catch(() => {});
          }}
        />

        <AppFontSettingsModal
          visible={fontSettingsVisible}
          bottomInset={insets.bottom}
          onClose={() => setFontSettingsVisible(false)}
        />

        <Modal
          transparent
          visible={successModalVisible}
          animationType="fade"
          onRequestClose={goToWelcomeTransition}
        >
          <View style={styles.successModalBackdrop}>
            <View style={[styles.successModalCard, { backgroundColor: registrationPresentation.palette.stickySurfaceColor }]}>
              <View style={styles.successLogoWrap}>
                <Image
                  source={ASSETS.logo}
                  style={styles.successLogo}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.successCopyWrap}>
                <AppText typographyRole="celebration" preset="unifiedTitle" style={styles.successTitle}>
                  등록이 완료되었어요!
                </AppText>
                <AppText preset="unifiedBody" style={styles.successBody}>
                  우리 아이와 함께할 소중한 추억들을
                </AppText>
                <AppText preset="unifiedBody" style={styles.successBody}>
                  차곡차곡 쌓아보세요.
                </AppText>
              </View>

              <TouchableOpacity
                activeOpacity={0.92}
                style={[
                  styles.successPrimaryButton,
                  {
                    backgroundColor: selectedTheme.primary,
                    shadowColor: selectedTheme.primary,
                  },
                ]}
                onPress={goToWelcomeTransition}
              >
                <AppText typographyRole="emotionalCta"
                  preset="unifiedTitle"
                  style={[
                    styles.successPrimaryButtonText,
                    { color: selectedTheme.onPrimary },
                  ]}
                >
                  시작하기
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <DatePickerModal
          visible={dateModalTarget !== null}
          title={dateModalTitle}
          initialDate={dateModalInitialValue}
          maximumDate={new Date()}
          directInputLabel="날짜 직접 입력"
          directInputHelper="과거 날짜는 YYYY-MM-DD로 입력"
          onCancel={closeDateModal}
          onConfirm={onConfirmDateModal}
        />
        <ConfirmDialog
          visible={exitConfirmVisible}
          typographyMode="unified"
          title="등록을 멈추고 나갈까요?"
          message={
            '입력 중인 내용은 임시 저장되어\n다음에 다시 이어서 작성할 수 있어요.'
          }
          cancelLabel="계속 작성하기"
          confirmLabel="나가기"
          tone="warning"
          accentColor={selectedThemeColor}
          onCancel={() => setExitConfirmVisible(false)}
          onConfirm={() => {
            setExitConfirmVisible(false);
            onPressExitToPrevious();
          }}
        />
      </View>
    </RegistrationSeasonalStyleContext.Provider>
  );
}
