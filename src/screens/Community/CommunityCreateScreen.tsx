import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackHandler, Keyboard, Pressable, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  type KeyboardAwareScrollViewRef,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import RNBlobUtil from 'react-native-blob-util';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import ConfirmDialog from '../../components/common/ConfirmDialog';
import { spacing } from '../../app/theme/tokens/spacing';
import AppText from '../../app/ui/AppText';
import { PRODUCT_CTA } from '../../app/theme/tokens/productAccent';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { getCommunityMutationErrorMeta } from '../../services/community/errors';
import {
  pickPhotoAssets,
  type PickedPhotoAsset,
} from '../../services/media/photoPicker';
import { flushPendingCommunityImageCleanup } from '../../services/supabase/storageCommunity';
import { useCommunityAuth } from '../../hooks/useCommunityAuth';
import { useCommunityStore } from '../../store/communityStore';
import { showToast } from '../../store/uiStore';
import type { CommunityPostCategory } from '../../types/community';
import CommunityCreateForm from './components/CommunityCreateForm';
import CommunityCreateAttachments from './components/CommunityCreateAttachments';
import CommunitySubmitProgress from './components/CommunitySubmitProgress';
import {
  COMMUNITY_CREATE_PHOTO_LIMIT,
  getCommunityEditorExitDialogCopy,
  hasCommunityEditorDraftChanges,
} from './communityPostEditor.shared';
import { runCommunityCreateSubmitFlow } from './communityPostSubmit.shared';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CommunityCreate'>;

type DraftPayload = {
  title: string;
  content: string;
  category: CommunityPostCategory;
  pickedImages: PickedPhotoAsset[];
};

