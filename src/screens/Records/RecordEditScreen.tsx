// 파일: src/screens/Records/RecordEditScreen.tsx
// 목적:
// - 기존 memory 수정(완전체)
// - title / content / tags / emotion / occurredAt 수정
// - ✅ 이미지 교체(선택→업로드→DB path 업데이트→(선택)기존 파일 삭제)
// - ✅ 저장 후 "즉시 반영"(refresh 없이도 Detail/Timeline 바로 반영)
//   - updateOneLocal(patch)로 store를 먼저 갱신
//   - 필요하면 마지막에 refresh(petId)로 서버 정합만 맞춤(옵션)
//
// ✅ 안전 규칙
// 1) 기존 imagePath는 서버에서 fetchMemoryImagePath(memoryId)로 “진실”을 가져온다.
// 2) 새 이미지 업로드 성공 + DB 업데이트 성공 이후에만 기존 파일 삭제한다.
// 3) 새 이미지 업로드/DB 업데이트 중 실패하면 기존 이미지는 유지된다(데이터 보호).
// 4) UI 렌더는 imagePath → getMemoryImageSignedUrlCached() 규칙으로 고정.
// 5) “이미지 제거” 의도는 removeRequested 플래그로 관리한다.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  fetchMemoryImagePath,
  updateMemoryFields,
  updateMemoryImagePath,
  type EmotionTag,
} from '../../services/supabase/memories';
import {
  deleteMemoryImage,
  getMemoryImageSignedUrlCached,
  uploadMemoryImage,
} from '../../services/supabase/storageMemories';
import { useAuthStore } from '../../store/authStore';
import { useRecordStore } from '../../store/recordStore';
import AppText from '../../app/ui/AppText';
import { styles } from './RecordEditScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = {
  key: string;
  name: string;
  params: { petId: string; memoryId: string };
};

const ENABLE_SERVER_SYNC = false; // ✅ 필요할 때만 true

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
  return '오류가 발생했습니다.';
}

type PickedImage = { uri: string; mimeType: string | null };

function inferMimeFromFileName(
  fileName: string | null | undefined,
): string | null {
  const n = (fileName ?? '').toLowerCase().trim();
  if (!n) return null;
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.heic')) return 'image/heic';
  if (n.endsWith('.heif')) return 'image/heif';
  return null;
}

function inferMimeFromUri(uri: string): string | null {
  const u = uri.toLowerCase().split('?')[0];
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.webp')) return 'image/webp';
  if (u.endsWith('.heic')) return 'image/heic';
  if (u.endsWith('.heif')) return 'image/heif';
  return null;
}

function resolvePickerMimeType(asset: any): string | null {
  const t = asset?.type ?? asset?.mime ?? asset?.mimeType ?? null;
  if (typeof t === 'string' && t.includes('/')) return t;

  const byName = inferMimeFromFileName(asset?.fileName ?? null);
  if (byName) return byName;

  const byUri =
    typeof asset?.uri === 'string' ? inferMimeFromUri(asset.uri) : null;
  if (byUri) return byUri;

  return null;
}

