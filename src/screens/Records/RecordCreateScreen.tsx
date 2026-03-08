// 파일: src/screens/Records/RecordCreateScreen.tsx
// 목적:
// - memory(기록) 생성
// - 이미지 중심 폼 UI로 재구성
// - 저장 직후 홈/타임라인에 즉시 반영
// - 탭 구조에서 폼 상태가 남지 않도록 focus/reset 유지

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
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
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { launchImageLibrary } from 'react-native-image-picker';

import AppText from '../../app/ui/AppText';
import DatePickerModal from '../../components/date-picker/DatePickerModal';
import RecordImageGallery from '../../components/records/RecordImageGallery';
import type { AppTabParamList } from '../../navigation/AppTabsNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  buildPickedRecordImages,
  formatRecordKoreanDate,
  mergeRecordTags,
  normalizeRecentRecordTags,
  parseRecordTags,
  RECORD_DEFAULT_RECENT_TAGS,
  RECORD_EMOTION_OPTIONS,
  RECORD_MAIN_CATEGORIES,
  RECORD_OTHER_SUBCATEGORIES,
  RECORD_RECENT_TAGS_STORAGE_KEY,
  RECORD_SUGGESTED_TAGS,
  toRecordYmd,
  type PickedRecordImage,
  type RecordMainCategoryKey,
  type RecordOtherSubCategoryKey,
  validateRecordOccurredAt,
} from '../../services/records/form';
import {
  clearRecordCreateDraft,
  loadRecordCreateDraft,
  saveRecordCreateDraft,
} from '../../services/local/recordDraft';
import { enqueuePendingMemoryUpload } from '../../services/local/uploadQueue';
import {
  getBrandedErrorMeta,
} from '../../services/app/errors';
import { supabase } from '../../services/supabase/client';
import {
  createMemory,
  type EmotionTag,
  fetchMemoryById,
  updateMemoryImagePaths,
} from '../../services/supabase/memories';
import { uploadMemoryImage } from '../../services/supabase/storageMemories';
import { usePetStore } from '../../store/petStore';
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
  const rootNavigation =
    navigation as unknown as NativeStackNavigationProp<RootStackParamList>;
  const route = useRoute<RecordCreateTabRoute>();
  const insets = useSafeAreaInsets();

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const refresh = useRecordStore(s => s.refresh);
  const upsertOneLocal = useRecordStore(s => s.upsertOneLocal);

  const petIdFromParams = route.params?.petId ?? null;
  const returnTo = route.params?.returnTo;

  const petId = useMemo(() => {
    if (petIdFromParams) return petIdFromParams;
    if (selectedPetId && pets.some(p => p.id === selectedPetId)) {
      return selectedPetId;
    }
    return pets[0]?.id ?? null;
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
  const [recentTags, setRecentTags] =
    useState<string[]>(Array.from(RECORD_DEFAULT_RECENT_TAGS));
  const [tagDraft, setTagDraft] = useState('');
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [mainCategoryKey, setMainCategoryKey] =
    useState<RecordMainCategoryKey>('walk');
  const [otherSubCategoryKey, setOtherSubCategoryKey] =
    useState<RecordOtherSubCategoryKey | null>(null);
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
  const formattedDate = useMemo(
    () => formatRecordKoreanDate(occurredAt || todayYmd),
    [occurredAt, todayYmd],
  );
  const mergedPreviewTags = useMemo(
    () =>
      mergeRecordTags(selectedTags, mainCategoryKey, otherSubCategoryKey),
    [selectedTags, mainCategoryKey, otherSubCategoryKey],
  );
  const activeImage = useMemo(
    () => selectedImages[activeImageIndex] ?? selectedImages[0] ?? null,
    [selectedImages, activeImageIndex],
  );
  const photoCounterText = useMemo(
    () =>
      selectedImages.length > 0
        ? `${activeImageIndex + 1}/${selectedImages.length}`
        : null,
    [activeImageIndex, selectedImages.length],
  );

  const resetForm = useCallback(() => {
    setTitle('');
    setContent('');
    setOccurredAt(todayYmd);
    setSelectedTags([]);
    setTagDraft('');
    setTagModalVisible(false);
    setMainCategoryKey('walk');
    setOtherSubCategoryKey(null);
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
    if (activeImageIndex >= selectedImages.length && selectedImages.length > 0) {
      setActiveImageIndex(selectedImages.length - 1);
    }
  }, [activeImageIndex, selectedImages.length]);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(RECORD_RECENT_TAGS_STORAGE_KEY)
        .then(raw => {
          if (!raw) return;
          try {
            const parsed = JSON.parse(raw) as string[];
            if (Array.isArray(parsed)) {
              const next = normalizeRecentRecordTags(parsed);
              if (next.length) setRecentTags(next);
            }
          } catch {
            // ignore
          }
        })
        .catch(() => {});
    }, []),
  );

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
          setSelectedTags(Array.isArray(draft.selectedTags) ? draft.selectedTags : []);
          setMainCategoryKey(draft.mainCategoryKey ?? 'walk');
          setOtherSubCategoryKey(draft.otherSubCategoryKey ?? null);
          setSelectedEmotion(draft.selectedEmotion ?? null);
          setSelectedImages(Array.isArray(draft.selectedImages) ? draft.selectedImages : []);
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
    saving,
    selectedEmotion,
    selectedImages,
    selectedTags,
    title,
  ]);

  const pickImage = useCallback(async () => {
    if (saving) return;

    const res = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 10,
      quality: 0.9,
    });

    if (res.didCancel) return;

    const assets = (res.assets ?? []).filter(asset => !!asset.uri);
    if (assets.length === 0) {
      Alert.alert('이미지 선택 실패', '다시 시도해 주세요.');
      return;
    }

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
  }, [saving]);

  const removeActiveImage = useCallback(() => {
    setSelectedImages(prev => {
      if (prev.length === 0) return prev;
      return prev.filter((_, index) => index !== activeImageIndex);
    });
  }, [activeImageIndex]);

  const navigateBackToOrigin = useCallback(() => {
    if (returnTo?.tab === 'TimelineTab') {
      rootNavigation.navigate('AppTabs', {
        screen: 'TimelineTab',
        params: returnTo.params,
      });
      return;
    }

    if (returnTo?.tab === 'GuestbookTab') {
      rootNavigation.navigate('AppTabs', { screen: 'GuestbookTab' });
      return;
    }

    if (returnTo?.tab === 'MoreTab') {
      rootNavigation.navigate('AppTabs', { screen: 'HomeTab' });
      openMoreDrawer();
      return;
    }

    if (returnTo?.tab === 'HomeTab') {
      rootNavigation.navigate('AppTabs', { screen: 'HomeTab' });
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    rootNavigation.navigate('AppTabs', { screen: 'HomeTab' });
  }, [navigation, returnTo, rootNavigation]);

  const onPressCancel = useCallback(() => {
    clearRecordCreateDraft().catch(() => {});
    resetForm();
    navigateBackToOrigin();
  }, [navigateBackToOrigin, resetForm]);

  const onSelectMainCategory = useCallback((nextKey: RecordMainCategoryKey) => {
    setMainCategoryKey(nextKey);
    if (nextKey !== 'other') {
      setOtherSubCategoryKey(null);
    }
  }, []);

  const onSelectOtherSubCategory = useCallback(
    (nextKey: RecordOtherSubCategoryKey) => {
      setMainCategoryKey('other');
      setOtherSubCategoryKey(nextKey);
    },
    [],
  );

  const clearOtherSubCategory = useCallback(() => {
    setOtherSubCategoryKey(null);
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

  const onPressSuggestedTag = useCallback(
    (tag: string) => {
      appendTag(tag);
    },
    [appendTag],
  );

  const onRemoveTag = useCallback((target: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== target));
  }, []);

  const onClearRecentTags = useCallback(() => {
    setRecentTags([]);
    AsyncStorage.removeItem(RECORD_RECENT_TAGS_STORAGE_KEY).catch(() => {});
  }, []);

  const onSubmit = useCallback(async () => {
    if (disabled || !petId) return;

    try {
      setSaving(true);

      const occurred = validateRecordOccurredAt(occurredAt);
      const mergedTags = mergeRecordTags(
        selectedTags,
        mainCategoryKey,
        otherSubCategoryKey,
      );

      const memoryId = await createMemory({
        petId,
        title: trimmedTitle,
        content: content.trim() || null,
        emotion: selectedEmotion,
        tags: mergedTags,
        occurredAt: occurred,
        imagePath: null,
      });

      if (selectedImages.length > 0) {
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id ?? null;
        if (!userId) throw new Error('로그인 정보가 없습니다.');

        const uploadedPaths: string[] = [];
        let failedCount = 0;
        const queuedImages: PickedRecordImage[] = [];

        for (const image of selectedImages) {
          try {
            const firstTry = await uploadMemoryImage({
              userId,
              petId,
              memoryId,
              fileUri: image.uri,
              mimeType: image.mimeType,
            });
            uploadedPaths.push(firstTry.path);
          } catch {
            try {
              const retry = await uploadMemoryImage({
                userId,
                petId,
                memoryId,
                fileUri: image.uri,
                mimeType: image.mimeType,
              });
              uploadedPaths.push(retry.path);
            } catch {
              failedCount += 1;
              queuedImages.push(image);
            }
          }
        }

        if (uploadedPaths.length > 0) {
          const saveResult = await updateMemoryImagePaths({
            memoryId,
            imagePaths: uploadedPaths,
          });

          if (
            saveResult.mode === 'single_fallback' &&
            uploadedPaths.length > 1
          ) {
            Alert.alert(
              '다중 이미지 저장 미지원',
              'DB 스키마에 image_urls 컬럼이 없어 첫 번째 사진만 저장됐어요. SQL 마이그레이션을 적용하면 슬라이드가 정상 동작해요.',
            );
          }
        }

        if (failedCount > 0) {
          await enqueuePendingMemoryUpload({
            userId,
            petId,
            memoryId,
            images: queuedImages.map(image => ({
              key: image.key,
              uri: image.uri,
              mimeType: image.mimeType,
            })),
          });

          showToast({
            tone: 'warning',
            title: '업로드 복구 대기',
            message:
              '실패한 이미지는 큐에 저장했어요. 앱이 다시 활성화되면 자동으로 재시도합니다.',
            durationMs: 3200,
          });
        }
      }

      try {
        const created = await fetchMemoryById(memoryId);
        upsertOneLocal(petId, created);
      } catch {
        // optimistic 반영 실패는 refresh에 맡긴다.
      }

      refresh(petId).catch(() => {});

      if (selectedTags.length > 0) {
        const recentUsedTags = normalizeRecentRecordTags(
          Array.from(new Set([...selectedTags, ...recentTags])),
        );
        setRecentTags(recentUsedTags);
        AsyncStorage.setItem(
          RECORD_RECENT_TAGS_STORAGE_KEY,
          JSON.stringify(recentUsedTags),
        ).catch(() => {});
      }

      resetForm();
      await clearRecordCreateDraft();
      showToast({
        tone: 'success',
        title: '기록 저장 완료',
        message: '작성 중 draft는 정리했고, 타임라인에 바로 반영했어요.',
      });
      navigation.navigate('TimelineTab');
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
    navigation,
    mainCategoryKey,
    otherSubCategoryKey,
    occurredAt,
    petId,
    refresh,
    recentTags,
    resetForm,
    selectedEmotion,
    selectedImages,
    selectedTags,
    trimmedTitle,
    upsertOneLocal,
  ]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.headerSideBtn}
          onPress={onPressCancel}
        >
          <AppText preset="body" style={styles.headerCancelText}>
            취소
          </AppText>
        </TouchableOpacity>

        <AppText preset="headline" style={styles.headerTitle}>
          기록하기
        </AppText>

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 32 + Math.max(insets.bottom, 18) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
          <Feather
            name="chevron-right"
            size={18}
            color="#C4CAD6"
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={pickImage}
        >
          <RecordImageGallery
            items={selectedImages}
            activeIndex={activeImageIndex}
            onChangeActiveIndex={setActiveImageIndex}
            containerStyle={styles.photoBox}
            emptyContent={
              <View style={styles.photoPlaceholder}>
                <View style={styles.photoIconBadge}>
                  <Feather name="camera" size={22} color="#94A1B5" />
                </View>
                <AppText preset="body" style={styles.photoPlaceholderTitle}>
                  사진 추가 (최대 10장)
                </AppText>
              </View>
            }
            mainContent={
              activeImage ? (
                <Image source={{ uri: activeImage.uri }} style={styles.photoImage} />
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
            counterText={photoCounterText}
            counterBadgeStyle={styles.photoCounterBadge}
            counterTextStyle={styles.photoCounterText}
          />
        </TouchableOpacity>

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
            style={[
              styles.quickTagHint,
              { backgroundColor: petTheme.tint },
            ]}
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
            { marginBottom: Math.max(insets.bottom, 18) },
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
      </ScrollView>

      <DatePickerModal
        visible={dateModalVisible}
        initialDate={occurredAt || todayYmd}
        onCancel={onCloseDateModal}
        onConfirm={onConfirmDate}
      />

      <RecordTagModal
        visible={tagModalVisible}
        tagDraft={tagDraft}
        recentTags={recentTags}
        selectedTags={selectedTags}
        suggestedTags={RECORD_SUGGESTED_TAGS}
        onClose={onCloseTagModal}
        onChangeTagDraft={setTagDraft}
        onSubmitDraftTag={onSubmitDraftTag}
        onPressSuggestedTag={onPressSuggestedTag}
        onRemoveTag={onRemoveTag}
        onClearRecentTags={onClearRecentTags}
        onConfirm={() => {
          onSubmitDraftTag();
          onCloseTagModal();
        }}
      />
    </KeyboardAvoidingView>
  );
}
