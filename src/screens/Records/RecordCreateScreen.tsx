// 파일: src/screens/Records/RecordCreateScreen.tsx
// 목적:
// - memory(기록) 생성
// - ✅ 저장 직후 홈/타임라인에 "즉시" 보이도록 optimistic upsert 적용
// - 이후 refresh로 서버와 동기화(이미지 signed url 포함)
// - ✅ 탭 구조에서 폼이 남는 문제 방지: focus/reset + 성공 후 reset

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { supabase } from '../../services/supabase/client';
import {
  createMemory,
  updateMemoryImagePath,
  type EmotionTag,
  fetchMemoryById,
} from '../../services/supabase/memories';
import { uploadMemoryImage } from '../../services/supabase/storageMemories';
import { useRecordStore } from '../../store/recordStore';
import { usePetStore } from '../../store/petStore';
import AppText from '../../app/ui/AppText';

type Nav = NativeStackNavigationProp<any>;

const EMOTIONS: Array<{ label: string; value: EmotionTag }> = [
  { label: '행복', value: 'happy' },
  { label: '평온', value: 'calm' },
  { label: '신남', value: 'excited' },
  { label: '무난', value: 'neutral' },
  { label: '슬픔', value: 'sad' },
  { label: '불안', value: 'anxious' },
  { label: '화남', value: 'angry' },
  { label: '피곤', value: 'tired' },
];

export default function RecordCreateScreen() {
  // ---------------------------------------------------------
  // 1) navigation / route
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();

  // ---------------------------------------------------------
  // 1.5) petId resolve (params → store fallback)
  // ---------------------------------------------------------
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const petIdFromParams = route?.params?.petId ?? null;

  const petId = useMemo(() => {
    if (petIdFromParams) return petIdFromParams;
    if (selectedPetId && pets.some(p => p.id === selectedPetId)) {
      return selectedPetId;
    }
    return pets[0]?.id ?? null;
  }, [petIdFromParams, selectedPetId, pets]);

  // ---------------------------------------------------------
  // 2) store
  // ---------------------------------------------------------
  const refresh = useRecordStore(s => s.refresh);
  const upsertOneLocal = useRecordStore(s => s.upsertOneLocal);

  // ---------------------------------------------------------
  // 3) local state
  // ---------------------------------------------------------
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [emotion, setEmotion] = useState<EmotionTag | null>(null);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const trimmedTitle = useMemo(() => title.trim(), [title]);
  const disabled = saving || trimmedTitle.length === 0 || !petId;

  // ---------------------------------------------------------
  // 3.5) reset helpers (✅ 탭/재진입 안정화)
  // ---------------------------------------------------------
  const resetForm = useCallback(() => {
    setTitle('');
    setContent('');
    setOccurredAt('');
    setTagsText('');
    setEmotion(null);
    setImageUri(null);
    setImageType(null);
    setSaving(false);
  }, []);

  // ✅ 화면 포커스될 때 폼 초기화 (탭 구조에서 state 잔상 방지)
  useFocusEffect(
    useCallback(() => {
      resetForm();
      return () => {};
    }, [resetForm]),
  );

  // ---------------------------------------------------------
  // 4) helpers
  // ---------------------------------------------------------
  const parseTags = (raw: string) => {
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
  };

  const validateOccurredAt = (v: string) => {
    const t = v.trim();
    if (!t) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      throw new Error('날짜 형식은 YYYY-MM-DD 입니다.');
    }
    return t;
  };

  const pickImage = async () => {
    if (saving) return;

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

      const occurred = validateOccurredAt(occurredAt);

      // 1) create row
      const memoryId = await createMemory({
        petId,
        title: trimmedTitle,
        content: content.trim() || null,
        emotion,
        tags: parseTags(tagsText),
        occurredAt: occurred,
        imagePath: null,
      });

      // 2) upload image + update path
      if (imageUri) {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id ?? null;
        if (!userId) throw new Error('로그인 정보가 없습니다.');

        const { path } = await uploadMemoryImage({
          userId,
          petId,
          memoryId,
          fileUri: imageUri,
          mimeType: imageType,
        });

        await updateMemoryImagePath({ memoryId, imagePath: path });
      }

      // 3) optimistic upsert
      try {
        const created = await fetchMemoryById(memoryId);
        upsertOneLocal(petId, created);
      } catch {
        // ignore
      }

      // 4) background refresh
      refresh(petId).catch(() => {});

      // ✅ 5) 성공 후 폼 리셋(탭에 남아있는 값 제거)
      resetForm();

      // 6) 이동
      navigation.navigate('TimelineTab');
    } catch (e: any) {
      Alert.alert('기록 저장 실패', e?.message ?? '다시 시도해 주세요.');
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
        <AppText preset="headline" style={styles.title}>
          기록하기
        </AppText>

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <AppText preset="body" style={styles.imagePickerText}>
              사진 선택(선택)
            </AppText>
          )}
        </TouchableOpacity>

        <AppText preset="caption" style={styles.label}>
          제목
        </AppText>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="제목"
          placeholderTextColor="#777777"
        />

        <AppText preset="caption" style={styles.label}>
          내용(선택)
        </AppText>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={content}
          onChangeText={setContent}
          placeholder="내용"
          placeholderTextColor="#777777"
          multiline
        />

        <AppText preset="caption" style={styles.label}>
          날짜(선택)
        </AppText>
        <TextInput
          style={styles.input}
          value={occurredAt}
          onChangeText={setOccurredAt}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#777777"
          autoCapitalize="none"
        />

        <AppText preset="caption" style={styles.label}>
          태그(선택)
        </AppText>
        <TextInput
          style={styles.input}
          value={tagsText}
          onChangeText={setTagsText}
          placeholder="#산책 #간식 또는 산책,간식"
          placeholderTextColor="#777777"
        />

        <AppText preset="caption" style={styles.label}>
          감정(선택)
        </AppText>

        <View style={styles.emotionRow}>
          {EMOTIONS.slice(0, 4).map(e => (
            <TouchableOpacity
              key={e.value}
              style={[
                styles.chip,
                emotion === e.value ? styles.chipActive : null,
              ]}
              onPress={() =>
                setEmotion(prev => (prev === e.value ? null : e.value))
              }
            >
              <AppText preset="caption" style={styles.chipText}>
                {e.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.emotionRow}>
          {EMOTIONS.slice(4).map(e => (
            <TouchableOpacity
              key={e.value}
              style={[
                styles.chip,
                emotion === e.value ? styles.chipActive : null,
              ]}
              onPress={() =>
                setEmotion(prev => (prev === e.value ? null : e.value))
              }
            >
              <AppText preset="caption" style={styles.chipText}>
                {e.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primary, disabled ? styles.primaryDisabled : null]}
          disabled={disabled}
          onPress={onSubmit}
        >
          <AppText preset="body" style={styles.primaryText}>
            {saving ? '저장 중...' : '저장'}
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },

  title: { marginBottom: 10, color: '#000000', fontWeight: '900' },

  imagePicker: {
    height: 160,
    borderRadius: 18,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  imagePickerText: { color: '#333333', fontWeight: '700' },
  image: { width: '100%', height: '100%' },

  label: {
    marginTop: 10,
    marginBottom: 6,
    color: '#333333',
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    padding: 12,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },

  emotionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { borderColor: '#000000' },
  chipText: { color: '#000000', fontWeight: '700' },

  primary: {
    marginTop: 16,
    backgroundColor: '#000000',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },
});
