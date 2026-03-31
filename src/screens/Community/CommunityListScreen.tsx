import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  Platform,
  Pressable,
  RefreshControl,
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
  CommunityPostCategory,
} from '../../types/community';
import { styles } from './CommunityListScreen.styles';
import CommunityPostListItem from './components/CommunityPostListItem';

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

const FLOATING_BUTTON_SIZE = 48;
const FLOATING_BUTTON_GAP = 14;
const TOP_BUTTON_SHOW_SCROLL_Y = 260;
const FLOATING_BUTTON_RAISE_STEP = 24;

const keyExtractor = (item: string) => item;

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
  const flatListRef = useRef<FlatList<string> | null>(null);
  const pendingCategoryTransitionRef = useRef<
    CommunityPostCategory | null | 'all'
  >(null);
  const postLikeDebounceTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
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

  const posts = useCommunityStore(s => s.posts);
  const listStatus = useCommunityStore(s => s.listStatus);
  const listErrorMessage = useCommunityStore(s => s.listErrorMessage);
  const hasMore = useCommunityStore(s => s.hasMore);
  const activeCategory = useCommunityStore(s => s.activeCategory);
  const lastFetchedAt = useCommunityStore(s => s.lastFetchedAt);
  const fetchPosts = useCommunityStore(s => s.fetchPosts);
  const refreshPosts = useCommunityStore(s => s.refreshPosts);
  const loadMorePosts = useCommunityStore(s => s.loadMorePosts);
  const fetchLatestCommentPreview = useCommunityStore(
    s => s.fetchLatestCommentPreview,
  );
  const togglePostLike = useCommunityStore(s => s.togglePostLike);

  const [showTopButton, setShowTopButton] = useState(false);
  const { currentUserId, requireLogin } = useCommunityAuth();

  useEffect(() => {
    if (listStatus !== 'idle' || posts.length > 0) return;
    fetchPosts(null).catch(() => {});
  }, [fetchPosts, listStatus, posts.length]);

  useFocusEffect(
    useCallback(() => {
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

      return undefined;
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
  const renderHeaderLeft = useCallback(
    () => (
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
    ),
    [handlePressBack, theme.colors.textPrimary],
  );
  const renderHeaderRight = useCallback(() => null, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '커뮤니티',
      headerLeft: renderHeaderLeft,
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderLeft, renderHeaderRight]);

  useEffect(
    () => () => {
      Object.values(postLikeDebounceTimersRef.current).forEach(timer => {
        clearTimeout(timer);
      });
      postLikeDebounceTimersRef.current = {};
    },
    [],
  );

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
        if (y > TOP_BUTTON_SHOW_SCROLL_Y && !prev) return true;
        if (y <= TOP_BUTTON_SHOW_SCROLL_Y && prev) return false;
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
        if (postLikeDebounceTimersRef.current[postId]) return;
        togglePostLike(postId, currentUserId).catch(() => {
          showToast({
            tone: 'error',
            message: '좋아요 처리에 실패했어요.',
          });
        });
        postLikeDebounceTimersRef.current[postId] = setTimeout(() => {
          delete postLikeDebounceTimersRef.current[postId];
        }, 300);
      });
    },
    [currentUserId, requireLogin, togglePostLike],
  );

  const postIds = useMemo(() => posts.map(post => post.id), [posts]);

  useEffect(() => {
    const { latestCommentStatusByPostId } = useCommunityStore.getState();
    posts.forEach(post => {
      if (post.commentCount <= 0) return;
      const latestCommentStatus = latestCommentStatusByPostId[post.id] ?? 'idle';
      if (latestCommentStatus !== 'idle') return;
      fetchLatestCommentPreview(post.id).catch(() => {});
    });
  }, [fetchLatestCommentPreview, posts]);

  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item: postId }) => (
      <CommunityPostListItem
        postId={postId}
        onPressPost={handlePressPost}
        onPressLike={handlePressLike}
      />
    ),
    [handlePressLike, handlePressPost],
  );

  const isCategoryTransitioning =
    pendingCategoryTransitionRef.current !== null &&
    (listStatus === 'loading' || listStatus === 'refreshing');

  const categoryHeader = useMemo(
    () => (
      <View
        style={[
          styles.stickyCategoryHeader,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <View style={styles.categoryRow}>
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
      </View>
    ),
    [
      activeCategory,
      handlePressCategory,
      isCategoryTransitioning,
      petTheme.primary,
      theme.colors.background,
      theme.colors.textMuted,
    ],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listIntroHeader}>
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
                {postIds.length}개
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
      postIds.length,
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
    (listStatus === 'idle' || listStatus === 'loading') && postIds.length === 0;
  const isError = listStatus === 'error' && postIds.length === 0;

  useEffect(() => {
    if (pendingCategoryTransitionRef.current === null) return;
    if (listStatus !== 'ready' && listStatus !== 'error') return;
    pendingCategoryTransitionRef.current = null;
  }, [listStatus]);

  const createFabBottom = useMemo(
    () =>
      Math.max(
        insets.bottom + 126 + FLOATING_BUTTON_RAISE_STEP,
        142 + FLOATING_BUTTON_RAISE_STEP,
      ),
    [insets.bottom],
  );
  const topButtonBottom = useMemo(
    () =>
      Math.max(
        createFabBottom - FLOATING_BUTTON_SIZE - FLOATING_BUTTON_GAP,
        insets.bottom + 34,
      ),
    [createFabBottom, insets.bottom],
  );
  const listBottomInset = useMemo(
    () =>
      Math.max(
        createFabBottom + FLOATING_BUTTON_SIZE + 28,
        insets.bottom + 176,
      ),
    [createFabBottom, insets.bottom],
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
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
          {categoryHeader}
          <FlatList
            ref={flatListRef}
            style={styles.postList}
            data={postIds}
            overScrollMode="always"
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={7}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={Platform.OS === 'android'}
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
                paddingBottom: listBottomInset,
              },
            ]}
          />

          <Pressable
            android_ripple={{ color: `${petTheme.onPrimary}18` }}
            style={[
              styles.createFab,
              {
                backgroundColor: petTheme.primary,
                bottom: createFabBottom,
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
                  bottom: topButtonBottom,
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
