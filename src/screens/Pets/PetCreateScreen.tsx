// 파일: src/screens/Pets/PetCreateScreen.tsx
// 역할:
// - 온보딩 반려동물 프로필 등록(1/2, 2/2)
// - 입력 중단 복구(draft 저장/복원) + 완료 후 정리

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
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';

import { ASSETS } from '../../assets';
import DatePickerModal from '../../components/date-picker/DatePickerModal';
import PhotoAddCard from '../../components/media/PhotoAddCard';
import PetMemorialFields from '../../components/pets/PetMemorialFields';
import PetThemePicker from '../../components/pets/PetThemePicker';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getBrandedErrorMeta, getErrorMessage } from '../../services/app/errors';
import { readFileAsBase64 } from '../../services/files/readFileAsBase64';
import { pickPhotoAssets } from '../../services/media/photoPicker';
import { supabase } from '../../services/supabase/client';
import {
  clearPetCreateDraft,
  loadPetCreateDraft,
  savePetCreateDraft,
} from '../../services/local/onboardingDraft';
import {
  recommendPetThemeColor,
} from '../../services/pets/themePalette';
import {
  getPetMemorialChoice,
  type PetMemorialChoice,
} from '../../services/pets/memorial';
import {
  createPet,
  fetchMyPets,
  toPublicPetAvatarUrl,
} from '../../services/supabase/pets';
import { uploadPetAvatar } from '../../services/supabase/storagePets';
import { usePetStore } from '../../store/petStore';
import { showToast } from '../../store/uiStore';
import { styles } from './PetCreateScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PetCreate'>;
type PetCreateRoute = RouteProp<RootStackParamList, 'PetCreate'>;
type Step = 1 | 2;
type PetGender = 'male' | 'female' | 'unknown';

const BRAND = '#6D6AF8';
const MAX_MULTI_ITEMS = 10;

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
  const value = raw.trim();
  if (!value) return null;

  let year = '';
  let month = '';
  let day = '';

  const separatedMatch = value.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})$/);
  if (separatedMatch) {
    year = separatedMatch[1];
    month = separatedMatch[2].padStart(2, '0');
    day = separatedMatch[3].padStart(2, '0');
  } else {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 8) {
      throw new Error(
        '날짜는 20111028 또는 2011-10-28 형식으로 입력해 주세요.',
      );
    }
    year = digits.slice(0, 4);
    month = digits.slice(4, 6);
    day = digits.slice(6, 8);
  }

  const normalized = `${year}-${month}-${day}`;
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('올바른 날짜를 입력해 주세요.');
  }

  const [yearNum, monthNum, dayNum] = normalized.split('-').map(Number);
  if (
    date.getFullYear() !== yearNum ||
    date.getMonth() + 1 !== monthNum ||
    date.getDate() !== dayNum
  ) {
    throw new Error('올바른 날짜를 입력해 주세요.');
  }

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

type MultiInputSectionProps = {
  label: string;
  list: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
  placeholder: string;
  hint?: string;
};

