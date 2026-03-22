import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useCommunityAuth } from '../../hooks/useCommunityAuth';
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
import { formatRelativeTimeFromNow } from '../../utils/date';

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

export default function CommunityDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scrollViewRef = useRef<ScrollView | null>(null);

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
  const submitComment = useCommunityStore(s => s.submitComment);
  const removeComment = useCommunityStore(s => s.removeComment);
  const reportContent = useCommunityStore(s => s.reportContent);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
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

  const relativeTime = useMemo(() => {
    if (!post) return '';
    return formatRelativeTimeFromNow(post.createdAt);
  }, [post]);

  const handlePressLike = () => {
    requireLogin(() => {
      if (!post || !currentUserId) return;
      togglePostLike(post.id, currentUserId).catch(error => {
        showToast({
          tone: 'error',
          message: getErrorMessage(error) || '좋아요 처리에 실패했어요.',
        });
      });
    });
  };

  const handleSubmitComment = () => {
    requireLogin(() => {
      if (!currentUserId || commentSubmitting) return;
      const trimmed = commentDraft.trim();
      if (!trimmed) {
        showToast({ tone: 'warning', message: '댓글 내용을 입력해 주세요.' });
        return;
      }

      setCommentSubmitting(true);
      submitComment(postId, trimmed, currentUserId)
        .then(() => {
          setCommentDraft('');
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
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 140);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 280);
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

  const stateBody = (() => {
    if ((detailStatus === 'idle' || detailStatus === 'loading') && !post) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={petTheme.primary} />
        </View>
      );
    }

    if (detailStatus === 'not_found') {
      return (
        <StateMessage
          title="게시글을 찾을 수 없어요"
          body="삭제되었거나 더 이상 볼 수 없는 게시글일 수 있어요."
          buttonLabel="뒤로 가기"
          onPress={handleBack}
        />
      );
    }

    if (detailStatus === 'deleted') {
      return (
        <StateMessage
          title="삭제된 게시글입니다"
          body="원문은 더 이상 확인할 수 없어요."
          buttonLabel="뒤로 가기"
          onPress={handleBack}
        />
      );
    }

    if (detailStatus === 'moderated') {
      return (
        <StateMessage
          title="운영 검토 중인 게시글입니다"
          body="검토가 끝나면 다시 노출될 수 있어요."
          buttonLabel="뒤로 가기"
          onPress={handleBack}
        />
      );
    }

    if (detailStatus === 'error' && !post) {
      return (
        <StateMessage
          title="게시글을 불러오지 못했어요"
          body="잠시 후 다시 시도해 주세요."
          buttonLabel="다시 시도"
          onPress={() => {
            fetchPostDetail(postId).catch(() => {});
            fetchPostComments(postId).catch(() => {});
          }}
        />
      );
    }

    if (!post) return null;

    const petName = post.petName?.trim() || null;
    const petBreedAge = [post.petBreed || post.petSpecies, post.petAgeLabel]
      .filter(Boolean)
      .join(' · ');
    const categoryTone = getCategoryTone(post.category);

    return (
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: detailBottomInset },
        ]}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.postCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.postTop}>
            <View style={styles.authorBlock}>
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
                    preset="headline"
                    style={[
                      styles.authorName,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {post.authorNickname}
                  </AppText>
                  {petName ? (
                    <AppText
                      preset="body"
                      numberOfLines={1}
                      style={[
                        styles.petNameLine,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {petName}
                    </AppText>
                  ) : null}
                  {petBreedAge ? (
                    <AppText
                      preset="caption"
                      numberOfLines={1}
                      style={[
                        styles.metaLine,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {petBreedAge}
                    </AppText>
                  ) : null}
                </View>
              </View>
              <AppText
                preset="caption"
                style={[styles.metaLine, { color: theme.colors.textMuted }]}
              >
                {relativeTime}
              </AppText>
            </View>

            <View style={styles.postTopRight}>
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
              ) : null}
              {post ? (
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
              ) : null}
            </View>
          </View>

          <AppText
            preset="body"
            style={[styles.postContent, { color: theme.colors.textPrimary }]}
          >
            {post.content}
          </AppText>

          {post.imageUrl ? (
            <Image
              source={{ uri: post.imageUrl }}
              style={styles.postImage}
              resizeMode="cover"
            />
          ) : post.hasImage ? (
            <View
              style={[
                styles.imageFallback,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Feather name="image" size={18} color={theme.colors.textMuted} />
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
          ) : null}

          <View style={styles.countRow}>
            <Pressable style={styles.countItem} onPress={handlePressLike}>
              <Feather
                name="heart"
                size={17}
                color={
                  post.isLikedByMe
                    ? theme.colors.danger
                    : theme.colors.textMuted
                }
              />
              <AppText
                preset="caption"
                style={[styles.countText, { color: theme.colors.textMuted }]}
              >
                {post.likeCount}
              </AppText>
            </Pressable>
            <View style={styles.countItem}>
              <Feather
                name="message-circle"
                size={17}
                color={theme.colors.textMuted}
              />
              <AppText
                preset="caption"
                style={[styles.countText, { color: theme.colors.textMuted }]}
              >
                {post.commentCount}
              </AppText>
            </View>
            <View style={styles.countItem}>
              <Feather name="eye" size={17} color={theme.colors.textMuted} />
              <AppText
                preset="caption"
                style={[styles.countText, { color: theme.colors.textMuted }]}
              >
                {post.viewCount}
              </AppText>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.commentsCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <AppText
            preset="headline"
            style={[styles.commentsTitle, { color: theme.colors.textPrimary }]}
          >
            댓글
          </AppText>

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
          ) : (
            comments.map((comment, index) => (
              <View
                key={comment.id}
                style={[
                  styles.commentItem,
                  index > 0
                    ? { borderTopColor: theme.colors.border, borderTopWidth: 1 }
                    : null,
                ]}
              >
                <View style={styles.commentTop}>
                  <AppText
                    preset="body"
                    style={[
                      styles.commentAuthor,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {comment.authorNickname}
                  </AppText>
                  <View style={styles.commentTopRight}>
                    <AppText
                      preset="caption"
                      style={[
                        styles.commentTime,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {formatRelativeTimeFromNow(comment.createdAt)}
                    </AppText>
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
                </View>
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
            ))
          )}
        </View>
      </ScrollView>
    );
  })();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top + 8, 20),
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <View style={styles.headerSide}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.backButton}
            onPress={handleBack}
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

      <KeyboardAvoidingView
        style={styles.contentArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.contentArea}>{stateBody}</View>

        {canShowCommentComposer ? (
          <View
            style={[
              styles.commentComposerWrap,
              {
                backgroundColor: theme.colors.background,
                borderTopColor: theme.colors.border,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
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
                value={commentDraft}
                onChangeText={setCommentDraft}
                placeholder={
                  currentUserId
                    ? '댓글을 입력해 주세요'
                    : '로그인 후 댓글을 남길 수 있어요'
                }
                placeholderTextColor={theme.colors.textMuted}
                editable={!!currentUserId && !commentSubmitting}
                style={[
                  styles.commentInput,
                  { color: theme.colors.textPrimary },
                ]}
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
      </KeyboardAvoidingView>

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
  authorName: {
    lineHeight: 28,
    fontSize: 18,
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
  postContent: {
    lineHeight: 26,
    fontSize: 16,
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
  commentsTitle: {
    marginBottom: 14,
    fontSize: 18,
    fontWeight: '700',
  },
  commentsLoading: {
    paddingVertical: 8,
  },
  emptyComments: {
    lineHeight: 22,
    fontSize: 14,
  },
  commentItem: {
    paddingVertical: 12,
  },
  commentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '700',
  },
  commentTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentTime: {
    lineHeight: 18,
    fontSize: 12,
  },
  commentActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentContent: {
    lineHeight: 22,
    fontSize: 15,
  },
  commentComposerWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  commentComposer: {
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 56,
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
