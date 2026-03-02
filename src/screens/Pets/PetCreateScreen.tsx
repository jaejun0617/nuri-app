// 파일: src/screens/Pets/PetCreateScreen.tsx
// 목적:
// - 펫 등록(온보딩)
// - 이미지 선택 → Storage 업로드 → pets.profile_image_url(path) 저장
// - 등록 성공 시 fetchMyPets → petStore 주입 → AppTabs reset(=홈으로 복귀)
//
// ✅ 이번 변경:
// - SQL 스키마 필드 확장 입력 반영
// - likes/dislikes/hobbies/tags: 최소 1개 강제
// - gender/neutered/breed 입력 추가
// - 스타일 분리(PetCreateScreen.styles.ts)

import React, { useMemo, useState, useCallback } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../services/supabase/client';
import { uploadPetAvatar } from '../../services/supabase/storagePets';
import { createPet, fetchMyPets } from '../../services/supabase/pets';
import { usePetStore } from '../../store/petStore';

import { styles } from './PetCreateScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PetCreate'>;

function normalizeYmdOrNull(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    throw new Error('날짜 형식은 YYYY-MM-DD 입니다.');
  }
  return t;
}

function normalizeWeightOrNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('몸무게는 0보다 큰 숫자여야 합니다.');
  }
  return n;
}

