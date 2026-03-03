// 파일: src/screens/Records/RecordEditScreen.tsx
// 목적:
// - 기존 memory 수정(완전체)
// - title / content / tags / emotion / occurredAt 수정
// - 저장 후 refresh(petId) + 뒤로
//
// ✅ 이번 수정 포인트 (중요)
// 1) 뒤로가기 안전 처리:
//    - canGoBack() ? goBack() : reset(Main)
// 2) Zustand selector에서 getPetState() 호출 제거:
//    - byPetId[petId] 직접 구독하여 안정성 확보
// 3) record 늦게 로드되는 케이스 대비:
//    - 폼 state를 record로 1회 동기화(useEffect + dirty 방지)

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const petId = route.params?.petId ?? null;
  const memoryId = route.params?.memoryId ?? null;

  // ---------------------------------------------------------
  // 2) store
  // ---------------------------------------------------------
  const refresh = useRecordStore(s => s.refresh);

  const petState = useRecordStore(s => {
    if (!petId) return undefined;
    return s.byPetId[petId];
  });

  const record = useMemo(() => {
    if (!memoryId) return null;
    const items = petState?.items ?? [];
    return items.find(r => r.id === memoryId) ?? null;
  }, [petState?.items, memoryId]);

  // ---------------------------------------------------------
  // 3) form state
  // ---------------------------------------------------------
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [emotion, setEmotion] = useState<EmotionTag | null>(null);

  const [saving, setSaving] = useState(false);

  // ✅ 폼 동기화 보호(사용자 입력을 덮어쓰지 않기 위해)
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!record) return;
    if (dirty) return;

    setTitle(record.title ?? '');
    setContent(record.content ?? '');
    setOccurredAt(record.occurredAt ?? '');
    setTagsText(record.tags?.join(' ') ?? '');
    setEmotion(record.emotion ?? null);
  }, [record, dirty]);

  // ---------------------------------------------------------
  // 4) navigation helpers
  // ---------------------------------------------------------
  const safeGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // ⚠️ 프로젝트의 "홈 루트" 라우트명이 다르면 여기만 수정
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' as keyof RootStackParamList }],
    });
  }, [navigation]);

  // ---------------------------------------------------------
  // 5) helpers
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
  // 6) submit
  // ---------------------------------------------------------
  const onSubmit = useCallback(async () => {
    if (!petId || !memoryId) return;
    if (!record) return;

    const nextTitle = title.trim();
    if (!nextTitle) {
      Alert.alert('제목을 입력해 주세요.');
      return;
    }

    try {
      setSaving(true);

      const occurred = validateOccurredAt(occurredAt);

      await updateMemoryFields({
        memoryId,
        title: nextTitle,
        content: content.trim() || null,
        emotion,
        tags: parseTags(tagsText),
        occurredAt: occurred,
      });

      await refresh(petId);
      safeGoBack();
    } catch (e: any) {
      Alert.alert('수정 실패', e?.message ?? '오류');
    } finally {
      setSaving(false);
    }
  }, [
    petId,
    memoryId,
    record,
    title,
    content,
    occurredAt,
    emotion,
    tagsText,
    refresh,
    safeGoBack,
  ]);

  // ---------------------------------------------------------
  // 7) guard
  // ---------------------------------------------------------
  if (!record) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <AppText preset="headline">기록을 찾을 수 없어요</AppText>
          <AppText preset="body" style={styles.desc}>
            목록으로 돌아가서 새로고침 해주세요.
          </AppText>

          <TouchableOpacity style={styles.ghost} onPress={safeGoBack}>
            <AppText preset="caption" style={styles.ghostText}>
              뒤로
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------
  // 8) UI
  // ---------------------------------------------------------
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.backBtn}
          onPress={safeGoBack}
          disabled={saving}
        >
          <AppText preset="body" style={styles.backText}>
            ←
          </AppText>
        </TouchableOpacity>

        <AppText preset="headline" style={styles.headerTitle}>
          기록 수정
        </AppText>

        <View style={{ width: 44 }} />
      </View>

      <View style={styles.card}>
        <AppText preset="caption" style={styles.label}>
          제목
        </AppText>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={v => {
            setDirty(true);
            setTitle(v);
          }}
          placeholder="제목"
          placeholderTextColor="#8A94A6"
        />

        <AppText preset="caption" style={styles.label}>
          내용(선택)
        </AppText>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={content ?? ''}
          onChangeText={v => {
            setDirty(true);
            setContent(v);
          }}
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
          onChangeText={v => {
            setDirty(true);
            setOccurredAt(v);
          }}
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
          onChangeText={v => {
            setDirty(true);
            setTagsText(v);
          }}
          placeholder="#산책 #간식 또는 산책,간식"
          placeholderTextColor="#8A94A6"
        />

        <AppText preset="caption" style={styles.label}>
          감정(선택)
        </AppText>

        <View style={styles.emotionRow}>
          {EMOTIONS.slice(0, 4).map(e => {
            const active = emotion === e.value;
            return (
              <TouchableOpacity
                key={e.value}
                style={[styles.chip, active ? styles.chipActive : null]}
                onPress={() => {
                  setDirty(true);
                  setEmotion(prev => (prev === e.value ? null : e.value));
                }}
                disabled={saving}
                activeOpacity={0.9}
              >
                <AppText preset="caption" style={styles.chipText}>
                  {e.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.emotionRow}>
          {EMOTIONS.slice(4).map(e => {
            const active = emotion === e.value;
            return (
              <TouchableOpacity
                key={e.value}
                style={[styles.chip, active ? styles.chipActive : null]}
                onPress={() => {
                  setDirty(true);
                  setEmotion(prev => (prev === e.value ? null : e.value));
                }}
                disabled={saving}
                activeOpacity={0.9}
              >
                <AppText preset="caption" style={styles.chipText}>
                  {e.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.primary, saving ? styles.primaryDisabled : null]}
          onPress={onSubmit}
          disabled={saving}
          activeOpacity={0.9}
        >
          <AppText preset="body" style={styles.primaryText}>
            {saving ? '저장 중...' : '저장'}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghost}
          onPress={safeGoBack}
          disabled={saving}
          activeOpacity={0.9}
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
  screen: { flex: 1, backgroundColor: '#F6F7FB' },

  header: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E6E8F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontWeight: '900', color: '#0B1220' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#0B1220',
    fontWeight: '900',
  },

  card: {
    margin: 16,
    backgroundColor: '#FFFFFF',
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

  emotionRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
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
  primaryDisabled: { opacity: 0.6 },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },

  ghost: { marginTop: 10, paddingVertical: 8, alignItems: 'center' },
  ghostText: { color: '#556070', fontWeight: '700' },

  desc: { marginTop: 8, color: '#556070' },
});