export default function RecordEditScreen() {
  // ---------------------------------------------------------
  // 1) nav / params
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const petId = route.params?.petId ?? null;
  const memoryId = route.params?.memoryId ?? null;

  // ---------------------------------------------------------
  // 2) auth/store
  // ---------------------------------------------------------
  const userId = useAuthStore(s => s.session?.user?.id ?? null);

  const updateOneLocal = useRecordStore(s => s.updateOneLocal);
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

    navigation.reset({
      index: 0,
      routes: [{ name: 'AppTabs', params: { screen: 'TimelineTab' } }],
    });
  }, [navigation]);

  // ---------------------------------------------------------
  // 5) image state (preview + replace flow)
  // ---------------------------------------------------------
  const [imgLoading, setImgLoading] = useState<boolean>(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [removeRequested, setRemoveRequested] = useState(false);

  const [originalPath, setOriginalPath] = useState<string | null>(null);

  const effectivePath = useMemo(
    () => record?.imagePath ?? null,
    [record?.imagePath],
  );

  // 원본 path 서버 truth 확보
  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!memoryId) return;
      try {
        const p = await fetchMemoryImagePath(memoryId);
        if (mounted) setOriginalPath(p);
      } catch {
        if (mounted) setOriginalPath(record?.imagePath ?? null);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [memoryId, record?.imagePath]);

  // imagePath → signed url
  useEffect(() => {
    let mounted = true;

    async function run() {
      const path = effectivePath;

      if (!path) {
        if (mounted) {
          setSignedUrl(null);
          setImgLoading(false);
        }
        return;
      }

      try {
        if (mounted) setImgLoading(true);
        const url = await getMemoryImageSignedUrlCached(path);
        if (mounted) setSignedUrl(url);
      } catch {
        if (mounted) setSignedUrl(null);
      } finally {
        if (mounted) setImgLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [effectivePath]);

  // ---------------------------------------------------------
  // 6) helpers
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

  const validateOccurredAt = useCallback((v: string) => {
    const t = v.trim();
    if (!t) return null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      throw new Error('날짜 형식은 YYYY-MM-DD 입니다.');
    }
    return t;
  }, []);

  // ---------------------------------------------------------
  // 7) image actions
  // ---------------------------------------------------------
  const onPickImage = useCallback(async () => {
    if (saving) return;

    const res = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.9,
    });

    if (res.didCancel) return;

    const asset = res.assets?.[0] as any;
    const uri: string | null = asset?.uri ?? null;

    if (!uri) {
      Alert.alert('이미지 선택 실패', 'uri를 가져오지 못했습니다.');
      return;
    }

    const mimeType: string | null = resolvePickerMimeType(asset);

    setDirty(true);
    setRemoveRequested(false);
    setPicked({ uri, mimeType });
  }, [saving]);

  const onClearPicked = useCallback(() => {
    if (saving) return;
    setDirty(true);
    setPicked(null);
  }, [saving]);

  const onRemoveImage = useCallback(() => {
    if (saving) return;

    Alert.alert(
      '이미지를 제거할까요?',
      '저장하면 이 기록의 이미지가 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '제거',
          style: 'destructive',
          onPress: () => {
            setDirty(true);
            setPicked(null);
            setRemoveRequested(true);
            setSignedUrl(null);
          },
        },
      ],
    );
  }, [saving]);

  // ---------------------------------------------------------
  // 8) submit (text + image replace) ✅ 즉시 반영
  // ---------------------------------------------------------
  const onSubmit = useCallback(async () => {
    if (!petId || !memoryId) return;
    if (!record) return;

    const nextTitle = title.trim();
    if (!nextTitle) {
      Alert.alert('제목을 입력해 주세요.');
      return;
    }

    if (!userId) {
      Alert.alert('로그인 정보가 없어요', '다시 로그인 후 시도해 주세요.');
      return;
    }

    try {
      setSaving(true);

      // 1) 텍스트 저장
      const occurred = validateOccurredAt(occurredAt);
      const nextContent = content.trim() || null;
      const nextTags = parseTags(tagsText);

      await updateMemoryFields({
        memoryId,
        title: nextTitle,
        content: nextContent,
        emotion,
        tags: nextTags,
        occurredAt: occurred,
      });

      // ✅ 즉시 반영(텍스트)
      updateOneLocal(petId, memoryId, {
        title: nextTitle,
        content: nextContent,
        emotion,
        tags: nextTags,
        occurredAt: occurred,
      });

      // 2) 이미지 저장
      const oldPath = originalPath ?? record.imagePath ?? null;

      // (A) 새 이미지로 교체
      if (picked?.uri) {
        const { path: newPath } = await uploadMemoryImage({
          userId,
          petId,
          memoryId,
          fileUri: picked.uri,
          mimeType: picked.mimeType,
        });

        await updateMemoryImagePath({ memoryId, imagePath: newPath });

        // ✅ 즉시 반영(이미지 path)
        updateOneLocal(petId, memoryId, { imagePath: newPath });

        if (oldPath && oldPath !== newPath) {
          await deleteMemoryImage(oldPath).catch(() => null);
        }
      }

      // (B) 이미지 제거
      if (!picked?.uri && removeRequested) {
        await updateMemoryImagePath({ memoryId, imagePath: null });

        // ✅ 즉시 반영(이미지 제거)
        updateOneLocal(petId, memoryId, { imagePath: null });

        if (oldPath) {
          await deleteMemoryImage(oldPath).catch(() => null);
        }
      }

      // 3) 서버 정합(옵션) - ✅ 여기서 refresh를 "진짜로 사용"하므로 경고 사라짐
      if (ENABLE_SERVER_SYNC) {
        await refresh(petId);
      }

      navigation.replace('EditDone', {
        title: '기록 수정 완료!',
        bodyLines: [
          '방금 다듬은 기록이 더 또렷하게 정리됐어요.',
          '이제 상세 화면에서 바로 확인할 수 있어요.',
        ],
        buttonLabel: '기록 보러 가기',
        navigateTo: { type: 'record-detail', petId, memoryId },
      });
    } catch (err) {
      Alert.alert('수정 실패', getErrorMessage(err));
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
    userId,
    picked,
    removeRequested,
    originalPath,
    navigation,
    updateOneLocal,
    parseTags,
    validateOccurredAt,
    refresh,
  ]);

  // ---------------------------------------------------------
  // 9) guard
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
  // 10) UI
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
        {/* Image Preview */}
        <View style={styles.heroWrap}>
          {picked?.uri ? (
            <Image source={{ uri: picked.uri }} style={styles.heroImg} />
          ) : removeRequested ? (
            <View style={styles.heroPlaceholder}>
              <AppText preset="caption" style={styles.heroPlaceholderText}>
                NO IMAGE
              </AppText>
            </View>
          ) : !record.imagePath ? (
            <View style={styles.heroPlaceholder}>
              <AppText preset="caption" style={styles.heroPlaceholderText}>
                NO IMAGE
              </AppText>
            </View>
          ) : imgLoading ? (
            <View style={styles.heroPlaceholder}>
              <ActivityIndicator size="large" color="#8A94A6" />
            </View>
          ) : signedUrl ? (
            <Image
              source={{ uri: signedUrl }}
              style={styles.heroImg}
              resizeMode="cover"
              fadeDuration={250}
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <AppText preset="caption" style={styles.heroPlaceholderText}>
                ERROR
              </AppText>
            </View>
          )}

          <View style={styles.imgActionsRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.imgBtn, styles.imgBtnPrimary]}
              onPress={onPickImage}
              disabled={saving}
            >
              <AppText preset="caption" style={styles.imgBtnText}>
                {picked ? '다른 사진 선택' : '사진 선택'}
              </AppText>
            </TouchableOpacity>

            {picked ? (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.imgBtn}
                onPress={onClearPicked}
                disabled={saving}
              >
                <AppText preset="caption" style={styles.imgBtnText}>
                  선택 취소
                </AppText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.imgBtn, styles.imgBtnDanger]}
                onPress={onRemoveImage}
                disabled={saving}
              >
                <AppText preset="caption" style={styles.imgBtnDangerText}>
                  이미지 제거
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>

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
          editable={!saving}
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
          editable={!saving}
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
          editable={!saving}
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
          editable={!saving}
        />

        <AppText preset="caption" style={styles.label}>
          감정(선택)
        </AppText>

        <View style={styles.emotionRow}>
          {EMOTIONS.slice(0, 4).map(em => {
            const active = emotion === em.value;
            return (
              <TouchableOpacity
                key={em.value}
                style={[styles.chip, active ? styles.chipActive : null]}
                onPress={() => {
                  setDirty(true);
                  setEmotion(prev => (prev === em.value ? null : em.value));
                }}
                disabled={saving}
                activeOpacity={0.9}
              >
                <AppText preset="caption" style={styles.chipText}>
                  {em.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.emotionRow}>
          {EMOTIONS.slice(4).map(em => {
            const active = emotion === em.value;
            return (
              <TouchableOpacity
                key={em.value}
                style={[styles.chip, active ? styles.chipActive : null]}
                onPress={() => {
                  setDirty(true);
                  setEmotion(prev => (prev === em.value ? null : em.value));
                }}
                disabled={saving}
                activeOpacity={0.9}
              >
                <AppText preset="caption" style={styles.chipText}>
                  {em.label}
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
