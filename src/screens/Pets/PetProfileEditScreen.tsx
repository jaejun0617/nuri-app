// 파일: src/screens/Pets/PetProfileEditScreen.tsx
// 역할:
// - 기존 반려동물 프로필 정보를 수정하는 편집 화면
// - 이름, 날짜, 태그, 프로필 이미지 등 프로필 전반의 값을 보정
// - 수정 완료 후 스토어와 후속 완료 화면으로 흐름을 연결해 홈 반영을 빠르게 유지

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import DatePickerModal from '../../components/date-picker/DatePickerModal';
import PhotoAddCard from '../../components/media/PhotoAddCard';
import PetMemorialFields from '../../components/pets/PetMemorialFields';
import PetThemePicker from '../../components/pets/PetThemePicker';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import {
  getBrandedErrorMeta,
  getErrorMessage,
} from '../../services/app/errors';
import { readFileAsBase64 } from '../../services/files/readFileAsBase64';
import { pickPhotoAssets } from '../../services/media/photoPicker';
import { formatPetAgeLabelFromBirthDate } from '../../services/pets/age';
import {
  getPetMemorialChoice,
  type PetMemorialChoice,
} from '../../services/pets/memorial';
import {
  buildPetSpeciesSelection,
  deriveRepresentativeSpeciesKey,
  getPetSpeciesQuickDetailOptions,
  getRepresentativeSpeciesOption,
  PET_REPRESENTATIVE_SPECIES_OPTIONS,
  type PetRepresentativeSpeciesKey,
} from '../../services/pets/species';
import {
  buildPetThemePalette,
  recommendPetThemeColor,
} from '../../services/pets/themePalette';
import { supabase } from '../../services/supabase/client';
import { fetchMyPets, updatePet } from '../../services/supabase/pets';
import { uploadPetAvatar } from '../../services/supabase/storagePets';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer, showToast } from '../../store/uiStore';
import { styles } from './PetProfileEditScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PetProfileEdit'>;
type Route = RootScreenRoute<'PetProfileEdit'>;

const NAME_CHANGE_LIMIT = 3;
const NAME_CHANGE_STORAGE_KEY = 'nuri.petNameChangeCounts.v1';
const MAX_TAGS = 10;
const RECOMMENDED_TAGS = ['#귀요미', '#산책왕', '#활발함', '#애교쟁이', '#호기심'];
const RECOMMEND_STYLES = [
  'recommendChipBlue',
  'recommendChipOrange',
  'recommendChipGreen',
  'recommendChipPink',
  'recommendChipPurple',
] as const;

type GlobalWithIdleCallback = typeof globalThis & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function scheduleIdleTask(task: () => void, timeout = 180) {
  const globalScope = globalThis as GlobalWithIdleCallback;

  if (typeof globalScope.requestIdleCallback === 'function') {
    const handle = globalScope.requestIdleCallback(
      () => {
        task();
      },
      { timeout },
    );

    return () => {
      if (typeof globalScope.cancelIdleCallback === 'function') {
        globalScope.cancelIdleCallback(handle);
      }
    };
  }

  const timer = setTimeout(task, 48);
  return () => clearTimeout(timer);
}

function normalizeYmdOrNull(raw: string): string | null {
  const value = raw.trim().replace(/\./g, '-');
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('날짜 형식은 YYYY.MM.DD 또는 YYYY-MM-DD 입니다.');
  }
  return value;
}

function normalizeWeightOrNull(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('몸무게는 0보다 큰 숫자로 입력해 주세요.');
  }

  return numeric;
}

function toDisplayYmd(raw: string | null | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return '';
  return value.replace(/-/g, '.');
}

function normalizeTextList(raw: string): string[] {
  return raw
    .split(',')
    .map(v => v.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .slice(0, 8);
}

async function loadNameChangeCount(petId: string): Promise<number> {
  const raw = await AsyncStorage.getItem(NAME_CHANGE_STORAGE_KEY);
  if (!raw) return 0;

  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return Math.max(0, Number(parsed[petId] ?? 0));
  } catch {
    return 0;
  }
}

