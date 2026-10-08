import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import type { CtaRole } from '../../app/theme/ctaPalette';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  StackActions,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useStore } from 'zustand';
import { useDiscussionField, useDiscussionSession } from './discussionSession';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAvoidingView as KeyboardControllerAvoidingView } from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';
import { useKeyboardBottomPadding } from '../../hooks/useKeyboardBottomPadding';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '../../components/icons/NuriFeatherIcon';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { TIMELINE_SEASON_COLORS } from '../../theme/seasonal/timeline';
import PostImageGallery from '../../components/community/PostImageGallery';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PremiumNoticeModal from '../../components/common/PremiumNoticeModal';
import { useCommunityAuth } from '../../hooks/useCommunityAuth';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { getErrorMessage } from '../../services/app/errors';
import { getCommunityMutationErrorMeta } from '../../services/community/errors';
import {
  blockCommunityUser,
  getCommunityBlockErrorMessage,
} from '../../services/supabase/communityBlocks';
import { useCommunityStore } from '../../store/communityStore';
import { showToast } from '../../store/uiStore';
import type { CommunityReportReasonCategory } from '../../types/community';
import { getKstDateParts } from '../../utils/date';
import { scheduleIdleTask } from '../../utils/scheduleIdleTask';
import CommentThreadItem from './components/CommentThreadItem';
import { useCommunityReadStore } from '../../store/communityReadStore';
import CommunityCommentComposer from './components/CommunityCommentComposer';
import { getCommunityCategoryLabel } from './communityListPresentation';
import {
  COMMUNITY_COMMENT_SORT_OPTIONS,
  getCommunityCommentSortLabel,
  getCommunityReplyCreateTarget,
  getCommunityReplyThreadRootId,
  areCommunityRepliesExpanded,
  resolveCommunityCommentNavigationTarget,
  toggleCommunityReplyExpansion,
  type CommunityCommentSort,
} from './utils/commentHelpers';
import {
  canShowCommunityBlockAction,
  COMMUNITY_BLOCK_CONFIRMATION_MESSAGE,
} from './communityBlockPresentation';
import { DETAIL_DIVIDER_COLOR, styles } from './CommunityDetailScreen.styles';
const INLINE_REVEAL_BOTTOM_MARGIN = 24;

type Nav = NativeStackNavigationProp<RootStackParamList, 'CommunityDetail'>;
type Route =
  | RootScreenRoute<'CommunityDetail'>
  | RootScreenRoute<'CommunityComments'>;
type ReportNotice = 'submitted' | 'duplicate';
const REPORT_REASON_OPTIONS: Array<{
  key: CommunityReportReasonCategory;
  label: string;
}> = [
  { key: 'spam', label: '스팸/도배' },
  { key: 'hate', label: '혐오 발언/욕설' },
  { key: 'advertising', label: '광고/홍보' },
  { key: 'misinformation', label: '잘못된 정보' },
  { key: 'personal_info', label: '개인정보 노출' },
  { key: 'other', label: '기타' },
];

