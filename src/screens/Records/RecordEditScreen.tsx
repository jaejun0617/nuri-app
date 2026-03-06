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
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type {
  CompositeNavigationProp,
  RouteProp,
} from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import Feather from 'react-native-vector-icons/Feather';

import RecordImageGallery from '../../components/records/RecordImageGallery';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import {
  buildPickedRecordImages,
  parseRecordTags,
  RECORD_EMOTION_OPTIONS,
  type PickedRecordImage,
  validateRecordOccurredAt,
} from '../../services/records/form';
import {
  updateMemoryFields,
  updateMemoryImagePaths,
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

type TimelineNav = NativeStackNavigationProp<TimelineStackParamList, 'RecordEdit'>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;
type Nav = CompositeNavigationProp<TimelineNav, RootNav>;
type Route = RouteProp<TimelineStackParamList, 'RecordEdit'>;

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '오류가 발생했습니다.';
}

type AddedImage = PickedRecordImage;
type PreviewItem =
  | { kind: 'existing'; key: string; path: string; uri: string | null }
  | { kind: 'added'; key: string; uri: string };

export default function RecordEditScreen() {
  // ---------------------------------------------------------
  // 1) nav / params
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const rootNavigation =
    navigation as unknown as NativeStackNavigationProp<RootStackParamList>;
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
  const [successModalVisible, setSuccessModalVisible] = useState(false);

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

    rootNavigation.reset({
      index: 0,
      routes: [{ name: 'AppTabs', params: { screen: 'TimelineTab' } }],
    });
  }, [navigation, rootNavigation]);

  // ---------------------------------------------------------
  // 5) image state (preview + replace flow)
  // ---------------------------------------------------------
  const [imgLoading, setImgLoading] = useState<boolean>(true);
  const [baseImagePaths, setBaseImagePaths] = useState<string[]>([]);
  const [removedPaths, setRemovedPaths] = useState<Set<string>>(new Set());
  const [addedImages, setAddedImages] = useState<AddedImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [signedByPath, setSignedByPath] = useState<Record<string, string | null>>(
    {},
  );

  useEffect(() => {
    if (!record) return;
    const nextPaths =
      record.imagePaths && record.imagePaths.length > 0
        ? record.imagePaths
        : record.imagePath
          ? [record.imagePath]
          : [];
    setBaseImagePaths(nextPaths);
    setRemovedPaths(new Set());
    setAddedImages([]);
    setActiveImageIndex(0);
  }, [record]);

  const visibleExistingPaths = useMemo(
    () => baseImagePaths.filter(path => !removedPaths.has(path)),
    [baseImagePaths, removedPaths],
  );

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (visibleExistingPaths.length === 0) {
        if (mounted) {
          setSignedByPath({});
          setImgLoading(false);
        }
        return;
      }

      try {
        if (mounted) setImgLoading(true);
        const urls = await Promise.all(
          visibleExistingPaths.map(async path => {
            const url = await getMemoryImageSignedUrlCached(path);
            return [path, url] as const;
          }),
        );
        if (!mounted) return;
        const nextMap: Record<string, string | null> = {};
        for (const [path, url] of urls) nextMap[path] = url ?? null;
        setSignedByPath(nextMap);
      } catch {
        if (mounted) setSignedByPath({});
      } finally {
        if (mounted) setImgLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [visibleExistingPaths]);

  const previewItems = useMemo<PreviewItem[]>(() => {
    const existing: PreviewItem[] = visibleExistingPaths.map(path => ({
      kind: 'existing',
      key: `e:${path}`,
      path,
      uri: signedByPath[path] ?? null,
    }));
    const added: PreviewItem[] = addedImages.map(img => ({
      kind: 'added',
      key: img.key,
      uri: img.uri,
    }));
    return [...existing, ...added];
  }, [visibleExistingPaths, signedByPath, addedImages]);

  useEffect(() => {
    if (activeImageIndex < previewItems.length) return;
    setActiveImageIndex(previewItems.length > 0 ? previewItems.length - 1 : 0);
  }, [activeImageIndex, previewItems.length]);

  // ---------------------------------------------------------
  // 7) image actions
  // ---------------------------------------------------------
  const onPickImage = useCallback(async () => {
    if (saving) return;

    const res = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 10,
      quality: 0.9,
    });

    if (res.didCancel) return;

    const assets = (res.assets ?? []).filter(asset => !!asset.uri);
    if (assets.length === 0) {
      Alert.alert('이미지 선택 실패', 'uri를 가져오지 못했습니다.');
      return;
    }
    setDirty(true);
    setAddedImages(prev => {
      return [
        ...prev,
        ...buildPickedRecordImages(assets, {
          existingUris: prev.map(image => image.uri),
          keyPrefix: `a:${Date.now()}`,
          limit: 10 - prev.length,
        }),
      ].slice(0, 10);
    });
  }, [saving]);

  const onRemoveActiveImage = useCallback(() => {
    if (saving) return;
    const target = previewItems[activeImageIndex];
    if (!target) return;

    setDirty(true);
    if (target.kind === 'added') {
      setAddedImages(prev => prev.filter(i => i.key !== target.key));
      return;
    }

    setRemovedPaths(prev => {
      const next = new Set(prev);
      next.add(target.path);
      return next;
    });
  }, [saving, previewItems, activeImageIndex]);

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
      const occurred = validateRecordOccurredAt(occurredAt);
      const nextContent = content.trim() || null;
      const nextTags = parseRecordTags(tagsText);

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

      // 2) 이미지 저장(다중)
      const uploadPaths: string[] = [];
      for (const image of addedImages) {
        try {
          const uploaded = await uploadMemoryImage({
            userId,
            petId,
            memoryId,
            fileUri: image.uri,
            mimeType: image.mimeType,
          });
          uploadPaths.push(uploaded.path);
        } catch {
          // skip failed one
        }
      }

      const keptExisting = baseImagePaths.filter(path => !removedPaths.has(path));
      const finalPaths = Array.from(new Set([...keptExisting, ...uploadPaths]));
      const saveResult = await updateMemoryImagePaths({
        memoryId,
        imagePaths: finalPaths,
      });

      updateOneLocal(petId, memoryId, {
        imagePath: saveResult.savedPaths[0] ?? null,
        imagePaths: saveResult.savedPaths,
      });

      if (saveResult.mode === 'single_fallback' && finalPaths.length > 1) {
        Alert.alert(
          '다중 이미지 저장 미지원',
          'DB 스키마에 image_urls 컬럼이 없어 첫 번째 사진만 저장됐어요.',
        );
      }

      for (const path of removedPaths) {
        await deleteMemoryImage(path).catch(() => null);
      }

      // 3) 서버 정합을 한 번 더 맞춰서 상세/리스트가 확실히 최신 상태를 보게 한다.
      await refresh(petId);

      setSuccessModalVisible(true);
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
    addedImages,
    baseImagePaths,
    removedPaths,
    updateOneLocal,
    refresh,
  ]);

  const onConfirmSuccess = useCallback(() => {
    setSuccessModalVisible(false);
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('RecordDetail', { petId, memoryId });
  }, [navigation, petId, memoryId]);

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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
        {/* Image Preview */}
        <RecordImageGallery
          items={previewItems.map(item => ({
            key: item.key,
            uri: item.uri ?? '',
          }))}
          activeIndex={activeImageIndex}
          onChangeActiveIndex={setActiveImageIndex}
          containerStyle={styles.heroWrap}
          emptyContent={
            <View style={styles.heroPlaceholder}>
              <AppText preset="caption" style={styles.heroPlaceholderText}>
                NO IMAGE
              </AppText>
            </View>
          }
          mainContent={
            previewItems.length === 0 ? null : imgLoading ? (
              <View style={styles.heroPlaceholder}>
                <ActivityIndicator size="large" color="#8A94A6" />
              </View>
            ) : (
              <Image
                source={{ uri: previewItems[activeImageIndex]?.uri ?? '' }}
                style={styles.heroImg}
                resizeMode="cover"
                fadeDuration={250}
              />
            )
          }
          thumbRowStyle={styles.thumbRow}
          thumbItemStyle={styles.thumbItem}
          thumbItemActiveStyle={styles.thumbItemActive}
          thumbImageStyle={styles.thumbImage}
          footerActions={
            <View style={styles.imgActionsRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.imgBtn, styles.imgBtnPrimary]}
                onPress={onPickImage}
                disabled={saving}
              >
                <AppText preset="caption" style={styles.imgBtnText}>
                  사진 추가
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.imgBtn, styles.imgBtnDanger]}
                onPress={onRemoveActiveImage}
                disabled={saving || previewItems.length === 0}
              >
                <AppText preset="caption" style={styles.imgBtnDangerText}>
                  현재 사진 제거
                </AppText>
              </TouchableOpacity>
            </View>
          }
        />

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

        <View style={styles.emotionGrid}>
          {RECORD_EMOTION_OPTIONS.map(em => {
            const active = emotion === em.value;
            return (
              <TouchableOpacity
                key={em.value}
                style={[styles.moodChip, active ? styles.moodChipActive : null]}
                onPress={() => {
                  setDirty(true);
                  setEmotion(prev => (prev === em.value ? null : em.value));
                }}
                disabled={saving}
                activeOpacity={0.9}
              >
                <AppText preset="caption" style={styles.moodEmoji}>
                  {em.emoji}
                </AppText>
                <AppText
                  preset="caption"
                  style={[styles.moodText, active ? styles.moodTextActive : null]}
                >
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
      </ScrollView>

      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={onConfirmSuccess}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="check" size={22} color="#6D6AF8" />
            </View>

            <AppText preset="title2" style={styles.modalTitle}>
              수정이 완료되었어요!
            </AppText>
            <AppText preset="body" style={styles.modalDesc}>
              소중한 추억이 안전하게
            </AppText>
            <AppText preset="body" style={styles.modalDesc}>
              업데이트되었습니다.
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.modalPrimaryBtn}
              onPress={onConfirmSuccess}
            >
              <AppText preset="body" style={styles.modalPrimaryBtnText}>
                확인
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