const DRAFT_KEY = 'nuri.community.draft.v1';
// A delayed autosave must finish before an exit save, deletion or subsequent visit reads this key.
let pendingDraftWrite: Promise<void> = Promise.resolve();
function writeDraft(raw: string | null) {
  const write = pendingDraftWrite.then(() =>
    raw === null ? AsyncStorage.removeItem(DRAFT_KEY) : AsyncStorage.setItem(DRAFT_KEY, raw),
  );
  pendingDraftWrite = write.catch(() => {});
  return write;
}

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
      .slice(0, COMMUNITY_CREATE_PHOTO_LIMIT);
    if (!title.trim() && !content.trim() && pickedImages.length === 0 && category === 'question')
      return null;
    return { title, content, category, pickedImages };
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
  const seasonColors = PRODUCT_CTA;
  const { progress: keyboardProgress } = useReanimatedKeyboardAnimation();
  const toolbarInset = useAnimatedStyle(
    () => ({
      paddingBottom: insets.bottom * (1 - keyboardProgress.value),
    }),
  );
  const [toolbarHeight, setToolbarHeight] = useState(68);
  const submittingRef = useRef(false);
  const photoPickerOpenRef = useRef(false);
  const scrollViewRef = useRef<KeyboardAwareScrollViewRef | null>(null);

  const editorAccent = useMemo(
    () => ({
      primary: seasonColors.primary,
      onPrimary: '#FFFFFF',
      deep: seasonColors.pressed,
    }),
    [seasonColors],
  );
  const { isLoggedIn, currentUserId } = useCommunityAuth();
  const submitPost = useCommunityStore(s => s.submitPost);
  const editPost = useCommunityStore(s => s.editPost);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CommunityPostCategory>('question');
  const [pickedImages, setPickedImages] = useState<PickedPhotoAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [draftRead, setDraftRead] = useState<'loading' | 'failed' | 'ready'>('loading');
  const [readAttempt, setReadAttempt] = useState(0);
  const [exitSave, setExitSave] = useState<'idle' | 'saving' | 'failed'>('idle');
  const savingExit = useRef(false);
  const mounted = useRef(false);
  const lastQueuedDraft = useRef<string | null>(null);
  const clearUnconfirmed = useRef(false);
  const autosaveWarningShown = useRef(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const resolvingDraft = useRef(false);
  const [pendingDraft, setPendingDraft] = useState<DraftPayload | null>(null);
  const [imageRestoreWarningVisible, setImageRestoreWarningVisible] =
    useState(false);
  const editorReady = draftRead === 'ready' && !pendingDraft;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (isLoggedIn) return;
    navigation.replace('SignIn');
  }, [isLoggedIn, navigation]);

  useEffect(() => {
    let active = true;
    const read = async () => {
      await pendingDraftWrite;
      for (let attempt = 0; active && attempt < 2; attempt += 1) {
        let raw: string | null;
        try {
          raw = await AsyncStorage.getItem(DRAFT_KEY);
        } catch {
          if (active && attempt === 1) setDraftRead('failed');
          continue;
        }
        if (!active) return;
        const draft = parseDraft(raw);
        setPendingDraft(draft);
        setDraftRead('ready');
        return;
      }
    };
    read();
    return () => { active = false; };
  }, [readAttempt]);

  useEffect(() => {
    flushPendingCommunityImageCleanup().catch(() => {});
  }, []);

  const hasUnsavedChanges = useMemo(
    () =>
      hasCommunityEditorDraftChanges(
        {
          title,
          content,
          category,
          hasPickedImage: pickedImages.length > 0,
        },
        {
          title: '',
          content: '',
          category: 'question',
          hasImage: false,
        },
      ),
    [category, content, pickedImages, title],
  );
  const serializedDraft = useMemo(() => hasUnsavedChanges
    ? JSON.stringify({ title, content, category, pickedImages } satisfies DraftPayload)
    : null, [category, content, hasUnsavedChanges, pickedImages, title]);

  useEffect(() => {
    if (!editorReady || lastQueuedDraft.current === serializedDraft) return;
    let current = true;
    lastQueuedDraft.current = serializedDraft;
    clearUnconfirmed.current = serializedDraft === null;
    writeDraft(serializedDraft).then(() => {
      if (!current) return;
      clearUnconfirmed.current = false;
      autosaveWarningShown.current = false;
    }, () => {
      // The exit action retries the current form, even after a failed autosave.
      if (current && !autosaveWarningShown.current) {
        autosaveWarningShown.current = true;
        showToast({ tone: 'warning', message: '글을 임시저장하지 못했어요. 나갈 때 다시 저장할게요.' });
      }
    });
    return () => { current = false; };
  }, [editorReady, serializedDraft]);

  const saveAndLeave = async () => {
    if (!editorReady || savingExit.current) return;
    savingExit.current = true;
    setExitSave('saving');
    try {
      await writeDraft(serializedDraft);
    } catch {
      if (mounted.current) setExitSave('failed');
      savingExit.current = false;
      return;
    }
    if (mounted.current) navigation.goBack();
  };

  const handleBack = useCallback(() => {
    if (submitting || savingExit.current) return;
    if (hasUnsavedChanges || clearUnconfirmed.current || lastQueuedDraft.current !== null) {
      setExitConfirmVisible(true);
      return;
    }
    navigation.goBack();
  }, [hasUnsavedChanges, navigation, submitting]);
  const renderHeaderLeft = useCallback(
    () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="작성 취소"
        accessibilityState={{ disabled: submitting }}
        style={styles.headerAction}
        onPress={handleBack}
        disabled={submitting}
      >
        <AppText
          preset="body"
          style={[
            styles.headerActionText,
            { color: theme.colors.textSecondary },
            submitting ? styles.headerDisabled : null,
          ]}
        >
          취소
        </AppText>
      </Pressable>
    ),
    [handleBack, submitting, theme.colors.textSecondary],
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
    if (!editorReady || submitting || photoPickerOpenRef.current) return;
    const remaining = Math.max(
      COMMUNITY_CREATE_PHOTO_LIMIT - pickedImages.length,
      0,
    );
    if (remaining === 0) {
      showToast({
        tone: 'info',
        message: `사진은 최대 ${COMMUNITY_CREATE_PHOTO_LIMIT}장까지 첨부할 수 있어요.`,
      });
      return;
    }
    photoPickerOpenRef.current = true;
    try {
      const result = await pickPhotoAssets({
        selectionLimit: remaining,
        quality: 0.9,
      });
      if (result.status !== 'success') return;
      const existingUris = new Set(pickedImages.map(image => image.uri));
      const appended = result.assets.filter(asset => {
        if (existingUris.has(asset.uri)) return false;
        existingUris.add(asset.uri);
        return true;
      });
      // Android may return more assets than the requested picker limit.
      if (appended.length > remaining) {
        showToast({
          tone: 'info',
          message: `사진은 최대 ${COMMUNITY_CREATE_PHOTO_LIMIT}장까지 첨부할 수 있어요. 선택 순서대로 ${remaining}장을 추가했어요.`,
        });
      }
      setPickedImages(prev =>
        [...prev, ...appended.slice(0, remaining)].slice(
          0,
          COMMUNITY_CREATE_PHOTO_LIMIT,
        ),
      );
    } catch (error: unknown) {
      const meta = getBrandedErrorMeta(error, 'image-pick');
      showToast({ tone: 'error', title: meta.title, message: meta.message });
    } finally {
      photoPickerOpenRef.current = false;
    }
  }, [editorReady, pickedImages, submitting]);

  const handleRemoveImage = useCallback((index?: number) => {
    if (index === undefined) {
      setPickedImages([]);
      return;
    }
    setPickedImages(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!editorReady || savingExit.current || submittingRef.current) return;
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

    submittingRef.current = true;
    setSubmitting(true);
    Keyboard.dismiss();
    try {
      await runCommunityCreateSubmitFlow({
        userId: currentUserId,
        title: trimmedTitle,
        content: trimmed,
        category,
        petId: null,
        petSnapshot: null,
        pickedImages,
        submitPost,
        editPost,
        onImageUploadWarning: stage => {
          showToast({
            tone: 'warning',
            title: '글은 등록됐어요',
            message: stage === 'upload'
              ? '사진을 올리지 못했어요. 게시글 수정에서 다시 첨부해 주세요.'
              : '사진 첨부를 확인하지 못했어요. 다시 첨부하기 전에 게시글의 사진을 확인해 주세요.',
          });
        },
      });

      await writeDraft(null).catch(() => {});
      navigation.goBack();
    } catch (error: unknown) {
      const meta = getCommunityMutationErrorMeta(error, 'post-create');
      showToast({
        tone: 'error',
        title: meta.title,
        message: meta.message,
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    category,
    content,
    currentUserId,
    editPost,
    editorReady,
    navigation,
    pickedImages,
    submitPost,
    title,
  ]);

  const handlePressCommunityPolicy = useCallback(() => {
    navigation.navigate('PolicyDetail', { documentId: 'community' });
  }, [navigation]);

  const disabled =
    !editorReady || submitting || title.trim().length === 0 || content.trim().length === 0;
  const renderHeaderRight = useCallback(
    () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="게시글 등록"
        accessibilityState={{ disabled, busy: submitting }}
        style={styles.headerAction}
        onPress={handleSubmit}
        disabled={disabled}
      >
        <AppText
          preset="body"
          style={[
            styles.headerActionText,
            { color: seasonColors.primary },
            disabled ? styles.headerDisabled : null,
          ]}
        >
          등록
        </AppText>
      </Pressable>
    ),
    [disabled, handleSubmit, seasonColors.primary, submitting],
  );
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '새 게시글',
      headerLeft: renderHeaderLeft,
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderLeft, renderHeaderRight]);
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: '#FFFFFF' }]}
      edges={['left', 'right']}
    >
      <View
        style={styles.screen}
        accessibilityElementsHidden={submitting}
        importantForAccessibility={submitting ? 'no-hide-descendants' : 'auto'}
      >
        <KeyboardAwareScrollView
          ref={scrollViewRef}
          bottomOffset={toolbarHeight + spacing.md}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {draftRead === 'loading' ? (
            <AppText preset="bodySm" accessibilityLiveRegion="polite">임시저장한 글을 확인하고 있어요.</AppText>
          ) : null}
          <CommunityCreateForm
            category={category}
            title={title}
            content={content}
            accentPalette={editorAccent}
            submitLoading={submitting || !editorReady || exitConfirmVisible}
            onChangeCategory={setCategory}
            onChangeTitle={setTitle}
            onChangeContent={setContent}
            onPressPolicy={handlePressCommunityPolicy}
          />
        </KeyboardAwareScrollView>
        <KeyboardStickyView>
          <Animated.View
            style={[toolbarInset, { backgroundColor: '#FFFFFF' }]}
          >
            <View
              onLayout={event =>
                setToolbarHeight(event.nativeEvent.layout.height)
              }
            >
              <CommunityCreateAttachments
                imageUris={pickedImages.map(image => image.uri)}
                submitLoading={submitting || !editorReady || exitConfirmVisible}
                onPickImage={handlePickImage}
                onRemoveImage={handleRemoveImage}
                onImageError={() => {
                  showToast({
                    tone: 'warning',
                    message:
                      '첨부 이미지를 다시 불러오지 못했어요. 이미지를 다시 선택해 주세요.',
                  });
                }}
              />
            </View>
          </Animated.View>
        </KeyboardStickyView>
      </View>
      {submitting ? (
        <CommunitySubmitProgress color={seasonColors.primary} />
      ) : null}

      <ConfirmDialog
        confirmRole="neutral"
        cancelRole="neutral"
        visible={exitConfirmVisible}
        tone="warning"
        title={getCommunityEditorExitDialogCopy('create').title}
        message={exitSave === 'failed'
          ? '입력한 글을 임시저장하지 못했어요. 다시 저장하거나 계속 작성해 주세요.'
          : getCommunityEditorExitDialogCopy('create').message}
        confirmLabel={exitSave === 'failed' ? '다시 저장' : getCommunityEditorExitDialogCopy('create').confirmLabel}
        cancelLabel={getCommunityEditorExitDialogCopy('create').cancelLabel}
        confirmLoading={exitSave === 'saving'}
        confirmDisabled={exitSave === 'saving'}
        onCancel={() => {
          if (savingExit.current) return;
          setExitSave('idle');
          setExitConfirmVisible(false);
        }}
        onConfirm={saveAndLeave}
      />
      <ConfirmDialog
        visible={draftRead === 'failed'}
        title="임시저장한 글을 확인하지 못했어요"
        message="기존 글을 덮어쓰지 않도록 작성을 잠시 멈췄어요."
        confirmLabel="다시 불러오기"
        cancelLabel="돌아가기"
        confirmRole="primary"
        cancelRole="neutral"
        onCancel={() => navigation.goBack()}
        onConfirm={() => {
          setDraftRead('loading');
          setReadAttempt(value => value + 1);
        }}
      />
      <ConfirmDialog
        confirmRole="primary"
        cancelRole="destructiveConfirm"
        visible={pendingDraft !== null && !confirmDiscard}
        title="임시저장된 글이 있어요"
        message={
          pendingDraft?.pickedImages.length
            ? '이전에 입력한 제목, 본문과 첨부한 이미지를 그대로 이어서 작성할까요?'
            : '이전에 입력한 제목과 본문을 그대로 이어서 작성할까요?'
        }
        cancelLabel="버리기"
        confirmLabel="이어쓰기"
        tone="default"
        onCancel={() => {
          if (!resolvingDraft.current) setConfirmDiscard(true);
        }}
        onConfirm={() => {
          if (resolvingDraft.current || !pendingDraft) return;

          resolvingDraft.current = true;
          setTitle(pendingDraft.title);
          setContent(pendingDraft.content);
          setCategory(pendingDraft.category);

          validateRestoredPickedImages(pendingDraft.pickedImages)
            .then(restoredImages => {
              if (!mounted.current) return;
              setPickedImages(restoredImages);
              if (
                pendingDraft.pickedImages.length > 0 &&
                restoredImages.length !== pendingDraft.pickedImages.length
              ) {
                setImageRestoreWarningVisible(true);
              }
            })
            .finally(() => {
              resolvingDraft.current = false;
              if (!mounted.current) return;
              setPendingDraft(null);
            });
        }}
      />
      <ConfirmDialog
        visible={confirmDiscard}
        title="이전 글을 버릴까요?"
        message="임시저장한 글을 지우고 새 글을 작성해요."
        confirmLabel="버리기"
        cancelLabel="돌아가기"
        confirmRole="destructiveConfirm"
        cancelRole="neutral"
        onCancel={() => {
          if (!resolvingDraft.current) setConfirmDiscard(false);
        }}
        onConfirm={async () => {
          if (resolvingDraft.current) return;
          resolvingDraft.current = true;
          try {
            await writeDraft(null);
          } catch {
            if (mounted.current) showToast({ tone: 'error', message: '임시저장한 글을 지우지 못했어요.' });
            return;
          } finally {
            resolvingDraft.current = false;
          }
          if (!mounted.current) return;
          setConfirmDiscard(false);
          setPendingDraft(null);
        }}
      />
      <ConfirmDialog
        confirmRole="primary"
        cancelRole="neutral"
        visible={imageRestoreWarningVisible}
        tone="warning"
        title="첨부 이미지를 다시 불러오지 못했어요"
        message={
          '기기에 남아 있는 본문과 설정만 먼저 복원했어요.\n이미지는 다시 선택해 주세요.'
        }
        confirmLabel="확인"
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
    paddingBottom: spacing.md,
    gap: 12,
    flexGrow: 1,
  },
  headerAction: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 4,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerActionText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  headerDisabled: { opacity: 0.45 },
};
