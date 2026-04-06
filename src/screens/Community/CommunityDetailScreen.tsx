import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAvoidingView as KeyboardControllerAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import PostImageSlider from '../../components/community/PostImageSlider';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PremiumNoticeModal from '../../components/common/PremiumNoticeModal';
import { useCommunityAuth } from '../../hooks/useCommunityAuth';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { getErrorMessage } from '../../services/app/errors';
import { getCommunityMutationErrorMeta } from '../../services/community/errors';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { useCommunityStore } from '../../store/communityStore';
import { usePetStore } from '../../store/petStore';
import { showToast } from '../../store/uiStore';
import type {
  CommunityComment,
  CommunityReportReasonCategory,
} from '../../types/community';
import { getKstDateParts } from '../../utils/date';
import CommentThreadItem from './components/CommentThreadItem';
import {
  DETAIL_DIVIDER_COLOR,
  styles,
} from './CommunityDetailScreen.styles';
const COMMENT_PAGE_SIZE = 10;
const REPLY_PREVIEW_COUNT = 2;

type Nav = NativeStackNavigationProp<RootStackParamList, 'CommunityDetail'>;
type Route = RootScreenRoute<'CommunityDetail'>;
const EMPTY_COMMENT_IDS: ReadonlyArray<string> = [];
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

function getCategoryLabel(category: string | null) {
  switch (category) {
    case 'question':
      return '질문';
    case 'info':
      return '팁 공유';
    case 'daily':
      return '일상';
    case 'free':
      return '정보';
    default:
      return '';
  }
}

function getCategoryTone(category: string | null) {
  switch (category) {
    case 'question':
      return {
        backgroundColor: '#E8F8EE',
        borderColor: '#B9E9CA',
        textColor: '#1F8A4D',
      };
    case 'info':
      return {
        backgroundColor: '#E9F6FF',
        borderColor: '#B9E0FF',
        textColor: '#2176C7',
      };
    case 'daily':
      return {
        backgroundColor: '#FFF2E8',
        borderColor: '#FFD6B8',
        textColor: '#C66A1D',
      };
    case 'free':
      return {
        backgroundColor: '#F2F3F5',
        borderColor: '#D8DCE1',
        textColor: '#5B6470',
      };
    default:
      return null;
  }
}

