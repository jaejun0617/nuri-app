import { ResponsiveNativeTextInput as TextInput } from '../../app/ui/ResponsiveNativeText';
import { APP_HEADER } from '../../components/navigation/headerAppearance';
import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import { useNotificationDestinationRead } from '../../hooks/useNotificationDestinationRead';
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
  TouchableOpacity,
  View,
} from 'react-native';
import {
  StackActions,
  useIsFocused,
  useNavigation,
  usePreventRemove,
  type NavigationAction,
  useRoute,
} from '@react-navigation/native';
import { useStore } from 'zustand';
import { useDiscussionField, useDiscussionSession } from './discussionSession';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  KeyboardAvoidingView as KeyboardControllerAvoidingView,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useKeyboardBottomPadding } from '../../hooks/useKeyboardBottomPadding';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '../../components/icons/NuriFeatherIcon';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { useTypographyScope } from '../../app/providers/AppFontPreferenceProvider';
import { useResponsiveTypography } from '../../app/providers/ResponsiveTypographyProvider';
import { resolveResponsiveTextStyle } from '../../app/typography/responsiveTypography';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { TIMELINE_SEASON_COLORS } from '../../theme/seasonal/timeline';
import PostImageGallery from '../../components/community/PostImageGallery';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PremiumNoticeModal from '../../components/common/PremiumNoticeModal';
import { useCommunityAuth } from '../../hooks/useCommunityAuth';
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
import { scheduleIdleTask } from '../../utils/scheduleIdleTask';
import CommentThreadItem from './components/CommentThreadItem';
import { useCommunityReadStore } from '../../store/communityReadStore';
import CommunityCommentComposer from './components/CommunityCommentComposer';
import {
  formatCommunityDetailTimestamp,
  getCommunityCategoryLabel,
} from './communityListPresentation';
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
import {
  resolveCommunityDiscussionBottomInset,
  resolveCommunityReplyRevealOffset,
} from './utils/commentViewport';
import { DETAIL_DIVIDER_COLOR, styles } from './CommunityDetailScreen.styles';
type DraftAction = { type: 'reply'; id: string | null } | { type: 'leave'; action: NavigationAction };

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

const COMMENT_SCROLL_ANCHOR = { minIndexForVisible: 0 };