function normalizeTextItem(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function ensureMinOne(list: string[], label: string) {
  if (!Array.isArray(list) || list.length < 1) {
    throw new Error(`${label}은(는) 최소 1개 이상 설정해야 합니다.`);
  }
}

export default function PetCreateScreen() {
  // ---------------------------------------------------------
  // 1) navigation
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();

  // ---------------------------------------------------------
  // 2) store
  // ---------------------------------------------------------
  const setPets = usePetStore(s => s.setPets);

  // ---------------------------------------------------------
  // 3) local state
  // ---------------------------------------------------------
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');

  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>(
    'unknown',
  );
  const [neutered, setNeutered] = useState<boolean | null>(null);

  const [adoptionDate, setAdoptionDate] = useState(''); // YYYY-MM-DD
  const [birthDate, setBirthDate] = useState(''); // YYYY-MM-DD
  const [weightKg, setWeightKg] = useState(''); // number string

  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]); // '#태그' 형태로 저장

  const [draftLike, setDraftLike] = useState('');
  const [draftDislike, setDraftDislike] = useState('');
  const [draftHobby, setDraftHobby] = useState('');
  const [draftTag, setDraftTag] = useState('');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);

  const trimmedName = useMemo(() => name.trim(), [name]);

  const disabled = useMemo(() => {
    if (saving) return true;
    if (trimmedName.length < 1) return true;

    // 최소 1개 규칙(요구사항)
    if (likes.length < 1) return true;
    if (dislikes.length < 1) return true;
    if (hobbies.length < 1) return true;
    if (tags.length < 1) return true;

    return false;
  }, [
    saving,
    trimmedName,
    likes.length,
    dislikes.length,
    hobbies.length,
    tags.length,
  ]);

  // ---------------------------------------------------------
  // 4) image picker
  // ---------------------------------------------------------
  const pickImage = useCallback(async () => {
    const res = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.9,
    });

    if (res.didCancel) return;

    const asset = res.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('이미지 선택 실패', '다시 시도해 주세요.');
      return;
    }

    setImageUri(asset.uri);
    setImageType(asset.type ?? null);
  }, []);

  // ---------------------------------------------------------
  // 5) list helpers
  // ---------------------------------------------------------
  const addItem = useCallback(
    (kind: 'likes' | 'dislikes' | 'hobbies' | 'tags') => {
      const getDraft = () => {
        if (kind === 'likes') return draftLike;
        if (kind === 'dislikes') return draftDislike;
        if (kind === 'hobbies') return draftHobby;
        return draftTag;
      };

      const setDraft = (v: string) => {
        if (kind === 'likes') setDraftLike(v);
        else if (kind === 'dislikes') setDraftDislike(v);
        else if (kind === 'hobbies') setDraftHobby(v);
        else setDraftTag(v);
      };

      const raw = normalizeTextItem(getDraft());
      if (!raw) return;

      if (kind === 'tags') {
        const normalized = raw.startsWith('#') ? raw : `#${raw}`;
        setTags(prev =>
          (prev.includes(normalized) ? prev : [...prev, normalized]).slice(
            0,
            12,
          ),
        );
        setDraft('');
        return;
      }

      const push = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setter(prev =>
          (prev.includes(raw) ? prev : [...prev, raw]).slice(0, 12),
        );
      };

      if (kind === 'likes') push(setLikes);
      if (kind === 'dislikes') push(setDislikes);
      if (kind === 'hobbies') push(setHobbies);

      setDraft('');
    },
    [draftLike, draftDislike, draftHobby, draftTag],
  );

  const removeItem = useCallback(
    (kind: 'likes' | 'dislikes' | 'hobbies' | 'tags', value: string) => {
      const filterOut = (
        setter: React.Dispatch<React.SetStateAction<string[]>>,
      ) => {
        setter(prev => prev.filter(v => v !== value));
      };
      if (kind === 'likes') filterOut(setLikes);
      if (kind === 'dislikes') filterOut(setDislikes);
      if (kind === 'hobbies') filterOut(setHobbies);
      if (kind === 'tags') filterOut(setTags);
    },
    [],
  );

  // ---------------------------------------------------------
  // 6) submit
  // ---------------------------------------------------------
  const onSubmit = useCallback(async () => {
    if (saving) return;

    try {
      setSaving(true);

      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id ?? null;
      if (!userId) throw new Error('로그인 정보가 없습니다.');

      const adoption = normalizeYmdOrNull(adoptionDate);
      const birth = normalizeYmdOrNull(birthDate);
      const weight = normalizeWeightOrNull(weightKg);

      const breedTrim = breed.trim() || null;

      // ✅ 최소 1개 규칙(요구사항)
      ensureMinOne(likes, '좋아하는 것');
      ensureMinOne(dislikes, '싫어하는 것');
      ensureMinOne(hobbies, '취미');
      ensureMinOne(tags, '태그');

      // 1) pets insert 먼저(펫 id 필요)
      const newPetId = await createPet({
        name: trimmedName,
        adoptionDate: adoption,
        birthDate: birth,
        weightKg: weight,

        gender,
        neutered,
        breed: breedTrim,

        likes,
        dislikes,
        hobbies,
        tags,

        avatarPath: null,
      });

      // 2) 이미지가 있으면 업로드 후 pets.profile_image_url 업데이트
      if (imageUri) {
        const { path } = await uploadPetAvatar({
          userId,
          petId: newPetId,
          fileUri: imageUri,
          mimeType: imageType,
        });

        const { error: upErr } = await supabase
          .from('pets')
          .update({ profile_image_url: path })
          .eq('id', newPetId);

        if (upErr) throw upErr;
      }

      // 3) pets refetch → store 주입
      const pets = await fetchMyPets();
      setPets(pets);

      // 4) ✅ AppTabs(=탭 루트)로 reset
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs' }],
      });
    } catch (e: any) {
      Alert.alert('펫 등록 실패', e?.message ?? '다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    trimmedName,
    adoptionDate,
    birthDate,
    weightKg,
    breed,
    gender,
    neutered,
    likes,
    dislikes,
    hobbies,
    tags,
    imageUri,
    imageType,
    setPets,
    navigation,
  ]);

  // ---------------------------------------------------------
  // 7) UI
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>반려동물 등록</Text>
          <Text style={styles.subTitle}>
            입력한 정보로 홈의 큰 프로필 카드가 완성돼요.
          </Text>
        </View>

        <View style={styles.card}>
          {/* 사진 */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.imagePicker}
            onPress={pickImage}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <Text style={styles.imagePickerText}>사진 선택</Text>
            )}
          </TouchableOpacity>

          {/* 이름 */}
          <Text style={styles.label}>이름 *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="예: 누리"
            placeholderTextColor="#B8B0A8"
            style={styles.input}
            returnKeyType="done"
          />

          {/* 견종 */}
          <Text style={styles.label}>견종</Text>
          <TextInput
            value={breed}
            onChangeText={setBreed}
            placeholder="예: 말티즈"
            placeholderTextColor="#B8B0A8"
            style={styles.input}
            returnKeyType="done"
          />

          {/* 성별 */}
          <Text style={styles.label}>성별 *</Text>
          <View style={styles.chipRow}>
            {(['male', 'female', 'unknown'] as const).map(v => {
              const active = gender === v;
              const label =
                v === 'male' ? '남아' : v === 'female' ? '여아' : '모름';
              return (
                <TouchableOpacity
                  key={v}
                  activeOpacity={0.9}
                  style={[styles.chip, active ? styles.chipActive : null]}
                  onPress={() => setGender(v)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active ? styles.chipTextActive : null,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 중성화 */}
          <Text style={styles.label}>중성화</Text>
          <View style={styles.chipRow}>
            {[
              { key: 'yes', label: '했어요', value: true as boolean },
              { key: 'no', label: '안 했어요', value: false as boolean },
              { key: 'unknown', label: '모름', value: null as boolean | null },
            ].map(o => {
              const active = neutered === o.value;
              return (
                <TouchableOpacity
                  key={o.key}
                  activeOpacity={0.9}
                  style={[styles.chip, active ? styles.chipActive : null]}
                  onPress={() => setNeutered(o.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active ? styles.chipTextActive : null,
                    ]}
                  >
                    {o.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 날짜/몸무게 */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>생년월일</Text>
              <TextInput
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#B8B0A8"
                style={styles.input}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>입양날짜</Text>
              <TextInput
                value={adoptionDate}
                onChangeText={setAdoptionDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#B8B0A8"
                style={styles.input}
                autoCapitalize="none"
              />
            </View>
          </View>

          <Text style={styles.label}>몸무게(kg)</Text>
          <TextInput
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="예: 4.5"
            placeholderTextColor="#B8B0A8"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          {/* 좋아하는 것 */}
          <Text style={styles.label}>좋아하는 것 * (최소 1개)</Text>
          <View style={styles.multiBox}>
            <View style={styles.multiTopRow}>
              <Text style={styles.multiCount}>{likes.length}/12</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.miniAddBtn}
                onPress={() => addItem('likes')}
              >
                <Text style={styles.miniAddBtnText}>추가</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={draftLike}
              onChangeText={setDraftLike}
              placeholder="예: 간식"
              placeholderTextColor="#B8B0A8"
              style={styles.input}
              onSubmitEditing={() => addItem('likes')}
              returnKeyType="done"
            />

            <View style={styles.pillRow}>
              {likes.map(v => (
                <TouchableOpacity
                  key={v}
                  activeOpacity={0.85}
                  style={styles.pill}
                  onPress={() => removeItem('likes', v)}
                >
                  <Text style={styles.pillText}>{v}</Text>
                  <Text style={styles.pillX}>×</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 싫어하는 것 */}
          <Text style={styles.label}>싫어하는 것 * (최소 1개)</Text>
          <View style={styles.multiBox}>
            <View style={styles.multiTopRow}>
              <Text style={styles.multiCount}>{dislikes.length}/12</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.miniAddBtn}
                onPress={() => addItem('dislikes')}
              >
                <Text style={styles.miniAddBtnText}>추가</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={draftDislike}
              onChangeText={setDraftDislike}
              placeholder="예: 큰 소리"
              placeholderTextColor="#B8B0A8"
              style={styles.input}
              onSubmitEditing={() => addItem('dislikes')}
              returnKeyType="done"
            />

            <View style={styles.pillRow}>
              {dislikes.map(v => (
                <TouchableOpacity
                  key={v}
                  activeOpacity={0.85}
                  style={styles.pill}
                  onPress={() => removeItem('dislikes', v)}
                >
                  <Text style={styles.pillText}>{v}</Text>
                  <Text style={styles.pillX}>×</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 취미 */}
          <Text style={styles.label}>취미 * (최소 1개)</Text>
          <View style={styles.multiBox}>
            <View style={styles.multiTopRow}>
              <Text style={styles.multiCount}>{hobbies.length}/12</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.miniAddBtn}
                onPress={() => addItem('hobbies')}
              >
                <Text style={styles.miniAddBtnText}>추가</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={draftHobby}
              onChangeText={setDraftHobby}
              placeholder="예: 산책"
              placeholderTextColor="#B8B0A8"
              style={styles.input}
              onSubmitEditing={() => addItem('hobbies')}
              returnKeyType="done"
            />

            <View style={styles.pillRow}>
              {hobbies.map(v => (
                <TouchableOpacity
                  key={v}
                  activeOpacity={0.85}
                  style={styles.pill}
                  onPress={() => removeItem('hobbies', v)}
                >
                  <Text style={styles.pillText}>{v}</Text>
                  <Text style={styles.pillX}>×</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 태그 */}
          <Text style={styles.label}>태그 * (최소 1개)</Text>
          <View style={styles.multiBox}>
            <View style={styles.multiTopRow}>
              <Text style={styles.multiCount}>{tags.length}/12</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.miniAddBtn}
                onPress={() => addItem('tags')}
              >
                <Text style={styles.miniAddBtnText}>추가</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={draftTag}
              onChangeText={setDraftTag}
              placeholder="예: 산책러버"
              placeholderTextColor="#B8B0A8"
              style={styles.input}
              onSubmitEditing={() => addItem('tags')}
              returnKeyType="done"
            />

            <View style={styles.pillRow}>
              {tags.map(v => (
                <TouchableOpacity
                  key={v}
                  activeOpacity={0.85}
                  style={styles.pill}
                  onPress={() => removeItem('tags', v)}
                >
                  <Text style={styles.pillText}>{v}</Text>
                  <Text style={styles.pillX}>×</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 저장 */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.primary, disabled ? styles.primaryDisabled : null]}
            disabled={disabled}
            onPress={onSubmit}
          >
            <Text style={styles.primaryText}>
              {saving ? '저장 중...' : '등록 완료'}
            </Text>
          </TouchableOpacity>

          {/* 뒤로 */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.ghost}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.ghostText}>나중에 할게요</Text>
          </TouchableOpacity>

          <Text style={styles.inputHint}>
            * 최소 1개 규칙: 좋아하는 것 / 싫어하는 것 / 취미 / 태그는 각각 1개
            이상 입력해야 해요.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
