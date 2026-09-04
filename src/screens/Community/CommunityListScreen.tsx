import React, {
  memo,
  Profiler,
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
  ScrollView,
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
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useCommunityAuth } from '../../hooks/useCommunityAuth';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { useCommunityStore } from '../../store/communityStore';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';
import { scheduleIdleTask } from '../../utils/scheduleIdleTask';
import type {
  CommunityCategory,
  CommunityListFilter,
  CommunityPageSize,
} from '../../types/community';
import { COMMUNITY_PAGE_SIZE_OPTIONS } from '../../types/community';
import { styles } from './CommunityListScreen.styles';
import CommunityPostListItem from './components/CommunityPostListItem';
import {
  canCreateCommunityPost,
  COMMUNITY_CATEGORY_OPTIONS,
  COMMUNITY_LIST_FILTER_OPTIONS,
  getCommunityEmptyState,
} from './communityListPresentation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CommunityList'>;
type Route = RootScreenRoute<'CommunityList'>;

const TOP_BUTTON_SHOW_SCROLL_Y = 260;
const TOP_BUTTON_BOTTOM_OFFSET = 82;
const LIST_BOTTOM_PADDING_OFFSET = 98;

const keyExtractor = (item: string) => item;

type FilterChipButtonProps = {
  chip: (typeof COMMUNITY_LIST_FILTER_OPTIONS)[number];
  isActive: boolean;
  activeColor: string;
  onPress: (filter: CommunityListFilter) => void;
};

type CategoryChipButtonProps = {
  option: (typeof COMMUNITY_CATEGORY_OPTIONS)[number];
  isActive: boolean;
  activeColor: string;
  onPress: (category: CommunityCategory) => void;
};

