// 파일: src/screens/Records/RecordCreateScreen.tsx
// 목적:
// - memory(기록) 생성
// - 이미지 선택 → (1) memories row 생성(id 확보)
//   → (2) Storage 업로드(memory-images) → (3) memories.image_url(path) 업데이트
// - 성공 시: store.refresh(petId)로 즉시 동기화 후 Timeline으로 이동

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../services/supabase/client';
import {
  createMemory,
  type EmotionTag,
  updateMemoryImagePath,
} from '../../services/supabase/memories';
import { uploadMemoryImage } from '../../services/supabase/storageMemories';
import { useRecordStore } from '../../store/recordStore';
import AppText from '../../app/ui/AppText';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = { key: string; name: string; params: { petId: string } };

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
  // 1) navigation / params
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const petId = route.params?.petId;

  // ---------------------------------------------------------
  // 2) store
  // ---------------------------------------------------------
  const refresh = useRecordStore(s => s.refresh);

  // ---------------------------------------------------------
  // 3) local state
  // ---------------------------------------------------------
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [occurredAt, setOccurredAt] = useState(''); // YYYY-MM-DD (옵션)
  const [tagsText, setTagsText] = useState(''); // "#a #b" 또는 "a,b"
  const [emotion, setEmotion] = useState<EmotionTag | null>(null);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const trimmedTitle = useMemo(() => title.trim(), [title]);
  const disabled = useMemo(
    () => saving || trimmedTitle.length < 1 || !petId,
    [saving, trimmedTitle, petId],
  );

  // ---------------------------------------------------------
  // 4) helpers
  // ---------------------------------------------------------
  const parseTags = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return [];

    // 1) 콤마 우선
    const byComma = cleaned
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // 2) 콤마가 아니라면 공백 split
    const base =
      byComma.length >= 2
        ? byComma
        : cleaned
            .split(/\s+/)
            .map(s => s.trim())
            .filter(Boolean);

    // 3) # 정리 + 최대 10개
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

  const validateOccurredAt = (v: string) => {
    const t = v.trim();
    if (!t) return null;

    // 매우 가벼운 형식 검증 (YYYY-MM-DD)
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(t);
    if (!ok) throw new Error('날짜 형식은 YYYY-MM-DD 입니다.');
    return t;
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

      const occurred = validateOccurredAt(occurredAt);

      // 1) row 먼저 생성해서 memoryId 확보
      const memoryId = await createMemory({
        petId,
        title: trimmedTitle,
        content: content.trim() ? content.trim() : null,
        emotion,
        tags: parseTags(tagsText),
        occurredAt: occurred,
        imagePath: null,
      });

      // 2) 이미지 업로드 + path 업데이트
      if (imageUri) {
        const { path } = await uploadMemoryImage({
          userId,
          petId,
          memoryId,
          fileUri: imageUri,
          mimeType: imageType,
        });

        await updateMemoryImagePath({ memoryId, imagePath: path });
      }

      // 3) store 동기화(최신 데이터 반영)
      await refresh(petId);

      // 4) Timeline으로 이동
      navigation.reset({
        index: 0,
        routes: [{ name: 'Timeline', params: { petId } }],
      });
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
        <AppText preset="caption" style={styles.subTitle}>
          사진과 함께 추억을 남겨요.
        </AppText>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.imagePicker}
          onPress={pickImage}
        >
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
          value={title}
          onChangeText={setTitle}
          placeholder="예: 같이 공원 산책한 날"
          placeholderTextColor="#8A94A6"
          style={styles.input}
        />

        <AppText preset="caption" style={styles.label}>
          내용(선택)
        </AppText>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="기억하고 싶은 내용을 적어주세요."
          placeholderTextColor="#8A94A6"
          style={[styles.input, styles.multiline]}
          multiline
        />

        <AppText preset="caption" style={styles.label}>
          날짜(선택)
        </AppText>
        <TextInput
          value={occurredAt}
          onChangeText={setOccurredAt}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#8A94A6"
          style={styles.input}
          autoCapitalize="none"
        />

        <AppText preset="caption" style={styles.label}>
          태그(선택)
        </AppText>
        <TextInput
          value={tagsText}
          onChangeText={setTagsText}
          placeholder="#산책 #간식 또는 산책,간식"
          placeholderTextColor="#8A94A6"
          style={styles.input}
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
          activeOpacity={0.9}
          style={[styles.primary, disabled ? styles.primaryDisabled : null]}
          disabled={disabled}
          onPress={onSubmit}
        >
          <AppText preset="body" style={styles.primaryText}>
            {saving ? '저장 중...' : '저장'}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.ghost}
          onPress={() => navigation.goBack()}
        >
          <AppText preset="caption" style={styles.ghostText}>
            취소
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    padding: 16,
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
  title: { marginBottom: 6 },
  subTitle: { color: '#556070', marginBottom: 14 },

  imagePicker: {
    height: 160,
    borderRadius: 18,
    backgroundColor: '#F6F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6E8F0',
  },
  imagePickerText: { color: '#556070' },
  image: { width: '100%', height: '100%' },

  label: {
    color: '#556070',
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#F6F7FB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0B1220',
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#E6E8F0',
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },

  emotionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6E8F0',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { borderColor: '#6D7CFF' },
  chipText: { color: '#0B1220', fontWeight: '700' },

  primary: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#6D7CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },

  ghost: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  ghostText: { color: '#556070', fontWeight: '700' },
});
