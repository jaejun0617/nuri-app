import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { useCommunityAuth } from '../../hooks/useCommunityAuth';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { useCommunityStore } from '../../store/communityStore';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer, showToast } from '../../store/uiStore';
import type {
  CommunityComment,
  CommunityPost,
  CommunityPostCategory,
} from '../../types/community';
import PostCard from './components/PostCard';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CommunityList'>;
type Route = RootScreenRoute<'CommunityList'>;

type CategoryChip = {
  key: 'all' | CommunityPostCategory;
  label: string;
  value: CommunityPostCategory | null;
};

const CATEGORY_CHIPS: CategoryChip[] = [
  { key: 'all', label: '전체', value: null },
  { key: 'question', label: '질문', value: 'question' },
  { key: 'info', label: '팁 공유', value: 'info' },
  { key: 'daily', label: '일상', value: 'daily' },
  { key: 'free', label: '정보', value: 'free' },
];

const keyExtractor = (item: CommunityPost) => item.id;
const EMPTY_COMMENTS: ReadonlyArray<CommunityComment> = [];

const ListFooterLoading = memo(function ListFooterLoading() {
  return (
    <View style={styles.footerLoading}>
      <ActivityIndicator size="small" />
    </View>
  );
});

type CategoryChipButtonProps = {
  chip: CategoryChip;
  isActive: boolean;
  activeColor: string;
  onPress: (category: CommunityPostCategory | null) => void;
};

const CategoryChipButton = memo(function CategoryChipButton({
  chip,
  isActive,
  activeColor,
  onPress,
}: CategoryChipButtonProps) {
  const underlineProgress = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(underlineProgress, {
      toValue: isActive ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isActive, underlineProgress]);

  const handlePress = useCallback(() => {
    onPress(chip.value);
  }, [chip.value, onPress]);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={styles.categoryChip}
      onPress={handlePress}
    >
      <AppText
        preset="caption"
        style={[
          styles.categoryChipText,
          isActive
            ? [styles.categoryChipTextActive, { color: activeColor }]
            : { color: '#8A8A8A' },
        ]}
      >
        {chip.label}
      </AppText>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.categoryChipUnderline,
          {
            backgroundColor: activeColor,
            opacity: underlineProgress,
            transform: [
              {
                scaleX: underlineProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 1],
                }),
              },
            ],
          },
        ]}
      />
    </TouchableOpacity>
  );
});