const FilterChipButton = memo(function FilterChipButton({
  chip,
  isActive,
  activeColor,
  onPress,
}: FilterChipButtonProps) {
  const underlineProgress = useRef(
    new Animated.Value(isActive ? 1 : 0),
  ).current;

  useEffect(() => {
    Animated.timing(underlineProgress, {
      toValue: isActive ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isActive, underlineProgress]);

  const handlePress = useCallback(() => {
    onPress(chip.key);
  }, [chip.key, onPress]);

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

const CategoryChipButton = memo(function CategoryChipButton({
  option,
  isActive,
  activeColor,
  onPress,
}: CategoryChipButtonProps) {
  const underlineProgress = useRef(
    new Animated.Value(isActive ? 1 : 0),
  ).current;

  useEffect(() => {
    Animated.timing(underlineProgress, {
      toValue: isActive ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isActive, underlineProgress]);

  const handlePress = useCallback(() => {
    onPress(option.key);
  }, [onPress, option.key]);

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
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
        {option.label}
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
  const hasNextPage = useCommunityStore(s => s.hasNextPage);
  const hasPreviousPage = useCommunityStore(s => s.hasPreviousPage);
  const currentPage = useCommunityStore(s => s.currentPage);
  const activeFilter = useCommunityStore(s => s.activeFilter);
  const activeCategory = useCommunityStore(s => s.activeCategory);
  const pageSize = useCommunityStore(s => s.pageSize);
  const lastFetchedAt = useCommunityStore(s => s.lastFetchedAt);
  const fetchPosts = useCommunityStore(s => s.fetchPosts);
  const setCategory = useCommunityStore(s => s.setCategory);
  const refreshPosts = useCommunityStore(s => s.refreshPosts);
  const loadMorePosts = useCommunityStore(s => s.loadMorePosts);
  const loadPreviousPosts = useCommunityStore(s => s.loadPreviousPosts);
  const setPageSize = useCommunityStore(s => s.setPageSize);
  const resumePosts = useCommunityStore(s => s.resumePosts);

  const [showTopButton, setShowTopButton] = useState(false);
  const [isPageSizeModalVisible, setPageSizeModalVisible] = useState(false);
  const { requireLogin } = useCommunityAuth();
  const isCreateActionVisible = canCreateCommunityPost(activeFilter);

  useEffect(() => {
    if (listStatus !== 'idle' || posts.length > 0) return;
    const task = scheduleIdleTask(() => {
      resumePosts().catch(() => {});
    });
    return () => {
      task.cancel();
    };
  }, [listStatus, posts.length, resumePosts]);

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
  const handlePressCreate = useCallback(() => {
    requireLogin(() => {
      navigation.navigate('CommunityCreate');
    });
  }, [navigation, requireLogin]);
  const renderHeaderLeft = useCallback(
    () => (
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.backButton}
        onPress={handlePressBack}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    ),
    [handlePressBack, theme.colors.textPrimary],
  );
  const renderHeaderRight = useCallback(
    () => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="게시글 작성"
        activeOpacity={0.82}
        style={styles.headerActionButton}
        onPress={handlePressCreate}
      >
        <Feather name="edit-3" size={19} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    ),
    [handlePressCreate, theme.colors.textPrimary],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '커뮤니티',
      headerLeft: renderHeaderLeft,
      headerRight: isCreateActionVisible ? renderHeaderRight : undefined,
    });
  }, [
    isCreateActionVisible,
    navigation,
    renderHeaderLeft,
    renderHeaderRight,
  ]);

  const handlePressFilter = useCallback(
    (filter: CommunityListFilter) => {
      if (filter === activeFilter) return;
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      fetchPosts(filter, filter === 'notice' ? 'all' : activeCategory).catch(
        () => {},
      );
    },
    [activeCategory, activeFilter, fetchPosts],
  );

  const handlePressCategory = useCallback(
    (category: CommunityCategory) => {
      if (activeFilter === 'notice' || category === activeCategory) return;
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      setCategory(category).catch(() => {});
    },
    [activeCategory, activeFilter, setCategory],
  );

  const handleRefresh = useCallback(() => {
    refreshPosts().catch(() => {});
  }, [refreshPosts]);

  const handleLoadNextPage = useCallback(() => {
    if (!hasNextPage) return;
    loadMorePosts().catch(() => {});
  }, [hasNextPage, loadMorePosts]);

  const handleLoadPreviousPage = useCallback(() => {
    if (!hasPreviousPage) return;
    loadPreviousPosts().catch(() => {});
  }, [hasPreviousPage, loadPreviousPosts]);

  const isListBusy =
    listStatus === 'loading' ||
    listStatus === 'refreshing' ||
    listStatus === 'loadingMore';

  const handleSelectPageSize = useCallback(
    (nextPageSize: CommunityPageSize) => {
      if (isListBusy || nextPageSize === pageSize) {
        setPageSizeModalVisible(false);
        return;
      }
      setPageSizeModalVisible(false);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      setPageSize(nextPageSize).catch(() => {});
    },
    [isListBusy, pageSize, setPageSize],
  );

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
    fetchPosts(activeFilter, activeCategory).catch(() => {});
  }, [activeCategory, activeFilter, fetchPosts]);

  const handlePressPost = useCallback(
    (postId: string) => {
      navigation.navigate('CommunityDetail', { postId });
    },
    [navigation],
  );

  const postIds = useMemo(() => posts.map(post => post.id), [posts]);

  const handleListRender = useCallback(
    (
      id: string,
      phase: 'mount' | 'update' | 'nested-update',
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number,
    ) => {
      if (!__DEV__) return;
      console.info('[NURI-PERF] community-list-render', {
        id,
        phase,
        filter: activeFilter,
        category: activeCategory,
        pageSize,
        itemCount: postIds.length,
        actualDurationMs: Number(actualDuration.toFixed(2)),
        baseDurationMs: Number(baseDuration.toFixed(2)),
        renderStartMs: Number(startTime.toFixed(2)),
        renderCommitMs: Number(commitTime.toFixed(2)),
      });
    },
    [activeCategory, activeFilter, pageSize, postIds.length],
  );

  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item: postId }) => (
      <CommunityPostListItem
        postId={postId}
        accentColor={petTheme.primary}
        onPressPost={handlePressPost}
      />
    ),
    [handlePressPost, petTheme.primary],
  );

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
        <View style={styles.filterBarRow}>
          <ScrollView
            horizontal
            style={styles.filterScroll}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {COMMUNITY_LIST_FILTER_OPTIONS.map(chip => {
              return (
                <FilterChipButton
                  key={chip.key}
                  chip={chip}
                  isActive={chip.key === activeFilter}
                  activeColor={petTheme.primary}
                  onPress={handlePressFilter}
                />
              );
            })}
          </ScrollView>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`목록 표시 개수, 현재 ${pageSize}개`}
            accessibilityState={{ disabled: isListBusy }}
            activeOpacity={0.84}
            disabled={isListBusy}
            style={styles.pageSizeButton}
            onPress={() => setPageSizeModalVisible(true)}
          >
            <AppText
              preset="caption"
              style={[styles.pageSizeText, { color: petTheme.primary }]}
            >
              {pageSize}개
            </AppText>
            {isListBusy ? (
              <ActivityIndicator size="small" color={petTheme.primary} />
            ) : (
              <Feather name="chevron-down" size={15} color={petTheme.primary} />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.secondaryCategoryRow}>
          {activeFilter === 'notice' ? null : (
            <ScrollView
              horizontal
              style={styles.filterScroll}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {COMMUNITY_CATEGORY_OPTIONS.map(option => (
                <CategoryChipButton
                  key={option.key}
                  option={option}
                  isActive={option.key === activeCategory}
                  activeColor={petTheme.primary}
                  onPress={handlePressCategory}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    ),
    [
      activeFilter,
      activeCategory,
      handlePressCategory,
      handlePressFilter,
      isListBusy,
      pageSize,
      petTheme.primary,
      theme.colors.background,
    ],
  );

  const emptyComponent = useMemo(() => {
    const emptyState = getCommunityEmptyState(activeFilter, activeCategory);

    return (
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
          {emptyState.title}
        </AppText>
        {emptyState.showCreateCta ? (
          <>
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
          </>
        ) : null}
      </View>
    );
  }, [
    activeFilter,
    activeCategory,
    handlePressCreate,
    petTheme.onPrimary,
    petTheme.primary,
    theme.colors.textMuted,
    theme.colors.textPrimary,
  ]);

  const footerComponent = useMemo(() => {
    if (postIds.length === 0) return null;
    const isPageLoading = isListBusy;

    return (
      <View style={styles.paginationFooter}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="이전 페이지"
          accessibilityState={{ disabled: !hasPreviousPage || isPageLoading }}
          activeOpacity={0.84}
          disabled={!hasPreviousPage || isPageLoading}
          style={[
            styles.paginationButton,
            (!hasPreviousPage || isPageLoading) &&
              styles.paginationButtonDisabled,
          ]}
          onPress={handleLoadPreviousPage}
        >
          <Feather
            name="chevron-left"
            size={17}
            color={theme.colors.textPrimary}
          />
          <AppText
            preset="caption"
            style={[
              styles.paginationButtonText,
              { color: theme.colors.textPrimary },
            ]}
          >
            이전
          </AppText>
        </TouchableOpacity>

        <View style={styles.paginationPageIndicator}>
          {isPageLoading ? (
            <ActivityIndicator size="small" color={petTheme.primary} />
          ) : (
            <AppText
              preset="caption"
              style={[
                styles.paginationPageText,
                { color: theme.colors.textPrimary },
              ]}
            >
              {currentPage}페이지
            </AppText>
          )}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="다음 페이지"
          accessibilityState={{ disabled: !hasNextPage || isPageLoading }}
          activeOpacity={0.84}
          disabled={!hasNextPage || isPageLoading}
          style={[
            styles.paginationButton,
            (!hasNextPage || isPageLoading) && styles.paginationButtonDisabled,
          ]}
          onPress={handleLoadNextPage}
        >
          <AppText
            preset="caption"
            style={[
              styles.paginationButtonText,
              { color: theme.colors.textPrimary },
            ]}
          >
            다음
          </AppText>
          <Feather
            name="chevron-right"
            size={17}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
      </View>
    );
  }, [
    currentPage,
    handleLoadNextPage,
    handleLoadPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isListBusy,
    petTheme.primary,
    postIds.length,
    theme.colors.textPrimary,
  ]);
  const refreshing = listStatus === 'refreshing';
  const isInitialLoading =
    (listStatus === 'idle' || listStatus === 'loading') && postIds.length === 0;
  const isError = listStatus === 'error' && postIds.length === 0;
  const isInlineListLoading = listStatus === 'loading' && postIds.length > 0;

  const topButtonBottom = useMemo(
    () => Math.max(insets.bottom + TOP_BUTTON_BOTTOM_OFFSET, 88),
    [insets.bottom],
  );
  const listBottomInset = useMemo(
    () => Math.max(insets.bottom + LIST_BOTTOM_PADDING_OFFSET, 112),
    [insets.bottom],
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
          {isInlineListLoading ? (
            <View style={styles.inlineListLoading}>
              <ActivityIndicator size="small" color={petTheme.primary} />
            </View>
          ) : null}
          <Profiler id="community-list" onRender={handleListRender}>
            <FlatList
              ref={flatListRef}
              style={styles.postList}
              data={postIds}
              overScrollMode="always"
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              initialNumToRender={12}
              maxToRenderPerBatch={10}
              windowSize={9}
              updateCellsBatchingPeriod={50}
              removeClippedSubviews={Platform.OS === 'android'}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={emptyComponent}
              ListFooterComponent={footerComponent ?? undefined}
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
          </Profiler>

          {showTopButton ? (
            <Pressable
              android_ripple={{ color: `${petTheme.onPrimary}22` }}
              style={[
                styles.topButton,
                {
                  backgroundColor: '#FFFFFF',
                  bottom: topButtonBottom,
                  borderColor: petTheme.border,
                },
              ]}
              onPress={handlePressTop}
            >
              <Feather name="arrow-up" size={18} color={petTheme.primary} />
            </Pressable>
          ) : null}
        </View>
      )}

      <ConfirmDialog
        visible={isPageSizeModalVisible}
        title="게시글 표시 개수"
        message="한 번에 불러올 게시글 수를 선택해 주세요."
        confirmLabel="닫기"
        hideActions
        onCancel={() => setPageSizeModalVisible(false)}
        onConfirm={() => setPageSizeModalVisible(false)}
      >
        <View style={styles.pageSizeOptions}>
          {COMMUNITY_PAGE_SIZE_OPTIONS.map(option => {
            const isSelected = option === pageSize;
            return (
              <TouchableOpacity
                key={option}
                accessibilityRole="radio"
                accessibilityState={{
                  selected: isSelected,
                  disabled: isListBusy,
                }}
                activeOpacity={0.84}
                disabled={isListBusy}
                style={[
                  styles.pageSizeOption,
                  isSelected && {
                    backgroundColor: petTheme.soft,
                    borderColor: petTheme.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => handleSelectPageSize(option)}
              >
                <AppText
                  preset="body"
                  style={[
                    styles.pageSizeOptionText,
                    {
                      color: isSelected
                        ? petTheme.primary
                        : theme.colors.textPrimary,
                    },
                  ]}
                >
                  {option}개
                </AppText>
                <Feather
                  name={isSelected ? 'check-circle' : 'circle'}
                  size={22}
                  color={
                    isSelected ? petTheme.primary : theme.colors.textMuted
                  }
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ConfirmDialog>
    </View>
  );
}
