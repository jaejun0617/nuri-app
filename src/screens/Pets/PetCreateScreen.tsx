// 파일: src/screens/Pets/PetCreateScreen.tsx
// 목적:
// - 펫 등록(온보딩)
// - 이미지 선택 → Storage 업로드 → pets.profile_image_url 저장
// - 등록 성공 시 fetchMyPets → petStore 주입 → Main reset
//
// 패키지:
// - react-native-image-picker

import React, { useMemo, useState } from 'react';
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
  const [adoptionDate, setAdoptionDate] = useState(''); // YYYY-MM-DD
  const [birthDate, setBirthDate] = useState(''); // YYYY-MM-DD
  const [weightKg, setWeightKg] = useState(''); // number string
  const [tagsText, setTagsText] = useState(''); // "#태그1 #태그2" or "태그1,태그2"

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
  const parseTags = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return [];
    // "#a #b" 또는 "a,b" 둘 다 허용
    const bySpace = cleaned.split(/\s+/);
    const byComma = cleaned
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const base = byComma.length >= 2 ? byComma : bySpace;
    return base
      .map(t => t.replace(/^#/, '').trim())
      .filter(Boolean)
      .slice(0, 10)
      .map(t => `#${t}`);
  };

  const pickImage = async () => {
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
  };

  // ---------------------------------------------------------
  // 5) submit
  // ---------------------------------------------------------
  const onSubmit = async () => {
    if (disabled) return;

    try {
      setSaving(true);

      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id ?? null;
      if (!userId) throw new Error('로그인 정보가 없습니다.');

      // 1) pets insert 먼저(펫 id 필요)
      const newPetId = await createPet({
        name: trimmedName,
        adoptionDate: adoptionDate.trim() ? adoptionDate.trim() : null,
        birthDate: birthDate.trim() ? birthDate.trim() : null,
        weightKg: weightKg.trim() ? Number(weightKg.trim()) : null,
        tags: parseTags(tagsText),
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

      // 4) Main reset
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e: any) {
      Alert.alert('펫 등록 실패', e?.message ?? '다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

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
        />

        <Text style={styles.label}>입양일(선택)</Text>
        <TextInput
          value={adoptionDate}
          onChangeText={setAdoptionDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#B8B0A8"
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.label}>생일(선택)</Text>
        <TextInput
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#B8B0A8"
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.label}>몸무게(선택)</Text>
        <TextInput
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="예: 5.2"
          placeholderTextColor="#B8B0A8"
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <Text style={styles.label}>태그(선택)</Text>
        <TextInput
          value={tagsText}
          onChangeText={setTagsText}
          placeholder="#산책러버 #간식최애 또는 산책러버,간식최애"
          placeholderTextColor="#B8B0A8"
          style={styles.input}
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