function formatDetailMetaDate(input: string) {
  const parts = getKstDateParts(input);
  if (!parts) return '';
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}.${month}.${day}`;
}

export default function CommunityDiscussionContent({
  mode,
}: {
  mode: 'post' | 'comments';
}) {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const safeContentRef = useRef<React.ComponentRef<typeof View> | null>(null);
  const [contentWindowY, setContentWindowY] = useState(0);
  const measureContentWindow = useCallback(() => {
    safeContentRef.current?.measureInWindow((_x, y) => {
      if (Number.isFinite(y) && y >= 0) setContentWindowY(y);
    });
  }, []);
  const reportBottomPaddingStyle = useKeyboardBottomPadding(
    Math.max(insets.bottom, 16) + 8,
  );
  const theme = useTheme();
  const season = useEffectiveSeason();
  const moreAccent = TIMELINE_SEASON_COLORS[season].selectedCategory;
  const flatListRef = useRef<FlatList<string> | null>(null);
  const commentInputRef = useRef<React.ComponentRef<typeof TextInput> | null>(
    null,
  );
  const inlineComposerRef = useRef<React.ComponentRef<typeof View> | null>(
    null,
  );
  const currentScrollOffsetRef = useRef(0);
  const preparedNavigationTargetKeyRef = useRef<string | null>(null);
  const measuredNavigationTargetKeyRef = useRef<string | null>(null);
  const missingNavigationTargetKeyRef = useRef<string | null>(null);
  const targetScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const inlineKeyboardShowSubscriptionRef = useRef<{
    remove: () => void;
  } | null>(null);
  const inlineRevealTargetRef = useRef<string | null>(null);
  const inlineInteractionGenerationRef = useRef(0);
  const inlineFocusRequestRef = useRef<{
    targetId: string;
    generation: number;
    forceRefocus: boolean;
  } | null>(null);
  const inlineFocusIntentRef = useRef<{
    targetId: string;
    instanceId: number;
    generation: number;
  } | null>(null);
  const inlineMountedComposerRef = useRef<{
    targetId: string;
    instanceId: number;
  } | null>(null);
  const focusedInlineInteractionGenerationRef = useRef<number | null>(null);
  const inlineLayoutReadyTargetRef = useRef<string | null>(null);
  const isCommentListDraggingRef = useRef(false);
  const keyboardVisibleRef = useRef(false);
  const keyboardInsetRef = useRef(0);
  const { height: windowHeight } = useWindowDimensions();
  const keyboardInset = useKeyboardInset();
  const closedBottomInset = insets.bottom;
  keyboardInsetRef.current = keyboardInset;
  const commentLikeDebounceTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  const cancelPendingNavigationScroll = useCallback(() => {
    if (targetScrollTimerRef.current) {
      clearTimeout(targetScrollTimerRef.current);
      targetScrollTimerRef.current = null;
    }
  }, []);

  const cancelPendingInlineReveal = useCallback(
    (preserveMountedLayout = false) => {
      inlineInteractionGenerationRef.current += 1;
      inlineFocusRequestRef.current = null;
      inlineFocusIntentRef.current = null;
      focusedInlineInteractionGenerationRef.current = null;
      if (!preserveMountedLayout) {
        inlineMountedComposerRef.current = null;
        inlineLayoutReadyTargetRef.current = null;
      }
      inlineKeyboardShowSubscriptionRef.current?.remove();
      inlineKeyboardShowSubscriptionRef.current = null;
      inlineRevealTargetRef.current = null;
      return inlineInteractionGenerationRef.current;
    },
    [],
  );

  const { currentUserId, requireLogin } = useCommunityAuth();

  const postId = route.params.postId;
  const sessionId = route.params.discussionSessionId ?? route.key;
  const session = useDiscussionSession(currentUserId, postId, sessionId);
  const discussion = useStore(session.store);
  const commentSubmitInFlightRef = session.submitLock;
  const commentDraftRef = session.draft;
  const initialContentOffset = useRef({ x: 0, y: session.offsets[mode] });
  const notificationCommentId = route.params.commentId ?? null;
  const restoredFromRouteSnapshot =
    route.params.restoredFromRouteSnapshot === true;
  const post = useCommunityStore(s => s.postsById[postId] ?? null);
  const topLevelCommentIds =
    mode === 'post' ? discussion.previewIds : discussion.threads.ids;
  const commentEntitiesById = useCommunityStore(s => s.commentEntitiesById);
  const detailStatus = useCommunityStore(
    s => s.detailStatusByPostId[postId] ?? 'idle',
  );
  const commentsStatus =
    mode === 'post' ? discussion.summaryStatus : discussion.threadStatus;
  const notificationTargetComment = useCommunityStore(
    useCallback(
      state =>
        notificationCommentId
          ? state.commentEntitiesById[notificationCommentId] ?? null
          : null,
      [notificationCommentId],
    ),
  );
  const fetchPostDetail = useCommunityStore(s => s.fetchPostDetail);
  const recordPostView = useCommunityStore(s => s.recordPostView);
  const fetchPostComments = useCallback(
    async (_postId: string) => {
      await session.refresh(mode);
    },
    [mode, session],
  );
  const removePost = useCommunityStore(s => s.removePost);
  const togglePostLike = useCommunityStore(s => s.togglePostLike);
  const toggleCommentLike = useCommunityStore(s => s.toggleCommentLike);
  const submitComment = useCommunityStore(s => s.submitComment);
  const removeComment = useCommunityStore(s => s.removeComment);
  const reportContent = useCommunityStore(s => s.reportContent);
  const invalidateCommunityVisibility = useCommunityStore(
    s => s.invalidateCommunityVisibility,
  );
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [detailReloadKey, setDetailReloadKey] = React.useState(0);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [blockConfirmVisible, setBlockConfirmVisible] = React.useState(false);
  const [blocking, setBlocking] = React.useState(false);
  const [commentSubmitting, setCommentSubmitting] = useDiscussionField(
    session,
    'submitting',
  );
  const [commentDraftResetKey, setCommentDraftResetKey] = useDiscussionField(
    session,
    'draftResetKey',
  );
  const [commentSort] = useDiscussionField(session, 'sort');
  const [commentSortModalVisible, setCommentSortModalVisible] =
    React.useState(false);
  const [highlightedCommentId, setHighlightedCommentId] = useDiscussionField(
    session,
    'selectedId',
  );
  const [replyTargetId, setReplyTargetId] = useDiscussionField(
    session,
    'replyTargetId',
  );
  const [expandedRepliesByCommentId, setExpandedRepliesByCommentId] =
    useDiscussionField(session, 'expanded');
  const [commentDeleteTargetId, setCommentDeleteTargetId] = React.useState<
    string | null
  >(null);
  const [reportTarget, setReportTarget] = React.useState<{
    targetType: 'post' | 'comment';
    targetId: string;
  } | null>(null);
  const [reportReasonCategory, setReportReasonCategory] =
    React.useState<CommunityReportReasonCategory>('spam');
  const [reportReason, setReportReason] = React.useState('');
  const [reportSubmitting, setReportSubmitting] = React.useState(false);
  const [reportNotice, setReportNotice] = React.useState<ReportNotice | null>(
    null,
  );
  const replyTarget = useCommunityStore(
    useCallback(
      s =>
        replyTargetId !== null
          ? s.commentEntitiesById[replyTargetId] ?? null
          : null,
      [replyTargetId],
    ),
  );

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      keyboardVisibleRef.current = true;
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardVisibleRef.current = false;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDetail = async () => {
      const reuseProtectedDetail =
        useCommunityStore.getState().detailStatusByPostId[postId] === 'ready' &&
        session.store.getState().summaryStatus === 'ready';
      if (!reuseProtectedDetail) {
        await fetchPostDetail(postId);
      }
      if (cancelled) return;

      // Comments are content-bearing and may only start after the protected
      // detail RPC has established that this post is visible to the viewer.
      const state = useCommunityStore.getState();
      if (
        state.detailStatusByPostId[postId] === 'ready' &&
        state.postsById[postId]
      ) {
        await session.summary(!reuseProtectedDetail);
        if (mode === 'comments')
          await session.threads(
            null,
            notificationCommentId,
            !!notificationCommentId,
          );
      }
    };

    loadDetail().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    detailReloadKey,
    fetchPostDetail,
    mode,
    notificationCommentId,
    postId,
    session,
  ]);

  useEffect(() => {
    if (!restoredFromRouteSnapshot || detailStatus !== 'not_found') {
      return undefined;
    }

    const task = scheduleIdleTask(() => {
      navigation.goBack();
    });

    return () => {
      task.cancel();
    };
  }, [detailStatus, navigation, restoredFromRouteSnapshot]);

  useEffect(() => {
    if (!post || detailStatus !== 'ready') return;
    if (session.viewAttempted.current) return;

    session.viewAttempted.current = true;
    recordPostView(postId).catch(() => {});
  }, [detailStatus, post, postId, recordPostView, session]);

  useEffect(() => {
    if (mode !== 'post' || !isFocused || !post || detailStatus !== 'ready')
      return;
    // The protected load effect may already have invalidated a cached ready
    // render. Do not mark a failed/loading detail merely because it was tapped.
    if (useCommunityStore.getState().detailStatusByPostId[postId] !== 'ready')
      return;
    useCommunityReadStore.getState().markRead(currentUserId, postId);
  }, [currentUserId, detailStatus, isFocused, mode, post, postId]);

  useEffect(() => {
    setCommentSortModalVisible(false);
    cancelPendingInlineReveal();
    cancelPendingNavigationScroll();
    preparedNavigationTargetKeyRef.current = null;
    measuredNavigationTargetKeyRef.current = null;
    missingNavigationTargetKeyRef.current = null;
  }, [
    cancelPendingInlineReveal,
    cancelPendingNavigationScroll,
    notificationCommentId,
    postId,
  ]);

  const sortedTopLevelCommentIds = topLevelCommentIds;

  const commentNavigationTarget = useMemo(() => {
    if (!notificationCommentId || !notificationTargetComment) return null;
    return resolveCommunityCommentNavigationTarget(
      notificationCommentId,
      { [notificationCommentId]: notificationTargetComment },
      sortedTopLevelCommentIds,
    );
  }, [
    notificationCommentId,
    notificationTargetComment,
    sortedTopLevelCommentIds,
  ]);

  useEffect(() => {
    if (!notificationCommentId || commentsStatus !== 'ready') return undefined;

    const targetKey = `${postId}:${notificationCommentId}:${commentSort}`;
    if (!commentNavigationTarget) {
      if (missingNavigationTargetKeyRef.current !== targetKey) {
        missingNavigationTargetKeyRef.current = targetKey;
        showToast({
          tone: 'warning',
          message: '댓글이 삭제되었거나 숨겨져 있어 게시글만 열었어요.',
        });
      }
      return undefined;
    }
    if (preparedNavigationTargetKeyRef.current === targetKey) return undefined;
    preparedNavigationTargetKeyRef.current = targetKey;

    if (commentNavigationTarget.isReply) {
      setExpandedRepliesByCommentId(previous => ({
        ...previous,
        [commentNavigationTarget.threadCommentId]: true,
      }));
    }
    setHighlightedCommentId(notificationCommentId);

    const task = scheduleIdleTask(() => {
      targetScrollTimerRef.current = setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: commentNavigationTarget.threadIndex,
          animated: true,
          viewPosition: 0.2,
        });
      }, 120);
    });

    return () => {
      task.cancel();
    };
  }, [
    commentNavigationTarget,
    commentSort,
    commentsStatus,
    notificationCommentId,
    postId,
    setExpandedRepliesByCommentId,
    setHighlightedCommentId,
  ]);

  const handleTargetCommentReady = useCallback(
    (target: React.ComponentRef<typeof View> | null) => {
      if (!target || !notificationCommentId || !commentNavigationTarget) return;

      const targetKey = `${postId}:${notificationCommentId}:${commentSort}`;
      if (measuredNavigationTargetKeyRef.current === targetKey) return;
      measuredNavigationTargetKeyRef.current = targetKey;

      targetScrollTimerRef.current = setTimeout(() => {
        target.measureInWindow((_x, y) => {
          const desiredTop = Math.max(insets.top + 88, 96);
          const delta = y - desiredTop;
          if (Number.isFinite(delta) && Math.abs(delta) > 8) {
            flatListRef.current?.scrollToOffset({
              offset: Math.max(currentScrollOffsetRef.current + delta, 0),
              animated: true,
            });
          }
        });
      }, 420);
    },
    [
      commentNavigationTarget,
      commentSort,
      insets.top,
      notificationCommentId,
      postId,
    ],
  );

  useEffect(
    () => () => {
      Object.values(commentLikeDebounceTimersRef.current).forEach(timer => {
        clearTimeout(timer);
      });
      if (targetScrollTimerRef.current) {
        clearTimeout(targetScrollTimerRef.current);
        targetScrollTimerRef.current = null;
      }
      inlineInteractionGenerationRef.current += 1;
      inlineFocusRequestRef.current = null;
      inlineFocusIntentRef.current = null;
      focusedInlineInteractionGenerationRef.current = null;
      inlineMountedComposerRef.current = null;
      inlineLayoutReadyTargetRef.current = null;
      inlineKeyboardShowSubscriptionRef.current?.remove();
      inlineKeyboardShowSubscriptionRef.current = null;
      inlineRevealTargetRef.current = null;
      commentLikeDebounceTimersRef.current = {};
    },
    [],
  );

  useEffect(() => {
    if (typeof navigation.addListener !== 'function') return undefined;
    const unsubscribe = navigation.addListener('blur', () => {
      // A navigation blur can leave the screen mounted. Keep the selected
      // inline composer mounted/layout-ready so returning to the same target
      // can refocus it without rebuilding the interaction state.
      cancelPendingInlineReveal(true);
      cancelPendingNavigationScroll();
    });
    return unsubscribe;
  }, [cancelPendingInlineReveal, cancelPendingNavigationScroll, navigation]);

  const handleBack = useCallback(() => {
    cancelPendingInlineReveal();
    cancelPendingNavigationScroll();
    navigation.goBack();
  }, [cancelPendingInlineReveal, cancelPendingNavigationScroll, navigation]);

  const openComments = useCallback(
    (commentId?: string) => {
      cancelPendingInlineReveal(true);
      cancelPendingNavigationScroll();
      Keyboard.dismiss();
      if (commentId) {
        setHighlightedCommentId(commentId);
        const rootId =
          commentEntitiesById[commentId]?.parentCommentId ?? commentId;
        setExpandedRepliesByCommentId(previous => ({
          ...previous,
          [rootId]: true,
        }));
      }
      navigation.navigate('CommunityComments', {
        postId,
        commentId,
        discussionSessionId: sessionId,
        postRouteKey: route.key,
      });
    },
    [
      cancelPendingInlineReveal,
      cancelPendingNavigationScroll,
      navigation,
      postId,
      route.key,
      sessionId,
      setHighlightedCommentId,
      setExpandedRepliesByCommentId,
      commentEntitiesById,
    ],
  );

  const goToPost = useCallback(() => {
    cancelPendingInlineReveal(true);
    cancelPendingNavigationScroll();
    Keyboard.dismiss();
    session.offsets.post = 0;
    session.bodyRequest.current = true;
    const routes = navigation.getState().routes;
    const parentKey =
      route.name === 'CommunityComments'
        ? route.params.postRouteKey
        : undefined;
    const index = routes.findIndex(
      item => item.key === parentKey && item.name === 'CommunityDetail',
    );
    if (index >= 0)
      navigation.dispatch(StackActions.pop(routes.length - 1 - index));
    else
      navigation.replace('CommunityDetail', {
        postId,
        discussionSessionId: sessionId,
      });
  }, [
    cancelPendingInlineReveal,
    cancelPendingNavigationScroll,
    navigation,
    postId,
    route,
    session,
    sessionId,
  ]);

  useEffect(() => {
    if (!isFocused || mode !== 'post' || !session.bodyRequest.current) return;
    session.bodyRequest.current = false;
    currentScrollOffsetRef.current = 0;
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [isFocused, mode, session]);

  const isMyPost = !!post && !!currentUserId && post.authorId === currentUserId;
  const canShowCommentComposer =
    !!post &&
    detailStatus !== 'deleted' &&
    detailStatus !== 'moderated' &&
    detailStatus !== 'not_found';
  const postMetaDate = useMemo(() => {
    if (!post) return '';
    return formatDetailMetaDate(post.createdAt);
  }, [post]);
  const renderHeaderLeft = useCallback(
    () => (
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.backButton}
        onPress={handleBack}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    ),
    [handleBack, theme.colors.textPrimary],
  );
  const renderHeaderRight = useCallback(
    () =>
      mode === 'comments' ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="게시글 본문으로 가기"
          onPress={goToPost}
          style={styles.bodyButton}
        >
          <AppText
            style={{
              color: theme.colors.textSecondary,
              fontSize: 13,
              fontWeight: '600',
            }}
          >
            본문 가기
          </AppText>
        </TouchableOpacity>
      ) : post ? (
        <TouchableOpacity
          testID="community-detail-more"
          accessibilityRole="button"
          accessibilityLabel="게시글 더보기"
          activeOpacity={0.88}
          style={styles.moreButton}
          onPress={() => {
            cancelPendingInlineReveal(true);
            cancelPendingNavigationScroll();
            Keyboard.dismiss();
            setMenuVisible(true);
          }}
        >
          <NuriSemanticIcon
            family="feather"
            preserveOriginal
            name="more-horizontal"
            size={22}
            color={moreAccent}
          />
        </TouchableOpacity>
      ) : null,
    [
      cancelPendingInlineReveal,
      cancelPendingNavigationScroll,
      moreAccent,
      mode,
      goToPost,
      post,
      theme.colors.textSecondary,
    ],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle:
        mode === 'comments'
          ? `댓글${
              discussion.total === null
                ? ''
                : `(${discussion.total.toLocaleString()})`
            }`
          : '커뮤니티',
      headerLeft: renderHeaderLeft,
      headerRight: renderHeaderRight,
    });
  }, [discussion.total, mode, navigation, renderHeaderLeft, renderHeaderRight]);

  const handlePressLike = useCallback(() => {
    requireLogin(() => {
      if (!post || !currentUserId) return;
      togglePostLike(post.id, currentUserId).catch(error => {
        showToast({
          tone: 'error',
          message: getErrorMessage(error) || '좋아요 처리에 실패했어요.',
        });
      });
    });
  }, [currentUserId, post, requireLogin, togglePostLike]);

  const handleConfirmBlock = useCallback(() => {
    const blockedUserId = post?.authorId ?? null;
    if (
      !canShowCommunityBlockAction(blockedUserId, currentUserId) ||
      blocking
    ) {
      return;
    }

    setBlocking(true);
    blockCommunityUser(blockedUserId)
      .then(async () => {
        setBlockConfirmVisible(false);
        setMenuVisible(false);
        await invalidateCommunityVisibility(blockedUserId);
        showToast({ tone: 'success', message: '사용자를 차단했어요.' });
        navigation.goBack();
      })
      .catch(error => {
        showToast({
          tone: 'error',
          message: getCommunityBlockErrorMessage(error),
        });
      })
      .finally(() => {
        setBlocking(false);
      });
  }, [
    blocking,
    currentUserId,
    invalidateCommunityVisibility,
    navigation,
    post,
  ]);

  const handleSubmitComment = useCallback(
    (draft: string) => {
      requireLogin(() => {
        if (!currentUserId || commentSubmitInFlightRef.current) return;
        const trimmed = draft.trim();
        if (!trimmed) {
          showToast({ tone: 'warning', message: '댓글 내용을 입력해 주세요.' });
          return;
        }

        // Lock synchronously: two taps before React renders must not issue two writes.
        commentSubmitInFlightRef.current = true;
        setCommentSubmitting(true);
        const replyCreateTarget = getCommunityReplyCreateTarget(replyTarget);
        submitComment(
          postId,
          trimmed,
          replyCreateTarget.parentCommentId,
          replyCreateTarget.replyToCommentId,
        )
          .then(() => {
            cancelPendingInlineReveal();
            Keyboard.dismiss();
            commentDraftRef.current = '';
            session.selection.current = undefined;
            setCommentDraftResetKey(previous => previous + 1);
            const parentCommentId = replyCreateTarget.parentCommentId;
            if (parentCommentId) {
              setExpandedRepliesByCommentId(previous => ({
                ...previous,
                [parentCommentId]: true,
              }));
            }
            setReplyTargetId(null);
            session.refresh(mode);
          })
          .catch(error => {
            const meta = getCommunityMutationErrorMeta(error, 'comment-create');
            showToast({
              tone: 'error',
              title: meta.title,
              message: meta.message,
            });
          })
          .finally(() => {
            commentSubmitInFlightRef.current = false;
            setCommentSubmitting(false);
          });
      });
    },
    [
      currentUserId,
      cancelPendingInlineReveal,
      postId,
      replyTarget,
      requireLogin,
      submitComment,
      commentDraftRef,
      commentSubmitInFlightRef,
      mode,
      session,
      setExpandedRepliesByCommentId,
      setReplyTargetId,
      setCommentSubmitting,
      setCommentDraftResetKey,
    ],
  );

  const revealInlineComposer = useCallback(
    (targetId: string | null, interactionGeneration: number) => {
      if (
        targetId === null ||
        isCommentListDraggingRef.current ||
        inlineRevealTargetRef.current === targetId ||
        inlineInteractionGenerationRef.current !== interactionGeneration ||
        inlineLayoutReadyTargetRef.current !== targetId
      ) {
        return;
      }

      inlineRevealTargetRef.current = targetId;
      let hasMeasuredForInteraction = false;

      // Reveal only the obscured delta for the selected row. There is no
      // delayed retry loop: a drag cancels this pending reveal, and a target
      // receives at most one keyboard-driven adjustment.
      const measureAndReveal = (
        reportedKeyboardHeight = 0,
        reportedKeyboardTop = 0,
      ) => {
        if (
          isCommentListDraggingRef.current ||
          inlineRevealTargetRef.current !== targetId ||
          inlineInteractionGenerationRef.current !== interactionGeneration ||
          inlineLayoutReadyTargetRef.current !== targetId
        ) {
          return;
        }
        if (hasMeasuredForInteraction) return;

        const keyboardHeight = Math.max(
          reportedKeyboardHeight,
          Keyboard.metrics()?.height ?? 0,
          keyboardInsetRef.current,
        );
        if (keyboardHeight <= 0) return;
        hasMeasuredForInteraction = true;

        inlineKeyboardShowSubscriptionRef.current?.remove();
        inlineKeyboardShowSubscriptionRef.current = null;

        const keyboardMetrics = Keyboard.metrics();
        const keyboardTop =
          reportedKeyboardTop > 0
            ? reportedKeyboardTop
            : keyboardMetrics?.screenY ?? 0;
        const visibleBottom =
          keyboardTop > 0
            ? keyboardTop - INLINE_REVEAL_BOTTOM_MARGIN
            : windowHeight - keyboardHeight - INLINE_REVEAL_BOTTOM_MARGIN;
        inlineComposerRef.current?.measureInWindow((_x, y, _width, height) => {
          if (
            isCommentListDraggingRef.current ||
            inlineRevealTargetRef.current !== targetId ||
            inlineInteractionGenerationRef.current !== interactionGeneration ||
            inlineLayoutReadyTargetRef.current !== targetId
          ) {
            return;
          }
          const obscuredDelta = y + height - visibleBottom;
          if (Number.isFinite(obscuredDelta) && obscuredDelta > 0) {
            const nextOffset = Math.max(
              currentScrollOffsetRef.current + obscuredDelta,
              0,
            );
            flatListRef.current?.scrollToOffset({
              offset: nextOffset,
              animated: false,
            });
          }
        });
      };

      inlineKeyboardShowSubscriptionRef.current = Keyboard.addListener(
        'keyboardDidShow',
        event => {
          measureAndReveal(
            event.endCoordinates.height,
            event.endCoordinates.screenY,
          );
        },
      );
      measureAndReveal();
    },
    [windowHeight],
  );

  const focusMountedComposer = useCallback(
    (targetId: string, interactionGeneration: number, forceRefocus = false) => {
      if (
        isCommentListDraggingRef.current ||
        inlineInteractionGenerationRef.current !== interactionGeneration ||
        inlineLayoutReadyTargetRef.current !== targetId ||
        focusedInlineInteractionGenerationRef.current === interactionGeneration
      ) {
        return;
      }

      inlineFocusRequestRef.current = null;
      focusedInlineInteractionGenerationRef.current = interactionGeneration;
      const mountedComposer = inlineMountedComposerRef.current;
      if (
        mountedComposer?.targetId !== targetId ||
        inlineLayoutReadyTargetRef.current !== targetId
      ) {
        return;
      }
      inlineFocusIntentRef.current = {
        targetId,
        instanceId: mountedComposer.instanceId,
        generation: interactionGeneration,
      };

      // Android can keep the TextInput marked as focused after Back hides the
      // IME. React Native intentionally no-ops focus() for that same native
      // field, so explicitly blur once before the single refocus attempt.
      if (forceRefocus) {
        commentInputRef.current?.blur();
        requestAnimationFrame(() => {
          if (
            isCommentListDraggingRef.current ||
            inlineInteractionGenerationRef.current !== interactionGeneration ||
            inlineLayoutReadyTargetRef.current !== targetId
          ) {
            return;
          }
          commentInputRef.current?.focus();
          revealInlineComposer(targetId, interactionGeneration);
        });
        return;
      }

      commentInputRef.current?.focus();
      revealInlineComposer(targetId, interactionGeneration);
    },
    [revealInlineComposer],
  );

  const handleInlineComposerMounted = useCallback(
    (targetId: string, instanceId: number) => {
      const previous = inlineMountedComposerRef.current;
      if (previous?.instanceId === instanceId) return;

      inlineMountedComposerRef.current = { targetId, instanceId };
      inlineLayoutReadyTargetRef.current = null;
    },
    [],
  );

  const handleInlineInputFocus = useCallback(
    (targetId: string, instanceId: number) => {
      const focusIntent = inlineFocusIntentRef.current;
      if (
        isCommentListDraggingRef.current ||
        inlineLayoutReadyTargetRef.current !== targetId ||
        inlineMountedComposerRef.current?.targetId !== targetId ||
        inlineMountedComposerRef.current.instanceId !== instanceId ||
        focusIntent?.targetId !== targetId ||
        focusIntent.instanceId !== instanceId ||
        focusIntent.generation !== inlineInteractionGenerationRef.current
      ) {
        return;
      }
      inlineFocusIntentRef.current = null;
      revealInlineComposer(targetId, inlineInteractionGenerationRef.current);
    },
    [revealInlineComposer],
  );

  const focusCommentComposer = useCallback(
    (targetId: string, forceRefocus = false) => {
      if (isCommentListDraggingRef.current) return;
      const preserveMountedLayout =
        inlineMountedComposerRef.current?.targetId === targetId;
      const interactionGeneration = cancelPendingInlineReveal(
        preserveMountedLayout,
      );
      inlineFocusRequestRef.current = {
        targetId,
        generation: interactionGeneration,
        forceRefocus,
      };
      requestAnimationFrame(() => {
        if (
          isCommentListDraggingRef.current ||
          inlineInteractionGenerationRef.current !== interactionGeneration ||
          inlineLayoutReadyTargetRef.current !== targetId
        ) {
          return;
        }
        focusMountedComposer(targetId, interactionGeneration, forceRefocus);
      });
    },
    [cancelPendingInlineReveal, focusMountedComposer],
  );

  const handleInlineInputPressIn = useCallback(
    (targetId: string, instanceId: number) => {
      if (
        isCommentListDraggingRef.current ||
        inlineMountedComposerRef.current?.targetId !== targetId ||
        inlineMountedComposerRef.current.instanceId !== instanceId ||
        inlineLayoutReadyTargetRef.current !== targetId
      ) {
        return;
      }

      const keyboardIsVisible =
        keyboardVisibleRef.current ||
        keyboardInsetRef.current > 0 ||
        (Keyboard.metrics()?.height ?? 0) > 0;
      if (keyboardIsVisible) return;

      const inputIsFocused = commentInputRef.current?.isFocused?.() ?? false;
      if (inputIsFocused) {
        focusCommentComposer(targetId, true);
        return;
      }

      inlineFocusIntentRef.current = {
        targetId,
        instanceId,
        generation: inlineInteractionGenerationRef.current,
      };
    },
    [focusCommentComposer],
  );

  const handleInlineLayoutReady = useCallback(
    (targetId: string, instanceId: number) => {
      if (
        inlineMountedComposerRef.current?.targetId !== targetId ||
        inlineMountedComposerRef.current.instanceId !== instanceId
      ) {
        return;
      }
      inlineLayoutReadyTargetRef.current = targetId;
      const request = inlineFocusRequestRef.current;
      if (
        request?.targetId === targetId &&
        request.generation === inlineInteractionGenerationRef.current
      ) {
        focusMountedComposer(
          targetId,
          request.generation,
          request.forceRefocus,
        );
      }
    },
    [focusMountedComposer],
  );

  const handlePressComment = useCallback(
    (commentId: string) => {
      setHighlightedCommentId(commentId);
      const keyboardIsVisible =
        keyboardVisibleRef.current ||
        keyboardInsetRef.current > 0 ||
        (Keyboard.metrics()?.height ?? 0) > 0;
      const inputIsFocused = commentInputRef.current?.isFocused?.() ?? false;
      if (replyTargetId === commentId && inputIsFocused && keyboardIsVisible) {
        return;
      }
      const forceRefocus =
        replyTargetId === commentId && inputIsFocused && !keyboardIsVisible;
      cancelPendingNavigationScroll();
      isCommentListDraggingRef.current = false;
      const selectedComment = commentEntitiesById[commentId] ?? null;
      const threadRootId = getCommunityReplyThreadRootId(selectedComment);
      if (
        threadRootId !== null &&
        !areCommunityRepliesExpanded(expandedRepliesByCommentId, threadRootId)
      ) {
        setExpandedRepliesByCommentId(previous => ({
          ...previous,
          [threadRootId]: true,
        }));
      }
      setReplyTargetId(commentId);
      focusCommentComposer(commentId, forceRefocus);
    },
    [
      cancelPendingNavigationScroll,
      commentEntitiesById,
      expandedRepliesByCommentId,
      focusCommentComposer,
      keyboardInsetRef,
      replyTargetId,
      setExpandedRepliesByCommentId,
      setHighlightedCommentId,
      setReplyTargetId,
    ],
  );

  const handleCancelReply = useCallback(() => {
    cancelPendingInlineReveal();
    Keyboard.dismiss();
    setReplyTargetId(null);
  }, [cancelPendingInlineReveal, setReplyTargetId]);

  const handleToggleCommentLike = useCallback(
    (commentId: string) => {
      requireLogin(() => {
        if (!currentUserId) return;
        if (commentLikeDebounceTimersRef.current[commentId]) return;
        toggleCommentLike(commentId, postId, currentUserId).catch(error => {
          showToast({
            tone: 'error',
            message: getErrorMessage(error) || '댓글 좋아요 처리에 실패했어요.',
          });
        });
        commentLikeDebounceTimersRef.current[commentId] = setTimeout(() => {
          delete commentLikeDebounceTimersRef.current[commentId];
        }, 300);
      });
    },
    [currentUserId, postId, requireLogin, toggleCommentLike],
  );

  const handleRequestDeleteComment = useCallback(
    (commentId: string) => {
      // The delete confirmation overlays the active composer. Keep the
      // mounted target/layout registration so cancelling the modal can
      // refocus the same row without requiring a remount.
      cancelPendingInlineReveal(true);
      cancelPendingNavigationScroll();
      Keyboard.dismiss();
      setCommentDeleteTargetId(commentId);
    },
    [cancelPendingInlineReveal, cancelPendingNavigationScroll],
  );

  const handleRequestReportComment = useCallback(
    (commentId: string) => {
      // Reporting is also an overlay-only transition. Preserve the active
      // inline composer readiness until the report sheet is cancelled.
      cancelPendingInlineReveal(true);
      cancelPendingNavigationScroll();
      Keyboard.dismiss();
      setReportTarget({
        targetType: 'comment',
        targetId: commentId,
      });
      setReportReason('');
      setReportReasonCategory('spam');
    },
    [cancelPendingInlineReveal, cancelPendingNavigationScroll],
  );

  const closeReportModal = useCallback(() => {
    if (reportSubmitting) return;
    Keyboard.dismiss();
    setReportTarget(null);
  }, [reportSubmitting]);

  const handleToggleReplies = useCallback(
    (commentId: string) => {
      const willCollapse = areCommunityRepliesExpanded(
        expandedRepliesByCommentId,
        commentId,
      );
      const activeTargetBelongsToThread =
        replyTargetId === commentId ||
        replyTarget?.parentCommentId === commentId;

      if (willCollapse && activeTargetBelongsToThread) {
        handleCancelReply();
      }

      setExpandedRepliesByCommentId(prev =>
        toggleCommunityReplyExpansion(prev, commentId),
      );
    },
    [
      expandedRepliesByCommentId,
      handleCancelReply,
      replyTarget,
      replyTargetId,
      setExpandedRepliesByCommentId,
    ],
  );

  const handlePressCommentSort = useCallback(() => {
    cancelPendingInlineReveal(true);
    cancelPendingNavigationScroll();
    Keyboard.dismiss();
    setCommentSortModalVisible(true);
  }, [cancelPendingInlineReveal, cancelPendingNavigationScroll]);

  const handleSelectCommentSort = useCallback(
    (nextSort: CommunityCommentSort) => {
      cancelPendingInlineReveal();
      cancelPendingNavigationScroll();
      session.changeSort(nextSort);
      setCommentSortModalVisible(false);
      setExpandedRepliesByCommentId({});
      setReplyTargetId(null);
      preparedNavigationTargetKeyRef.current = null;
      measuredNavigationTargetKeyRef.current = null;
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    },
    [
      cancelPendingInlineReveal,
      cancelPendingNavigationScroll,
      session,
      setExpandedRepliesByCommentId,
      setReplyTargetId,
    ],
  );

  const handleSubmitReport = () => {
    requireLogin(() => {
      if (!reportTarget || !currentUserId || reportSubmitting) return;
      const trimmed = reportReason.trim();
      if (!trimmed) {
        showToast({
          tone: 'warning',
          message: '신고 사유를 간단히 적어 주세요.',
        });
        return;
      }

      setReportSubmitting(true);
      reportContent(
        reportTarget.targetType,
        reportTarget.targetId,
        reportReasonCategory,
        trimmed,
        currentUserId,
      )
        .then(result => {
          const submittedTarget = reportTarget;
          Keyboard.dismiss();
          setReportNotice(result === 'duplicate' ? 'duplicate' : 'submitted');

          fetchPostDetail(postId)
            .then(() => {
              if (submittedTarget.targetType === 'comment')
                return fetchPostComments(postId);
            })
            .catch(() => {});

          setReportTarget(null);
          setReportReason('');
          setReportReasonCategory('spam');
        })
        .catch(error => {
          showToast({
            tone: 'error',
            message: getErrorMessage(error) || '신고 접수에 실패했어요.',
          });
        })
        .finally(() => {
          setReportSubmitting(false);
        });
    });
  };

  const listHeader = useMemo(() => {
    if (!post) return null;

    return (
      <View style={styles.scrollContent}>
        {mode === 'post' ? (
          <View style={styles.postSection}>
            <View style={styles.postTitleRow}>
              {post.category ? (
                <View
                  style={[
                    styles.categoryBadge,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <AppText
                    preset="caption"
                    style={[
                      styles.categoryText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {getCommunityCategoryLabel(post.category)}
                  </AppText>
                </View>
              ) : null}

              {post.title ? (
                <AppText
                  preset="headline"
                  style={[
                    styles.postTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {post.title}
                </AppText>
              ) : null}
            </View>

            <View style={styles.postMetaRow}>
              <AppText
                preset="body"
                style={[styles.authorName, { color: theme.colors.textPrimary }]}
              >
                {post.authorNickname}
              </AppText>
              {postMetaDate ? (
                <AppText
                  preset="caption"
                  style={[styles.metaLine, { color: theme.colors.textMuted }]}
                >
                  {postMetaDate}
                </AppText>
              ) : null}
            </View>

            <View
              style={[
                styles.postContentSection,
                { borderTopColor: DETAIL_DIVIDER_COLOR },
              ]}
            >
              <AppText
                preset="body"
                style={[
                  styles.postContent,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {post.content}
              </AppText>
            </View>

            {(post.imageUrls?.length ?? 0) > 0 || post.hasImage ? (
              <View style={styles.mediaSection}>
                {(post.imageUrls?.length ?? 0) > 0 ? (
                  <PostImageGallery imageUrls={post.imageUrls ?? []} />
                ) : (
                  <View
                    style={[
                      styles.imageFallback,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  >
                    <Feather
                      name="image"
                      size={18}
                      color={theme.colors.textMuted}
                    />
                    <AppText
                      preset="caption"
                      style={[
                        styles.imageFallbackText,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      이미지를 불러오지 못했어요.
                    </AppText>
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.actionPill,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={handlePressLike}
              >
                <Feather
                  name="heart"
                  size={16}
                  color={
                    post.isLikedByMe
                      ? theme.colors.danger
                      : theme.colors.textMuted
                  }
                />
                <AppText
                  preset="caption"
                  style={[
                    styles.actionPillText,
                    {
                      color: post.isLikedByMe
                        ? theme.colors.danger
                        : theme.colors.textPrimary,
                    },
                  ]}
                >
                  좋아요 {post.likeCount.toLocaleString()}
                </AppText>
              </Pressable>
              {!isMyPost ? (
                <CtaButton
                  role="secondary"
                  compact
                  style={[
                    styles.actionPill,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setReportTarget({ targetType: 'post', targetId: postId });
                    setReportReason('');
                    setReportReasonCategory('spam');
                  }}
                >
                  <AppText
                    preset="caption"
                    style={[
                      styles.actionPillText,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    신고하기
                  </AppText>
                </CtaButton>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.commentsSection}>
          <View
            style={
              mode === 'comments'
                ? styles.commentsSortHeader
                : styles.commentsHeader
            }
          >
            {mode === 'post' ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  discussion.total === null
                    ? '전체 댓글 보기'
                    : `전체 댓글 ${discussion.total}개 보기`
                }
                onPress={() => openComments()}
                style={styles.commentsTitleRow}
              >
                <AppText
                  preset="headline"
                  numberOfLines={1}
                  style={[
                    styles.commentsTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  댓글{' '}
                  <AppText
                    preset="headline"
                    style={[
                      styles.commentsCount,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {discussion.total === null
                      ? ''
                      : discussion.total.toLocaleString()}
                  </AppText>
                </AppText>
                <NuriSemanticIcon
                  family="feather"
                  preserveOriginal
                  name="chevron-right"
                  size={14}
                  color={theme.colors.textSecondary}
                  accessible={false}
                  accessibilityElementsHidden
                />
              </TouchableOpacity>
            ) : null}
            {mode === 'comments' ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`댓글 정렬, 현재 ${getCommunityCommentSortLabel(
                  commentSort,
                )}`}
                activeOpacity={0.84}
                style={styles.commentSortLabel}
                onPress={handlePressCommentSort}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.commentSortText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {getCommunityCommentSortLabel(commentSort)}
                </AppText>
                <Feather
                  name="chevron-down"
                  size={15}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            ) : null}
          </View>
          {commentsStatus === 'loading' ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator
                size="small"
                color={theme.colors.textSecondary}
              />
            </View>
          ) : commentsStatus === 'ready' && topLevelCommentIds.length === 0 ? (
            <AppText
              preset="body"
              style={[styles.emptyComments, { color: theme.colors.textMuted }]}
            >
              아직 댓글이 없어요.
            </AppText>
          ) : null}
          {commentsStatus === 'error' ||
          discussion.summaryStatus === 'error' ||
          discussion.error ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                session.refresh(mode);
              }}
              style={styles.readRetry}
            >
              <AppText style={{ color: theme.colors.textSecondary }}>
                {discussion.error ?? '댓글 수를 불러오지 못했어요.'}
              </AppText>
              <AppText style={{ color: theme.colors.textSecondary }}>
                다시 불러오기
              </AppText>
            </TouchableOpacity>
          ) : null}
          {mode === 'comments' && discussion.threads.previous ? (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={commentsStatus === 'loading'}
              style={styles.readRetry}
              onPress={() => {
                session.threads(discussion.threads.previous);
              }}
            >
              <AppText style={{ color: theme.colors.textSecondary }}>
                이전 댓글 보기
              </AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }, [
    commentsStatus,
    discussion.error,
    discussion.summaryStatus,
    discussion.threads.previous,
    discussion.total,
    mode,
    openComments,
    session,
    commentSort,
    handlePressLike,
    handlePressCommentSort,
    isMyPost,
    post,
    postId,
    postMetaDate,
    topLevelCommentIds.length,
    theme.colors.border,
    theme.colors.danger,
    theme.colors.surface,
    theme.colors.surfaceElevated,
    theme.colors.textMuted,
    theme.colors.textPrimary,
    theme.colors.textSecondary,
  ]);

  const visibleTopLevelCommentIds = sortedTopLevelCommentIds;
  const remainingCommentCount = Math.max(
    (discussion.total ?? 0) - discussion.previewCount,
    0,
  );

  const listFooter = useMemo(() => {
    if (
      mode === 'comments'
        ? !discussion.threads.next
        : discussion.total !== null && remainingCommentCount <= 0
    ) {
      return <View style={styles.listFooterSpacer} />;
    }

    return (
      <View style={styles.listFooterWrap}>
        <TouchableOpacity
          testID="community-comments-more"
          accessibilityRole="button"
          disabled={mode === 'comments' && commentsStatus === 'loading'}
          activeOpacity={0.9}
          style={[
            styles.moreCommentsButton,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => {
            if (mode === 'post') openComments();
            else session.threads(discussion.threads.next);
          }}
        >
          <AppText
            preset="caption"
            style={[
              styles.moreCommentsText,
              { color: theme.colors.textPrimary },
            ]}
          >
            {mode === 'comments'
              ? '다음 댓글 보기'
              : discussion.total === null
              ? '댓글 모두 보기'
              : `댓글 ${remainingCommentCount.toLocaleString()}개 더보기`}
          </AppText>
          <Feather
            name="chevron-right"
            size={15}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
      </View>
    );
  }, [
    remainingCommentCount,
    theme.colors.background,
    theme.colors.border,
    theme.colors.textPrimary,
    mode,
    discussion.threads.next,
    discussion.total,
    commentsStatus,
    openComments,
    session,
  ]);

  const handleCommentDraftChange = useCallback(
    (draft: string) => {
      commentDraftRef.current = draft;
    },
    [commentDraftRef],
  );
  const handleNavigateToSignIn = useCallback(() => {
    navigation.navigate('SignIn');
  }, [navigation]);
  const renderCommentComposer = useCallback(
    (placement: 'inline' | 'bottom') => {
      const isInline = placement === 'inline';
      const composerPaddingStyle = {
        paddingBottom: isInline ? 8 : 6,
      };

      return (
        <CommunityCommentComposer
          key={
            placement === 'inline'
              ? `community-inline-composer-${replyTargetId ?? 'none'}`
              : 'community-root-composer'
          }
          placement={placement}
          replyTargetId={replyTargetId}
          replyTarget={replyTarget}
          currentUserId={currentUserId}
          commentSubmitting={commentSubmitting}
          initialDraft={commentDraftRef.current}
          initialSelection={session.selection.current}
          onSelectionChange={selection => {
            session.selection.current = selection;
          }}
          resetKey={commentDraftResetKey}
          paddingBottom={composerPaddingStyle.paddingBottom}
          accentColor={theme.colors.textSecondary}
          inputRef={commentInputRef}
          inlineComposerRef={inlineComposerRef}
          onDraftChange={handleCommentDraftChange}
          onSubmit={handleSubmitComment}
          onCancelReply={handleCancelReply}
          onInlinePressIn={handleInlineInputPressIn}
          onInlineFocus={handleInlineInputFocus}
          onInlineComposerMounted={handleInlineComposerMounted}
          onInlineLayoutReady={handleInlineLayoutReady}
          onNavigateToSignIn={handleNavigateToSignIn}
        />
      );
    },
    [
      commentDraftResetKey,
      commentDraftRef,
      session.selection,
      commentSubmitting,
      currentUserId,
      handleCancelReply,
      handleCommentDraftChange,
      handleInlineInputFocus,
      handleInlineInputPressIn,
      handleInlineComposerMounted,
      handleInlineLayoutReady,
      handleNavigateToSignIn,
      handleSubmitComment,
      theme.colors.textSecondary,
      replyTarget,
      replyTargetId,
    ],
  );

  const inlineCommentComposer = useMemo(
    () =>
      isFocused && replyTargetId !== null
        ? renderCommentComposer('inline')
        : null,
    [isFocused, renderCommentComposer, replyTargetId],
  );
  const bottomCommentComposer = useMemo(
    () =>
      isFocused && canShowCommentComposer && replyTargetId === null
        ? renderCommentComposer('bottom')
        : null,
    [isFocused, canShowCommentComposer, renderCommentComposer, replyTargetId],
  );
  const activeReplyThreadRootId = getCommunityReplyThreadRootId(replyTarget);

  const renderCommentThread = useCallback(
    ({ item: commentId }: { item: string }) => (
      <CommentThreadItem
        session={session}
        preview={mode === 'post'}
        previewReplyIds={discussion.previewReplyIds[commentId]}
        commentId={commentId}
        activeReplyTargetId={replyTargetId}
        inlineComposer={
          activeReplyThreadRootId === commentId ? inlineCommentComposer : null
        }
        repliesExpanded={areCommunityRepliesExpanded(
          expandedRepliesByCommentId,
          commentId,
        )}
        currentUserId={currentUserId}
        postAuthorId={post?.authorId ?? ''}
        authorAccentColor={theme.colors.textSecondary}
        bestBadgeColor={theme.colors.textSecondary}
        highlightedCommentId={highlightedCommentId}
        onTargetReady={handleTargetCommentReady}
        onPressComment={handlePressComment}
        onToggleLike={handleToggleCommentLike}
        onPressDelete={handleRequestDeleteComment}
        onPressReport={handleRequestReportComment}
        onToggleReplies={handleToggleReplies}
      />
    ),
    [
      currentUserId,
      expandedRepliesByCommentId,
      handleToggleReplies,
      handlePressComment,
      handleRequestDeleteComment,
      handleRequestReportComment,
      handleToggleCommentLike,
      handleTargetCommentReady,
      highlightedCommentId,
      inlineCommentComposer,
      activeReplyThreadRootId,
      theme.colors.textSecondary,
      post?.authorId,
      replyTargetId,
      mode,
      session,
      discussion.previewReplyIds,
    ],
  );

  if ((detailStatus === 'idle' || detailStatus === 'loading') && !post) {
    return (
      <View
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={theme.colors.textSecondary} />
        </View>
      </View>
    );
  }

  if (detailStatus === 'not_found') {
    return (
      <View
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <StateMessage
          actionRole="neutral"
          title="게시글을 찾을 수 없어요"
          body="삭제되었거나 더 이상 볼 수 없는 게시글일 수 있어요."
          buttonLabel="뒤로 가기"
          onPress={handleBack}
        />
      </View>
    );
  }

  if (detailStatus === 'deleted') {
    return (
      <View
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <StateMessage
          actionRole="neutral"
          title="삭제된 게시글입니다"
          body="원문은 더 이상 확인할 수 없어요."
          buttonLabel="뒤로 가기"
          onPress={handleBack}
        />
      </View>
    );
  }

  if (detailStatus === 'moderated') {
    return (
      <View
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <StateMessage
          actionRole="neutral"
          title="운영 검토 중인 게시글입니다"
          body="검토가 끝나면 다시 노출될 수 있어요."
          buttonLabel="뒤로 가기"
          onPress={handleBack}
        />
      </View>
    );
  }

  if (detailStatus === 'error' && !post) {
    return (
      <View
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <StateMessage
          title="게시글을 불러오지 못했어요"
          body="잠시 후 다시 시도해 주세요."
          buttonLabel="다시 시도"
          onPress={() => setDetailReloadKey(value => value + 1)}
        />
      </View>
    );
  }

  if (!post) return null;

  return (
    <View
      ref={safeContentRef}
      collapsable={false}
      onLayout={measureContentWindow}
      testID="community-detail-safe-content"
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.background,
          paddingBottom: closedBottomInset,
        },
      ]}
    >
      {/* Stable safe-area frame; one measured controller owns the IME overlap. */}
      {/* The local frame starts below the custom header; IME coordinates are window-relative. */}
      <KeyboardControllerAvoidingView
        testID="community-comment-keyboard-owner"
        behavior="height"
        enabled={isFocused}
        keyboardVerticalOffset={contentWindowY}
        style={styles.contentArea}
      >
        <FlatList
          ref={flatListRef}
          data={visibleTopLevelCommentIds}
          keyExtractor={item => item}
          style={styles.contentArea}
          contentContainerStyle={{ paddingBottom: 12 }}
          contentOffset={initialContentOffset.current}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          automaticallyAdjustKeyboardInsets={false}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => {
            isCommentListDraggingRef.current = true;
            cancelPendingNavigationScroll();
            cancelPendingInlineReveal(true);
          }}
          onScrollEndDrag={() => {
            isCommentListDraggingRef.current = false;
          }}
          onMomentumScrollBegin={() => {
            isCommentListDraggingRef.current = true;
          }}
          onMomentumScrollEnd={() => {
            isCommentListDraggingRef.current = false;
          }}
          onScroll={event => {
            currentScrollOffsetRef.current = event.nativeEvent.contentOffset.y;
            session.offsets[mode] = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          onScrollToIndexFailed={({ averageItemLength, index }) => {
            flatListRef.current?.scrollToOffset({
              offset: Math.max(averageItemLength * index, 0),
              animated: false,
            });
            if (targetScrollTimerRef.current) {
              clearTimeout(targetScrollTimerRef.current);
            }
            targetScrollTimerRef.current = setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.2,
              });
            }, 180);
          }}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          // Keep inline inputs attached from the start, before a reply changes
          // the cell height. Virtualized render-window limits still apply.
          removeClippedSubviews={false}
          ListHeaderComponent={listHeader ?? undefined}
          ListFooterComponent={listFooter ?? undefined}
          renderItem={renderCommentThread}
        />

        {mode === 'post' &&
        replyTargetId !== null &&
        !topLevelCommentIds.includes(replyTargetId) ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.readRetry}
            onPress={() => openComments(replyTargetId)}
          >
            <AppText style={{ color: theme.colors.textSecondary }}>
              작성 중인 답글 이어쓰기
            </AppText>
          </TouchableOpacity>
        ) : null}
        {bottomCommentComposer}
      </KeyboardControllerAvoidingView>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View
          style={[
            styles.menuBackdrop,
            { backgroundColor: theme.colors.overlay },
          ]}
        >
          <Pressable
            style={styles.menuScrim}
            onPress={() => setMenuVisible(false)}
          />
          <View
            style={[
              styles.menuSheet,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {isMyPost ? (
              <CtaButton
                role="secondary"
                compact
                activeOpacity={0.9}
                style={styles.menuAction}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('CommunityEdit', { postId });
                }}
              >
                <CtaText preset="body" style={[styles.menuActionText, {}]}>
                  수정하기
                </CtaText>
              </CtaButton>
            ) : null}

            {canShowCommunityBlockAction(post.authorId, currentUserId) ? (
              <CtaButton
                role="secondary"
                compact
                activeOpacity={0.9}
                style={styles.menuAction}
                onPress={() => {
                  setMenuVisible(false);
                  setBlockConfirmVisible(true);
                }}
              >
                <CtaText preset="body" style={[styles.menuActionText, {}]}>
                  사용자 차단
                </CtaText>
              </CtaButton>
            ) : null}

            <CtaButton
              role={isMyPost ? 'destructiveConfirm' : 'secondary'}
              compact
              activeOpacity={0.9}
              style={styles.menuAction}
              onPress={() => {
                setMenuVisible(false);
                if (isMyPost) {
                  setDeleteConfirmVisible(true);
                  return;
                }
                setReportTarget({ targetType: 'post', targetId: postId });
                setReportReason('');
                setReportReasonCategory('spam');
              }}
            >
              <CtaText preset="body" style={[styles.menuActionText, {}]}>
                {isMyPost ? '삭제하기' : '신고'}
              </CtaText>
            </CtaButton>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        confirmRole="secondary"
        cancelRole="neutral"
        confirmLoading={blocking}
        visible={blockConfirmVisible}
        tone="warning"
        title="이 사용자를 차단할까요?"
        message={COMMUNITY_BLOCK_CONFIRMATION_MESSAGE}
        confirmLabel={blocking ? '차단 중...' : '차단'}
        cancelLabel="취소"
        confirmDisabled={blocking}
        onCancel={() => {
          if (blocking) return;
          setBlockConfirmVisible(false);
        }}
        onConfirm={handleConfirmBlock}
      />

      <ConfirmDialog
        confirmRole="neutral"
        cancelRole="neutral"
        visible={commentSortModalVisible}
        title="댓글 정렬"
        message="원하는 정렬 기준을 선택해 주세요."
        confirmLabel="닫기"
        hideActions
        onCancel={() => setCommentSortModalVisible(false)}
        onConfirm={() => setCommentSortModalVisible(false)}
      >
        <View style={styles.commentSortOptions}>
          {COMMUNITY_COMMENT_SORT_OPTIONS.map(option => {
            const isSelected = option.key === commentSort;
            return (
              <TouchableOpacity
                key={option.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                activeOpacity={0.86}
                style={[
                  styles.commentSortOption,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.surfaceElevated
                      : theme.colors.surface,
                    borderColor: isSelected
                      ? theme.colors.textSecondary
                      : theme.colors.border,
                  },
                ]}
                onPress={() => handleSelectCommentSort(option.key)}
              >
                <View style={styles.commentSortOptionCopy}>
                  <AppText
                    preset="body"
                    style={{
                      color: isSelected
                        ? theme.colors.textPrimary
                        : theme.colors.textPrimary,
                      fontWeight: '700',
                    }}
                  >
                    {option.label}
                  </AppText>
                  <AppText
                    preset="caption"
                    style={{ color: theme.colors.textMuted }}
                  >
                    {option.description}
                  </AppText>
                </View>
                <Feather
                  name={isSelected ? 'check-circle' : 'circle'}
                  size={22}
                  color={
                    isSelected
                      ? theme.colors.textPrimary
                      : theme.colors.textMuted
                  }
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ConfirmDialog>

      <ConfirmDialog
        confirmRole="destructiveConfirm"
        cancelRole="neutral"
        confirmLoading={deleting}
        visible={deleteConfirmVisible}
        tone="danger"
        title="게시글을 삭제할까요?"
        message={
          '삭제된 게시글은 복구되지 않아요.\n정말로 삭제할지 다시 확인해 주세요.'
        }
        confirmLabel={deleting ? '삭제 중...' : '삭제'}
        cancelLabel="취소"
        onCancel={() => {
          if (deleting) return;
          setDeleteConfirmVisible(false);
        }}
        onConfirm={() => {
          if (deleting) return;
          setDeleting(true);
          removePost(postId)
            .then(() => {
              setDeleteConfirmVisible(false);
              navigation.goBack();
            })
            .catch(error => {
              showToast({
                tone: 'error',
                message: getErrorMessage(error) || '삭제에 실패했어요.',
              });
            })
            .finally(() => {
              setDeleting(false);
            });
        }}
      />

      <ConfirmDialog
        confirmRole="destructiveConfirm"
        cancelRole="neutral"
        visible={commentDeleteTargetId !== null}
        tone="danger"
        title="댓글을 삭제할까요?"
        message={
          '삭제한 댓글은 복구되지 않아요.\n정말로 삭제할지 다시 확인해 주세요.'
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        onCancel={() => setCommentDeleteTargetId(null)}
        onConfirm={() => {
          if (!commentDeleteTargetId) return;
          const deletedCommentId = commentDeleteTargetId;
          removeComment(commentDeleteTargetId, postId)
            .then(() => {
              const activeTargetWasDeleted =
                replyTargetId === deletedCommentId ||
                replyTarget?.parentCommentId === deletedCommentId;
              if (activeTargetWasDeleted) {
                handleCancelReply();
              }
              setCommentDeleteTargetId(null);
              if (highlightedCommentId === deletedCommentId)
                setHighlightedCommentId(null);
              session.refresh(mode);
            })
            .catch(error => {
              showToast({
                tone: 'error',
                message: getErrorMessage(error) || '댓글 삭제에 실패했어요.',
              });
            });
        }}
      />

      <Modal
        visible={reportTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={closeReportModal}
      >
        <KeyboardControllerAvoidingView
          style={[
            styles.menuBackdrop,
            {
              backgroundColor: theme.colors.overlay,
            },
          ]}
          behavior="padding"
          enabled
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <Pressable style={styles.menuScrim} onPress={closeReportModal} />
          <Pressable
            style={styles.reportSheetTouchGuard}
            onPress={Keyboard.dismiss}
          >
            <Animated.View
              testID="community-report-surface"
              style={[
                styles.reportSheet,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.brand,
                },
                reportBottomPaddingStyle,
              ]}
            >
              <View
                style={[
                  styles.reportEyebrowWrap,
                  { backgroundColor: '#EEF1FF' },
                ]}
              >
                <AppText
                  preset="caption"
                  style={[styles.reportEyebrow, { color: theme.colors.brand }]}
                >
                  COMMUNITY CARE
                </AppText>
              </View>
              <AppText
                preset="headline"
                style={[
                  styles.reportTitle,
                  { color: theme.colors.textPrimary },
                ]}
              >
                신고 사유를 선택해 주세요
              </AppText>
              <View style={styles.reportReasonList}>
                {REPORT_REASON_OPTIONS.map(option => {
                  const active = option.key === reportReasonCategory;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      activeOpacity={0.88}
                      style={[
                        styles.reportReasonButton,
                        active
                          ? {
                              backgroundColor: '#EEF1FF',
                              borderColor: theme.colors.brand,
                            }
                          : {
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.border,
                            },
                      ]}
                      onPress={() => setReportReasonCategory(option.key)}
                    >
                      <AppText
                        preset="caption"
                        style={[
                          styles.reportReasonText,
                          {
                            color: active
                              ? theme.colors.brand
                              : theme.colors.textPrimary,
                          },
                        ]}
                      >
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                value={reportReason}
                onChangeText={setReportReason}
                placeholder="간단한 신고 사유를 적어 주세요"
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.reportInput,
                  {
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                multiline
                maxLength={300}
                textAlignVertical="top"
              />
              <View style={styles.reportActions}>
                <CtaButton
                  role="neutral"
                  activeOpacity={0.88}
                  style={[styles.reportActionButton, {}]}
                  onPress={closeReportModal}
                  disabled={reportSubmitting}
                >
                  <CtaText
                    preset="body"
                    style={{
                      fontWeight: '700',
                    }}
                  >
                    취소
                  </CtaText>
                </CtaButton>
                <CtaButton
                  role="primary"
                  loading={reportSubmitting}
                  activeOpacity={0.88}
                  style={[styles.reportActionButton, {}]}
                  onPress={handleSubmitReport}
                  disabled={reportSubmitting}
                >
                  <CtaText preset="body" style={{ fontWeight: '700' }}>
                    {reportSubmitting ? '접수 중...' : '신고하기'}
                  </CtaText>
                </CtaButton>
              </View>
            </Animated.View>
          </Pressable>
        </KeyboardControllerAvoidingView>
      </Modal>

      <PremiumNoticeModal
        confirmRole="primary"
        visible={reportNotice !== null}
        eyebrow={
          reportNotice === 'duplicate' ? 'REPORT RECEIVED' : 'REPORT SUBMITTED'
        }
        iconName="shield"
        titleLines={
          reportNotice === 'duplicate'
            ? ['이미 접수된 신고입니다.']
            : ['신고가 안전하게', '접수되었습니다.']
        }
        bodyLines={
          reportNotice === 'duplicate'
            ? [
                '같은 내용은 이미 접수되어',
                '운영 기준에 따라 검토를 이어갈게요.',
              ]
            : [
                '운영 기준에 따라 내용을 확인한 뒤',
                '필요하면 자동 숨김이 먼저 적용될 수 있어요.',
              ]
        }
        confirmLabel="확인"
        onClose={() => setReportNotice(null)}
      />
    </View>
  );
}

function StateMessage({
  title,
  body,
  buttonLabel,
  onPress,
  actionRole = 'primary',
}: {
  title: string;
  body: string;
  buttonLabel: string;
  onPress: () => void;
  actionRole?: CtaRole;
}) {
  const theme = useTheme();

  return (
    <View style={styles.centerState}>
      <AppText
        preset="headline"
        style={[styles.stateTitle, { color: theme.colors.textPrimary }]}
      >
        {title}
      </AppText>
      <AppText
        preset="body"
        style={[styles.stateBody, { color: theme.colors.textMuted }]}
      >
        {body}
      </AppText>
      <CtaButton
        role={actionRole}
        activeOpacity={0.9}
        style={[styles.stateButton, {}]}
        onPress={onPress}
      >
        <CtaText preset="body" style={styles.stateButtonText}>
          {buttonLabel}
        </CtaText>
      </CtaButton>
    </View>
  );
}