export default function CommunityDiscussionContent({
  mode,
}: {
  mode: 'post' | 'comments';
}) {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const discussionInsets = useAnimatedStyle(() => ({
    paddingBottom: resolveCommunityDiscussionBottomInset(insets.bottom, keyboardHeight.value, isFocused),
  }));
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
  const currentScrollOffsetRef = useRef(0);
  const preparedNavigationTargetKeyRef = useRef<string | null>(null);
  const measuredNavigationTargetKeyRef = useRef<string | null>(null);
  const missingNavigationTargetKeyRef = useRef<string | null>(null);
  const targetScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const focusFrameRef = useRef<number | null>(null);
  const consumedRouteFocusRef = useRef<string | null>(null);
  const highlightedRowRef = useRef<React.ComponentRef<typeof View> | null>(null);
  const pendingReplyRevealRef = useRef<string | null>(null);
  const listHeightRef = useRef(0);
  const commentLikeDebounceTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  const cancelPendingNavigationScroll = useCallback(() => {
    if (targetScrollTimerRef.current) {
      clearTimeout(targetScrollTimerRef.current);
      targetScrollTimerRef.current = null;
    }
  }, []);

  const cancelComposerFocus = useCallback(() => {
    if (focusFrameRef.current === null) return;
    cancelAnimationFrame(focusFrameRef.current);
    focusFrameRef.current = null;
  }, []);

  const { currentUserId, requireLogin } = useCommunityAuth();

  const postId = route.params.postId;
  const sessionId = route.params.discussionSessionId ?? route.key;
  const session = useDiscussionSession(currentUserId, postId, sessionId);
  const discussion = useStore(session.store);
  const commentSubmitInFlightRef = session.submitLock;
  const commentDraftRef = session.draft;
  const [hasDraft, setHasDraft] = useDiscussionField(session, 'hasDraft');
  const [draftAction, setDraftAction] = useState<DraftAction | null>(null);
  const [focusRequest, requestFocus] = useState(0);
  const [openedReplyRouteKey, setOpenedReplyRouteKey] = useState<string | null>(null);
  const initialContentOffset = useMemo(
    () => ({ x: 0, y: session.offsets[mode] }),
    [mode, session],
  );
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
        replyTargetId !== null && replyTargetId !== discussion.unavailableReplyId
          ? s.commentEntitiesById[replyTargetId] ?? null
          : null,
      [discussion.unavailableReplyId, replyTargetId],
    ),
  );

  useLayoutEffect(() => {
    currentScrollOffsetRef.current = initialContentOffset.y;
    setDraftAction(null);
    requestFocus(0);
    return cancelComposerFocus;
  }, [cancelComposerFocus, initialContentOffset, session]);

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
    cancelComposerFocus();
    cancelPendingNavigationScroll();
    preparedNavigationTargetKeyRef.current = null;
    measuredNavigationTargetKeyRef.current = null;
    missingNavigationTargetKeyRef.current = null;
  }, [
    cancelComposerFocus,
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
      highlightedRowRef.current = target;
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
      commentLikeDebounceTimersRef.current = {};
    },
    [],
  );

  useEffect(() => {
    if (typeof navigation.addListener !== 'function') return undefined;
    const unsubscribe = navigation.addListener('blur', () => {
      cancelComposerFocus();
      requestFocus(0);
      cancelPendingNavigationScroll();
    });
    return unsubscribe;
  }, [cancelComposerFocus, cancelPendingNavigationScroll, navigation]);

  const handleBack = useCallback(() => {
    cancelComposerFocus();
    cancelPendingNavigationScroll();
    navigation.goBack();
  }, [cancelComposerFocus, cancelPendingNavigationScroll, navigation]);

  const openComments = useCallback(
    (commentId?: string, focusReply = false) => {
      cancelComposerFocus();
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
        focusReply: focusReply || undefined,
        discussionSessionId: sessionId,
        postRouteKey: route.key,
      });
    },
    [
      cancelComposerFocus,
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
    cancelComposerFocus();
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
    cancelComposerFocus,
    cancelPendingNavigationScroll,
    navigation,
    postId,
    route,
    session,
    sessionId,
  ]);

  useLayoutEffect(() => {
    if (!isFocused || mode !== 'post' || !flatListRef.current || !session.bodyRequest.current) return;
    session.bodyRequest.current = false;
    currentScrollOffsetRef.current = 0;
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [isFocused, mode, post, session]);

  const isMyPost = !!post && !!currentUserId && post.authorId === currentUserId;
  const canShowCommentComposer =
    !!post &&
    detailStatus !== 'deleted' &&
    detailStatus !== 'moderated' &&
    detailStatus !== 'not_found';
  const postMetaDate = useMemo(() => {
    if (!post) return '';
    return formatCommunityDetailTimestamp(post.createdAt);
  }, [post]);
  const renderHeaderLeft = useCallback(
    () => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="뒤로가기"
        activeOpacity={0.88}
        style={styles.backButton}
        onPress={handleBack}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Feather name="chevron-left" size={APP_HEADER.backIconSize} color={theme.colors.textPrimary} />
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
            numberOfLines={1}
            style={{
              color: theme.colors.textSecondary,
              fontSize: 13,
              fontWeight: '600',
            }}
          >
            본문
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
            cancelComposerFocus();
            cancelPendingNavigationScroll();
            Keyboard.dismiss();
            setMenuVisible(true);
          }}
        >
          <NuriSemanticIcon
            family="feather"
            preserveOriginal
            name="more-horizontal"
            size={APP_HEADER.actionIconSize}
            color={moreAccent}
          />
        </TouchableOpacity>
      ) : null,
    [
      cancelComposerFocus,
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
        if (!currentUserId || detailStatus !== 'ready' || commentSubmitInFlightRef.current) return;
        if (replyTargetId !== null && replyTarget?.status !== 'active') return;
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
            cancelComposerFocus();
            Keyboard.dismiss();
            commentDraftRef.current = '';
            setHasDraft(false);
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
      cancelComposerFocus,
      postId,
      replyTarget,
      replyTargetId,
      requireLogin,
      submitComment,
      commentDraftRef,
      commentSubmitInFlightRef,
      detailStatus,
      mode,
      session,
      setExpandedRepliesByCommentId,
      setHasDraft,
      setReplyTargetId,
      setCommentSubmitting,
      setCommentDraftResetKey,
    ],
  );

  const activateReply = useCallback(
    (commentId: string) => {
      const target = useCommunityStore.getState().commentEntitiesById[commentId];
      if (target?.postId !== postId || target.status !== 'active') return;
      const threadRootId = getCommunityReplyThreadRootId(target);
      if (threadRootId !== null) {
        setExpandedRepliesByCommentId(previous =>
          previous[threadRootId] ? previous : { ...previous, [threadRootId]: true },
        );
      }
      setHighlightedCommentId(commentId);
      setReplyTargetId(commentId);
      if (mode === 'post') openComments(commentId, true);
      else requestFocus(previous => previous + 1);
    },
    [mode, openComments, postId, setExpandedRepliesByCommentId, setHighlightedCommentId, setReplyTargetId],
  );

  const revealReplyInViewport = useCallback(() => {
    const id = pendingReplyRevealRef.current;
    const row = highlightedRowRef.current;
    const list = flatListRef.current;
    const content = list?.getNativeScrollRef()?.getInnerViewRef();
    if (id === null || !row || !list || !content) return;

    // Measure against scroll content: Android window measurements can lose an
    // offscreen row while opening the keyboard.
    row.measureLayout(content, (_x, top, _width, height) => {
      const { selectedId, replyTargetId: activeReplyId } = session.store.getState();
      if (
        pendingReplyRevealRef.current !== id ||
        selectedId !== id ||
        activeReplyId !== id ||
        highlightedRowRef.current !== row ||
        flatListRef.current !== list
      ) return;
      const offset = resolveCommunityReplyRevealOffset(
        top,
        height,
        listHeightRef.current,
        currentScrollOffsetRef.current,
      );
      if (offset !== null) list.scrollToOffset({ offset, animated: false });
    }, () => {});
  }, [session]);

  useEffect(() => {
    if (!isFocused || mode !== 'comments') return undefined;
    const onShow = Keyboard.addListener('keyboardDidShow', revealReplyInViewport);
    const onHide = Keyboard.addListener('keyboardDidHide', () => {
      pendingReplyRevealRef.current = null;
    });
    return () => {
      pendingReplyRevealRef.current = null;
      onShow.remove();
      onHide.remove();
    };
  }, [isFocused, mode, revealReplyInViewport]);

  useLayoutEffect(() => {
    if (route.name !== 'CommunityComments' || !route.params.focusReply) return undefined;
    return navigation.addListener('transitionEnd', event => {
      if (!event.data.closing) setOpenedReplyRouteKey(route.key);
    });
  }, [navigation, route]);

  useLayoutEffect(() => {
    const focusFromPost =
      route.name === 'CommunityComments' &&
      route.params.focusReply === true &&
      openedReplyRouteKey === route.key &&
      commentsStatus === 'ready' &&
      route.params.commentId === replyTargetId &&
      consumedRouteFocusRef.current !== route.key;
    if (
      !isFocused ||
      mode !== 'comments' ||
      detailStatus !== 'ready' ||
      !currentUserId ||
      replyTarget?.status !== 'active' ||
      (!focusFromPost && focusRequest === 0)
    ) return undefined;

    focusFrameRef.current = requestAnimationFrame(() => {
      focusFrameRef.current = null;
      const input = commentInputRef.current;
      if (!input) return;
      consumedRouteFocusRef.current = route.key;
      pendingReplyRevealRef.current = replyTargetId;
      // Android Back can dismiss the IME without blurring the native input.
      if (input.isFocused() && !Keyboard.isVisible()) {
        input.blur();
        focusFrameRef.current = requestAnimationFrame(() => {
          focusFrameRef.current = null;
          commentInputRef.current?.focus();
          requestFocus(0);
        });
      } else {
        input.focus();
        requestFocus(0);
        if (Keyboard.isVisible()) revealReplyInViewport();
      }
    });
    return cancelComposerFocus;
  }, [cancelComposerFocus, commentsStatus, currentUserId, detailStatus, focusRequest, isFocused, mode, openedReplyRouteKey, replyTarget, replyTargetId, revealReplyInViewport, route]);

  const handlePressComment = useCallback(
    (commentId: string) => {
      requireLogin(() => {
        if (commentSubmitInFlightRef.current) return;
        if (replyTargetId !== commentId && commentDraftRef.current.length > 0) {
          cancelComposerFocus();
          Keyboard.dismiss();
          setDraftAction({ type: 'reply', id: commentId });
        } else {
          activateReply(commentId);
        }
      });
    },
    [activateReply, cancelComposerFocus, commentDraftRef, commentSubmitInFlightRef, replyTargetId, requireLogin],
  );

  const handleCancelReply = useCallback(() => {
    if (commentSubmitInFlightRef.current) return;
    pendingReplyRevealRef.current = null;
    cancelComposerFocus();
    requestFocus(0);
    Keyboard.dismiss();
    if (commentDraftRef.current.length > 0) setDraftAction({ type: 'reply', id: null });
    else setReplyTargetId(null);
  }, [cancelComposerFocus, commentDraftRef, commentSubmitInFlightRef, setReplyTargetId]);

  const parentPostRouteKey =
    route.name === 'CommunityComments' ? route.params.postRouteKey : undefined;
  const canReturnToPost = !!parentPostRouteKey && navigation.getState().routes.some(
    entry => entry.key === parentPostRouteKey && entry.name === 'CommunityDetail',
  );
  usePreventRemove(
    isFocused && detailStatus === 'ready' && !canReturnToPost && (hasDraft || commentSubmitting),
    ({ data }) => {
      if (commentSubmitInFlightRef.current) return;
      cancelComposerFocus();
      Keyboard.dismiss();
      setDraftAction({ type: 'leave', action: data.action });
    },
  );

  const discardDraft = useCallback(() => {
    if (!draftAction || commentSubmitInFlightRef.current) return;
    commentDraftRef.current = '';
    session.selection.current = undefined;
    setHasDraft(false);
    setCommentDraftResetKey(previous => previous + 1);
    setDraftAction(null);
    if (draftAction.type === 'leave') navigation.dispatch(draftAction.action);
    else if (draftAction.id !== null) activateReply(draftAction.id);
    else setReplyTargetId(null);
  }, [activateReply, commentDraftRef, commentSubmitInFlightRef, draftAction, navigation, session.selection, setCommentDraftResetKey, setHasDraft, setReplyTargetId]);

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
      cancelComposerFocus();
      cancelPendingNavigationScroll();
      Keyboard.dismiss();
      setCommentDeleteTargetId(commentId);
    },
    [cancelComposerFocus, cancelPendingNavigationScroll],
  );

  const handleRequestReportComment = useCallback(
    (commentId: string) => {
      cancelComposerFocus();
      cancelPendingNavigationScroll();
      Keyboard.dismiss();
      setReportTarget({
        targetType: 'comment',
        targetId: commentId,
      });
      setReportReason('');
      setReportReasonCategory('spam');
    },
    [cancelComposerFocus, cancelPendingNavigationScroll],
  );

  const closeReportModal = useCallback(() => {
    if (reportSubmitting) return;
    Keyboard.dismiss();
    setReportTarget(null);
  }, [reportSubmitting]);

  const handleToggleReplies = useCallback(
    (commentId: string) => {
      setExpandedRepliesByCommentId(prev =>
        toggleCommunityReplyExpansion(prev, commentId),
      );
    },
    [setExpandedRepliesByCommentId],
  );

  const handlePressCommentSort = useCallback(() => {
    cancelComposerFocus();
    cancelPendingNavigationScroll();
    Keyboard.dismiss();
    setCommentSortModalVisible(true);
  }, [cancelComposerFocus, cancelPendingNavigationScroll]);

  const handleSelectCommentSort = useCallback(
    (nextSort: CommunityCommentSort) => {
      cancelComposerFocus();
      cancelPendingNavigationScroll();
      session.changeSort(nextSort);
      setCommentSortModalVisible(false);
      setExpandedRepliesByCommentId(replyTarget
        ? { [replyTarget.parentCommentId ?? replyTarget.id]: true }
        : {});
      preparedNavigationTargetKeyRef.current = null;
      measuredNavigationTargetKeyRef.current = null;
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    },
    [
      cancelComposerFocus,
      cancelPendingNavigationScroll,
      replyTarget,
      session,
      setExpandedRepliesByCommentId,
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

  useNotificationDestinationRead(route.params.notificationOpen,
    Boolean(post && detailStatus === 'ready' && (mode === 'post' ||
      (commentsStatus === 'ready' && notificationTargetComment && highlightedCommentId === notificationCommentId))));

  const { widthBand, readingScale } = useResponsiveTypography();
  const typographyScope = useTypographyScope();
  const titleLineHeight = resolveResponsiveTextStyle(styles.postTitle, widthBand, {
    fixedWidth: typographyScope === 'fixed',
    readingScale,
  })?.lineHeight;

  const listHeader = useMemo(() => {
    if (!post) return null;

    return (
      <View style={styles.scrollContent}>
        {mode === 'post' ? (
          <View style={styles.postSection}>
            {post.category || post.title ? (
              <View testID="community-detail-title-row" style={styles.postTitleRow}>
                {post.category ? (
                  <View
                    style={[
                      styles.categoryColumn,
                      { minHeight: post.title ? titleLineHeight : undefined },
                    ]}
                  >
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
                        testID="community-detail-category"
                        preset="caption"
                        style={[
                          styles.categoryText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {getCommunityCategoryLabel(post.category)}
                      </AppText>
                    </View>
                  </View>
                ) : null}
                {post.title ? (
                  <AppText
                    testID="community-detail-title"
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
            ) : null}

            <View style={styles.postMetaRow}>
              <AppText
                preset="body"
                style={[styles.authorName, { color: theme.colors.textPrimary }]}
              >
                {post.authorNickname}
              </AppText>
              {postMetaDate ? (
                <AppText
                  testID="community-detail-created-at"
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
                  styles.postLikePill,
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
    titleLineHeight,
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
      setHasDraft(draft.length > 0);
    },
    [commentDraftRef, setHasDraft],
  );
  const handleNavigateToSignIn = useCallback(() => {
    navigation.navigate('SignIn');
  }, [navigation]);
  const renderCommentThread = useCallback(
    ({ item: commentId }: { item: string }) => (
      <CommentThreadItem
        session={session}
        preview={mode === 'post'}
        previewReplyIds={discussion.previewReplyIds[commentId]}
        commentId={commentId}
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
      theme.colors.textSecondary,
      post?.authorId,
      mode,
      session,
      discussion.previewReplyIds,
    ],
  );

  if ((detailStatus === 'idle' || detailStatus === 'loading') && !post) {
    return (
      <View
        style={[styles.screen, { backgroundColor: '#FFFFFF' }]}
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
        style={[styles.screen, { backgroundColor: '#FFFFFF' }]}
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
        style={[styles.screen, { backgroundColor: '#FFFFFF' }]}
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
        style={[styles.screen, { backgroundColor: '#FFFFFF' }]}
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
        style={[styles.screen, { backgroundColor: '#FFFFFF' }]}
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
    <Animated.View
      testID="community-detail-safe-content"
      style={[styles.screen, { backgroundColor: '#FFFFFF' }, discussionInsets]}
    >
      {/* The list and composer share one bottom inset for the system bar or IME. */}
      <View testID="community-comment-keyboard-owner" style={styles.contentArea}>
        <FlatList
          key={`${currentUserId ?? 'guest'}:${postId}:${sessionId}:${mode}`}
          ref={flatListRef}
          data={visibleTopLevelCommentIds}
          keyExtractor={item => item}
          style={styles.contentArea}
          contentContainerStyle={{ paddingBottom: 12 }}
          contentOffset={initialContentOffset}
          // FlatList excludes its header from anchoring. Anchoring a comment
          // would scroll past the article when its text or photos change height.
          maintainVisibleContentPosition={mode === 'comments' || notificationCommentId ? COMMENT_SCROLL_ANCHOR : undefined}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          automaticallyAdjustKeyboardInsets={false}
          showsVerticalScrollIndicator={false}
          onLayout={({ nativeEvent: { layout: { height } } }) => {
            const shrank = height < listHeightRef.current;
            listHeightRef.current = height;
            if (isFocused && shrank) revealReplyInViewport();
          }}
          onScrollBeginDrag={() => {
            cancelPendingNavigationScroll();
            cancelComposerFocus();
            pendingReplyRevealRef.current = null;
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
          removeClippedSubviews={false}
          ListHeaderComponent={listHeader ?? undefined}
          ListFooterComponent={listFooter ?? undefined}
          renderItem={renderCommentThread}
        />

        {isFocused && canShowCommentComposer ? (
          <CommunityCommentComposer
            key={`${currentUserId ?? 'guest'}:${postId}:${sessionId}`}
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
            accentColor={theme.colors.textSecondary}
            inputRef={commentInputRef}
            onDraftChange={handleCommentDraftChange}
            onSubmit={handleSubmitComment}
            onCancelReply={handleCancelReply}
            onNavigateToSignIn={handleNavigateToSignIn}
          />
        ) : null}
      </View>

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
        visible={draftAction !== null}
        tone="warning"
        confirmRole="destructiveConfirm"
        cancelRole="neutral"
        title="작성 중인 글을 버릴까요?"
        message="버리면 작성 중인 글은 복구할 수 없어요."
        confirmLabel="초안 버리기"
        cancelLabel="계속 작성"
        onCancel={() => setDraftAction(null)}
        onConfirm={discardDraft}
      />

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
    </Animated.View>
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