async function incrementNameChangeCount(petId: string): Promise<number> {
  const raw = await AsyncStorage.getItem(NAME_CHANGE_STORAGE_KEY);
  let nextMap: Record<string, number> = {};

  if (raw) {
    try {
      nextMap = JSON.parse(raw) as Record<string, number>;
    } catch {
      nextMap = {};
    }
  }

  const nextCount = Math.max(0, Number(nextMap[petId] ?? 0)) + 1;
  nextMap[petId] = nextCount;
  await AsyncStorage.setItem(NAME_CHANGE_STORAGE_KEY, JSON.stringify(nextMap));
  return nextCount;
}

export default function PetProfileEditScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const petId = route.params?.petId?.trim() || '';

  const pets = usePetStore(s => s.pets);
  const setPets = usePetStore(s => s.setPets);
  const invalidatePetAvatar = usePetStore(s => s.invalidatePetAvatar);

  const pet = useMemo(() => pets.find(item => item.id === petId) ?? null, [pets, petId]);

  const [name, setName] = useState('');
  const [representativeSpecies, setRepresentativeSpecies] =
    useState<PetRepresentativeSpeciesKey>('other');
  const [speciesDetailKey, setSpeciesDetailKey] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [adoptionDate, setAdoptionDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [memorialChoice, setMemorialChoice] =
    useState<PetMemorialChoice>('together');
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [neutered, setNeutered] = useState<boolean | null>(null);
  const [hobbiesText, setHobbiesText] = useState('');
  const [likesText, setLikesText] = useState('');
  const [dislikesText, setDislikesText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [draftTag, setDraftTag] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameChangeCount, setNameChangeCount] = useState(0);
  const [dateModalTarget, setDateModalTarget] = useState<
    'birth' | 'adoption' | 'death' | null
  >(null);

  useEffect(() => {
    if (petId || !isFocused) return;

    let cancelled = false;
    const cancelIdleTask = scheduleIdleTask(() => {
      if (cancelled || AppState.currentState !== 'active') return;

      Alert.alert('프로필을 열지 못했어요', '아이 정보를 다시 불러온 뒤 시도해 주세요.', [
        {
          text: '확인',
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }

            navigation.reset({
              index: 0,
              routes: [{ name: 'AppTabs' }],
            });
          },
        },
      ]);
    });

    return () => {
      cancelled = true;
      cancelIdleTask();
    };
  }, [isFocused, navigation, petId]);

  useEffect(() => {
    if (!pet) return;

    setName(pet.name ?? '');
    setRepresentativeSpecies(
      deriveRepresentativeSpeciesKey({
        species: pet.species ?? 'other',
        speciesDetailKey: pet.speciesDetailKey,
        speciesDisplayName: pet.speciesDisplayName,
      }),
    );
    setSpeciesDetailKey(
      pet.speciesDetailKey ?? pet.speciesDisplayName ?? '',
    );
    setBirthDate(toDisplayYmd(pet.birthDate));
    setAdoptionDate(toDisplayYmd(pet.adoptionDate));
    setDeathDate(toDisplayYmd(pet.deathDate));
    setWeightKg(
      typeof pet.weightKg === 'number' && Number.isFinite(pet.weightKg)
        ? String(pet.weightKg)
        : '',
    );
    setMemorialChoice(getPetMemorialChoice(pet.deathDate));
    setGender(pet.gender ?? 'unknown');
    setNeutered(pet.neutered ?? null);
    setHobbiesText((pet.hobbies ?? []).join(', '));
    setLikesText((pet.likes ?? []).join(', '));
    setDislikesText((pet.dislikes ?? []).join(', '));
    setTags((pet.tags ?? []).slice(0, MAX_TAGS));
    setImageUri(pet.avatarUrl?.trim() || null);
    setImageType(null);
    setThemeColor(pet.themeColor ?? null);
  }, [pet]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      const count = await loadNameChangeCount(petId);
      if (mounted) setNameChangeCount(count);
    }

    run().catch(() => {
      // ignore name change count hydrate errors
    });
    return () => {
      mounted = false;
    };
  }, [petId]);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const originalName = useMemo(() => pet?.name?.trim() ?? '', [pet?.name]);
  const remainingNameChanges = Math.max(0, NAME_CHANGE_LIMIT - nameChangeCount);
  const isNameChanged = trimmedName.length > 0 && trimmedName !== originalName;
  const canEditName = remainingNameChanges > 0 || !originalName;

  const avatarSourceUri = useMemo(
    () => imageUri?.trim() || pet?.avatarUrl?.trim() || null,
    [imageUri, pet?.avatarUrl],
  );
  const displayDeathDate = useMemo(() => deathDate.replace(/\./g, '-'), [deathDate]);
  const selectedThemeColor = useMemo(
    () =>
      themeColor ??
      recommendPetThemeColor({
        name: trimmedName || originalName,
        petId: pet?.id,
      }),
    [originalName, pet?.id, themeColor, trimmedName],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedThemeColor),
    [selectedThemeColor],
  );

  useEffect(() => {
    if (memorialChoice === 'memorial') return;
    if (!deathDate) return;
    setDeathDate('');
  }, [deathDate, memorialChoice]);

  const addTag = useCallback((raw: string) => {
    const normalizedBase = raw.trim().replace(/^#/, '');
    if (!normalizedBase) return;

    const normalized = `#${normalizedBase}`;
    setTags(prev => {
      if (prev.includes(normalized)) return prev;
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, normalized];
    });
    setDraftTag('');
  }, []);

  const removeTag = useCallback((value: string) => {
    setTags(prev => prev.filter(item => item !== value));
  }, []);

  const onChangeDeathDate = useCallback((value: string) => {
    setDeathDate(value.replace(/-/g, '.'));
  }, []);

  const onBlurDeathDate = useCallback(() => {
    if (!deathDate.trim()) return;
    try {
      const normalized = normalizeYmdOrNull(deathDate);
      setDeathDate(toDisplayYmd(normalized));
    } catch {
      // 사용자가 다시 고칠 수 있게 입력값을 유지한다.
    }
  }, [deathDate]);

  const openBirthDateModal = useCallback(() => {
    setDateModalTarget('birth');
  }, []);

  const openAdoptionDateModal = useCallback(() => {
    setDateModalTarget('adoption');
  }, []);

  const openDeathDateModal = useCallback(() => {
    setDateModalTarget('death');
  }, []);

  const closeDateModal = useCallback(() => {
    setDateModalTarget(null);
  }, []);

  const dateModalInitialValue = useMemo(() => {
    if (dateModalTarget === 'birth') return birthDate;
    if (dateModalTarget === 'adoption') return adoptionDate;
    if (dateModalTarget === 'death') return deathDate;
    return null;
  }, [adoptionDate, birthDate, dateModalTarget, deathDate]);

  const applyDateModal = useCallback((date: Date) => {
    try {
      const normalized = normalizeYmdOrNull(
        `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`,
      );
      const displayValue = toDisplayYmd(normalized);

      if (dateModalTarget === 'birth') {
        setBirthDate(displayValue);
      } else if (dateModalTarget === 'adoption') {
        setAdoptionDate(displayValue);
      } else if (dateModalTarget === 'death') {
        setDeathDate(displayValue);
      }

      setDateModalTarget(null);
    } catch (error) {
      Alert.alert('날짜 확인', getErrorMessage(error));
    }
  }, [dateModalTarget]);

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
            name: trimmedName || originalName,
            petId,
          }),
        );
      } catch {
        setThemeColor(
          recommendPetThemeColor({
            name: trimmedName || originalName,
            petId,
          }),
        );
      }
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'image-pick');
      showToast({ tone: 'error', title, message });
    }
  }, [originalName, petId, trimmedName]);

  const handleRepresentativeSpeciesChange = useCallback(
    (value: PetRepresentativeSpeciesKey) => {
      const option = getRepresentativeSpeciesOption(value);
      setRepresentativeSpecies(value);
      setSpeciesDetailKey(option.defaultDisplayName);
    },
    [],
  );

  const onSubmit = useCallback(async () => {
    if (!pet) return;
    if (!trimmedName) {
      Alert.alert('이름을 입력해 주세요.');
      return;
    }

    if (isNameChanged && remainingNameChanges <= 0) {
      Alert.alert('이름 변경 제한', '반려동물 이름은 최대 3번까지만 변경할 수 있어요.');
      return;
    }

    try {
      setSaving(true);

      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id ?? null;
      if (!userId) throw new Error('로그인 정보가 없습니다.');

      let nextAvatarPath = pet.avatarPath ?? null;
      let avatarPathChanged = false;
      if (imageUri && imageUri !== pet.avatarUrl) {
        const { path } = await uploadPetAvatar({
          userId,
          petId: pet.id,
          fileUri: imageUri,
          mimeType: imageType,
        });
        nextAvatarPath = path;
        avatarPathChanged = path !== (pet.avatarPath ?? null);
      }

      const speciesSelection = buildPetSpeciesSelection(
        representativeSpecies,
        speciesDetailKey,
      );

      await updatePet({
        petId: pet.id,
        name: trimmedName,
        species: speciesSelection.species,
        speciesDetailKey: speciesSelection.speciesDetailKey,
        speciesDisplayName: speciesSelection.speciesDisplayName,
        themeColor: selectedThemeColor,
        birthDate: normalizeYmdOrNull(birthDate),
        adoptionDate: normalizeYmdOrNull(adoptionDate),
        deathDate:
          memorialChoice === 'memorial'
            ? normalizeYmdOrNull(displayDeathDate)
            : null,
        weightKg: normalizeWeightOrNull(weightKg),
        breed: speciesDetailKey.trim() || null,
        gender,
        neutered,
        hobbies: normalizeTextList(hobbiesText),
        likes: normalizeTextList(likesText),
        dislikes: normalizeTextList(dislikesText),
        tags,
        avatarPath: nextAvatarPath,
      });

      if (isNameChanged) {
        const nextCount = await incrementNameChangeCount(pet.id);
        setNameChangeCount(nextCount);
      }

      if (avatarPathChanged) {
        invalidatePetAvatar(pet.id, { userId });
      }

      const refreshedPets = await fetchMyPets();
      setPets(refreshedPets, { userId });

      navigation.replace('PetProfileEditDone', {
        petId: pet.id,
        petName: trimmedName,
      });
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'pet-update');
      Alert.alert(title, message);
    } finally {
      setSaving(false);
    }
  }, [
    adoptionDate,
    birthDate,
    gender,
    hobbiesText,
    imageType,
    imageUri,
    invalidatePetAvatar,
    isNameChanged,
    likesText,
    displayDeathDate,
    memorialChoice,
    navigation,
    neutered,
    pet,
    remainingNameChanges,
    representativeSpecies,
    selectedThemeColor,
    setPets,
    speciesDetailKey,
    tags,
    trimmedName,
    dislikesText,
    weightKg,
  ]);

  const onPressBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: () => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
    },
    onMore: () => {
      navigation.goBack();
      requestAnimationFrame(() => {
        openMoreDrawer();
      });
    },
    onFallback: () => {
      navigation.goBack();
    },
  });
  const representativeOption = getRepresentativeSpeciesOption(representativeSpecies);
  const quickDetailOptions = getPetSpeciesQuickDetailOptions(representativeSpecies);
  const normalizedBirthDate = useMemo(
    () => birthDate.trim().replace(/\./g, '-') || null,
    [birthDate],
  );
  const profileSpeciesLabel = useMemo(() => {
    const detail = speciesDetailKey.trim();
    if (detail) return detail;
    return representativeOption.label;
  }, [representativeOption.label, speciesDetailKey]);
  const profileAgeLabel = useMemo(
    () => formatPetAgeLabelFromBirthDate(normalizedBirthDate),
    [normalizedBirthDate],
  );
  const profileSummaryLine = useMemo(() => {
    const parts: string[] = [];
    if (profileSpeciesLabel) parts.push(profileSpeciesLabel);
    if (profileAgeLabel) parts.push(profileAgeLabel);
    return parts.length > 0 ? parts.join(' · ') : null;
  }, [profileAgeLabel, profileSpeciesLabel]);

  if (!pet) {
    return (
      <View style={styles.screen}>
        <View style={styles.centerFallback}>
          <AppText preset="headline" style={styles.fallbackTitle}>
            수정할 프로필을 찾을 수 없어요
          </AppText>
          <TouchableOpacity
            activeOpacity={0.92}
            style={[
              styles.primaryButton,
              { backgroundColor: petTheme.primary, shadowColor: petTheme.primary },
            ]}
            onPress={onPressBack}
          >
            <AppText preset="body" style={styles.primaryButtonText}>
              돌아가기
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.backButton}
            onPress={onPressBack}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>

        <AppText preset="headline" style={styles.headerTitle}>
          프로필 수정
        </AppText>

        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(156, insets.bottom + 132) },
        ]}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        enableOnAndroid
        enableAutomaticScroll
        enableResetScrollToCoords={false}
        keyboardOpeningTime={0}
        extraScrollHeight={88}
        extraHeight={140}
      >
        <View style={styles.avatarSection}>
          <PhotoAddCard
            imageUri={avatarSourceUri}
            onPress={pickImage}
            containerStyle={styles.avatarWrap}
            imageStyle={styles.avatarImage}
            placeholderStyle={styles.avatarFallback}
            placeholderIconName="image"
            placeholderIconColor="#A0A7B4"
            placeholderIconSize={28}
            editButtonStyle={[
              styles.avatarCameraBtn,
              { backgroundColor: petTheme.primary },
            ]}
            editIconName="camera"
            editIconSize={16}
          />
          <AppText preset="title2" style={[styles.profileName, { color: petTheme.deep }]}>
            {trimmedName || pet.name || '우리 아이'}
          </AppText>
          {profileSummaryLine ? (
            <AppText preset="body" style={styles.profileMeta}>
              {profileSummaryLine}
            </AppText>
          ) : (
            <AppText preset="caption" style={styles.profileMetaMuted}>
              품종과 생일을 입력하면 나이를 함께 보여드려요
            </AppText>
          )}
        </View>

        <PetThemePicker
          selectedColor={selectedThemeColor}
          helperText="홈 프로필 카드와 위젯 강조색에 함께 반영돼요."
          onSelectColor={setThemeColor}
        />

        <PetMemorialFields
          choice={memorialChoice}
          deathDate={deathDate}
          onChangeChoice={setMemorialChoice}
          onChangeDeathDate={onChangeDeathDate}
          onBlurDeathDate={onBlurDeathDate}
          onOpenDeathDateModal={openDeathDateModal}
          buildHint={value => (value ? value : 'YYYY.MM.DD 또는 YYYY-MM-DD')}
        />

        <View style={styles.formSection}>
          <View style={styles.fieldBlock}>
            <AppText preset="caption" style={styles.label}>
              반려동물 이름
            </AppText>
              <TextInput
                value={name}
                onChangeText={setName}
                editable={canEditName}
                placeholder="이름"
                placeholderTextColor="#A0A7B4"
                style={[styles.input, !canEditName ? styles.inputDisabled : null]}
                returnKeyType="next"
              />
            <AppText preset="caption" style={styles.inputHint}>
              이름 변경은 최대 3회까지 가능해요. 남은 횟수 {remainingNameChanges}회
            </AppText>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <AppText preset="caption" style={styles.label}>
                생일
              </AppText>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.input}
                onPress={openBirthDateModal}
              >
                <TextInput
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="YYYY.MM.DD"
                  placeholderTextColor="#A0A7B4"
                  style={styles.readonlyInputText}
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.col}>
              <AppText preset="caption" style={styles.label}>
                입양일
              </AppText>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.input}
                onPress={openAdoptionDateModal}
              >
                <TextInput
                  value={adoptionDate}
                  onChangeText={setAdoptionDate}
                  placeholder="YYYY.MM.DD"
                  placeholderTextColor="#A0A7B4"
                  style={styles.readonlyInputText}
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <AppText preset="caption" style={styles.label}>
              대표 종
            </AppText>
            <View style={styles.segmentWrap}>
              {PET_REPRESENTATIVE_SPECIES_OPTIONS.map(option => {
                const active = representativeSpecies === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    activeOpacity={0.92}
                    style={[
                      styles.segmentChip,
                      styles.segmentChipWide,
                      active ? styles.segmentChipActive : null,
                      active
                        ? { backgroundColor: petTheme.tint }
                        : null,
                    ]}
                    onPress={() => handleRepresentativeSpeciesChange(option.key)}
                  >
                    <AppText
                      preset="caption"
                      style={[
                        styles.segmentChipText,
                        active ? styles.segmentChipTextActive : null,
                        active ? { color: petTheme.deep } : null,
                      ]}
                    >
                      {option.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
            <AppText preset="caption" style={styles.inputHint}>
              {representativeOption.description}
            </AppText>
          </View>

          <View style={styles.fieldBlock}>
            <AppText preset="caption" style={styles.label}>
              {representativeOption.showBreedField ? '품종/세부 종' : '세부 종'}
            </AppText>
            {quickDetailOptions.length > 0 ? (
              <View style={styles.segmentWrap}>
                {quickDetailOptions.map(option => {
                  const active = speciesDetailKey.trim() === option.label;
                  return (
                    <TouchableOpacity
                      key={option.detailKey}
                      activeOpacity={0.92}
                      style={[
                        styles.quickChip,
                        active ? styles.quickChipActive : null,
                        active ? { backgroundColor: petTheme.tint } : null,
                      ]}
                      onPress={() => setSpeciesDetailKey(option.label)}
                    >
                      <AppText
                        preset="caption"
                        style={[
                          styles.quickChipText,
                          active ? styles.quickChipTextActive : null,
                          active ? { color: petTheme.deep } : null,
                        ]}
                      >
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
            <View style={styles.searchInputWrap}>
              <TextInput
                value={speciesDetailKey}
                onChangeText={setSpeciesDetailKey}
                placeholder={representativeOption.placeholders.detail}
                placeholderTextColor="#A0A7B4"
                style={styles.searchInput}
                autoCapitalize="none"
                returnKeyType={representativeOption.showBreedField ? 'next' : 'done'}
              />
              <Feather name="search" size={16} color="#A0A7B4" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <AppText preset="caption" style={styles.label}>
                성별
              </AppText>
              <View style={styles.segmentRow}>
                {[
                  { label: '남아', value: 'male' as const },
                  { label: '여아', value: 'female' as const },
                ].map(item => {
                  const active = gender === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      activeOpacity={0.92}
                      style={[
                        styles.segmentChip,
                        active ? styles.segmentChipActive : null,
                        active ? { backgroundColor: petTheme.tint } : null,
                      ]}
                      onPress={() => setGender(item.value)}
                    >
                      <AppText
                        preset="caption"
                        style={[
                          styles.segmentChipText,
                          active ? styles.segmentChipTextActive : null,
                          active ? { color: petTheme.deep } : null,
                        ]}
                      >
                        {item.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.col}>
              <AppText preset="caption" style={styles.label}>
                중성화 여부
              </AppText>
              <View style={styles.segmentRow}>
                {[
                  { label: '예', value: true },
                  { label: '아니오', value: false },
                ].map(item => {
                  const active = neutered === item.value;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      activeOpacity={0.92}
                      style={[
                        styles.segmentChip,
                        active ? styles.segmentChipActive : null,
                        active ? { backgroundColor: petTheme.tint } : null,
                      ]}
                      onPress={() => setNeutered(item.value)}
                    >
                      <AppText
                        preset="caption"
                        style={[
                          styles.segmentChipText,
                          active ? styles.segmentChipTextActive : null,
                          active ? { color: petTheme.deep } : null,
                        ]}
                      >
                        {item.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <AppText preset="caption" style={styles.label}>
              몸무게
            </AppText>
            <View style={styles.searchInputWrap}>
              <TextInput
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="0.0"
                placeholderTextColor="#A0A7B4"
                style={styles.searchInput}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              <AppText preset="caption" style={styles.unitText}>
                kg
              </AppText>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <View style={styles.inlineLabel}>
              <Feather name="home" size={13} color={petTheme.primary} />
              <AppText preset="caption" style={styles.labelInlineText}>
                취미
              </AppText>
            </View>
            <TextInput
              value={hobbiesText}
              onChangeText={setHobbiesText}
              placeholder="산책하기, 공놀이, 창밖 구경하기"
              placeholderTextColor="#A0A7B4"
              style={[styles.input, styles.multilineInput]}
              multiline
              returnKeyType="default"
            />
          </View>

          <View style={styles.fieldBlock}>
            <View style={styles.inlineLabel}>
              <Feather name="heart" size={13} color="#FF8B3D" />
              <AppText preset="caption" style={styles.labelInlineText}>
                좋아하는 것
              </AppText>
            </View>
            <TextInput
              value={likesText}
              onChangeText={setLikesText}
              placeholder="고구마 간식, 백색이 인형, 낮잠 자기"
              placeholderTextColor="#A0A7B4"
              style={[styles.input, styles.multilineInput]}
              multiline
              returnKeyType="default"
            />
          </View>

          <View style={styles.fieldBlock}>
            <View style={styles.inlineLabel}>
              <Feather name="heart" size={13} color="#FF5FA0" />
              <AppText preset="caption" style={styles.labelInlineText}>
                싫어하는 것
              </AppText>
            </View>
            <TextInput
              value={dislikesText}
              onChangeText={setDislikesText}
              placeholder="천둥 소리, 목욕하기, 낯선 사람"
              placeholderTextColor="#A0A7B4"
              style={[styles.input, styles.multilineInput]}
              multiline
              returnKeyType="default"
            />
          </View>

          <View style={styles.fieldBlock}>
            <View style={styles.inlineLabel}>
              <Feather name="hash" size={13} color={petTheme.primary} />
              <AppText preset="caption" style={styles.labelInlineText}>
                태그
              </AppText>
            </View>

            <View style={styles.tagBox}>
              <View style={styles.tagRow}>
                {tags.map(tag => (
                  <View key={tag} style={styles.tagChip}>
                    <AppText preset="caption" style={styles.tagChipText}>
                      {tag}
                    </AppText>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => removeTag(tag)}
                    >
                      <AppText preset="caption" style={styles.tagChipX}>
                        ×
                      </AppText>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.tagInputRow}>
                <TextInput
                  value={draftTag}
                  onChangeText={setDraftTag}
                  placeholder="태그 입력"
                  placeholderTextColor="#A0A7B4"
                  style={styles.tagInput}
                  onSubmitEditing={() => addTag(draftTag)}
                  returnKeyType="done"
                />

                <TouchableOpacity
                  activeOpacity={0.92}
                  style={[styles.tagAddButton, { backgroundColor: petTheme.tint }]}
                  onPress={() => addTag(draftTag)}
                >
                  <AppText
                    preset="caption"
                    style={[styles.tagAddButtonText, { color: petTheme.deep }]}
                  >
                    추가
                  </AppText>
                </TouchableOpacity>

                <AppText preset="caption" style={styles.tagCount}>
                  {tags.length}/{MAX_TAGS}
                </AppText>
              </View>

              <View style={styles.recommendWrap}>
                <View style={styles.recommendHeaderRow}>
                  <AppText preset="caption" style={styles.recommendLabel}>
                    추천 태그
                  </AppText>
                </View>

                <View style={styles.recommendRow}>
                  {RECOMMENDED_TAGS.map((tag, index) => (
                    <TouchableOpacity
                      key={tag}
                      activeOpacity={0.92}
                      style={[
                        styles.recommendChip,
                        styles[RECOMMEND_STYLES[index]],
                        index === RECOMMENDED_TAGS.length - 1
                          ? { backgroundColor: petTheme.tint }
                          : null,
                      ]}
                      onPress={() => addTag(tag)}
                    >
                      <AppText
                        preset="caption"
                        style={[
                          styles.recommendChipText,
                          index === RECOMMENDED_TAGS.length - 1
                            ? { color: petTheme.deep }
                            : null,
                        ]}
                      >
                        {tag}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

      </KeyboardAwareScrollView>

        <View
          style={[
            styles.footerActionBar,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.92}
            style={[
              styles.primaryButton,
              { backgroundColor: petTheme.primary, shadowColor: petTheme.primary },
              saving ? styles.primaryButtonDisabled : null,
            ]}
            onPress={onSubmit}
            disabled={saving}
          >
            <AppText preset="body" style={styles.primaryButtonText}>
              {saving ? '수정 중...' : '수정 완료'}
            </AppText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={dateModalTarget !== null}
        title="날짜 선택"
        initialDate={dateModalInitialValue}
        onCancel={closeDateModal}
        onConfirm={applyDateModal}
      />
    </View>
  );
}