function formatDetailMetaDate(input: string) {
  const parts = getKstDateParts(input);
  if (!parts) return '';
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}.${month}.${day}`;
}

function resolveReplyParentId(comment: CommunityComment) {
  if (comment.depth === 0) {
    return comment.id;
  }

  return comment.parentCommentId ?? comment.id;
}

export default function CommunityDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const flatListRef = useRef<FlatList<string> | null>(null);
  const commentInputRef = useRef<TextInput | null>(null);
  const keyboardInset = useKeyboardInset();
  const viewRecordAttemptedPostIdsRef = useRef<Record<string, boolean>>({});
  const commentLikeDebounceTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  const { currentUserId, requireLogin } = useCommunityAuth();
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

  const postId = route.params.postId;
  const post = useCommunityStore(s => s.postsById[postId] ?? null);
  const topLevelCommentIds = useCommunityStore(
    s => s.topLevelCommentIdsByPostId[postId] ?? EMPTY_COMMENT_IDS,
  );
  const detailStatus = useCommunityStore(
    s => s.detailStatusByPostId[postId] ?? 'idle',
  );
  const commentsStatus = useCommunityStore(
    s => s.commentsStatusByPostId[postId] ?? 'idle',
  );
  const fetchPostDetail = useCommunityStore(s => s.fetchPostDetail);
  const recordPostView = useCommunityStore(s => s.recordPostView);
  const fetchPostComments = useCommunityStore(s => s.fetchPostComments);
  const removePost = useCommunityStore(s => s.removePost);
  const togglePostLike = useCommunityStore(s => s.togglePostLike);
  const toggleCommentLike = useCommunityStore(s => s.toggleCommentLike);
  const submitComment = useCommunityStore(s => s.submitComment);
  const removeComment = useCommunityStore(s => s.removeComment);
  const reportContent = useCommunityStore(s => s.reportContent);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [visibleCommentCount, setVisibleCommentCount] =
    React.useState(COMMENT_PAGE_SIZE);
  const [replyTargetId, setReplyTargetId] = React.useState<string | null>(null);
  const [expandedRepliesByCommentId, setExpandedRepliesByCommentId] =
    React.useState<Record<string, boolean>>({});
  const [commentDeleteTargetId, setCommentDeleteTargetId] =
    React.useState<string | null>(null);
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
        replyTargetId !== null ? s.commentEntitiesById[replyTargetId] ?? null : null,
      [replyTargetId],
    ),
  );

  useEffect(() => {
    fetchPostDetail(postId).catch(() => {});
    fetchPostComments(postId).catch(() => {});
  }, [fetchPostComments, fetchPostDetail, postId]);

  useEffect(() => {
    if (!post || detailStatus !== 'ready') return;
    if (viewRecordAttemptedPostIdsRef.current[postId]) return;

    viewRecordAttemptedPostIdsRef.current[postId] = true;
    recordPostView(postId).catch(() => {});
  }, [detailStatus, post, postId, recordPostView]);

  useEffect(() => {
    setVisibleCommentCount(COMMENT_PAGE_SIZE);
    setExpandedRepliesByCommentId({});
    setReplyTargetId(null);
  }, [postId]);

  useEffect(
    () => () => {
      Object.values(commentLikeDebounceTimersRef.current).forEach(timer => {
        clearTimeout(timer);
      });
      commentLikeDebounceTimersRef.current = {};
    },
    [],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const isMyPost = !!post && !!currentUserId && post.authorId === currentUserId;
  const detailBottomInset = insets.bottom + 156;
  const reportBottomInset = Math.max(insets.bottom, 16) + 8;
  const canShowCommentComposer =
    !!post &&
    detailStatus !== 'deleted' &&
    detailStatus !== 'moderated' &&
    detailStatus !== 'not_found';
  const canSubmitComment =
    !!currentUserId && !commentSubmitting && commentDraft.trim().length > 0;

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
        <Feather
          name="arrow-left"
          size={20}
          color={theme.colors.textPrimary}
        />
      </TouchableOpacity>
    ),
    [handleBack, theme.colors.textPrimary],
  );
  const renderHeaderRight = useCallback(
    () =>
      isMyPost ? (
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.moreButton,
            { borderColor: theme.colors.border },
          ]}
          onPress={() => setMenuVisible(true)}
        >
          <Feather
            name="more-vertical"
            size={18}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
      ) : null,
    [isMyPost, theme.colors.border, theme.colors.textPrimary],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '커뮤니티',
      headerLeft: renderHeaderLeft,
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderLeft, renderHeaderRight]);

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

  const handleSubmitComment = () => {
    requireLogin(() => {
      if (!currentUserId || commentSubmitting) return;
      const trimmed = commentDraft.trim();
      if (!trimmed) {
        showToast({ tone: 'warning', message: '댓글 내용을 입력해 주세요.' });
        return;
      }

      setCommentSubmitting(true);
      submitComment(
        postId,
        trimmed,
        currentUserId,
        replyTarget ? resolveReplyParentId(replyTarget) : null,
      )
        .then(() => {
          setCommentDraft('');
          setReplyTargetId(null);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
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
          setCommentSubmitting(false);
        });
    });
  };

  const scrollCommentComposerIntoView = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 300);
  }, []);

  const focusCommentComposer = useCallback(() => {
    commentInputRef.current?.focus();
    scrollCommentComposerIntoView();
  }, [scrollCommentComposerIntoView]);

  const handlePressReply = useCallback(
    (commentId: string) => {
      setReplyTargetId(commentId);
      focusCommentComposer();
    },
    [focusCommentComposer],
  );

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

  const handleRequestDeleteComment = useCallback((commentId: string) => {
    setCommentDeleteTargetId(commentId);
  }, []);

  const handleRequestReportComment = useCallback((commentId: string) => {
    setReportTarget({
      targetType: 'comment',
      targetId: commentId,
    });
    setReportReason('');
    setReportReasonCategory('spam');
  }, []);

  const closeReportModal = useCallback(() => {
    if (reportSubmitting) return;
    Keyboard.dismiss();
    setReportTarget(null);
  }, [reportSubmitting]);

  const handleExpandReplies = useCallback((commentId: string) => {
    setExpandedRepliesByCommentId(prev => {
      if (prev[commentId] === true) return prev;
      return {
        ...prev,
        [commentId]: true,
      };
    });
  }, []);

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

          fetchPostDetail(postId).catch(() => {});
          if (submittedTarget.targetType === 'comment') {
            fetchPostComments(postId).catch(() => {});
          }

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

    const categoryTone = getCategoryTone(post.category);

    return (
      <View style={styles.scrollContent}>
        <View style={styles.postSection}>
          <View style={styles.postTop}>
            {post.category && categoryTone ? (
              <View
                style={[
                  styles.categoryBadge,
                  {
                    backgroundColor: categoryTone.backgroundColor,
                    borderColor: categoryTone.borderColor,
                  },
                ]}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.categoryText,
                    { color: categoryTone.textColor },
                  ]}
                >
                  {getCategoryLabel(post.category)}
                </AppText>
              </View>
            ) : (
              <View />
            )}
            <View style={styles.moreButtonPlaceholder} />
          </View>

          {post.title ? (
            <AppText
              preset="headline"
              style={[styles.postTitle, { color: theme.colors.textPrimary }]}
            >
              {post.title}
            </AppText>
          ) : null}

          <View style={styles.postMetaRow}>
            <View style={styles.profileRow}>
              {post.petAvatarUrl ? (
                <Image
                  source={{ uri: post.petAvatarUrl }}
                  style={[
                    styles.petAvatar,
                    { borderColor: theme.colors.border },
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.petAvatarFallback,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Feather
                    name="user"
                    size={16}
                    color={theme.colors.textMuted}
                  />
                </View>
              )}
              <View style={styles.profileTextBlock}>
                <AppText
                  preset="body"
                  style={[
                    styles.authorName,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {post.authorNickname}
                </AppText>
                <AppText
                  preset="caption"
                  style={[styles.metaLine, { color: theme.colors.textMuted }]}
                >
                  {postMetaDate
                    ? `${postMetaDate} · 조회수 ${post.viewCount.toLocaleString()}`
                    : `조회수 ${post.viewCount.toLocaleString()}`}
                </AppText>
              </View>
            </View>
          </View>

          {(post.imageUrls?.length ?? 0) > 0 || post.hasImage ? (
            <View style={styles.mediaSection}>
              {(post.imageUrls?.length ?? 0) > 0 ? (
                <PostImageSlider imageUrls={post.imageUrls ?? []} />
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

          <View
            style={[
              styles.postContentSection,
              { borderTopColor: DETAIL_DIVIDER_COLOR },
            ]}
          >
            <AppText
              preset="body"
              style={[styles.postContent, { color: theme.colors.textPrimary }]}
            >
              {post.content}
            </AppText>
          </View>

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
              <Pressable
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
                <MaterialCommunityIcons
                  name="alarm-light-outline"
                  size={16}
                  color={theme.colors.textMuted}
                />
                <AppText
                  preset="caption"
                  style={[styles.actionPillText, { color: theme.colors.textPrimary }]}
                >
                  신고하기
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.commentsSection}>
          <View style={styles.commentsHeader}>
            <AppText
              preset="headline"
              style={[styles.commentsTitle, { color: theme.colors.textPrimary }]}
            >
              댓글
            </AppText>
            <AppText
              preset="caption"
              style={[styles.commentsCount, { color: theme.colors.textMuted }]}
            >
              {post.commentCount.toLocaleString()}개
            </AppText>
          </View>
          {commentsStatus === 'loading' ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator size="small" color={petTheme.primary} />
            </View>
          ) : topLevelCommentIds.length === 0 ? (
            <AppText
              preset="body"
              style={[styles.emptyComments, { color: theme.colors.textMuted }]}
            >
              아직 댓글이 없어요.
            </AppText>
          ) : null}
        </View>
      </View>
    );
  }, [
    commentsStatus,
    handlePressLike,
    isMyPost,
    petTheme.primary,
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
  ]);

  const visibleTopLevelCommentIds = topLevelCommentIds.slice(0, visibleCommentCount);
  const remainingCommentCount = Math.max(
    topLevelCommentIds.length - visibleTopLevelCommentIds.length,
    0,
  );

  const listFooter = useMemo(() => {
    if (remainingCommentCount <= 0) {
      return <View style={styles.listFooterSpacer} />;
    }

    return (
      <View style={styles.listFooterWrap}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.moreCommentsButton,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => {
            setVisibleCommentCount(previousCount =>
              Math.min(previousCount + COMMENT_PAGE_SIZE, topLevelCommentIds.length),
            );
          }}
        >
          <AppText
            preset="caption"
            style={[styles.moreCommentsText, { color: theme.colors.textPrimary }]}
          >
            댓글 {remainingCommentCount.toLocaleString()}개 더보기
          </AppText>
          <Feather name="chevron-right" size={15} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
    );
  }, [
    remainingCommentCount,
    theme.colors.background,
    theme.colors.border,
    theme.colors.textPrimary,
    topLevelCommentIds.length,
  ]);

  const renderCommentThread = useCallback(
    ({ item: commentId }: { item: string }) => (
      <CommentThreadItem
        commentId={commentId}
        repliesExpanded={expandedRepliesByCommentId[commentId] === true}
        previewCount={REPLY_PREVIEW_COUNT}
        currentUserId={currentUserId}
        bestBadgeColor={petTheme.primary}
        onPressReply={handlePressReply}
        onToggleLike={handleToggleCommentLike}
        onPressDelete={handleRequestDeleteComment}
        onPressReport={handleRequestReportComment}
        onExpandReplies={handleExpandReplies}
      />
    ),
    [
      currentUserId,
      expandedRepliesByCommentId,
      handleExpandReplies,
      handlePressReply,
      handleRequestDeleteComment,
      handleRequestReportComment,
      handleToggleCommentLike,
      petTheme.primary,
    ],
  );

  if ((detailStatus === 'idle' || detailStatus === 'loading') && !post) {
    return (
      <View
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={petTheme.primary} />
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
          onPress={() => {
            fetchPostDetail(postId).catch(() => {});
            fetchPostComments(postId).catch(() => {});
          }}
        />
      </View>
    );
  }

  if (!post) return null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={visibleTopLevelCommentIds}
        keyExtractor={item => item}
        style={styles.contentArea}
        contentContainerStyle={{ paddingBottom: detailBottomInset }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={true}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={Keyboard.dismiss}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        renderItem={renderCommentThread}
      />

      {canShowCommentComposer ? (
        <View
          style={[
            styles.commentComposerWrap,
            {
              backgroundColor: theme.colors.background,
              borderTopColor: theme.colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
              marginBottom: keyboardInset,
            },
          ]}
        >
          {replyTarget ? (
            <View
              style={[
                styles.replyComposerBanner,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <AppText
                preset="caption"
                style={[styles.replyComposerText, { color: theme.colors.textPrimary }]}
              >
                {`${replyTarget.authorNickname}님에게 답글 남기는 중`}
              </AppText>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setReplyTargetId(null)}
              >
                <AppText
                  preset="caption"
                  style={[styles.replyComposerCancel, { color: theme.colors.textMuted }]}
                >
                  취소
                </AppText>
              </TouchableOpacity>
            </View>
          ) : null}
          <View
            style={[
              styles.commentComposer,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <TextInput
              ref={commentInputRef}
              value={commentDraft}
              onChangeText={setCommentDraft}
              placeholder={
                currentUserId
                  ? replyTarget
                    ? '답글을 입력해 주세요'
                    : '댓글을 입력해 주세요'
                  : '로그인 후 댓글을 남길 수 있어요'
              }
              placeholderTextColor={theme.colors.textMuted}
              editable={!!currentUserId && !commentSubmitting}
              style={[styles.commentInput, { color: theme.colors.textPrimary }]}
              multiline
              maxLength={500}
              onFocus={() => {
                if (!currentUserId) {
                  navigation.navigate('SignIn');
                  return;
                }
                scrollCommentComposerIntoView();
              }}
            />
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.commentSubmitButton,
                {
                  backgroundColor: petTheme.primary,
                  opacity: canSubmitComment ? 1 : 0.48,
                },
              ]}
              disabled={!canSubmitComment}
              onPress={handleSubmitComment}
            >
              <Feather name="send" size={17} color={petTheme.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

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
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.menuAction}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('CommunityEdit', { postId });
                }}
              >
                <Feather
                  name="edit-3"
                  size={16}
                  color={theme.colors.textPrimary}
                />
                <AppText
                  preset="body"
                  style={[
                    styles.menuActionText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  수정
                </AppText>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.menuAction, styles.menuDangerAction]}
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
              <Feather
                name={isMyPost ? 'trash-2' : 'flag'}
                size={16}
                color={
                  isMyPost ? theme.colors.danger : theme.colors.textPrimary
                }
              />
              <AppText
                preset="body"
                style={[
                  styles.menuActionText,
                  {
                    color: isMyPost
                      ? theme.colors.danger
                      : theme.colors.textPrimary,
                  },
                ]}
              >
                {isMyPost ? '삭제' : '신고'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
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
          removeComment(commentDeleteTargetId, postId)
            .then(() => {
              setCommentDeleteTargetId(null);
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : Math.max(insets.bottom, 8)}
        >
          <Pressable style={styles.menuScrim} onPress={closeReportModal} />
          <Pressable
            style={styles.reportSheetTouchGuard}
            onPress={Keyboard.dismiss}
          >
            <View
              style={[
                styles.reportSheet,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.brand,
                  paddingBottom: reportBottomInset,
                },
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
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[
                    styles.reportActionButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={closeReportModal}
                  disabled={reportSubmitting}
                >
                  <AppText
                    preset="body"
                    style={{
                      color: theme.colors.textPrimary,
                      fontWeight: '700',
                    }}
                  >
                    취소
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[
                    styles.reportActionButton,
                    {
                      backgroundColor: theme.colors.brand,
                      borderColor: theme.colors.brand,
                    },
                  ]}
                  onPress={handleSubmitReport}
                  disabled={reportSubmitting}
                >
                  <AppText
                    preset="body"
                    style={{ color: '#FFFFFF', fontWeight: '700' }}
                  >
                    {reportSubmitting ? '접수 중...' : '신고하기'}
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </KeyboardControllerAvoidingView>
      </Modal>

      <PremiumNoticeModal
        visible={reportNotice !== null}
        eyebrow={reportNotice === 'duplicate' ? 'REPORT RECEIVED' : 'REPORT SUBMITTED'}
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
}: {
  title: string;
  body: string;
  buttonLabel: string;
  onPress: () => void;
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
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.stateButton,
          { backgroundColor: theme.colors.textPrimary },
        ]}
        onPress={onPress}
      >
        <AppText preset="body" style={styles.stateButtonText}>
          {buttonLabel}
        </AppText>
      </TouchableOpacity>
    </View>
  );
}
