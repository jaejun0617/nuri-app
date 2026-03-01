// 파일: src/screens/Pets/PetCreateScreen.tsx
// 목적:
// - 펫 등록(온보딩)
// - 이미지 선택 → Storage 업로드(pet-profiles: public) → pets.profile_image_url(path) 저장
// - 등록 성공 시 fetchMyPets → petStore 주입 → Main reset

import React, { useMemo, useState, useCallback } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
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

type Nav = NativeStackNavigationProp<RootStackParamList>;

function normalizeYmdOrNull(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t))
    throw new Error('날짜 형식은 YYYY-MM-DD 입니다.');
  return t;
}

function normalizeWeightOrNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0)
    throw new Error('몸무게는 양수 숫자만 가능합니다.');
  return n;
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
  const [name, setName] = useState('');
  const [adoptionDate, setAdoptionDate] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [tagsText, setTagsText] = useState('');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const disabled = useMemo(
    () => saving || trimmedName.length < 1,
    [saving, trimmedName],
  );

  // ---------------------------------------------------------
  // 4) helpers
  // ---------------------------------------------------------
  const parseTags = useCallback((raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return [];

    const byComma = cleaned
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const base =
      byComma.length >= 2
        ? byComma
        : cleaned
            .split(/\s+/)
            .map(s => s.trim())
            .filter(Boolean);

    return base
      .map(t => t.replace(/^#/, '').trim())
      .filter(Boolean)
      .slice(0, 10)
      .map(t => `#${t}`);
  }, []);

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
  // 5) submit
  // ---------------------------------------------------------
  const onSubmit = useCallback(async () => {
    if (disabled) return;

    try {
      setSaving(true);

      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id ?? null;
      if (!userId) throw new Error('로그인 정보가 없습니다.');

      const adoption = normalizeYmdOrNull(adoptionDate);
      const birth = normalizeYmdOrNull(birthDate);
      const weight = normalizeWeightOrNull(weightKg);

      // 1) pets insert 먼저(펫 id 필요)
      const newPetId = await createPet({
        name: trimmedName,
        adoptionDate: adoption,
        birthDate: birth,
        weightKg: weight,
        tags: parseTags(tagsText),
        avatarPath: null,
      });

      // 2) 이미지 업로드 → path 저장
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

      // 3) pets refetch → store 주입(avatarUrl은 public url로 세팅됨)
      const pets = await fetchMyPets();
      setPets(pets);

      // 4) Main reset
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e: any) {
      Alert.alert('펫 등록 실패', e?.message ?? '다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }, [
    disabled,
    adoptionDate,
    birthDate,
    weightKg,
    trimmedName,
    parseTags,
    tagsText,
    imageUri,
    imageType,
    setPets,
    navigation,
  ]);

  // ---------------------------------------------------------
  // 6) UI
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>반려동물 등록</Text>
        <Text style={styles.subTitle}>
          아이의 정보를 등록하면 홈에서 바로 보여요.
        </Text>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.imagePicker}
          onPress={pickImage}
          disabled={saving}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <Text style={styles.imagePickerText}>사진 선택</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>이름</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="예: 누리"
          placeholderTextColor="#B8B0A8"
          style={styles.input}
          editable={!saving}
        />

        <Text style={styles.label}>입양일(선택)</Text>
        <TextInput
          value={adoptionDate}
          onChangeText={setAdoptionDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#B8B0A8"
          style={styles.input}
          autoCapitalize="none"
          editable={!saving}
        />

        <Text style={styles.label}>생일(선택)</Text>
        <TextInput
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#B8B0A8"
          style={styles.input}
          autoCapitalize="none"
          editable={!saving}
        />

        <Text style={styles.label}>몸무게(선택)</Text>
        <TextInput
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="예: 5.2"
          placeholderTextColor="#B8B0A8"
          keyboardType="decimal-pad"
          style={styles.input}
          editable={!saving}
        />

        <Text style={styles.label}>태그(선택)</Text>
        <TextInput
          value={tagsText}
          onChangeText={setTagsText}
          placeholder="#산책러버 #간식최애 또는 산책러버,간식최애"
          placeholderTextColor="#B8B0A8"
          style={styles.input}
          editable={!saving}
        />

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

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.ghost}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={styles.ghostText}>나중에 할게요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F2EE',
    padding: 18,
    justifyContent: 'center',
  },
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
  title: { fontSize: 20, fontWeight: '900', color: '#1D1B19', marginBottom: 6 },
  subTitle: {
    fontSize: 12,
    color: '#6E6660',
    fontWeight: '600',
    lineHeight: 17,
    marginBottom: 14,
  },

  imagePicker: {
    height: 160,
    borderRadius: 18,
    backgroundColor: '#F3EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  imagePickerText: { color: '#7A726C', fontSize: 13, fontWeight: '800' },
  image: { width: '100%', height: '100%' },

  label: {
    fontSize: 12,
    color: '#6E6660',
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3EEE8',
    paddingHorizontal: 14,
    color: '#1D1B19',
    fontWeight: '700',
  },

  primary: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#97A48D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },

  ghost: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  ghostText: { color: '#7A726C', fontSize: 13, fontWeight: '700' },
});
