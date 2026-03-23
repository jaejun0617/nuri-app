import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import RNBlobUtil from 'react-native-blob-util';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import ConfirmDialog from '../../components/common/ConfirmDialog';
import HeaderTextActionButton from '../../components/navigation/HeaderTextActionButton';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  getBrandedErrorMeta,
  getErrorMessage,
} from '../../services/app/errors';
import {
  pickPhotoAssets,
  type PickedPhotoAsset,
} from '../../services/media/photoPicker';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { flushPendingCommunityImageCleanup } from '../../services/supabase/storageCommunity';
import { useCommunityAuth } from '../../hooks/useCommunityAuth';
import { useCommunityStore } from '../../store/communityStore';
import { usePetStore } from '../../store/petStore';
import { showToast } from '../../store/uiStore';
import type { CommunityPostCategory } from '../../types/community';
import CommunityPostEditorForm from './components/CommunityPostEditorForm';
import {
  buildCommunityPetSnapshot,
  getCommunityEditorExitDialogCopy,
  hasCommunityEditorDraftChanges,
  resolveCommunityPetMetaLabel,
} from './communityPostEditor.shared';
import { runCommunityCreateSubmitFlow } from './communityPostSubmit.shared';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CommunityCreate'>;

type DraftPayload = {
  title: string;
  content: string;
  category: CommunityPostCategory;
  petId: string | null;
  pickedImages: PickedPhotoAsset[];
  showPetAge: boolean;
};

const DRAFT_KEY = 'nuri.community.draft.v1';
function isValidCategory(value: unknown): value is CommunityPostCategory {
  return (
    value === 'question' ||
    value === 'info' ||
    value === 'daily' ||
    value === 'free'
  );
}

function parseDraft(raw: string | null): DraftPayload | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    const title = typeof record.title === 'string' ? record.title : '';
    const content = typeof record.content === 'string' ? record.content : '';
    const category = isValidCategory(record.category)
      ? record.category
      : 'question';
    const petId = typeof record.petId === 'string' ? record.petId : null;
    const showPetAge =
      typeof record.showPetAge === 'boolean' ? record.showPetAge : true;
    const rawPickedImages = Array.isArray(record.pickedImages)
      ? record.pickedImages
      : record.pickedImage
      ? [record.pickedImage]
      : [];
    const pickedImages = rawPickedImages
      .map(item => {
        if (!item || typeof item !== 'object') return null;
        const image = item as Record<string, unknown>;
        if (typeof image.uri !== 'string') return null;
        return {
          uri: image.uri,
          mimeType: typeof image.mimeType === 'string' ? image.mimeType : null,
          fileName: typeof image.fileName === 'string' ? image.fileName : null,
        } satisfies PickedPhotoAsset;
      })
      .filter((item): item is PickedPhotoAsset => item !== null)
      .slice(0, 3);
    if (!title.trim() && !content.trim() && pickedImages.length === 0) return null;
    return { title, content, category, petId, pickedImages, showPetAge };
  } catch {
    return null;
  }
}

async function validateRestoredPickedImages(
  assets: PickedPhotoAsset[],
): Promise<PickedPhotoAsset[]> {
  const restored: PickedPhotoAsset[] = [];
  for (const asset of assets) {
    if (!asset?.uri) continue;

    const rawUri = asset.uri.trim();
    if (!rawUri) continue;
    if (rawUri.startsWith('content://')) {
      restored.push(asset);
      continue;
    }

    if (!RNBlobUtil?.fs?.exists) {
      restored.push(asset);
      continue;
    }

    const normalizedPath = rawUri.startsWith('file://')
      ? rawUri.replace('file://', '')
      : rawUri;

    try {
      const exists = await RNBlobUtil.fs.exists(normalizedPath);
      if (exists) restored.push(asset);
    } catch {
      continue;
    }
  }

  return restored;
}

