import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import RNBlobUtil from 'react-native-blob-util';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import HeaderTextActionButton from '../../components/navigation/HeaderTextActionButton';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getBrandedErrorMeta, getErrorMessage } from '../../services/app/errors';
import { pickPhotoAssets, type PickedPhotoAsset } from '../../services/media/photoPicker';
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
  content: string;
  category: CommunityPostCategory;
  petId: string | null;
  pickedImage: PickedPhotoAsset | null;
  showPetAge: boolean;
};

const DRAFT_KEY = 'nuri.community.draft.v1';

function isValidCategory(value: unknown): value is CommunityPostCategory {
  return value === 'question' || value === 'info' || value === 'daily' || value === 'free';
}

function parseDraft(raw: string | null): DraftPayload | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    const content = typeof record.content === 'string' ? record.content : '';
    const category = isValidCategory(record.category) ? record.category : 'question';
    const petId = typeof record.petId === 'string' ? record.petId : null;
    const showPetAge =
      typeof record.showPetAge === 'boolean' ? record.showPetAge : true;
    const imageRecord = record.pickedImage;
    const pickedImage =
      imageRecord &&
      typeof imageRecord === 'object' &&
      typeof (imageRecord as Record<string, unknown>).uri === 'string'
        ? {
            uri: (imageRecord as Record<string, unknown>).uri as string,
            mimeType:
              typeof (imageRecord as Record<string, unknown>).mimeType === 'string'
                ? ((imageRecord as Record<string, unknown>).mimeType as string)
                : null,
            fileName:
              typeof (imageRecord as Record<string, unknown>).fileName === 'string'
                ? ((imageRecord as Record<string, unknown>).fileName as string)
                : null,
          }
        : null;
    if (!content.trim() && !pickedImage) return null;
    return { content, category, petId, pickedImage, showPetAge };
  } catch {
    return null;
  }
}

async function validateRestoredPickedImage(
  asset: PickedPhotoAsset | null,
): Promise<PickedPhotoAsset | null> {
  if (!asset?.uri) return null;

  const rawUri = asset.uri.trim();
  if (!rawUri) return null;
  if (rawUri.startsWith('content://')) {
    return asset;
  }

  if (!RNBlobUtil?.fs?.exists) {
    return asset;
  }

  const normalizedPath = rawUri.startsWith('file://')
    ? rawUri.replace('file://', '')
    : rawUri;

  try {
    const exists = await RNBlobUtil.fs.exists(normalizedPath);
    return exists ? asset : null;
  } catch {
    return null;
  }
}

