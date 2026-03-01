// 파일: src/screens/Records/RecordEditScreen.tsx
// 목적:
// - 기존 memory 수정(완전체)
// - title / content / tags / emotion / occurredAt 수정
// - 저장 후 refresh(petId) + 뒤로

import React, { useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  updateMemoryFields,
  type EmotionTag,
} from '../../services/supabase/memories';
import { useRecordStore } from '../../store/recordStore';
import AppText from '../../app/ui/AppText';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = {
  key: string;
  name: string;
  params: { petId: string; memoryId: string };
};

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

export default function RecordEditScreen() {
  // ---------------------------------------------------------
  // 1) nav / params
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { petId, memoryId } = route.params;

  // ---------------------------------------------------------
  // 2) store
  // ---------------------------------------------------------
  const petState = useRecordStore(s => s.getPetState(petId));
  const refresh = useRecordStore(s => s.refresh);

  const record = useMemo(
    () => petState.items.find(r => r.id === memoryId) ?? null,
    [petState.items, memoryId],
  );

  // ---------------------------------------------------------
  // 3) local state
  // ---------------------------------------------------------
  const [title, setTitle] = useState(record?.title ?? '');
  const [content, setContent] = useState(record?.content ?? '');
  const [occurredAt, setOccurredAt] = useState(record?.occurredAt ?? '');
  const [tagsText, setTagsText] = useState(record?.tags?.join(' ') ?? '');
  const [emotion, setEmotion] = useState<EmotionTag | null>(
    record?.emotion ?? null,
  );

  const [saving, setSaving] = useState(false);

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

  // ---------------------------------------------------------
  // 5) submit
  // ---------------------------------------------------------
  const onSubmit = async () => {
    if (!record) return;
    if (!title.trim()) return;

    try {
      setSaving(true);

      const occurred = validateOccurredAt(occurredAt);

      await updateMemoryFields({
        memoryId,
        title: title.trim(),
        content: content.trim() || null,
        emotion,
        tags: parseTags(tagsText),
        occurredAt: occurred,
      });

      await refresh(petId);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('수정 실패', e?.message ?? '오류');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------
  // 6) guard
  // ---------------------------------------------------------
  if (!record) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <AppText preset="headline">기록을 찾을 수 없어요</AppText>
          <AppText preset="body" style={styles.desc}>
            목록으로 돌아가서 새로고침 해주세요.
          </AppText>
          <TouchableOpacity
            style={styles.ghost}
            onPress={() => navigation.goBack()}
          >
            <AppText preset="caption" style={styles.ghostText}>
              뒤로
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------
  // 7) UI
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <AppText preset="headline">기록 수정</AppText>

        <AppText preset="caption" style={styles.label}>
          제목
        </AppText>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="제목"
          placeholderTextColor="#8A94A6"
        />

        <AppText preset="caption" style={styles.label}>
          내용(선택)
        </AppText>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={content ?? ''}
          onChangeText={setContent}
          placeholder="내용"
          placeholderTextColor="#8A94A6"
          multiline
        />

        <AppText preset="caption" style={styles.label}>
          날짜(선택)
        </AppText>
        <TextInput
          style={styles.input}
          value={occurredAt ?? ''}
          onChangeText={setOccurredAt}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#8A94A6"
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
          placeholderTextColor="#8A94A6"
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
          style={styles.primary}
          onPress={onSubmit}
          disabled={saving}
        >
          <AppText preset="body" style={styles.primaryText}>
            {saving ? '저장 중...' : '저장'}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
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
  screen: { flex: 1, padding: 16, backgroundColor: '#F6F7FB' },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E8F0',
  },

  label: {
    marginTop: 10,
    marginBottom: 6,
    color: '#556070',
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E6E8F0',
    borderRadius: 12,
    padding: 12,
    color: '#0B1220',
    backgroundColor: '#FFFFFF',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },

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
    marginTop: 14,
    backgroundColor: '#6D7CFF',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '900' },

  ghost: { marginTop: 10, paddingVertical: 8, alignItems: 'center' },
  ghostText: { color: '#556070', fontWeight: '700' },

  desc: { marginTop: 8, color: '#556070' },
});
