import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
  useKeyboardState,
} from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { spacing } from '../../app/theme/tokens/spacing';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import HeaderTextActionButton from '../../components/navigation/HeaderTextActionButton';
import { useCommunityAuth } from '../../hooks/useCommunityAuth';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { getCommunityMutationErrorMeta } from '../../services/community/errors';
import {
  resolveComposerFocusOffset,
  type ComposerFocusTarget,
} from '../../services/forms/composerFocus';
import { pickPhotoAssets, type PickedPhotoAsset } from '../../services/media/photoPicker';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { flushPendingCommunityImageCleanup } from '../../services/supabase/storageCommunity';
import { useCommunityStore } from '../../store/communityStore';
import { usePetStore } from '../../store/petStore';
import { showToast } from '../../store/uiStore';
import type { CommunityPostCategory } from '../../types/community';
import CommunityPostEditorForm from './components/CommunityPostEditorForm';
import {
  getCommunityEditorExitDialogCopy,
  hasCommunityEditorDraftChanges,
} from './communityPostEditor.shared';
import { runCommunityEditSubmitFlow } from './communityPostSubmit.shared';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CommunityEdit'>;
type Route = RootScreenRoute<'CommunityEdit'>;

export default function CommunityEditScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const keyboardVisible = useKeyboardState(state => state.isVisible);
  const hydratedRef = useRef(false);
  const scrollViewRef = useRef<KeyboardAwareScrollViewRef | null>(null);
  const composerFieldOffsetsRef = useRef<
    Partial<Record<ComposerFocusTarget, number>>
  >({});

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
  const postId = route.params.postId;
  const post = useCommunityStore(s => s.postsById[postId] ?? null);
  const detailStatus = useCommunityStore(s => s.detailStatusByPostId[postId] ?? 'idle');
  const fetchPostDetail = useCommunityStore(s => s.fetchPostDetail);
  const editPost = useCommunityStore(s => s.editPost);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CommunityPostCategory>('question');
  const [pickedImage, setPickedImage] = useState<PickedPhotoAsset | null>(null);
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigation.replace('SignIn');
    }
  }, [isLoggedIn, navigation]);

  useEffect(() => {
    if (post) return;
    fetchPostDetail(postId).catch(() => {});
  }, [fetchPostDetail, post, postId]);

  useEffect(() => {
    if (!post || hydratedRef.current) return;
    hydratedRef.current = true;
    setTitle(post.title ?? '');
    setContent(post.content);
    setCategory(post.category ?? 'question');
    setExistingImagePath(post.imagePath ?? null);
    setExistingImageUrl(post.imageUrl ?? null);
  }, [post]);

  useEffect(() => {
    flushPendingCommunityImageCleanup().catch(() => {});
  }, []);

  const isMyPost = !!post && !!currentUserId && post.authorId === currentUserId;
  const hasUnsavedChanges = useMemo(() => {
    if (!post) return false;
    const baselineHasImage = !!(post.imagePath ?? '').trim();
    const nextHasImage = pickedImage !== null || !!(existingImagePath ?? '').trim();
    return (
      hasCommunityEditorDraftChanges(
        {
          title,
          content,
          category,
          hasPickedImage: nextHasImage,
        },
        {
          title: post.title ?? '',
          content: post.content,
          category: post.category ?? 'question',
          hasImage: baselineHasImage,
        },
      ) ||
      existingImagePath !== (post.imagePath ?? null)
    );
  }, [category, content, existingImagePath, pickedImage, post, title]);

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
        accessibilityLabel="수정 취소"
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
      setExistingImageUrl(null);
    } catch (error: unknown) {
      const meta = getBrandedErrorMeta(error, 'image-pick');
      showToast({ tone: 'error', title: meta.title, message: meta.message });
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setPickedImage(null);
    setExistingImagePath(null);
    setExistingImageUrl(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!post || !currentUserId) return;
    const trimmedTitle = title.trim();
    const trimmed = content.trim();
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
      await runCommunityEditSubmitFlow({
        userId: currentUserId,
        postId: post.id,
        title: trimmedTitle,
        content: trimmed,
        category,
        pickedImage,
        previousImagePath: post.imagePath ?? null,
        existingImagePath,
        editPost,
      });

      navigation.goBack();
    } catch (error: unknown) {
      const meta = getCommunityMutationErrorMeta(error, 'post-update');
      showToast({
        tone: 'error',
        title: meta.title,
        message: meta.message,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    category,
    content,
    currentUserId,
    editPost,
    existingImagePath,
    navigation,
    pickedImage,
    post,
    title,
  ]);

  const handlePressCommunityPolicy = useCallback(() => {
    navigation.navigate('PolicyDetail', { documentId: 'community' });
  }, [navigation]);

  const disabled =
    submitting ||
    !post ||
    !isMyPost ||
    title.trim().length === 0 ||
    content.trim().length === 0;
  const renderHeaderRight = useCallback(
    () => (
      <HeaderTextActionButton
        label="저장"
        accessibilityLabel="게시글 저장"
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
      headerTitle: '게시글 수정',
      headerLeft: renderHeaderLeft,
      headerRight: renderHeaderRight,
    });
  }, [
    navigation,
    renderHeaderLeft,
    renderHeaderRight,
  ]);
  const handleFieldLayout = useCallback(
    (field: ComposerFocusTarget, offsetY: number) => {
      composerFieldOffsetsRef.current[field] = offsetY;
    },
    [],
  );
  const handleFocusField = useCallback((field: ComposerFocusTarget) => {
    requestAnimationFrame(() => {
      const offsetY = composerFieldOffsetsRef.current[field];
      if (offsetY === undefined) {
        scrollViewRef.current?.assureFocusedInputVisible();
        return;
      }
      scrollViewRef.current?.scrollTo({
        x: 0,
        y: resolveComposerFocusOffset(offsetY),
        animated: true,
      });
    });
  }, []);
  const handleTitleFocus = useCallback(
    () => handleFocusField('title'),
    [handleFocusField],
  );
  const handleContentFocus = useCallback(
    () => handleFocusField('body'),
    [handleFocusField],
  );

  if (!post || detailStatus === 'idle' || detailStatus === 'loading') {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.loadingWrap, { paddingTop: Math.max(insets.top + 32, 48) }]}>
          <AppText preset="body" style={{ color: theme.colors.textMuted }}>
            게시글 정보를 불러오는 중이에요.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (!isMyPost) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.loadingWrap, { paddingTop: Math.max(insets.top + 32, 48) }]}>
          <AppText preset="headline" style={{ color: theme.colors.textPrimary }}>
            수정 권한이 없어요
          </AppText>
          <AppText preset="body" style={[styles.permissionBody, { color: theme.colors.textMuted }]}>
            본인이 작성한 게시글만 수정할 수 있어요.
          </AppText>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.permissionButton, { backgroundColor: petTheme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <AppText preset="body" style={{ color: petTheme.onPrimary, fontWeight: '700' }}>
              돌아가기
            </AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]} edges={['left', 'right', 'bottom']}>
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: keyboardVisible
              ? spacing.md
              : insets.bottom + spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <CommunityPostEditorForm
          category={category}
          title={title}
          content={content}
          imageUri={pickedImage?.uri ?? existingImageUrl}
          accentPalette={petTheme}
          bottomSubmitMargin={0}
          submitLabel={submitting ? '저장 중...' : '저장'}
          submitDisabled={disabled}
          onChangeCategory={setCategory}
          onChangeTitle={setTitle}
          onChangeContent={setContent}
          onFieldLayout={handleFieldLayout}
          onTitleFocus={handleTitleFocus}
          onContentFocus={handleContentFocus}
          onPressPolicy={handlePressCommunityPolicy}
          onPickImage={handlePickImage}
          onRemoveImage={handleRemoveImage}
          onImageError={() => {
            setPickedImage(null);
            setExistingImageUrl(null);
            showToast({
              tone: 'warning',
              message: '첨부 이미지를 다시 불러오지 못했어요. 이미지를 다시 선택해 주세요.',
            });
          }}
          onSubmit={handleSubmit}
        />
      </KeyboardAwareScrollView>

      <ConfirmDialog
        visible={exitConfirmVisible}
        tone="warning"
        title={getCommunityEditorExitDialogCopy('edit').title}
        message={getCommunityEditorExitDialogCopy('edit').message}
        confirmLabel={getCommunityEditorExitDialogCopy('edit').confirmLabel}
        cancelLabel={getCommunityEditorExitDialogCopy('edit').cancelLabel}
        accentColor={petTheme.primary}
        onCancel={() => setExitConfirmVisible(false)}
        onConfirm={() => {
          setExitConfirmVisible(false);
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
}

const styles = {
  screen: {
    flex: 1,
  },
  loadingWrap: {
    paddingHorizontal: 24,
    gap: 12,
    alignItems: 'center' as const,
  },
  permissionBody: {
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  permissionButton: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
    flexGrow: 1,
  },
};