export default function CommunityCreateScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const draftHydratedRef = useRef(false);
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

  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CommunityPostCategory>('question');
  const [linkedPetId, setLinkedPetId] = useState<string | null>(selectedPetId ?? null);
  const [pickedImage, setPickedImage] = useState<PickedPhotoAsset | null>(null);
  const [showPetAge, setShowPetAge] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [restoreDraftVisible, setRestoreDraftVisible] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftPayload | null>(null);
  const [imageRestoreWarningVisible, setImageRestoreWarningVisible] = useState(false);
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
    const hasDraftContent = content.trim().length > 0 || pickedImage !== null;
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
        content,
        category,
        petId: linkedPetId,
        pickedImage,
        showPetAge,
      } satisfies DraftPayload),
    ).catch(() => {});
  }, [category, content, linkedPetId, pickedImage, selectedPetId, showPetAge]);

  const hasUnsavedChanges = useMemo(
    () =>
      hasCommunityEditorDraftChanges(
        {
          content,
          category,
          linkedPetId,
          showPetAge,
          hasPickedImage: pickedImage !== null,
        },
        {
          content: '',
          category: 'question',
          linkedPetId: selectedPetId ?? null,
          showPetAge: true,
          hasImage: false,
        },
      ),
    [category, content, linkedPetId, pickedImage, selectedPetId, showPetAge],
  );

  const handleBack = useCallback(() => {
    if (submitting) return;
    if (hasUnsavedChanges) {
      setExitConfirmVisible(true);
      return;
    }
    navigation.goBack();
  }, [hasUnsavedChanges, navigation, submitting]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });

      return () => {
        subscription.remove();
      };
    }, [handleBack]),
  );

  const handlePickImage = useCallback(async () => {
    try {
      const result = await pickPhotoAssets({ selectionLimit: 1, quality: 0.9 });
      if (result.status !== 'success') return;
      setPickedImage(result.assets[0] ?? null);
    } catch (error: unknown) {
      const meta = getBrandedErrorMeta(error, 'image-pick');
      showToast({ tone: 'error', title: meta.title, message: meta.message });
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setPickedImage(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (!currentUserId) {
      navigation.replace('SignIn');
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
        content: trimmed,
        category,
        petId: linkedPetId,
        petSnapshot: buildCommunityPetSnapshot(linkedPet, showPetAge),
        pickedImage,
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
    pickedImage,
    showPetAge,
    submitPost,
  ]);

  const disabled = submitting || content.trim().length === 0;
  const scrollBottomInset = useMemo(() => {
    return Math.max(insets.bottom + 240, keyboardInset + 160, 280);
  }, [insets.bottom, keyboardInset]);
  const bottomSubmitMargin = useMemo(() => {
    if (keyboardInset > 0) return Math.max(insets.bottom, 18) + 20;
    return Math.max(insets.bottom, 18);
  }, [insets.bottom, keyboardInset]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 20) }]}>
        <View style={styles.headerSide}>
          <HeaderTextActionButton
            label="취소"
            accessibilityLabel="작성 취소"
            onPress={handleBack}
            disabled={submitting}
            backgroundColor={theme.colors.surfaceElevated}
            textColor={theme.colors.textPrimary}
            borderColor={theme.colors.border}
          />
        </View>

        <AppText preset="headline" style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          새 게시글
        </AppText>

        <View style={[styles.headerSide, styles.headerRight]}>
          <HeaderTextActionButton
            label="등록"
            accessibilityLabel="게시글 등록"
            onPress={handleSubmit}
            disabled={disabled}
            backgroundColor={petTheme.primary}
            textColor={petTheme.onPrimary}
          />
        </View>
      </View>

      <KeyboardAwareScrollView
        enableOnAndroid
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        enableAutomaticScroll
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomInset },
        ]}
        extraScrollHeight={132}
        extraHeight={196}
        showsVerticalScrollIndicator={false}
      >
        <CommunityPostEditorForm
          pets={pets}
          linkedPetId={linkedPetId}
          linkedPet={linkedPet}
          linkedPetMetaLabel={linkedPetMetaLabel}
          showPetAge={showPetAge}
          category={category}
          content={content}
          imageUri={pickedImage?.uri ?? null}
          accentPalette={petTheme}
          bottomSubmitMargin={bottomSubmitMargin}
          submitLabel={submitting ? '글 등록 중...' : '글 등록'}
          submitDisabled={disabled}
          onChangeCategory={setCategory}
          onChangeLinkedPetId={setLinkedPetId}
          onToggleShowPetAge={() => setShowPetAge(prev => !prev)}
          onChangeContent={setContent}
          onPickImage={handlePickImage}
          onRemoveImage={handleRemoveImage}
          onImageError={() => {
            setPickedImage(null);
            showToast({
              tone: 'warning',
              message: '첨부 이미지를 다시 불러오지 못했어요. 이미지를 다시 선택해 주세요.',
            });
          }}
          onSubmit={handleSubmit}
          petHintText="현재 프로필 기준으로 미리 보여주고 있어요. 게시글 저장 시점에 고정되는 스냅샷 구조는 다음 단계에서 함께 열 예정이에요."
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
          pendingDraft?.pickedImage
            ? '이전에 입력한 본문과 첨부한 이미지를 그대로 이어서 작성할까요?'
            : '이전에 입력한 본문을 그대로 이어서 작성할까요?'
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

          setContent(pendingDraft.content);
          setCategory(pendingDraft.category);
          setLinkedPetId(pendingDraft.petId);
          setShowPetAge(pendingDraft.showPetAge);

          validateRestoredPickedImage(pendingDraft.pickedImage)
            .then(restoredImage => {
              setPickedImage(restoredImage);
              if (pendingDraft.pickedImage && !restoredImage) {
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
        message={'기기에 남아 있는 본문과 설정만 먼저 복원했어요.\n이미지는 다시 선택해 주세요.'}
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
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerSide: {
    width: 72,
    alignItems: 'flex-start' as const,
    justifyContent: 'center' as const,
  },
  headerRight: {
    alignItems: 'flex-end' as const,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center' as const,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
    flexGrow: 1,
  },
};