export default function CommunityCreateScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const draftHydratedRef = useRef(false);
  const scrollViewRef = useRef<KeyboardAwareScrollView | null>(null);
  const keyboardInset = useKeyboardInset();

  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const selectedPet = useMemo(
    () => pets.find(pet => pet.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );
  const { isLoggedIn, currentUserId } = useCommunityAuth();
  const submitPost = useCommunityStore(s => s.submitPost);
  const editPost = useCommunityStore(s => s.editPost);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CommunityPostCategory>('question');
  const [linkedPetId, setLinkedPetId] = useState<string | null>(
    selectedPetId ?? null,
  );
  const [pickedImages, setPickedImages] = useState<PickedPhotoAsset[]>([]);
  const [showPetAge, setShowPetAge] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [restoreDraftVisible, setRestoreDraftVisible] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftPayload | null>(null);
  const [imageRestoreWarningVisible, setImageRestoreWarningVisible] =
    useState(false);
  const linkedPet = useMemo(
    () => pets.find(pet => pet.id === linkedPetId) ?? null,
    [linkedPetId, pets],
  );
  const linkedPetMetaLabel = useMemo(() => {
    if (!linkedPet) return null;
    return resolveCommunityPetMetaLabel({
      breed: linkedPet.breed,
      speciesDisplayName: linkedPet.speciesDisplayName,
      showAge: showPetAge,
      birthDate: linkedPet.birthDate,
    });
  }, [linkedPet, showPetAge]);

  useEffect(() => {
    if (isLoggedIn) return;
    navigation.replace('SignIn');
  }, [isLoggedIn, navigation]);

  useEffect(() => {
    if (draftHydratedRef.current) return;
    draftHydratedRef.current = true;

    AsyncStorage.getItem(DRAFT_KEY)
      .then(raw => {
        const draft = parseDraft(raw);
        if (!draft) return;
        setPendingDraft(draft);
        setRestoreDraftVisible(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    flushPendingCommunityImageCleanup().catch(() => {});
  }, []);

  useEffect(() => {
    const hasDraftContent =
      title.trim().length > 0 ||
      content.trim().length > 0 ||
      pickedImages.length > 0;
    if (
      !hasDraftContent &&
      category === 'question' &&
      linkedPetId === (selectedPetId ?? null) &&
      showPetAge
    ) {
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      return;
    }

    AsyncStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        title,
        content,
        category,
        petId: linkedPetId,
        pickedImages,
        showPetAge,
      } satisfies DraftPayload),
    ).catch(() => {});
  }, [category, content, linkedPetId, pickedImages, selectedPetId, showPetAge, title]);

  const hasUnsavedChanges = useMemo(
    () =>
      hasCommunityEditorDraftChanges(
        {
          title,
          content,
          category,
          linkedPetId,
          showPetAge,
          hasPickedImage: pickedImages.length > 0,
        },
        {
          title: '',
          content: '',
          category: 'question',
          linkedPetId: selectedPetId ?? null,
          showPetAge: true,
          hasImage: false,
        },
      ),
    [category, content, linkedPetId, pickedImages, selectedPetId, showPetAge, title],
  );

  const handleBack = useCallback(() => {
    if (submitting) return;
    if (hasUnsavedChanges) {
      setExitConfirmVisible(true);
      return;
    }
    navigation.goBack();
  }, [hasUnsavedChanges, navigation, submitting]);
  const renderHeaderLeft = useCallback(
    () => (
      <HeaderTextActionButton
        label="취소"
        accessibilityLabel="작성 취소"
        onPress={handleBack}
        disabled={submitting}
        backgroundColor={theme.colors.surfaceElevated}
        textColor={theme.colors.textPrimary}
        borderColor={theme.colors.border}
      />
    ),
    [
      handleBack,
      submitting,
      theme.colors.border,
      theme.colors.surfaceElevated,
      theme.colors.textPrimary,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          handleBack();
          return true;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [handleBack]),
  );

  const handlePickImage = useCallback(async () => {
    try {
      const remaining = Math.max(3 - pickedImages.length, 0);
      if (remaining === 0) return;
      const result = await pickPhotoAssets({
        selectionLimit: remaining,
        quality: 0.9,
      });
      if (result.status !== 'success') return;
      setPickedImages(prev => {
        const existingUris = new Set(prev.map(image => image.uri));
        const appended = result.assets.filter(
          asset => !existingUris.has(asset.uri),
        );
        return [...prev, ...appended].slice(0, 3);
      });
    } catch (error: unknown) {
      const meta = getBrandedErrorMeta(error, 'image-pick');
      showToast({ tone: 'error', title: meta.title, message: meta.message });
    }
  }, [pickedImages.length]);

  const handleRemoveImage = useCallback((index?: number) => {
    if (index === undefined) {
      setPickedImages([]);
      return;
    }
    setPickedImages(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    const trimmed = content.trim();
    if (!currentUserId) {
      navigation.replace('SignIn');
      return;
    }
    if (trimmedTitle.length === 0 || trimmedTitle.length > 80) {
      showToast({
        tone: 'warning',
        message: '제목은 1자 이상 80자 이하로 작성해 주세요.',
      });
      return;
    }
    if (trimmed.length === 0 || trimmed.length > 5000) {
      showToast({
        tone: 'warning',
        message: '본문은 1자 이상 5000자 이하로 작성해 주세요.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await runCommunityCreateSubmitFlow({
        userId: currentUserId,
        title: trimmedTitle,
        content: trimmed,
        category,
        petId: linkedPetId,
        petSnapshot: buildCommunityPetSnapshot(linkedPet, showPetAge),
        pickedImages,
        submitPost,
        editPost,
        onImageUploadWarning: () => {
          showToast({
            tone: 'warning',
            message: '이미지 업로드에 실패했어요. 텍스트만 등록됐습니다.',
          });
        },
      });

      await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      navigation.goBack();
    } catch (error: unknown) {
      const meta = getBrandedErrorMeta(error, 'generic');
      showToast({
        tone: 'error',
        title: meta.title,
        message: getErrorMessage(error) || meta.message,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    category,
    content,
    currentUserId,
    editPost,
    linkedPetId,
    linkedPet,
    navigation,
    pickedImages,
    showPetAge,
    submitPost,
    title,
  ]);

  const disabled =
    submitting || title.trim().length === 0 || content.trim().length === 0;
  const renderHeaderRight = useCallback(
    () => (
      <HeaderTextActionButton
        label="등록"
        accessibilityLabel="게시글 등록"
        onPress={handleSubmit}
        disabled={disabled}
        backgroundColor={petTheme.primary}
        textColor={petTheme.onPrimary}
      />
    ),
    [disabled, handleSubmit, petTheme.onPrimary, petTheme.primary],
  );
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '새 게시글',
      headerLeft: renderHeaderLeft,
      headerRight: renderHeaderRight,
    });
  }, [
    navigation,
    renderHeaderLeft,
    renderHeaderRight,
  ]);
  const hasPickedImage = pickedImages.length > 0;
  const scrollBottomInset = useMemo(() => {
    if (keyboardInset > 0) {
      if (hasPickedImage) {
        return Math.max(keyboardInset + 32, insets.bottom + 112);
      }
      return Math.max(keyboardInset + 56, insets.bottom + 128);
    }
    return hasPickedImage ? insets.bottom + 120 : insets.bottom + 132;
  }, [hasPickedImage, insets.bottom, keyboardInset]);
  const bottomSubmitMargin = useMemo(() => {
    if (keyboardInset > 0) {
      return (
        Math.max(keyboardInset - 200, 0) +
        (hasPickedImage
          ? Math.max(insets.bottom, 12) + 4
          : Math.max(insets.bottom, 12) + 8)
      );
    }
    return Math.max(insets.bottom, 18);
  }, [hasPickedImage, insets.bottom, keyboardInset]);

  const handleFocusContent = useCallback(() => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd(true);
    });
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd(true);
    }, 180);
  }, []);

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right', 'bottom']}
    >
      <KeyboardAwareScrollView
        innerRef={ref => {
          scrollViewRef.current = ref;
        }}
        enableOnAndroid
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="interactive"
        enableAutomaticScroll
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomInset },
        ]}
        extraScrollHeight={hasPickedImage ? 18 : 42}
        extraHeight={hasPickedImage ? 54 : 78}
        showsVerticalScrollIndicator={false}
      >
        <CommunityPostEditorForm
          pets={pets}
          linkedPetId={linkedPetId}
          linkedPet={linkedPet}
          linkedPetMetaLabel={linkedPetMetaLabel}
          showPetAge={showPetAge}
          category={category}
          title={title}
          content={content}
          imageUri={pickedImages[0]?.uri ?? null}
          imageUris={pickedImages.map(image => image.uri)}
          accentPalette={petTheme}
          bottomSubmitMargin={bottomSubmitMargin}
          submitLabel={submitting ? '글 등록 중...' : '글 등록'}
          submitDisabled={disabled}
          onChangeCategory={setCategory}
          onChangeLinkedPetId={setLinkedPetId}
          onToggleShowPetAge={() => setShowPetAge(prev => !prev)}
          onChangeTitle={setTitle}
          onChangeContent={setContent}
          onContentFocus={handleFocusContent}
          onPickImage={handlePickImage}
          onRemoveImage={handleRemoveImage}
          onImageError={() => {
            setPickedImages([]);
            showToast({
              tone: 'warning',
              message:
                '첨부 이미지를 다시 불러오지 못했어요. 이미지를 다시 선택해 주세요.',
            });
          }}
          onSubmit={handleSubmit}
        />
      </KeyboardAwareScrollView>

      <ConfirmDialog
        visible={exitConfirmVisible}
        tone="warning"
        title={getCommunityEditorExitDialogCopy('create').title}
        message={getCommunityEditorExitDialogCopy('create').message}
        confirmLabel={getCommunityEditorExitDialogCopy('create').confirmLabel}
        cancelLabel={getCommunityEditorExitDialogCopy('create').cancelLabel}
        accentColor={petTheme.primary}
        onCancel={() => setExitConfirmVisible(false)}
        onConfirm={() => {
          setExitConfirmVisible(false);
          navigation.goBack();
        }}
      />
      <ConfirmDialog
        visible={restoreDraftVisible}
        title="임시저장된 글이 있어요"
        message={
          pendingDraft?.pickedImages.length
            ? '이전에 입력한 제목, 본문과 첨부한 이미지를 그대로 이어서 작성할까요?'
            : '이전에 입력한 제목과 본문을 그대로 이어서 작성할까요?'
        }
        cancelLabel="버리기"
        confirmLabel="이어쓰기"
        tone="default"
        accentColor={petTheme.primary}
        onCancel={() => {
          setRestoreDraftVisible(false);
          setPendingDraft(null);
          AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
        }}
        onConfirm={() => {
          if (!pendingDraft) {
            setRestoreDraftVisible(false);
            setPendingDraft(null);
            return;
          }

          setTitle(pendingDraft.title);
          setContent(pendingDraft.content);
          setCategory(pendingDraft.category);
          setLinkedPetId(pendingDraft.petId);
          setShowPetAge(pendingDraft.showPetAge);

          validateRestoredPickedImages(pendingDraft.pickedImages)
            .then(restoredImages => {
              setPickedImages(restoredImages);
              if (
                pendingDraft.pickedImages.length > 0 &&
                restoredImages.length !== pendingDraft.pickedImages.length
              ) {
                setImageRestoreWarningVisible(true);
              }
            })
            .finally(() => {
              setRestoreDraftVisible(false);
              setPendingDraft(null);
            });
        }}
      />
      <ConfirmDialog
        visible={imageRestoreWarningVisible}
        tone="warning"
        title="첨부 이미지를 다시 불러오지 못했어요"
        message={
          '기기에 남아 있는 본문과 설정만 먼저 복원했어요.\n이미지는 다시 선택해 주세요.'
        }
        confirmLabel="확인"
        accentColor={petTheme.primary}
        onCancel={() => setImageRestoreWarningVisible(false)}
        onConfirm={() => setImageRestoreWarningVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = {
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
    flexGrow: 1,
  },
};