const MultiInputSection = memo(function MultiInputSection({
  label,
  list,
  draft,
  onDraftChange,
  onAdd,
  onRemove,
  placeholder,
  hint,
}: MultiInputSectionProps) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.countText}>
          {list.length}/{MAX_MULTI_ITEMS}
        </Text>
      </View>

      <View style={styles.tagInputRow}>
        <TextInput
          value={draft}
          onChangeText={onDraftChange}
          placeholder={placeholder}
          placeholderTextColor="#A0A7B4"
          style={[styles.input, styles.tagInput]}
          returnKeyType="done"
          onSubmitEditing={onAdd}
        />
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.inlineAddButton}
          onPress={onAdd}
        >
          <Text style={styles.inlineAddButtonText}>추가</Text>
        </TouchableOpacity>
      </View>

      {hint ? <Text style={styles.inputHint}>{hint}</Text> : null}

      <View style={styles.pillRow}>
        {list.map(item => (
          <TouchableOpacity
            key={item}
            activeOpacity={0.88}
            style={styles.pill}
            onPress={() => onRemove(item)}
          >
            <Text style={styles.pillText}>{item}</Text>
            <Text style={styles.pillX}>×</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

type StepOneFormProps = {
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
  breed: string;
  onBreedChange: (value: string) => void;
  gender: PetGender;
  onGenderChange: (value: PetGender) => void;
  neutered: boolean | null;
  onNeuteredChange: (value: boolean) => void;
};

const StepOneForm = memo(function StepOneForm({
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
  breed,
  onBreedChange,
  gender,
  onGenderChange,
  neutered,
  onNeuteredChange,
}: StepOneFormProps) {
  return (
    <>
      <View style={styles.avatarSection}>
        <PhotoAddCard
          imageUri={imageUri}
          onPress={onPickImage}
          containerStyle={styles.avatarCircle}
          imageStyle={styles.avatarImage}
          placeholderStyle={styles.avatarPlaceholder}
          placeholderIconColor={BRAND}
          placeholderIconSize={18}
          editButtonStyle={styles.avatarEditButton}
          editIconSize={12}
        />
      </View>

      <Text style={styles.heroCopy}>우리 아이 사진을 등록해주세요</Text>

      <PetThemePicker
        selectedColor={selectedThemeColor}
        helperText="기본값은 자동으로 잡아두고, 원하는 색으로 바꿀 수 있어요."
        onSelectColor={onSelectThemeColor}
      />

      <PetMemorialFields
        choice={memorialChoice}
        deathDate={deathDate}
        onChangeChoice={onChangeMemorialChoice}
        onChangeDeathDate={onDeathDateChange}
        onBlurDeathDate={onDeathDateBlur}
        onOpenDeathDateModal={onOpenDeathDateModal}
        buildHint={buildDateHint}
      />

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>반려동물 이름</Text>
        <TextInput
          value={name}
          onChangeText={onNameChange}
          placeholder="이름을 입력해 주세요"
          placeholderTextColor="#A0A7B4"
          style={styles.input}
          returnKeyType="done"
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>생일</Text>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.iconInputWrap}
          onPress={onOpenBirthModal}
        >
          <TextInput
            value={birthDate}
            onChangeText={onBirthDateChange}
            onBlur={onBirthDateBlur}
            placeholder="2011-10-28"
            placeholderTextColor="#A0A7B4"
            style={styles.iconInput}
            editable={false}
            pointerEvents="none"
          />
          <Feather color="#98A1B2" name="calendar" size={16} />
        </TouchableOpacity>
        <Text style={styles.inputHint}>{buildDateHint(birthDate)}</Text>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>입양일</Text>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.iconInputWrap}
          onPress={onOpenAdoptionModal}
        >
          <TextInput
            value={adoptionDate}
            onChangeText={onAdoptionDateChange}
            onBlur={onAdoptionDateBlur}
            placeholder="입양일을 입력해 주세요"
            placeholderTextColor="#A0A7B4"
            style={styles.iconInput}
            editable={false}
            pointerEvents="none"
          />
          <Feather color="#98A1B2" name="calendar" size={16} />
        </TouchableOpacity>
        <Text style={styles.inputHint}>{buildDateHint(adoptionDate)}</Text>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>품종</Text>
        <View style={styles.iconInputWrap}>
          <TextInput
            value={breed}
            onChangeText={onBreedChange}
            placeholder="품종을 입력해 주세요"
            placeholderTextColor="#A0A7B4"
            style={styles.iconInput}
          />
          <Feather color="#98A1B2" name="search" size={16} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>성별</Text>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.segmentChip,
                gender === 'female' ? styles.segmentChipActive : null,
              ]}
              onPress={() => onGenderChange('female')}
            >
              <Text
                style={[
                  styles.segmentChipText,
                  gender === 'female' ? styles.segmentChipTextActive : null,
                ]}
              >
                여아
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.segmentChip,
                gender === 'male' ? styles.segmentChipActive : null,
              ]}
              onPress={() => onGenderChange('male')}
            >
              <Text
                style={[
                  styles.segmentChipText,
                  gender === 'male' ? styles.segmentChipTextActive : null,
                ]}
              >
                남아
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.col}>
          <Text style={styles.label}>중성화 여부</Text>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.segmentChip,
                neutered === true ? styles.segmentChipActive : null,
              ]}
              onPress={() => onNeuteredChange(true)}
            >
              <Text
                style={[
                  styles.segmentChipText,
                  neutered === true ? styles.segmentChipTextActive : null,
                ]}
              >
                예
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.segmentChip,
                neutered === false ? styles.segmentChipActive : null,
              ]}
              onPress={() => onNeuteredChange(false)}
            >
              <Text
                style={[
                  styles.segmentChipText,
                  neutered === false ? styles.segmentChipTextActive : null,
                ]}
              >
                아니오
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
});