export default function CommunityListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const flatListRef = useRef<FlatList<CommunityPost> | null>(null);
  const pendingCategoryTransitionRef = useRef<
    CommunityPostCategory | null | 'all'
  >(null);

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

  const posts = useCommunityStore(s => s.posts);
  const listStatus = useCommunityStore(s => s.listStatus);
  const listErrorMessage = useCommunityStore(s => s.listErrorMessage);
  const hasMore = useCommunityStore(s => s.hasMore);
  const activeCategory = useCommunityStore(s => s.activeCategory);
  const lastFetchedAt = useCommunityStore(s => s.lastFetchedAt);
  const commentsByPostId = useCommunityStore(s => s.commentsByPostId);
  const commentsStatusByPostId = useCommunityStore(s => s.commentsStatusByPostId);
  const fetchPosts = useCommunityStore(s => s.fetchPosts);
  const refreshPosts = useCommunityStore(s => s.refreshPosts);
  const loadMorePosts = useCommunityStore(s => s.loadMorePosts);
  const fetchPostComments = useCommunityStore(s => s.fetchPostComments);
  const togglePostLike = useCommunityStore(s => s.togglePostLike);

  const [showTopButton, setShowTopButton] = useState(false);
  const [relativeTimeTick, setRelativeTimeTick] = useState(() => Date.now());
  const { currentUserId, requireLogin } = useCommunityAuth();

  useEffect(() => {
    if (listStatus !== 'idle' || posts.length > 0) return;
    fetchPosts(null).catch(() => {});
  }, [fetchPosts, listStatus, posts.length]);

  useFocusEffect(
    useCallback(() => {
      setRelativeTimeTick(Date.now());

      const intervalId = setInterval(() => {
        setRelativeTimeTick(Date.now());
      }, 60 * 1000);

      const now = Date.now();
      const shouldRefreshOnFocus =
        posts.length > 0 &&
        lastFetchedAt !== null &&
        now - lastFetchedAt > 45 * 1000 &&
        listStatus !== 'loading' &&
        listStatus !== 'refreshing' &&
        listStatus !== 'loadingMore';

      if (shouldRefreshOnFocus) {
        refreshPosts().catch(() => {});
      }

      return () => {
        clearInterval(intervalId);
      };
    }, [lastFetchedAt, listStatus, posts.length, refreshPosts]),
  );

  const handlePressBack = useEntryAwareBackAction({
    entrySource: route.params?.entrySource,
    onHome: () => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
    },
    onMore: () => {
      navigation.goBack();
      requestAnimationFrame(() => {
        openMoreDrawer();
      });
    },
    onFallback: () => {
      navigation.goBack();
    },
  });

  const handlePressCreate = useCallback(() => {
    requireLogin(() => {
      navigation.navigate('CommunityCreate');
    });
  }, [navigation, requireLogin]);

  const handlePressCategory = useCallback(
    (category: CommunityPostCategory | null) => {
      if (category === activeCategory) return;
      pendingCategoryTransitionRef.current = category ?? 'all';
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      fetchPosts(category).catch(() => {});
    },
    [activeCategory, fetchPosts],
  );

  const handleRefresh = useCallback(() => {
    setRelativeTimeTick(Date.now());
    refreshPosts().catch(() => {});
  }, [refreshPosts]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore) return;
    loadMorePosts().catch(() => {});
  }, [hasMore, loadMorePosts]);

  const handlePressTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      setShowTopButton(prev => {
        if (y > 180 && !prev) return true;
        if (y <= 180 && prev) return false;
        return prev;
      });
    },
    [],
  );

  const handleRetry = useCallback(() => {
    fetchPosts(activeCategory).catch(() => {});
  }, [activeCategory, fetchPosts]);

  const handlePressPost = useCallback(
    (postId: string) => {
      navigation.navigate('CommunityDetail', { postId });
    },
    [navigation],
  );

  const handlePressLike = useCallback(
    (postId: string) => {
      requireLogin(() => {
        if (!currentUserId) return;
        togglePostLike(postId, currentUserId).catch(() => {
          showToast({
            tone: 'error',
            message: '좋아요 처리에 실패했어요.',
          });
        });
      });
    },
    [currentUserId, requireLogin, togglePostLike],
  );

  useEffect(() => {
    posts.forEach(post => {
      if (post.commentCount <= 0) return;
      const comments = commentsByPostId[post.id] ?? EMPTY_COMMENTS;
      const commentsStatus = commentsStatusByPostId[post.id] ?? 'idle';
      if (comments.length > 0) return;
      if (commentsStatus !== 'idle') return;
      fetchPostComments(post.id).catch(() => {});
    });
  }, [commentsByPostId, commentsStatusByPostId, fetchPostComments, posts]);

  const renderItem = useCallback<ListRenderItem<CommunityPost>>(
    ({ item }) => {
      const comments = commentsByPostId[item.id] ?? EMPTY_COMMENTS;
      const latestComment =
        comments.length > 0 ? comments[comments.length - 1] : null;

      return (
        <PostCard
          post={item}
          latestComment={latestComment}
          onPressPost={handlePressPost}
          onPressLike={handlePressLike}
          relativeTimeTick={relativeTimeTick}
        />
      );
    },
    [commentsByPostId, handlePressLike, handlePressPost, relativeTimeTick],
  );

  const isCategoryTransitioning =
    pendingCategoryTransitionRef.current !== null &&
    (listStatus === 'loading' || listStatus === 'refreshing');

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <View
          style={[
            styles.categoryRow,
            { borderBottomColor: theme.colors.border },
          ]}
        >
          {CATEGORY_CHIPS.map(chip => {
            return (
              <CategoryChipButton
                key={chip.key}
                chip={chip}
                isActive={chip.value === activeCategory}
                activeColor={petTheme.primary}
                onPress={handlePressCategory}
              />
            );
          })}
        </View>
        {isCategoryTransitioning ? (
          <View style={styles.categoryLoadingWrap}>
            <ActivityIndicator size="small" color={petTheme.primary} />
            <AppText
              preset="caption"
              style={[
                styles.categoryLoadingText,
                { color: theme.colors.textMuted },
              ]}
            >
              목록을 바꾸는 중이에요
            </AppText>
          </View>
        ) : null}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderTextBlock}>
            <View style={styles.sectionHeaderTitleRow}>
              <AppText
                preset="caption"
                style={[styles.sectionHeaderLabel, { color: theme.colors.textPrimary }]}
              >
                최근 글
              </AppText>
              <AppText
                preset="caption"
                style={[styles.sectionHeaderCount, { color: theme.colors.textMuted }]}
              >
                {posts.length}개
              </AppText>
            </View>
            <AppText
              preset="caption"
              style={[styles.headline, { color: '#000000' }]}
            >
              반려생활 이야기를 나눠보세요 :)
            </AppText>
          </View>
        </View>
      </View>
    ),
    [
      activeCategory,
      handlePressCategory,
      isCategoryTransitioning,
      posts.length,
      petTheme.primary,
      theme.colors.border,
      theme.colors.textMuted,
      theme.colors.textPrimary,
    ],
  );

  const emptyComponent = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: `${petTheme.primary}14` },
          ]}
        >
          <Feather name="message-circle" size={22} color={petTheme.primary} />
        </View>
        <AppText
          preset="headline"
          style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}
        >
          아직 게시글이 없어요
        </AppText>
        <AppText
          preset="body"
          style={[styles.emptyBody, { color: theme.colors.textMuted }]}
        >
          첫 번째로 공유해 보세요!
        </AppText>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.emptyButton, { backgroundColor: petTheme.primary }]}
          onPress={handlePressCreate}
        >
          <AppText
            preset="body"
            style={[styles.emptyButtonText, { color: petTheme.onPrimary }]}
          >
            첫 글 작성하기
          </AppText>
        </TouchableOpacity>
      </View>
    ),
    [
      handlePressCreate,
      petTheme.onPrimary,
      petTheme.primary,
      theme.colors.textMuted,
      theme.colors.textPrimary,
    ],
  );

  const footerComponent = useMemo(() => {
    if (listStatus !== 'loadingMore') return null;
    return <ListFooterLoading />;
  }, [listStatus]);
  const refreshing = listStatus === 'refreshing';
  const isInitialLoading =
    (listStatus === 'idle' || listStatus === 'loading') && posts.length === 0;
  const isError = listStatus === 'error' && posts.length === 0;

  useEffect(() => {
    if (pendingCategoryTransitionRef.current === null) return;
    if (listStatus !== 'ready' && listStatus !== 'error') return;
    pendingCategoryTransitionRef.current = null;
  }, [listStatus]);

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
            onPress={handlePressBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
          pointerEvents="none"
          style={[styles.headerTitle, { color: theme.colors.textPrimary }]}
        >
          커뮤니티
        </AppText>

        <View style={[styles.headerSide, styles.headerRight]} />
      </View>

      {isInitialLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={petTheme.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <AppText
            preset="headline"
            style={[styles.errorTitle, { color: theme.colors.textPrimary }]}
          >
            게시글을 불러오지 못했어요
          </AppText>
          <AppText
            preset="body"
            style={[styles.errorBody, { color: theme.colors.textMuted }]}
          >
            {listErrorMessage ?? '잠시 후 다시 시도해 주세요.'}
          </AppText>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.retryButton, { backgroundColor: petTheme.primary }]}
            onPress={handleRetry}
          >
            <AppText
              preset="body"
              style={[styles.retryButtonText, { color: petTheme.onPrimary }]}
            >
              다시 시도
            </AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listWrap}>
          <FlatList
            ref={flatListRef}
            data={posts}
            overScrollMode="always"
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={emptyComponent}
            ListFooterComponent={footerComponent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={petTheme.primary}
                progressViewOffset={8}
              />
            }
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom: Math.max(insets.bottom + 108, 132),
              },
            ]}
          />

          <Pressable
            android_ripple={{ color: `${petTheme.onPrimary}18` }}
            style={[
              styles.createFab,
              {
                backgroundColor: petTheme.primary,
                bottom: Math.max(insets.bottom + 76, 92),
              },
            ]}
            onPress={handlePressCreate}
          >
            <Feather name="edit-3" size={18} color={petTheme.onPrimary} />
          </Pressable>

          {showTopButton ? (
            <Pressable
              android_ripple={{ color: `${petTheme.onPrimary}22` }}
              style={[
                styles.topButton,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  bottom: Math.max(insets.bottom + 18, 28),
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={handlePressTop}
            >
              <Feather
                name="arrow-up"
                size={18}
                color={theme.colors.textPrimary}
              />
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
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
    zIndex: 2,
    elevation: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
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
  errorTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  errorBody: {
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 18,
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontWeight: '700',
  },
  listContent: {
    flexGrow: 1,
  },
  listWrap: {
    flex: 1,
  },
  listHeader: {
    paddingTop: 6,
    paddingBottom: 16,
  },
  headline: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  categoryLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    minHeight: 20,
  },
  categoryLoadingText: {
    lineHeight: 18,
  },
  categoryChip: {
    minHeight: 34,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingBottom: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  categoryChipUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionHeaderTextBlock: {
    gap: 4,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  sectionHeaderCount: {
    fontSize: 11,
    lineHeight: 16,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptyBody: {
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 18,
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    fontWeight: '700',
  },
  footerLoading: {
    paddingVertical: 18,
  },
  topButton: {
    position: 'absolute',
    right: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#0B1220',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 4,
  },
  createFab: {
    position: 'absolute',
    right: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1220',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 5,
  },
});
