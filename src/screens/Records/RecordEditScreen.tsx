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
  Modal,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Feather from 'react-native-vector-icons/Feather';

import DatePickerModal from '../../components/date-picker/DatePickerModal';
import RecordImageGallery from '../../components/records/RecordImageGallery';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import type { TimelineScreenRoute } from '../../navigation/types';
import { createLatestRequestController } from '../../services/app/async';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { pickPhotoAssets } from '../../services/media/photoPicker';
import {
  normalizeCategoryKey,
  normalizeOtherSubKey,
} from '../../services/memories/categoryMeta';
import {
  buildPickedRecordImages,
  formatRecordKoreanDate,
  formatRecordPriceLabel,
  isShoppingRecordCategory,
  parseRecordTags,
  parseRecordPrice,
  RECORD_MAIN_CATEGORIES,
  RECORD_OTHER_SUBCATEGORIES,
  RECORD_EMOTION_OPTIONS,
  type RecordMainCategoryKey,
  type RecordOtherSubCategoryKey,
  normalizeRecordPriceInput,
  toRecordYmd,
  type PickedRecordImage,
  validateRecordOccurredAt,
} from '../../services/records/form';
import {
  fetchMemoryById,
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
import { showToast } from '../../store/uiStore';
import AppText from '../../app/ui/AppText';
import { styles } from './RecordEditScreen.styles';

type TimelineNav = NativeStackNavigationProp<TimelineStackParamList, 'RecordEdit'>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;
type Nav = CompositeNavigationProp<TimelineNav, RootNav>;
type Route = TimelineScreenRoute<'RecordEdit'>;

type AddedImage = PickedRecordImage;
type PreviewItem =
  | { kind: 'existing'; key: string; path: string; uri: string | null }
  | { kind: 'added'; key: string; uri: string };

export default function RecordEditScreen() {
  // ---------------------------------------------------------
  // 1) nav / params
  // ---------------------------------------------------------
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const petId = route.params.petId;
  const memoryId = route.params.memoryId;

  // ---------------------------------------------------------
  // 2) auth/store
  // ---------------------------------------------------------
  const userId = useAuthStore(s => s.session?.user?.id ?? null);

  const updateOneLocal = useRecordStore(s => s.updateOneLocal);
  const upsertOneLocal = useRecordStore(s => s.upsertOneLocal);
  const refresh = useRecordStore(s => s.refresh);
  const setFocusedMemoryId = useRecordStore(s => s.setFocusedMemoryId);

  const petState = useRecordStore(s => {
    if (!petId) return undefined;
    return s.byPetId[petId];
  });

  const record = useMemo(() => {
    if (!memoryId) return null;
    const items = petState?.items ?? [];
    return items.find(r => r.id === memoryId) ?? null;
  }, [petState?.items, memoryId]);

  useEffect(() => {
    let mounted = true;

    async function hydrateMissingRecord() {
      if (!petId || !memoryId || record) return;
      try {
        const fetched = await fetchMemoryById(memoryId);
        if (!mounted) return;
        upsertOneLocal(petId, fetched);
      } catch {
        // 화면 하단 가드가 처리한다.
      }
    }

    hydrateMissingRecord();
    return () => {
      mounted = false;
    };
  }, [memoryId, petId, record, upsertOneLocal]);

  // ---------------------------------------------------------
  // 3) form state
  // ---------------------------------------------------------
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [emotion, setEmotion] = useState<EmotionTag | null>(null);
  const [mainCategoryKey, setMainCategoryKey] =
    useState<RecordMainCategoryKey>('walk');
  const [otherSubCategoryKey, setOtherSubCategoryKey] =
    useState<RecordOtherSubCategoryKey | null>(null);
  const [priceText, setPriceText] = useState('');
  const [dateModalVisible, setDateModalVisible] = useState(false);

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
    const nextMainCategory = normalizeCategoryKey(
      record.category ?? record.tags.join(' '),
    );
    setMainCategoryKey(nextMainCategory === 'all' ? 'walk' : nextMainCategory);
    setOtherSubCategoryKey(
      nextMainCategory === 'other'
        ? normalizeOtherSubKey(record.subCategory ?? record.tags.join(' '))
        : null,
    );
    setPriceText(
      typeof record.price === 'number' && Number.isFinite(record.price)
        ? `${record.price}`
        : '',
    );
  }, [record, dirty]);

  const selectedMainCategory = useMemo(
    () =>
      RECORD_MAIN_CATEGORIES.find(category => category.key === mainCategoryKey) ??
      null,
    [mainCategoryKey],
  );
  const selectedOtherSubCategory = useMemo(
    () =>
      RECORD_OTHER_SUBCATEGORIES.find(sub => sub.key === otherSubCategoryKey) ??
      null,
    [otherSubCategoryKey],
  );
  const isShoppingCategory = useMemo(
    () => isShoppingRecordCategory(mainCategoryKey, otherSubCategoryKey),
    [mainCategoryKey, otherSubCategoryKey],
  );
  const priceLabel = useMemo(
    () => formatRecordPriceLabel(parseRecordPrice(priceText)),
    [priceText],
  );

  const occurredAtLabel = useMemo(() => {
    const normalized = validateRecordOccurredAt(occurredAt);
    if (!normalized) return '날짜를 선택해 주세요';
    return formatRecordKoreanDate(normalized);
  }, [occurredAt]);

  // ---------------------------------------------------------
  // 4) navigation helpers
  // ---------------------------------------------------------
  const safeGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('TimelineMain', { petId });
  }, [navigation, petId]);

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
    const request = createLatestRequestController();

    async function run() {
      const requestId = request.begin();
      if (visibleExistingPaths.length === 0) {
        if (request.isCurrent(requestId)) {
          setSignedByPath({});
          setImgLoading(false);
        }
        return;
      }

      try {
        if (request.isCurrent(requestId)) setImgLoading(true);
        const urls = await Promise.all(
          visibleExistingPaths.map(async path => {
            const url = await getMemoryImageSignedUrlCached(path);
            return [path, url] as const;
          }),
        );
        if (!request.isCurrent(requestId)) return;
        const nextMap: Record<string, string | null> = {};
        for (const [path, url] of urls) nextMap[path] = url ?? null;
        setSignedByPath(nextMap);
      } catch {
        if (request.isCurrent(requestId)) setSignedByPath({});
      } finally {
        if (request.isCurrent(requestId)) setImgLoading(false);
      }
    }

    run();
    return () => {
      request.cancel();
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

  const galleryItems = useMemo(
    () =>
      previewItems
        .map(item => ({
          key: item.key,
          uri: (item.uri ?? '').trim(),
        }))
        .filter(item => item.uri.length > 0),
    [previewItems],
  );

  const activeImageUri = useMemo(
    () => (previewItems[activeImageIndex]?.uri ?? '').trim(),
    [activeImageIndex, previewItems],
  );

  useEffect(() => {
    if (activeImageIndex < previewItems.length) return;
    setActiveImageIndex(previewItems.length > 0 ? previewItems.length - 1 : 0);
  }, [activeImageIndex, previewItems.length]);

  // ---------------------------------------------------------
  // 7) image actions
  // ---------------------------------------------------------
  const onPickImage = useCallback(async () => {
    if (saving) return;

    try {
      const result = await pickPhotoAssets({
        selectionLimit: 10,
        quality: 0.9,
      });
      if (result.status === 'cancelled') return;

      const assets = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.mimeType ?? undefined,
        fileName: asset.fileName ?? undefined,
      }));

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
    } catch (error) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        error,
        'image-pick',
      );
      showToast({ tone: 'error', title: alertTitle, message });
    }
  }, [saving]);

  const openDateModal = useCallback(() => {
    if (saving) return;
    setDateModalVisible(true);
  }, [saving]);

  const closeDateModal = useCallback(() => {
    setDateModalVisible(false);
  }, []);

  const applyDateModal = useCallback((nextDate: Date) => {
    setDirty(true);
    setOccurredAt(toRecordYmd(nextDate));
    setDateModalVisible(false);
  }, []);

  const onSelectMainCategory = useCallback((nextKey: RecordMainCategoryKey) => {
    setDirty(true);
    setMainCategoryKey(nextKey);
    if (nextKey !== 'other') {
      setOtherSubCategoryKey(null);
      setPriceText('');
    }
  }, []);

  const onSelectOtherSubCategory = useCallback(
    (nextKey: RecordOtherSubCategoryKey) => {
      setDirty(true);
      setMainCategoryKey('other');
      setOtherSubCategoryKey(nextKey);
      if (nextKey !== 'shopping') {
        setPriceText('');
      }
    },
    [],
  );

  const clearOtherSubCategory = useCallback(() => {
    setDirty(true);
    setOtherSubCategoryKey(null);
    setPriceText('');
  }, []);

  const onChangePriceText = useCallback((value: string) => {
    setDirty(true);
    setPriceText(normalizeRecordPriceInput(value));
  }, []);

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
      const nextPrice = isShoppingCategory ? parseRecordPrice(priceText) : null;

      await updateMemoryFields({
        memoryId,
        title: nextTitle,
        content: nextContent,
        emotion,
        tags: nextTags,
        category: mainCategoryKey,
        subCategory: otherSubCategoryKey,
        price: nextPrice,
        occurredAt: occurred,
      });

      // ✅ 즉시 반영(텍스트)
      updateOneLocal(petId, memoryId, {
        title: nextTitle,
        content: nextContent,
        emotion,
        tags: nextTags,
        category: mainCategoryKey,
        subCategory: otherSubCategoryKey,
        price: nextPrice,
        occurredAt: occurred,
      });
      setFocusedMemoryId(petId, memoryId);

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

      const latestLocalPatch = {
        title: nextTitle,
        content: nextContent,
        emotion,
        tags: nextTags,
        category: mainCategoryKey,
        subCategory: otherSubCategoryKey,
        price: nextPrice,
        occurredAt: occurred,
        imagePath: saveResult.savedPaths[0] ?? null,
        imagePaths: saveResult.savedPaths,
      } as const;

      updateOneLocal(petId, memoryId, latestLocalPatch);
      setFocusedMemoryId(petId, memoryId);

      if (saveResult.mode === 'single_fallback' && finalPaths.length > 1) {
        Alert.alert(
          '다중 이미지 저장 미지원',
          'DB 스키마에 image_urls 컬럼이 없어 첫 번째 사진만 저장됐어요.',
        );
      }

      for (const path of removedPaths) {
        await deleteMemoryImage(path).catch(() => null);
      }

      setSuccessModalVisible(true);

      // 3) 수정한 게시물 1건을 먼저 서버 스냅샷으로 보정하고, 그 뒤 전체 refresh를 백그라운드로 돌린다.
      (async () => {
        try {
          const latest = await fetchMemoryById(memoryId);
          upsertOneLocal(petId, latest);
          setFocusedMemoryId(petId, memoryId);
          refresh(petId).catch(() => {});
        } catch {
          upsertOneLocal(petId, {
            ...record,
            ...latestLocalPatch,
          });
          setFocusedMemoryId(petId, memoryId);
        }
      })().catch(() => {});
    } catch (err) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        err,
        'record-update',
      );
      Alert.alert(alertTitle, message);
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
    isShoppingCategory,
    mainCategoryKey,
    otherSubCategoryKey,
    priceText,
    emotion,
    tagsText,
    userId,
    addedImages,
    baseImagePaths,
    removedPaths,
    refresh,
    setFocusedMemoryId,
    updateOneLocal,
    upsertOneLocal,
  ]);

  const onConfirmSuccess = useCallback(() => {
    setSuccessModalVisible(false);
    setFocusedMemoryId(petId, memoryId);
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('RecordDetail', { petId, memoryId });
  }, [memoryId, navigation, petId, setFocusedMemoryId]);

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

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        enableOnAndroid
        extraScrollHeight={28}
        extraHeight={120}
      >
        <View style={styles.card}>
        {/* Image Preview */}
        <RecordImageGallery
          items={galleryItems}
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
            ) : !activeImageUri ? (
              <View style={styles.heroPlaceholder}>
                <AppText preset="caption" style={styles.heroPlaceholderText}>
                  NO IMAGE
                </AppText>
              </View>
            ) : (
              <Image
                source={{ uri: activeImageUri }}
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
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.input}
          onPress={openDateModal}
          disabled={saving}
        >
          <AppText
            preset="body"
            style={{ color: occurredAt ? '#0B1220' : '#8A94A6' }}
          >
            {occurredAt ? occurredAtLabel : '날짜를 선택해 주세요'}
          </AppText>
        </TouchableOpacity>

        <AppText preset="caption" style={styles.label}>
          분류
        </AppText>
        <View style={styles.categoryGrid}>
          {RECORD_MAIN_CATEGORIES.map(category => {
            const active = category.key === mainCategoryKey;
            return (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.categoryChip,
                  active ? styles.categoryChipActive : null,
                ]}
                onPress={() => onSelectMainCategory(category.key)}
                disabled={saving}
                activeOpacity={0.9}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.categoryChipText,
                    active ? styles.categoryChipTextActive : null,
                  ]}
                >
                  {category.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedMainCategory ? (
          <AppText preset="caption" style={styles.helperText}>
            분류: {selectedMainCategory.label}
            {selectedOtherSubCategory ? ` · ${selectedOtherSubCategory.label}` : ''}
          </AppText>
        ) : null}

        {mainCategoryKey === 'other' ? (
          <View style={styles.subCategoryGrid}>
            {RECORD_OTHER_SUBCATEGORIES.map(sub => {
              const active = sub.key === otherSubCategoryKey;
              return (
                <TouchableOpacity
                  key={sub.key}
                  style={[
                    styles.subCategoryChip,
                    active ? styles.subCategoryChipActive : null,
                  ]}
                  onPress={() => onSelectOtherSubCategory(sub.key)}
                  disabled={saving}
                  activeOpacity={0.9}
                >
                  <AppText
                    preset="caption"
                    style={[
                      styles.subCategoryChipText,
                      active ? styles.subCategoryChipTextActive : null,
                    ]}
                  >
                    {sub.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}

            {otherSubCategoryKey ? (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.subCategoryClearBtn}
                onPress={clearOtherSubCategory}
                disabled={saving}
              >
                <Feather name="x" size={14} color="#9AA4B6" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {isShoppingCategory ? (
          <>
            <AppText preset="caption" style={styles.label}>
              구매 가격
            </AppText>
            <TextInput
              style={styles.input}
              value={priceText}
              onChangeText={onChangePriceText}
              placeholder="예: 25000"
              placeholderTextColor="#8A94A6"
              keyboardType="number-pad"
              editable={!saving}
            />
            <AppText preset="caption" style={styles.helperText}>
              {priceLabel
                ? `저장 예정 금액: ${priceLabel}`
                : '숫자만 입력하면 자동으로 원 단위로 저장돼요.'}
            </AppText>
          </>
        ) : null}

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
      </KeyboardAwareScrollView>

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

      <DatePickerModal
        visible={dateModalVisible}
        initialDate={occurredAt || null}
        onCancel={closeDateModal}
        onConfirm={applyDateModal}
      />
    </View>
  );
}