type StepTwoFormProps = {
  weightKg: string;
  onWeightChange: (value: string) => void;
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

const StepTwoForm = memo(function StepTwoForm({
  weightKg,
  onWeightChange,
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
  return (
    <>
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>몸무게</Text>
        <View style={styles.iconInputWrap}>
          <TextInput
            value={weightKg}
            onChangeText={onWeightChange}
            placeholder="0.0"
            placeholderTextColor="#A0A7B4"
            style={styles.iconInput}
            keyboardType="decimal-pad"
          />
          <Text style={styles.trailingUnit}>kg</Text>
        </View>
      </View>

      <MultiInputSection
        label="좋아하는 것 (최소 1개)"
        list={likes}
        draft={draftLike}
        onDraftChange={onDraftLikeChange}
        onAdd={onAddLike}
        onRemove={onRemoveLike}
        placeholder="좋아하는 간식, 장난감 등"
      />

      <MultiInputSection
        label="싫어하는 것 (최소 1개)"
        list={dislikes}
        draft={draftDislike}
        onDraftChange={onDraftDislikeChange}
        onAdd={onAddDislike}
        onRemove={onRemoveDislike}
        placeholder="싫어하는 소리, 행동 등"
      />

      <MultiInputSection
        label="취미 (최소 1개)"
        list={hobbies}
        draft={draftHobby}
        onDraftChange={onDraftHobbyChange}
        onAdd={onAddHobby}
        onRemove={onRemoveHobby}
        placeholder="산책하기, 낮잠자기 등"
      />

      <MultiInputSection
        label="태그 (최소 1개)"
        list={tags}
        draft={draftTag}
        onDraftChange={onDraftTagChange}
        onAdd={onAddTag}
        onRemove={onRemoveTag}
        placeholder="우리 아이를 표현해 주세요"
        hint="태그는 저장 시 #이 자동으로 붙습니다."
      />
    </>
  );
});

export default function PetCreateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PetCreateRoute>();
  const routeFrom = route.params?.from ?? null;
  const insets = useSafeAreaInsets();
  const setPets = usePetStore(s => s.setPets);
  const upsertPet = usePetStore(s => s.upsertPet);
  const updatePetAvatar = usePetStore(s => s.updatePetAvatar);

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [adoptionDate, setAdoptionDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [breed, setBreed] = useState('');
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
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [dateModalTarget, setDateModalTarget] = useState<
    'birth' | 'adoption' | 'death' | null
  >(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const draftLoadOnceRef = useRef(false);

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
          `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`,
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
  const compactTopInset = useMemo(
    () => Math.max(insets.top - 24, 0),
    [insets.top],
  );
  const selectedThemeColor = useMemo(
    () =>
      themeColor ??
      recommendPetThemeColor({
        name: trimmedName,
      }),
    [themeColor, trimmedName],
  );

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
          setBirthDate(draft.birthDate);
          setAdoptionDate(draft.adoptionDate);
          setDeathDate(draft.deathDate ?? '');
          setBreed(draft.breed);
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
      savePetCreateDraft({
        step,
        name,
        birthDate,
        adoptionDate,
        deathDate,
        breed,
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
    breed,
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

      setStep(2);
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

      ensureMinOne(likes, '좋아하는 것');
      ensureMinOne(dislikes, '싫어하는 것');
      ensureMinOne(hobbies, '취미');
      ensureMinOne(tags, '태그');

      const createdPet = await createPet({
        name: trimmedName,
        themeColor: selectedThemeColor,
        birthDate: normalizedBirthDate,
        adoptionDate: normalizedAdoptionDate,
        deathDate: normalizedDeathDate,
        weightKg: normalizedWeight,
        breed: breed.trim() || null,
        gender,
        neutered,
        likes,
        dislikes,
        hobbies,
        tags,
        avatarPath: null,
      });

      upsertPet(createdPet, { userId, select: true });

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
      const includesCreatedPet = refreshedPets.some(p => p.id === createdPet.id);

      if (refreshedPets.length === 0 && currentPets.length > 0) {
        showToast({
          tone: 'info',
          title: '프로필 동기화 중',
          message: '새로 등록한 반려동물 정보를 먼저 보여드리고 있어요.',
          durationMs: 2200,
        });
      } else if (includesCreatedPet || refreshedPets.length >= currentPets.length) {
        setPets(refreshedPets, { userId, preferredPetId: createdPet.id });
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
    breed,
    canSubmit,
    dislikes,
    gender,
    hobbies,
    imageType,
    imageUri,
    likes,
    memorialChoice,
    selectedThemeColor,
    neutered,
    setPets,
    updatePetAvatar,
    upsertPet,
    tags,
    trimmedName,
    weightKg,
  ]);
  const goPrevStep = useCallback(() => {
    setStep(1);
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
      routes: [{ name: 'WelcomeTransition' }],
    });
  }, [navigation]);

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

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <View style={[styles.topChrome, { paddingTop: compactTopInset }]}>
        <View style={styles.header}>
          <View style={styles.headerActionPlaceholder} />

          <Text style={styles.headerTitle}>프로필 등록 ({step}/2)</Text>

          <View style={styles.headerActionPlaceholder} />
        </View>

        <View style={styles.progressHeader}>
          <View style={styles.progressMetaRow}>
            <Text style={styles.progressLabel}>
              {step === 1 ? '기본 정보 입력' : '상세 정보 입력'}
            </Text>
            <Text style={styles.progressStepText}>{step}/2</Text>
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {step === 1 ? (
            <StepOneForm
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
              breed={breed}
              onBreedChange={setBreed}
              gender={gender}
              onGenderChange={setGender}
              neutered={neutered}
              onNeuteredChange={setNeutered}
            />
          ) : (
            <StepTwoForm
              weightKg={weightKg}
              onWeightChange={setWeightKg}
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
        </View>

        <View style={styles.footerActions}>
          {step === 1 ? (
            <>
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={!canGoNext}
                style={[
                  styles.primaryButton,
                  !canGoNext ? styles.buttonDisabled : null,
                ]}
                onPress={goNext}
              >
                <Text style={styles.primaryButtonText}>다음으로</Text>
              </TouchableOpacity>

              {showStepOneExitButton ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.secondaryButton}
                  onPress={onPressExitToPrevious}
                >
                  <Text style={styles.secondaryButtonText}>돌아가기</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.secondaryButton}
                onPress={goPrevStep}
              >
                <Text style={styles.secondaryButtonText}>이전 단계로</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                disabled={!canSubmit}
                style={[
                  styles.primaryButton,
                  !canSubmit ? styles.buttonDisabled : null,
                ]}
                onPress={onSubmit}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? '등록 중...' : '등록 완료'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={successModalVisible}
        animationType="fade"
        onRequestClose={goToWelcomeTransition}
      >
        <View style={styles.successModalBackdrop}>
          <View style={styles.successModalCard}>
            <View style={styles.successLogoWrap}>
              <Image
                source={ASSETS.logo}
                style={styles.successLogo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.successCopyWrap}>
              <Text style={styles.successTitle}>등록이 완료되었어요!</Text>
              <Text style={styles.successBody}>
                우리 아이와 함께할 소중한 추억들을
              </Text>
              <Text style={styles.successBody}>차곡차곡 쌓아보세요.</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.successPrimaryButton}
              onPress={goToWelcomeTransition}
            >
              <Text style={styles.successPrimaryButtonText}>시작하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={dateModalTarget !== null}
        title={dateModalTitle}
        initialDate={dateModalInitialValue}
        onCancel={closeDateModal}
        onConfirm={onConfirmDateModal}
      />
    </SafeAreaView>
  );
}
