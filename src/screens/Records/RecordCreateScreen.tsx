// 파일: src/screens/Records/RecordCreateScreen.tsx
// 파일 목적:
// - 반려동물 기록을 작성하고, 저장 직후 홈/타임라인에 즉시 반영하는 작성 화면이다.
// 어디서 쓰이는지:
// - AppTabsNavigator의 `RecordCreateTab`과 날씨 활동 기록/홈/타임라인 CTA에서 공통 작성 화면으로 사용된다.
// 핵심 역할:
// - 텍스트/감정/카테고리/가격/날짜/이미지 입력을 수집해 `createMemory`를 호출한다.
// - draft 복구, 낙관적 store 반영, 업로드 큐 등록, 작성 후 복귀 경로 처리까지 담당한다.
// 데이터·상태 흐름:
// - 메모리 본문은 Supabase에 먼저 저장하고, 이미지 업로드는 local upload queue가 이어받아 비동기 복구를 지원한다.
// - 저장 직후 recordStore를 먼저 갱신해 홈/타임라인이 즉시 같은 엔티티를 보도록 만든다.
// 수정 시 주의:
// - returnTo와 탭 복귀 규칙은 하단 탭/More 드로어 흐름과 연결돼 있으므로 독립적으로 바꾸면 안 된다.
// - 이미지 업로드는 저장과 분리돼 있어, 폼 성공과 업로드 완료를 같은 시점으로 가정하면 상태가 꼬일 수 있다.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Image, TextInput, TouchableOpacity, View } from 'react-native';
import type {
  CompositeNavigationProp,
  RouteProp,
} from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import DatePickerModal from '../../components/date-picker/DatePickerModal';
import RecordImageGallery from '../../components/records/RecordImageGallery';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import type { AppTabParamList } from '../../navigation/AppTabsNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  buildPickedRecordImages,
  formatRecordKoreanDate,
  formatRecordPriceLabel,
  isShoppingRecordCategory,
  mergeRecordTags,
  parseRecordTags,
  parseRecordPrice,
  RECORD_EMOTION_OPTIONS,
  RECORD_MAIN_CATEGORIES,
  RECORD_OTHER_SUBCATEGORIES,
  normalizeRecordPriceInput,
  toRecordYmd,
  type PickedRecordImage,
  type RecordMainCategoryKey,
  type RecordOtherSubCategoryKey,
  validateRecordOccurredAt,
} from '../../services/records/form';
import { normalizeMemoryRecord } from '../../services/records/imageSources';
import {
  clearRecordCreateDraft,
  loadRecordCreateDraft,
  saveRecordCreateDraft,
} from '../../services/local/recordDraft';
import {
  enqueuePendingMemoryUpload,
  processPendingMemoryUploads,
  type PendingMemoryUploadEntry,
} from '../../services/local/uploadQueue';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { pickPhotoAssets } from '../../services/media/photoPicker';
import { supabase } from '../../services/supabase/client';
import {
  createMemory,
  type EmotionTag,
  fetchMemoryById,
  type MemoryRecord,
} from '../../services/supabase/memories';
import { resolveSelectedPetId, usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { showToast } from '../../store/uiStore';
import { openMoreDrawer } from '../../store/uiStore';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import RecordTagModal from './components/RecordTagModal';
import { styles } from './RecordCreateScreen.styles';

type RecordCreateTabRoute = RouteProp<AppTabParamList, 'RecordCreateTab'>;
type RecordCreateTabNav = BottomTabNavigationProp<
  AppTabParamList,
  'RecordCreateTab'
>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;
type Nav = CompositeNavigationProp<RecordCreateTabNav, RootNav>;

export default function RecordCreateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RecordCreateTabRoute>();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const refresh = useRecordStore(s => s.refresh);
  const setFocusedMemoryId = useRecordStore(s => s.setFocusedMemoryId);
  const upsertOneLocal = useRecordStore(s => s.upsertOneLocal);

  const petIdFromParams = route.params?.petId ?? null;
  const returnTo = route.params?.returnTo;

  const petId = useMemo(() => {
    return resolveSelectedPetId(pets, selectedPetId, petIdFromParams);
  }, [petIdFromParams, selectedPetId, pets]);
  const selectedPet = useMemo(
    () => pets.find(item => item.id === petId) ?? null,
    [petId, pets],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );

  const todayYmd = useMemo(() => toRecordYmd(new Date()), []);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [occurredAt, setOccurredAt] = useState(todayYmd);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [mainCategoryKey, setMainCategoryKey] =
    useState<RecordMainCategoryKey>('walk');
  const [otherSubCategoryKey, setOtherSubCategoryKey] =
    useState<RecordOtherSubCategoryKey | null>(null);
  const [priceText, setPriceText] = useState('');
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionTag | null>(
    null,
  );
  const [selectedImages, setSelectedImages] = useState<PickedRecordImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const draftLoadedRef = useRef(false);

  const trimmedTitle = useMemo(() => title.trim(), [title]);
  const disabled = saving || trimmedTitle.length === 0 || !petId;
  const selectedMainCategory = useMemo(
    () =>
      RECORD_MAIN_CATEGORIES.find(
        category => category.key === mainCategoryKey,
      ) ?? null,
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
  const formattedDate = useMemo(
    () => formatRecordKoreanDate(occurredAt || todayYmd),
    [occurredAt, todayYmd],
  );
  const mergedPreviewTags = useMemo(
    () => mergeRecordTags(selectedTags, mainCategoryKey, otherSubCategoryKey),
    [selectedTags, mainCategoryKey, otherSubCategoryKey],
  );
  const activeImage = useMemo(
    () => selectedImages[activeImageIndex] ?? selectedImages[0] ?? null,
    [selectedImages, activeImageIndex],
  );
  const scrollBottomInset = useMemo(() => {
    return Math.max(insets.bottom + 240, keyboardInset + 140, 280);
  }, [insets.bottom, keyboardInset]);
  const bottomSubmitMargin = useMemo(() => {
    if (keyboardInset > 0) return Math.max(insets.bottom, 18) + 20;
    return Math.max(insets.bottom, 18);
  }, [insets.bottom, keyboardInset]);
  const resetForm = useCallback(() => {
    setTitle('');
    setContent('');
    setOccurredAt(todayYmd);
    setSelectedTags([]);
    setTagDraft('');
    setTagModalVisible(false);
    setMainCategoryKey('walk');
    setOtherSubCategoryKey(null);
    setPriceText('');
    setDateModalVisible(false);
    setSelectedEmotion(null);
    setSelectedImages([]);
    setActiveImageIndex(0);
    setSaving(false);
    setDraftHydrated(true);
  }, [todayYmd]);

  useEffect(() => {
    if (selectedImages.length === 0 && activeImageIndex !== 0) {
      setActiveImageIndex(0);
      return;
    }
    if (
      activeImageIndex >= selectedImages.length &&
      selectedImages.length > 0
    ) {
      setActiveImageIndex(selectedImages.length - 1);
    }
  }, [activeImageIndex, selectedImages.length]);

  useEffect(() => {
    let mounted = true;

    async function hydrateDraft() {
      if (draftLoadedRef.current) return;
      draftLoadedRef.current = true;

      try {
        const draft = await loadRecordCreateDraft();
        if (!mounted) return;

        if (draft) {
          setTitle(draft.title ?? '');
          setContent(draft.content ?? '');
          setOccurredAt(draft.occurredAt || todayYmd);
          setSelectedTags(
            Array.isArray(draft.selectedTags) ? draft.selectedTags : [],
          );
          setMainCategoryKey(draft.mainCategoryKey ?? 'walk');
          setOtherSubCategoryKey(draft.otherSubCategoryKey ?? null);
          setPriceText(normalizeRecordPriceInput(draft.priceText ?? ''));
          setSelectedEmotion(draft.selectedEmotion ?? null);
          setSelectedImages(
            Array.isArray(draft.selectedImages) ? draft.selectedImages : [],
          );
          setActiveImageIndex(0);
        }
      } finally {
        if (mounted) setDraftHydrated(true);
      }
    }

    hydrateDraft().catch(() => {
      if (mounted) setDraftHydrated(true);
    });

    return () => {
      mounted = false;
    };
  }, [todayYmd]);

  useEffect(() => {
    if (!draftHydrated || saving) return;

    const hasContent =
      title.trim().length > 0 ||
      content.trim().length > 0 ||
      selectedTags.length > 0 ||
      priceText.trim().length > 0 ||
      selectedImages.length > 0;

    if (!hasContent) {
      clearRecordCreateDraft().catch(() => {});
      return;
    }

    saveRecordCreateDraft({
      petId,
      title,
      content,
      occurredAt,
      selectedTags,
      mainCategoryKey,
      otherSubCategoryKey,
      priceText,
      selectedEmotion,
      selectedImages,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }, [
    content,
    draftHydrated,
    mainCategoryKey,
    occurredAt,
    otherSubCategoryKey,
    petId,
    priceText,
    saving,
    selectedEmotion,
    selectedImages,
    selectedTags,
    title,
  ]);

  const pickImage = useCallback(async () => {
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

      setSelectedImages(prev => {
        return [
          ...prev,
          ...buildPickedRecordImages(assets, {
            existingUris: prev.map(image => image.uri),
            keyPrefix: `${Date.now()}`,
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

  const removeActiveImage = useCallback(() => {
    setSelectedImages(prev => {
      if (prev.length === 0) return prev;
      return prev.filter((_, index) => index !== activeImageIndex);
    });
  }, [activeImageIndex]);

  const navigateBackToOrigin = useCallback(() => {
    if (returnTo?.tab === 'TimelineTab') {
      navigation.navigate('AppTabs', {
        screen: 'TimelineTab',
        params: returnTo.params,
      });
      return;
    }

    if (returnTo?.tab === 'MoreTab') {
      navigation.navigate('AppTabs', { screen: 'HomeTab' });
      openMoreDrawer();
      return;
    }

    if (returnTo?.tab === 'HomeTab') {
      navigation.navigate('AppTabs', { screen: 'HomeTab' });
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('AppTabs', { screen: 'HomeTab' });
  }, [navigation, returnTo]);

  const onPressCancel = useCallback(() => {
    clearRecordCreateDraft().catch(() => {});
    resetForm();
    navigateBackToOrigin();
  }, [navigateBackToOrigin, resetForm]);

  const onSelectMainCategory = useCallback((nextKey: RecordMainCategoryKey) => {
    setMainCategoryKey(nextKey);
    if (nextKey !== 'other') {
      setOtherSubCategoryKey(null);
      setPriceText('');
    }
  }, []);

  const onSelectOtherSubCategory = useCallback(
    (nextKey: RecordOtherSubCategoryKey) => {
      setMainCategoryKey('other');
      setOtherSubCategoryKey(nextKey);
      if (nextKey !== 'shopping') {
        setPriceText('');
      }
    },
    [],
  );

  const clearOtherSubCategory = useCallback(() => {
    setOtherSubCategoryKey(null);
    setPriceText('');
  }, []);

  const onChangePriceText = useCallback((value: string) => {
    setPriceText(normalizeRecordPriceInput(value));
  }, []);

  const onOpenDateModal = useCallback(() => {
    setDateModalVisible(true);
  }, []);

  const onCloseDateModal = useCallback(() => {
    setDateModalVisible(false);
  }, []);

  const onConfirmDate = useCallback((nextDate: Date) => {
    setOccurredAt(toRecordYmd(nextDate));
    setDateModalVisible(false);
  }, []);

  const onOpenTagModal = useCallback(() => {
    setTagModalVisible(true);
  }, []);

  const onCloseTagModal = useCallback(() => {
    setTagModalVisible(false);
    setTagDraft('');
  }, []);

  const appendTag = useCallback((raw: string) => {
    const parsed = parseRecordTags(raw);
    if (!parsed.length) return;

    setSelectedTags(prev => {
      const next = [...prev];
      for (const tag of parsed) {
        if (!next.includes(tag)) next.push(tag);
      }
      return next.slice(0, 10);
    });
  }, []);

  const onSubmitDraftTag = useCallback(() => {
    appendTag(tagDraft);
    setTagDraft('');
  }, [appendTag, tagDraft]);

  const onRemoveTag = useCallback((target: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== target));
  }, []);

  const onSubmit = useCallback(async () => {
    if (disabled || !petId) return;

    try {
      setSaving(true);

      const occurred = validateRecordOccurredAt(occurredAt);
      const createdAt = new Date().toISOString();
      const mergedTags = mergeRecordTags(
        selectedTags,
        mainCategoryKey,
        otherSubCategoryKey,
      );
      const price = isShoppingCategory ? parseRecordPrice(priceText) : null;

      const memoryId = await createMemory({
        petId,
        title: trimmedTitle,
        content: content.trim() || null,
        emotion: selectedEmotion,
        tags: mergedTags,
        category: mainCategoryKey,
        subCategory: otherSubCategoryKey,
        price,
        occurredAt: occurred,
        imagePath: null,
      });

      const optimisticRecord: MemoryRecord = normalizeMemoryRecord({
        id: memoryId,
        petId,
        title: trimmedTitle,
        content: content.trim() || null,
        emotion: selectedEmotion,
        tags: mergedTags,
        category: mainCategoryKey,
        subCategory: otherSubCategoryKey,
        price,
        occurredAt: occurred,
        createdAt,
        imagePath: null,
        imagePaths: [],
        imageUrl: selectedImages[0]?.uri ?? null,
      });

      upsertOneLocal(petId, optimisticRecord);
      setFocusedMemoryId(petId, memoryId);

      (async () => {
        let latestLocal: MemoryRecord = optimisticRecord;
        let shouldHydrateFromServer = true;

        try {
          if (selectedImages.length > 0) {
            const userRes = await supabase.auth.getUser();
            const userId = userRes.data.user?.id ?? null;
            if (!userId) throw new Error('로그인 정보가 없습니다.');

            const finalEntries: PendingMemoryUploadEntry[] = selectedImages.map(
              image => ({
                kind: 'pending',
                key: image.key,
                uri: image.uri,
                mimeType: image.mimeType,
              }),
            );
            const queuedTask = await enqueuePendingMemoryUpload({
              userId,
              petId,
              memoryId,
              mode: 'create',
              finalEntries,
            });
            const queueResult = await processPendingMemoryUploads({ userId });

            if (!queueResult.succeededTaskIds.includes(queuedTask.taskId)) {
              shouldHydrateFromServer = false;
              showToast({
                tone: 'warning',
                title: '이미지 업로드 복구 대기',
                message:
                  '기록은 저장됐고 사진 업로드는 큐에서 이어서 처리합니다. 앱 복귀 시 자동 재시도됩니다.',
                durationMs: 3600,
              });
            }
          }

          if (shouldHydrateFromServer) {
            const created = await fetchMemoryById(memoryId);
            upsertOneLocal(petId, created);
            refresh(petId).catch(() => {});
          } else {
            upsertOneLocal(petId, latestLocal);
          }
        } catch {
          upsertOneLocal(petId, latestLocal);
        }
      })().catch(() => {});

      resetForm();
      await clearRecordCreateDraft();
      showToast({
        tone: 'success',
        title: '기록 저장 완료',
        message: '방금 기록을 먼저 반영했고, 상세에서 바로 확인할 수 있어요.',
      });
      navigation.navigate('TimelineTab', {
        screen: 'RecordDetail',
        params: { petId, memoryId },
      });
    } catch (error) {
      const { title: alertTitle, message } = getBrandedErrorMeta(
        error,
        'record-create',
      );
      Alert.alert(alertTitle, message);
      showToast({
        tone: 'error',
        title: alertTitle,
        message:
          '입력 중인 내용은 draft로 남겨둘게요. 네트워크가 안정되면 다시 저장해 주세요.',
        durationMs: 3200,
      });
    } finally {
      setSaving(false);
    }
  }, [
    content,
    disabled,
    isShoppingCategory,
    navigation,
    mainCategoryKey,
    otherSubCategoryKey,
    occurredAt,
    petId,
    priceText,
    refresh,
    resetForm,
    selectedEmotion,
    selectedImages,
    selectedTags,
    setFocusedMemoryId,
    trimmedTitle,
    upsertOneLocal,
  ]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.headerBackButton}
            onPress={onPressCancel}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
        </View>

        <AppText preset="headline" style={styles.headerTitle}>
          기록하기
        </AppText>

        <View style={[styles.headerSideSlot, styles.headerSideSlotRight]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.headerSideBtn}
            disabled={disabled}
            onPress={onSubmit}
          >
            <AppText
              preset="body"
              style={[
                styles.headerDoneText,
                !disabled ? { color: petTheme.primary } : null,
                disabled ? styles.headerDoneTextDisabled : null,
              ]}
            >
              {saving ? '저장중' : '완료'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(scrollBottomInset, 300) },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={28}
        extraHeight={120}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.dateCard,
            {
              backgroundColor: petTheme.soft,
              borderColor: petTheme.border,
            },
          ]}
          onPress={onOpenDateModal}
        >
          <View style={styles.dateLeft}>
            <View style={styles.dateIconWrap}>
              <Feather name="calendar" size={16} color={petTheme.primary} />
            </View>
            <AppText preset="body" style={styles.dateText}>
              {formattedDate}
            </AppText>
          </View>
          <Feather name="chevron-right" size={18} color="#C4CAD6" />
        </TouchableOpacity>

        <RecordImageGallery
          items={selectedImages}
          activeIndex={activeImageIndex}
          onChangeActiveIndex={setActiveImageIndex}
          containerStyle={styles.photoBox}
          stageStyle={styles.photoStage}
          emptyContent={
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.photoPlaceholderTouch}
              onPress={pickImage}
            >
              <View style={styles.photoPlaceholder}>
                <View style={styles.photoIconBadge}>
                  <Feather name="camera" size={22} color="#94A1B5" />
                </View>
                <AppText preset="body" style={styles.photoPlaceholderTitle}>
                  사진 추가 (최대 10장)
                </AppText>
              </View>
            </TouchableOpacity>
          }
          mainContent={
            activeImage ? (
              <Image
                source={{ uri: activeImage.uri }}
                style={styles.photoImage}
              />
            ) : null
          }
          topOverlay={
            activeImage ? (
              <View style={styles.photoOverlayTop}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.photoGhostBtn}
                  onPress={pickImage}
                >
                  <AppText preset="caption" style={styles.photoGhostBtnText}>
                    추가
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.photoGhostBtn}
                  onPress={removeActiveImage}
                >
                  <AppText preset="caption" style={styles.photoGhostBtnText}>
                    제거
                  </AppText>
                </TouchableOpacity>
              </View>
            ) : null
          }
          thumbRowStyle={styles.photoThumbRow}
          thumbItemStyle={styles.photoThumbWrap}
          thumbItemActiveStyle={styles.photoThumbWrapActive}
          thumbImageStyle={styles.photoThumb}
        />

        <View style={styles.quickTagRow}>
          {RECORD_MAIN_CATEGORIES.map(category => {
            const active = category.key === mainCategoryKey;
            return (
              <TouchableOpacity
                key={category.key}
                activeOpacity={0.88}
                style={styles.quickTagItem}
                onPress={() => onSelectMainCategory(category.key)}
              >
                <View
                  style={[
                    styles.quickTagIconWrap,
                    active ? styles.quickTagIconWrapActive : null,
                    active
                      ? {
                          backgroundColor: petTheme.primary,
                          shadowColor: petTheme.deep,
                        }
                      : null,
                  ]}
                >
                  <Feather
                    name={category.icon}
                    size={18}
                    color={active ? '#FFFFFF' : '#97A2B6'}
                  />
                </View>
                <AppText
                  preset="caption"
                  style={[
                    styles.quickTagLabel,
                    active ? styles.quickTagLabelActive : null,
                    active ? { color: petTheme.primary } : null,
                  ]}
                >
                  {category.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedMainCategory ? (
          <View
            style={[styles.quickTagHint, { backgroundColor: petTheme.tint }]}
          >
            <AppText
              preset="caption"
              style={[styles.quickTagHintText, { color: petTheme.deep }]}
            >
              분류: {selectedMainCategory.label}
              {selectedOtherSubCategory
                ? ` · ${selectedOtherSubCategory.label}`
                : ''}
            </AppText>
          </View>
        ) : null}

        {mainCategoryKey === 'other' ? (
          <View style={styles.otherSubRow}>
            {RECORD_OTHER_SUBCATEGORIES.map(sub => {
              const active = sub.key === otherSubCategoryKey;
              return (
                <TouchableOpacity
                  key={sub.key}
                  activeOpacity={0.88}
                  style={[
                    styles.otherSubChip,
                    active ? styles.otherSubChipActive : null,
                    active
                      ? {
                          borderColor: petTheme.border,
                          backgroundColor: petTheme.tint,
                        }
                      : null,
                  ]}
                  onPress={() => onSelectOtherSubCategory(sub.key)}
                >
                  <AppText
                    preset="caption"
                    style={[
                      styles.otherSubChipText,
                      active ? styles.otherSubChipTextActive : null,
                      active ? { color: petTheme.deep } : null,
                    ]}
                  >
                    {sub.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}

            {otherSubCategoryKey ? (
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.otherSubClearBtn}
                onPress={clearOtherSubCategory}
              >
                <Feather name="x" size={14} color="#9AA4B6" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {isShoppingCategory ? (
          <View style={styles.field}>
            <AppText preset="body" style={styles.fieldLabel}>
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
            {priceLabel ? (
              <AppText preset="caption" style={styles.helperText}>
                저장 예정 금액: {priceLabel}
              </AppText>
            ) : (
              <AppText preset="caption" style={styles.helperText}>
                숫자만 입력하면 자동으로 원 단위로 저장돼요.
              </AppText>
            )}
          </View>
        ) : null}

        <View style={styles.field}>
          <AppText preset="body" style={styles.fieldLabel}>
            오늘의 기분
          </AppText>
          <View style={styles.moodGrid}>
            {RECORD_EMOTION_OPTIONS.map(mood => {
              const active = selectedEmotion === mood.value;
              return (
                <TouchableOpacity
                  key={mood.value}
                  activeOpacity={0.88}
                  style={[
                    styles.moodChip,
                    active ? styles.moodChipActive : null,
                    active
                      ? {
                          backgroundColor: petTheme.tint,
                          borderColor: petTheme.border,
                        }
                      : null,
                  ]}
                  onPress={() =>
                    setSelectedEmotion(prev =>
                      prev === mood.value ? null : mood.value,
                    )
                  }
                >
                  <AppText preset="caption" style={styles.moodEmoji}>
                    {mood.emoji}
                  </AppText>
                  <AppText
                    preset="caption"
                    style={[
                      styles.moodText,
                      active ? styles.moodTextActive : null,
                      active ? { color: petTheme.deep } : null,
                    ]}
                  >
                    {mood.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <AppText preset="body" style={styles.fieldLabel}>
            제목
          </AppText>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="제목을 입력하세요"
            placeholderTextColor="#B5BDCB"
          />
        </View>

        <View style={styles.field}>
          <AppText preset="body" style={styles.fieldLabel}>
            내용
          </AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={content}
            onChangeText={setContent}
            multiline
            placeholder="오늘의 추억을 남겨주세요"
            placeholderTextColor="#B5BDCB"
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <AppText preset="body" style={styles.fieldLabel}>
            태그
          </AppText>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.tagSelector}
            onPress={onOpenTagModal}
          >
            {mergedPreviewTags.length ? (
              <View style={styles.selectedTagsWrap}>
                {mergedPreviewTags.map(tag => (
                  <View
                    key={tag}
                    style={[
                      styles.selectedTagChip,
                      { backgroundColor: petTheme.tint },
                    ]}
                  >
                    <AppText
                      preset="caption"
                      style={[styles.selectedTagText, { color: petTheme.deep }]}
                    >
                      {tag}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : (
              <AppText preset="body" style={styles.tagPlaceholder}>
                태그를 추가하세요
              </AppText>
            )}
            <Feather name="chevron-right" size={18} color="#B5BDCB" />
          </TouchableOpacity>
          <AppText preset="caption" style={styles.helperText}>
            빠른 태그와 함께 최대 10개까지 저장됩니다.
          </AppText>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.bottomSubmitBtn,
            { marginBottom: bottomSubmitMargin },
            disabled ? styles.bottomSubmitBtnDisabled : null,
            !disabled
              ? {
                  backgroundColor: petTheme.primary,
                  shadowColor: petTheme.deep,
                }
              : null,
          ]}
          disabled={disabled}
          onPress={onSubmit}
        >
          <AppText preset="body" style={styles.bottomSubmitText}>
            {saving ? '기록 저장 중...' : '완료'}
          </AppText>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <DatePickerModal
        visible={dateModalVisible}
        initialDate={occurredAt || todayYmd}
        onCancel={onCloseDateModal}
        onConfirm={onConfirmDate}
      />

      <RecordTagModal
        visible={tagModalVisible}
        tagDraft={tagDraft}
        selectedTags={selectedTags}
        onClose={onCloseTagModal}
        onChangeTagDraft={setTagDraft}
        onSubmitDraftTag={onSubmitDraftTag}
        onRemoveTag={onRemoveTag}
      />
    </View>
  );
}
