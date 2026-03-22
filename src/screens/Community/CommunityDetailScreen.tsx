import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import PostImageSlider from '../../components/community/PostImageSlider';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useCommunityAuth } from '../../hooks/useCommunityAuth';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { getErrorMessage } from '../../services/app/errors';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { useCommunityStore } from '../../store/communityStore';
import { usePetStore } from '../../store/petStore';
import { showToast } from '../../store/uiStore';
import type {
  CommunityComment,
  CommunityReportReasonCategory,
} from '../../types/community';
import { formatRelativeTimeFromNow, getKstDateParts } from '../../utils/date';

const DETAIL_DIVIDER_COLOR = '#00000008';
const COMMENT_PAGE_SIZE = 10;
const REPLY_PREVIEW_COUNT = 2;

type Nav = NativeStackNavigationProp<RootStackParamList, 'CommunityDetail'>;
type Route = RootScreenRoute<'CommunityDetail'>;
const EMPTY_COMMENTS: ReadonlyArray<CommunityComment> = [];
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

function isBestComment(comment: CommunityComment) {
  return comment.depth === 0 && comment.likeCount >= 5 && comment.status === 'active';
}

export default function CommunityDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const flatListRef = useRef<FlatList<CommunityComment> | null>(null);
  const commentInputRef = useRef<TextInput | null>(null);
  const keyboardInset = useKeyboardInset();

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
  const comments = useCommunityStore(
    s => s.commentsByPostId[postId] ?? EMPTY_COMMENTS,
  );
  const detailStatus = useCommunityStore(
    s => s.detailStatusByPostId[postId] ?? 'idle',
  );
  const commentsStatus = useCommunityStore(
    s => s.commentsStatusByPostId[postId] ?? 'idle',
  );
  const fetchPostDetail = useCommunityStore(s => s.fetchPostDetail);
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
  const [replyTarget, setReplyTarget] = React.useState<CommunityComment | null>(null);
  const [expandedRepliesByCommentId, setExpandedRepliesByCommentId] =
    React.useState<Record<string, boolean>>({});
  const [commentDeleteTarget, setCommentDeleteTarget] =
    React.useState<CommunityComment | null>(null);
  const [reportTarget, setReportTarget] = React.useState<{
    targetType: 'post' | 'comment';
    targetId: string;
  } | null>(null);
  const [reportReasonCategory, setReportReasonCategory] =
    React.useState<CommunityReportReasonCategory>('spam');
  const [reportReason, setReportReason] = React.useState('');
  const [reportSubmitting, setReportSubmitting] = React.useState(false);

  useEffect(() => {
    fetchPostDetail(postId).catch(() => {});
    fetchPostComments(postId).catch(() => {});
  }, [fetchPostComments, fetchPostDetail, postId]);

  useEffect(() => {
    setVisibleCommentCount(COMMENT_PAGE_SIZE);
    setExpandedRepliesByCommentId({});
    setReplyTarget(null);
  }, [postId]);

  const handleBack = () => {
    navigation.goBack();
  };

  const isMyPost = !!post && !!currentUserId && post.authorId === currentUserId;
  const detailBottomInset = insets.bottom + 156;
  const canShowCommentComposer =
    !!post &&
    detailStatus !== 'deleted' &&
    detailStatus !== 'moderated' &&
    detailStatus !== 'not_found';

  const postMetaDate = useMemo(() => {
    if (!post) return '';
    return formatDetailMetaDate(post.createdAt);
  }, [post]);

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
          setReplyTarget(null);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        })
        .catch(error => {
          showToast({
            tone: 'error',
            message: getErrorMessage(error) || '댓글 등록에 실패했어요.',
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
    (comment: CommunityComment) => {
      setReplyTarget(comment);
      focusCommentComposer();
    },
    [focusCommentComposer],
  );

  const handleToggleCommentLike = useCallback(
    (comment: CommunityComment) => {
      requireLogin(() => {
        if (!currentUserId) return;
        toggleCommentLike(comment.id, postId, currentUserId).catch(error => {
          showToast({
            tone: 'error',
            message: getErrorMessage(error) || '댓글 좋아요 처리에 실패했어요.',
          });
        });
      });
    },
    [currentUserId, postId, requireLogin, toggleCommentLike],
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
          showToast({
            tone: result === 'duplicate' ? 'info' : 'success',
            message:
              result === 'duplicate'
                ? '이미 신고한 내용이에요.'
                : '신고가 접수되었어요.',
          });
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
            {isMyPost ? (
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
            ) : (
              <View style={styles.moreButtonPlaceholder} />
            )}
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
          ) : comments.length === 0 ? (
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
    comments.length,
    commentsStatus,
    handlePressLike,
    isMyPost,
    petTheme.primary,
    post,
    postId,
    postMetaDate,
    theme.colors.border,
    theme.colors.danger,
    theme.colors.surface,
    theme.colors.surfaceElevated,
    theme.colors.textMuted,
    theme.colors.textPrimary,
  ]);

  const { topLevelComments, repliesByParentId } = useMemo(() => {
    const topLevel: CommunityComment[] = [];
    const replyMap = new Map<string, CommunityComment[]>();

    comments.forEach(comment => {
      if (comment.depth === 0 || !comment.parentCommentId) {
        topLevel.push(comment);
        return;
      }

      const currentReplies = replyMap.get(comment.parentCommentId) ?? [];
      currentReplies.push(comment);
      replyMap.set(comment.parentCommentId, currentReplies);
    });

    return {
      topLevelComments: topLevel,
      repliesByParentId: replyMap,
    };
  }, [comments]);

  if ((detailStatus === 'idle' || detailStatus === 'loading') && !post) {
    return (
      <View
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <Header onBack={handleBack} topInset={Math.max(insets.top + 8, 20)} />
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
        <Header onBack={handleBack} topInset={Math.max(insets.top + 8, 20)} />
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
        <Header onBack={handleBack} topInset={Math.max(insets.top + 8, 20)} />
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
        <Header onBack={handleBack} topInset={Math.max(insets.top + 8, 20)} />
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
        <Header onBack={handleBack} topInset={Math.max(insets.top + 8, 20)} />
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

  const visibleTopLevelComments = topLevelComments.slice(0, visibleCommentCount);
  const remainingCommentCount = Math.max(
    topLevelComments.length - visibleTopLevelComments.length,
    0,
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Header onBack={handleBack} topInset={Math.max(insets.top + 8, 20)} />

      <FlatList
        ref={flatListRef}
        data={visibleTopLevelComments}
        keyExtractor={item => item.id}
        style={styles.contentArea}
        contentContainerStyle={{ paddingBottom: detailBottomInset }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={true}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        renderItem={({ item: comment, index }) => {
          const replies = repliesByParentId.get(comment.id) ?? EMPTY_COMMENTS;
          const repliesExpanded = expandedRepliesByCommentId[comment.id] === true;
          const visibleReplies = repliesExpanded
            ? replies
            : replies.slice(0, REPLY_PREVIEW_COUNT);
          const remainingReplyCount = Math.max(replies.length - visibleReplies.length, 0);

          return (
            <View
              style={[
                styles.commentThreadWrap,
                index > 0
                  ? { borderTopColor: DETAIL_DIVIDER_COLOR, borderTopWidth: 1 }
                  : null,
              ]}
            >
              <View style={styles.commentRow}>
                {comment.authorAvatarUrl ? (
                  <Image
                    source={{ uri: comment.authorAvatarUrl }}
                    style={[styles.commentAvatar, { borderColor: theme.colors.border }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.commentAvatarFallback,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Feather name="user" size={12} color={theme.colors.textMuted} />
                  </View>
                )}

                <View style={styles.commentBodyWrap}>
                  <View style={styles.commentMetaRow}>
                    <View style={styles.commentMetaInline}>
                      <AppText
                        preset="caption"
                        style={[
                          styles.commentMetaText,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {`${comment.authorNickname} · ${formatRelativeTimeFromNow(comment.createdAt)}`}
                      </AppText>
                      {isBestComment(comment) ? (
                        <View
                          style={[
                            styles.bestBadge,
                            { backgroundColor: `${petTheme.primary}12` },
                          ]}
                        >
                          <AppText
                            preset="caption"
                            style={[styles.bestBadgeText, { color: petTheme.primary }]}
                          >
                            Best
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.commentBubble,
                      { backgroundColor: theme.colors.surfaceElevated },
                    ]}
                  >
                    <AppText
                      preset="body"
                      style={[
                        styles.commentContent,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {comment.content}
                    </AppText>
                  </View>

                  <View style={styles.commentActionRow}>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => handlePressReply(comment)}
                    >
                      <AppText
                        preset="caption"
                        style={[
                          styles.commentActionText,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        답글쓰기
                      </AppText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => handleToggleCommentLike(comment)}
                    >
                      <AppText
                        preset="caption"
                        style={[
                          styles.commentActionText,
                          {
                            color: comment.isLikedByMe
                              ? theme.colors.danger
                              : theme.colors.textMuted,
                          },
                        ]}
                      >
                        좋아요 {comment.likeCount}
                      </AppText>
                    </TouchableOpacity>

                    {currentUserId ? (
                      comment.authorId === currentUserId ? (
                        <TouchableOpacity
                          activeOpacity={0.88}
                          onPress={() => setCommentDeleteTarget(comment)}
                        >
                          <AppText
                            preset="caption"
                            style={[
                              styles.commentActionText,
                              { color: theme.colors.danger },
                            ]}
                          >
                            삭제
                          </AppText>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          activeOpacity={0.88}
                          onPress={() => {
                            setReportTarget({
                              targetType: 'comment',
                              targetId: comment.id,
                            });
                            setReportReason('');
                            setReportReasonCategory('spam');
                          }}
                        >
                          <AppText
                            preset="caption"
                            style={[
                              styles.commentActionText,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            신고
                          </AppText>
                        </TouchableOpacity>
                      )
                    ) : null}
                  </View>

                  {visibleReplies.length > 0 ? (
                    <View style={styles.replyListWrap}>
                      {visibleReplies.map(reply => (
                        <View key={reply.id} style={styles.replyRow}>
                          <View style={styles.replyConnector} />
                          <View style={styles.replyContentWrap}>
                            <View style={styles.replyMetaRow}>
                              <AppText
                                preset="caption"
                                style={[
                                  styles.replyMetaText,
                                  { color: theme.colors.textMuted },
                                ]}
                              >
                                {`${reply.authorNickname} · ${formatRelativeTimeFromNow(reply.createdAt)}`}
                              </AppText>
                            </View>
                            <View
                              style={[
                                styles.replyBubble,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <AppText
                                preset="body"
                                style={[
                                  styles.replyContent,
                                  { color: theme.colors.textPrimary },
                                ]}
                              >
                                {reply.content}
                              </AppText>
                            </View>
                            <View style={styles.replyActionRow}>
                              <TouchableOpacity
                                activeOpacity={0.88}
                                onPress={() => handlePressReply(reply)}
                              >
                                <AppText
                                  preset="caption"
                                  style={[
                                    styles.commentActionText,
                                    { color: theme.colors.textMuted },
                                  ]}
                                >
                                  답글쓰기
                                </AppText>
                              </TouchableOpacity>
                              <TouchableOpacity
                                activeOpacity={0.88}
                                onPress={() => handleToggleCommentLike(reply)}
                              >
                                <AppText
                                  preset="caption"
                                  style={[
                                    styles.commentActionText,
                                    {
                                      color: reply.isLikedByMe
                                        ? theme.colors.danger
                                        : theme.colors.textMuted,
                                    },
                                  ]}
                                >
                                  좋아요 {reply.likeCount}
                                </AppText>
                              </TouchableOpacity>
                              {currentUserId ? (
                                reply.authorId === currentUserId ? (
                                  <TouchableOpacity
                                    activeOpacity={0.88}
                                    onPress={() => setCommentDeleteTarget(reply)}
                                  >
                                    <AppText
                                      preset="caption"
                                      style={[
                                        styles.commentActionText,
                                        { color: theme.colors.danger },
                                      ]}
                                    >
                                      삭제
                                    </AppText>
                                  </TouchableOpacity>
                                ) : (
                                  <TouchableOpacity
                                    activeOpacity={0.88}
                                    onPress={() => {
                                      setReportTarget({
                                        targetType: 'comment',
                                        targetId: reply.id,
                                      });
                                      setReportReason('');
                                      setReportReasonCategory('spam');
                                    }}
                                  >
                                    <AppText
                                      preset="caption"
                                      style={[
                                        styles.commentActionText,
                                        { color: theme.colors.textMuted },
                                      ]}
                                    >
                                      신고
                                    </AppText>
                                  </TouchableOpacity>
                                )
                              ) : null}
                            </View>
                          </View>
                        </View>
                      ))}

                      {remainingReplyCount > 0 ? (
                        <TouchableOpacity
                          activeOpacity={0.88}
                          style={styles.moreRepliesButton}
                          onPress={() => {
                            setExpandedRepliesByCommentId(prev => ({
                              ...prev,
                              [comment.id]: true,
                            }));
                          }}
                        >
                          <AppText
                            preset="caption"
                            style={[
                              styles.moreRepliesText,
                              { color: petTheme.primary },
                            ]}
                          >
                            답글 {remainingReplyCount}개 더보기
                          </AppText>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : comment.replyCount > 0 ? (
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={styles.moreRepliesButton}
                      onPress={() => {
                        setExpandedRepliesByCommentId(prev => ({
                          ...prev,
                          [comment.id]: true,
                        }));
                      }}
                    >
                      <AppText
                        preset="caption"
                        style={[
                          styles.moreRepliesText,
                          { color: petTheme.primary },
                        ]}
                      >
                        답글 {comment.replyCount}개 보기
                      </AppText>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          );
        }}
      />

      {remainingCommentCount > 0 ? (
        <View style={styles.moreCommentsWrap}>
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
                Math.min(previousCount + COMMENT_PAGE_SIZE, topLevelComments.length),
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
      ) : null}

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
                onPress={() => setReplyTarget(null)}
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
                  opacity: commentSubmitting ? 0.72 : 1,
                },
              ]}
              disabled={commentSubmitting}
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
        visible={commentDeleteTarget !== null}
        tone="danger"
        title="댓글을 삭제할까요?"
        message={
          '삭제한 댓글은 복구되지 않아요.\n정말로 삭제할지 다시 확인해 주세요.'
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        onCancel={() => setCommentDeleteTarget(null)}
        onConfirm={() => {
          if (!commentDeleteTarget) return;
          removeComment(commentDeleteTarget.id, postId)
            .then(() => {
              setCommentDeleteTarget(null);
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
        onRequestClose={() => {
          if (reportSubmitting) return;
          setReportTarget(null);
        }}
      >
        <View
          style={[
            styles.menuBackdrop,
            { backgroundColor: theme.colors.overlay },
          ]}
        >
          <Pressable
            style={styles.menuScrim}
            onPress={() => {
              if (reportSubmitting) return;
              setReportTarget(null);
            }}
          />
          <View
            style={[
              styles.reportSheet,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <AppText
              preset="headline"
              style={[styles.reportTitle, { color: theme.colors.textPrimary }]}
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
                            backgroundColor: petTheme.tint,
                            borderColor: petTheme.primary,
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
                            ? petTheme.deep
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
                onPress={() => setReportTarget(null)}
                disabled={reportSubmitting}
              >
                <AppText
                  preset="body"
                  style={{ color: theme.colors.textPrimary, fontWeight: '700' }}
                >
                  취소
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.88}
                style={[
                  styles.reportActionButton,
                  { backgroundColor: petTheme.primary },
                ]}
                onPress={handleSubmitReport}
                disabled={reportSubmitting}
              >
                <AppText
                  preset="body"
                  style={{ color: petTheme.onPrimary, fontWeight: '700' }}
                >
                  {reportSubmitting ? '접수 중...' : '신고 접수'}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Header({
  onBack,
  topInset,
}: {
  onBack: () => void;
  topInset: number;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: topInset,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <View style={styles.headerSide}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.backButton}
          onPress={onBack}
        >
          <Feather
            name="arrow-left"
            size={20}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
      </View>
      <AppText
        preset="headline"
        style={[styles.headerTitle, { color: theme.colors.textPrimary }]}
      >
        커뮤니티
      </AppText>
      <View style={styles.headerSide} />
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerSide: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  stateTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  stateBody: {
    textAlign: 'center',
    lineHeight: 22,
  },
  stateButton: {
    marginTop: 18,
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingTop: 12,
  },
  postSection: {
    paddingTop: 4,
    paddingBottom: 18,
    gap: 16,
  },
  postCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 16,
  },
  postTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  postTopRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  authorBlock: {
    flex: 1,
    gap: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  authorName: {
    lineHeight: 22,
    fontSize: 15,
    fontWeight: '700',
  },
  petAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  petAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextBlock: {
    flex: 1,
    gap: 4,
  },
  petNameLine: {
    lineHeight: 22,
    fontSize: 15,
    fontWeight: '600',
  },
  metaLine: {
    lineHeight: 18,
    fontSize: 12,
  },
  categoryBadge: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  moreButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonPlaceholder: {
    width: 34,
    height: 34,
  },
  postTitle: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '700',
  },
  mediaSection: {
    marginTop: 4,
    marginBottom: 6,
  },
  postContent: {
    lineHeight: 32,
    fontSize: 18,
  },
  postContentSection: {
    borderTopWidth: 1,
    minHeight: 300,
    paddingTop: 20,
    paddingBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 260,
    borderRadius: 18,
  },
  imageFallback: {
    minHeight: 84,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageFallbackText: {
    lineHeight: 18,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 2,
    justifyContent: 'space-between',
  },
  actionPill: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPillText: {
    lineHeight: 18,
    fontSize: 12,
    fontWeight: '700',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    lineHeight: 18,
    fontSize: 12,
  },
  commentsCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  commentsSection: {
    paddingTop: 6,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: DETAIL_DIVIDER_COLOR,
    marginBottom: 8,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  commentsCount: {
    fontSize: 12,
    lineHeight: 18,
  },
  commentsLoading: {
    paddingVertical: 10,
  },
  emptyComments: {
    lineHeight: 22,
    fontSize: 14,
  },
  commentItemWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  commentThreadWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  commentAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBodyWrap: {
    flex: 1,
    minWidth: 0,
  },
  commentMetaRow: {
    marginBottom: 6,
  },
  commentMetaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  commentMetaText: {
    fontSize: 12,
    lineHeight: 16,
  },
  bestBadge: {
    minHeight: 20,
    borderRadius: 10,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
  commentBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  commentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingLeft: 2,
  },
  commentActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentContent: {
    lineHeight: 23,
    fontSize: 14,
  },
  replyListWrap: {
    marginTop: 10,
    gap: 10,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 4,
  },
  replyConnector: {
    width: 14,
    minHeight: 34,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 0,
    borderColor: DETAIL_DIVIDER_COLOR,
  },
  replyContentWrap: {
    flex: 1,
    minWidth: 0,
  },
  replyMetaRow: {
    marginBottom: 5,
  },
  replyMetaText: {
    fontSize: 12,
    lineHeight: 16,
  },
  replyBubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  replyContent: {
    fontSize: 13,
    lineHeight: 21,
  },
  replyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 7,
    paddingLeft: 2,
  },
  moreRepliesButton: {
    alignSelf: 'flex-start',
    paddingLeft: 26,
    paddingTop: 2,
    minHeight: 28,
    justifyContent: 'center',
  },
  moreRepliesText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  moreCommentsWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  moreCommentsButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  moreCommentsText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  commentComposerWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  replyComposerBanner: {
    minHeight: 34,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  replyComposerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  replyComposerCancel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  commentComposer: {
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 58,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 96,
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 4,
    paddingBottom: 4,
  },
  commentSubmitButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  menuScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  menuSheet: {
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 8,
    maxWidth: 320,
    width: '100%',
    alignSelf: 'center',
  },
  menuAction: {
    minHeight: 52,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuDangerAction: {
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  menuActionText: {
    fontWeight: '700',
  },
  reportSheet: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 14,
    maxWidth: 360,
    width: '100%',
    alignSelf: 'center',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  reportReasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportReasonButton: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportReasonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reportInput: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontSize: 14,
    lineHeight: 21,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
  },
  reportActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
