// 파일: src/screens/Records/RecordCreateScreen.tsx
// 목적:
// - memory(기록) 생성
// - ✅ 저장 직후 홈/타임라인에 "즉시" 보이도록 optimistic upsert 적용
// - 이후 refresh로 서버와 동기화(이미지 signed url 포함)
// - ✅ 탭 구조에서 폼이 남는 문제 방지: focus/reset + 성공 후 reset

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, TextInput, TouchableOpacity, View } from 'react-native';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { AppTabParamList } from '../../navigation/AppTabsNavigator';
import { supabase } from '../../services/supabase/client';
import {
  createMemory,
  fetchMemoryById,
  type EmotionTag,
  updateMemoryImagePath,
} from '../../services/supabase/memories';
import { uploadMemoryImage } from '../../services/supabase/storageMemories';
import AppText from '../../app/ui/AppText';
import { usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { styles } from './RecordCreateScreen.styles';

type RecordCreateTabRoute = RouteProp<AppTabParamList, 'RecordCreateTab'>;
type RecordCreateTabNav = BottomTabNavigationProp<
  AppTabParamList,
  'RecordCreateTab'
>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;
type Nav = CompositeNavigationProp<RecordCreateTabNav, RootNav>;

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

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '다시 시도해 주세요.';
}

function inferMimeFromFileName(
  fileName: string | null | undefined,
): string | null {
  const value = (fileName ?? '').toLowerCase().trim();
  if (!value) return null;
  if (value.endsWith('.jpg') || value.endsWith('.jpeg')) return 'image/jpeg';
  if (value.endsWith('.png')) return 'image/png';
  if (value.endsWith('.webp')) return 'image/webp';
  if (value.endsWith('.heic')) return 'image/heic';
  if (value.endsWith('.heif')) return 'image/heif';
  return null;
}

function inferMimeFromUri(uri: string): string | null {
  const normalized = uri.toLowerCase().split('?')[0];
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.heic')) return 'image/heic';
  if (normalized.endsWith('.heif')) return 'image/heif';
  return null;
}

function resolvePickerMimeType(asset: {
  type?: string | null;
  fileName?: string | null;
  uri?: string | null;
}) {
  const direct = asset.type ?? null;
  if (direct && direct.includes('/')) return direct;

  const byName = inferMimeFromFileName(asset.fileName);
  if (byName) return byName;

  if (asset.uri) return inferMimeFromUri(asset.uri);
  return null;
}

export default function RecordCreateScreen() {
  // ---------------------------------------------------------
  // 1) navigation / route
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const route = useRoute<RecordCreateTabRoute>();

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
    setImageType(resolvePickerMimeType(asset));
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
    } catch (error) {
      Alert.alert('기록 저장 실패', getErrorMessage(error));
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
