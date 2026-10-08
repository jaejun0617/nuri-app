import CtaButton, { CtaText } from '../../app/ui/CtaButton';
import React, {
  memo,
  Profiler,
  useCallback,
  useContext,
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
  Keyboard,
  Image,
  type LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  View,
  type ListRenderItem,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '../../components/icons/NuriFeatherIcon';
import NuriSemanticIcon from '../../components/icons/NuriSemanticIcon';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useCommunityAuth } from '../../hooks/useCommunityAuth';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { SEASON_CTA } from '../../app/theme/ctaPalette';
import { ToolbarHeightContext } from '../../components/navigation/ToolbarHeightContext';
import {
  COMMUNITY_HERO_ACCESSIBILITY_LABEL,
  COMMUNITY_HERO_ASPECT_RATIO,
  COMMUNITY_HERO_IMAGES,
  COMMUNITY_HERO_PANEL_OVERLAP_RATIO,
  COMMUNITY_HERO_SURFACES,
} from '../../theme/seasonal/community';
import { useCommunityStore } from '../../store/communityStore';
import { openMoreDrawer } from '../../store/uiStore';
import { scheduleIdleTask } from '../../utils/scheduleIdleTask';
import type {
  CommunityCategory,
  CommunityListFilter,
  CommunityPageSize,
} from '../../types/community';
import { COMMUNITY_PAGE_SIZE_OPTIONS } from '../../types/community';
import { COMMUNITY_SEARCH_MAX_LENGTH } from '../../services/community/search';
import { styles } from './CommunityListScreen.styles';
import CommunityPostListItem from './components/CommunityPostListItem';
import { COMMUNITY_CATEGORY_PALETTE } from './communityCategoryPalette';
import {
  canCreateCommunityPost,
  COMMUNITY_CATEGORY_OPTIONS,
  COMMUNITY_LIST_FILTER_OPTIONS,
  getCommunityEmptyState,
} from './communityListPresentation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CommunityList'>;
type Route = RootScreenRoute<'CommunityList'>;

const TOP_BUTTON_SHOW_SCROLL_Y = 260;

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
  inactiveColor: string;
  onPress: (category: CommunityCategory) => void;
};

const FilterChipButton = memo(function FilterChipButtonComponent({
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
      accessibilityRole="tab"
      accessibilityLabel={chip.label}
      accessibilityState={{ selected: isActive }}
      activeOpacity={0.88}
      style={styles.filterTab}
      onPress={handlePress}
    >
      <AppText
        preset="caption"
        style={[
          styles.categoryChipText,
          isActive
            ? [styles.categoryChipTextActive, { color: activeColor }]
            : { color: '#566271' },
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

const CategoryChipButton = memo(function CategoryChipButtonComponent({
  option,
  isActive,
  activeColor,
  inactiveColor,
  onPress,
}: CategoryChipButtonProps) {
  const handlePress = useCallback(() => {
    onPress(option.key);
  }, [onPress, option.key]);

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      activeOpacity={0.88}
      style={styles.categoryChip}
      accessibilityLabel={option.label}
      onPress={handlePress}
    >
      <View
        pointerEvents="none"
        style={[
          styles.categoryChipFace,
          { backgroundColor: isActive ? activeColor : '#F1F3F6' },
        ]}
      >
        <AppText
          preset="caption"
          style={[
            styles.categoryChipLabel,
            isActive
              ? [styles.categoryChipTextActive, { color: '#FFFFFF' }]
              : { color: inactiveColor },
          ]}
        >
          {option.label}
        </AppText>
      </View>
    </TouchableOpacity>
  );
});

export default function CommunityListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const season = useEffectiveSeason();
  const seasonal = SEASON_CTA[season];
  const heroSurface = COMMUNITY_HERO_SURFACES[season];
  const toolbarHeight = useContext(ToolbarHeightContext);
  const { width: windowWidth } = useWindowDimensions();
  const [listWidth, setListWidth] = useState<number | null>(null);
  const heroWidth = listWidth ?? windowWidth;
  // Override both intrinsic asset dimensions; percentage width can expand a list header.
  const heroSize = {
    width: heroWidth,
    height: heroWidth / COMMUNITY_HERO_ASPECT_RATIO,
  };
  const handleListLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (Number.isFinite(width) && width > 0) setListWidth(width);
  }, []);
  const flatListRef = useRef<FlatList<string> | null>(null);
  const [heroFailedSeason, setHeroFailedSeason] = useState<
    typeof season | null
  >(null);
  const heroPanelOverlap =
    heroFailedSeason === season
      ? 0
      : heroWidth * COMMUNITY_HERO_PANEL_OVERLAP_RATIO;

  const posts = useCommunityStore(s => s.posts);
  const listStatus = useCommunityStore(s => s.listStatus);
  const listErrorMessage = useCommunityStore(s => s.listErrorMessage);
  const hasNextPage = useCommunityStore(s => s.hasNextPage);
  const hasPreviousPage = useCommunityStore(s => s.hasPreviousPage);
  const currentPage = useCommunityStore(s => s.currentPage);
  const activeFilter = useCommunityStore(s => s.activeFilter);
  const activeCategory = useCommunityStore(s => s.activeCategory);
  const searchQuery = useCommunityStore(s => s.searchQuery);
  const setSearchQuery = useCommunityStore(s => s.setSearchQuery);
  const [searchDraft, setSearchDraft] = useState(searchQuery ?? '');
  const [searchVisible, setSearchVisible] = useState(!!searchQuery);
  const handleSearch = useCallback(() => {
    Keyboard.dismiss();
    setSearchQuery(searchDraft).catch(() => {});
  }, [searchDraft, setSearchQuery]);
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
        accessibilityRole="button"
        accessibilityLabel="뒤로가기"
        activeOpacity={0.88}
        style={styles.backButton}
        onPress={handlePressBack}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Feather name="arrow-left" size={20} color="#243042" />
      </TouchableOpacity>
    ),
    [handlePressBack],
  );
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

  const previousPageRef = useRef(currentPage);
  useEffect(() => {
    if (previousPageRef.current !== currentPage) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      setShowTopButton(false);
      previousPageRef.current = currentPage;
    }
  }, [currentPage]);

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
        accentColor={seasonal.primary}
        onPressPost={handlePressPost}
      />
    ),
    [handlePressPost, seasonal.primary],
  );

  const categoryHeader = useMemo(
    () => (
      <View
        testID="community-list-panel"
        style={[
          styles.categoryHeader,
          { marginTop: -styles.heroTail.height - heroPanelOverlap },
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
                  activeColor={seasonal.primary}
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
              style={[styles.pageSizeText, { color: seasonal.primary }]}
            >
              {pageSize}개
            </AppText>
            {isListBusy ? (
              <ActivityIndicator size="small" color={seasonal.primary} />
            ) : (
              <Feather name="chevron-down" size={15} color={seasonal.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            testID="community-search-toggle"
            accessibilityRole="button"
            accessibilityLabel={
              searchVisible ? '게시글 검색 닫기' : '게시글 검색'
            }
            style={styles.searchIconButton}
            onPress={() => {
              if (searchVisible) {
                Keyboard.dismiss();
                setSearchDraft('');
                setSearchQuery('').catch(() => {});
              }
              setSearchVisible(previous => !previous);
            }}
          >
            <NuriSemanticIcon
              family="feather"
              preserveOriginal
              name={searchVisible ? 'x' : 'search'}
              size={20}
              color={seasonal.primary}
            />
          </TouchableOpacity>
        </View>
        {searchVisible ? (
          <View style={styles.searchRow}>
            <TextInput
              testID="community-search-input"
              accessibilityLabel="게시글 제목과 내용 검색"
              placeholder="제목과 내용 검색"
              placeholderTextColor="#697586"
              value={searchDraft}
              onChangeText={setSearchDraft}
              maxLength={COMMUNITY_SEARCH_MAX_LENGTH}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              style={styles.searchInput}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="검색 실행"
              style={styles.searchIconButton}
              onPress={handleSearch}
            >
              <NuriSemanticIcon
                family="feather"
                preserveOriginal
                name="search"
                size={18}
                color={seasonal.primary}
              />
            </TouchableOpacity>
          </View>
        ) : null}
        {activeFilter === 'notice' ? null : (
          <View style={styles.secondaryCategoryRow}>
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
                  activeColor={
                    option.key === 'all'
                      ? seasonal.primary
                      : COMMUNITY_CATEGORY_PALETTE[option.key].text
                  }
                  inactiveColor={
                    option.key === 'all'
                      ? '#566271'
                      : COMMUNITY_CATEGORY_PALETTE[option.key].text
                  }
                  onPress={handlePressCategory}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    ),
    [
      activeFilter,
      activeCategory,
      handlePressCategory,
      handlePressFilter,
      heroPanelOverlap,
      isListBusy,
      pageSize,
      seasonal.primary,
      searchDraft,
      searchVisible,
      setSearchQuery,
      handleSearch,
    ],
  );

  const emptyComponent = useMemo(() => {
    const emptyState = getCommunityEmptyState(activeFilter, activeCategory);

    return (
      <View style={styles.emptyWrap}>
        <View style={[styles.emptyIcon, { backgroundColor: seasonal.subtle }]}>
          <Feather name="message-circle" size={22} color={seasonal.primary} />
        </View>
        <AppText preset="headline" style={styles.emptyTitle}>
          {searchQuery ? '검색 결과가 없어요' : emptyState.title}
        </AppText>
        {!searchQuery && emptyState.showCreateCta ? (
          <>
            <AppText preset="body" style={styles.emptyBody}>
              첫 번째로 공유해 보세요!
            </AppText>
            <CtaButton
              role="primary"
              activeOpacity={0.9}
              style={[styles.emptyButton, {}]}
              onPress={handlePressCreate}
            >
              <CtaText preset="body" style={[styles.emptyButtonText, {}]}>
                첫 글 작성하기
              </CtaText>
            </CtaButton>
          </>
        ) : null}
      </View>
    );
  }, [
    activeFilter,
    activeCategory,
    handlePressCreate,
    seasonal.primary,
    seasonal.subtle,
    searchQuery,
  ]);

  const footerActions = useMemo(() => {
    const isPageLoading = isListBusy;
    const blocked = isPageLoading || postIds.length === 0;

    return (
      <View
        testID="community-list-pagination"
        style={[
          styles.paginationFooter,
          {
            paddingLeft:
              styles.paginationFooter.paddingHorizontal + insets.left,
            paddingRight:
              styles.paginationFooter.paddingHorizontal + insets.right,
          },
        ]}
      >
        <View
          testID="community-pagination-controls"
          style={styles.paginationControls}
        >
          <CtaButton
            role="neutral"
            compact
            accessibilityRole="button"
            accessibilityLabel="이전 페이지"
            accessibilityState={{ disabled: !hasPreviousPage || blocked }}
            activeOpacity={0.84}
            disabled={!hasPreviousPage || blocked}
            style={styles.paginationButton}
            onPress={handleLoadPreviousPage}
          >
            <CtaText preset="caption" style={styles.paginationButtonText}>
              이전
            </CtaText>
          </CtaButton>

          <View
            accessibilityLabel={`현재 ${currentPage}페이지`}
            accessibilityLiveRegion="polite"
            style={styles.paginationPageIndicator}
          >
            {isPageLoading ? (
              <ActivityIndicator size="small" color={seasonal.primary} />
            ) : (
              <AppText
                preset="caption"
                style={[styles.paginationPageText, { color: seasonal.primary }]}
              >
                {currentPage}
              </AppText>
            )}
          </View>

          <CtaButton
            role="neutral"
            compact
            accessibilityRole="button"
            accessibilityLabel="다음 페이지"
            accessibilityState={{ disabled: !hasNextPage || blocked }}
            activeOpacity={0.84}
            disabled={!hasNextPage || blocked}
            style={styles.paginationButton}
            onPress={handleLoadNextPage}
          >
            <CtaText preset="caption" style={styles.paginationButtonText}>
              다음
            </CtaText>
          </CtaButton>
        </View>
      </View>
    );
  }, [
    currentPage,
    handleLoadNextPage,
    handleLoadPreviousPage,
    hasNextPage,
    hasPreviousPage,
    insets.left,
    insets.right,
    isListBusy,
    seasonal.primary,
    postIds.length,
  ]);
  const refreshing = listStatus === 'refreshing';
  const isInitialLoading =
    (listStatus === 'idle' || listStatus === 'loading') && postIds.length === 0;
  const isError = listStatus === 'error' && postIds.length === 0;
  const isInlineListLoading = listStatus === 'loading' && postIds.length > 0;

  // Reserve the status-bar inset once; both artwork and overlay start below it.
  return (
    <View
      testID="community-screen"
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
          paddingBottom: toolbarHeight ?? insets.bottom,
        },
      ]}
    >
      <View
        testID="community-list-viewport"
        style={styles.listWrap}
        onLayout={handleListLayout}
      >
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
            removeClippedSubviews={Platform.OS === 'android' && !searchVisible}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                <View testID="community-hero-frame" style={styles.heroFrame}>
                  <View
                    testID="community-hero-canvas"
                    style={[styles.heroCanvas, heroSize]}
                  >
                    {heroFailedSeason === season ? (
                      <View style={[styles.heroFallback, heroSize]}>
                        <AppText
                          preset="headline"
                          style={{ color: seasonal.primary }}
                        >
                          우리 아이들의 이야기
                        </AppText>
                        <AppText preset="body" style={styles.emptyBody}>
                          누리에서 소중한 이야기를 나눠보세요.
                        </AppText>
                      </View>
                    ) : (
                      <Image
                        testID="community-seasonal-hero"
                        accessibilityRole="image"
                        accessibilityLabel={COMMUNITY_HERO_ACCESSIBILITY_LABEL}
                        source={COMMUNITY_HERO_IMAGES[season]}
                        resizeMode="contain"
                        style={[styles.heroImage, heroSize]}
                        onError={() => setHeroFailedSeason(season)}
                      />
                    )}
                  </View>
                  <LinearGradient
                    pointerEvents="none"
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                    testID="community-hero-tail"
                    colors={[...heroSurface.tail]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.heroTail}
                  />
                  <View
                    testID="community-hero-overlay-header"
                    style={[
                      styles.header,
                      {
                        paddingTop: 8,
                        paddingLeft: insets.left,
                        paddingRight: 20 + insets.right,
                      },
                    ]}
                  >
                    <View style={[styles.headerSide, styles.headerLeft]}>
                      {renderHeaderLeft()}
                    </View>
                    <AppText
                      preset="titleSm"
                      maxFontSizeMultiplier={1.6}
                      numberOfLines={1}
                      style={[
                        styles.headerTitle,
                        styles.connectedHeaderTitle,
                        { color: '#243042' },
                      ]}
                    >
                      커뮤니티
                    </AppText>
                    <View style={styles.headerSide} pointerEvents="none" />
                  </View>
                </View>
                {categoryHeader}
                {isInlineListLoading ? (
                  <View style={styles.inlineListLoading}>
                    <ActivityIndicator size="small" color={seasonal.primary} />
                  </View>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              <View
                testID="community-empty-result"
                style={styles.emptyListContent}
              >
                {isInitialLoading ? (
                  <View style={styles.centerState}>
                    <ActivityIndicator size="small" color={seasonal.primary} />
                  </View>
                ) : isError ? (
                  <View style={styles.centerState}>
                    <AppText preset="headline" style={styles.errorTitle}>
                      게시글을 불러오지 못했어요
                    </AppText>
                    <AppText preset="body" style={styles.errorBody}>
                      {listErrorMessage ?? '잠시 후 다시 시도해 주세요.'}
                    </AppText>
                    <CtaButton
                      role="primary"
                      activeOpacity={0.9}
                      style={[styles.retryButton, {}]}
                      onPress={handleRetry}
                    >
                      <CtaText
                        preset="body"
                        style={[styles.retryButtonText, {}]}
                      >
                        다시 시도
                      </CtaText>
                    </CtaButton>
                  </View>
                ) : (
                  emptyComponent
                )}
              </View>
            }
            ListFooterComponent={footerActions}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={seasonal.primary}
                colors={[seasonal.primary]}
                progressViewOffset={8}
              />
            }
            contentContainerStyle={styles.listContent}
          />
        </Profiler>

        {isCreateActionVisible || showTopButton ? (
          <View
            testID="community-floating-actions"
            pointerEvents="box-none"
            style={[
              styles.floatingActions,
              {
                right: styles.floatingActions.right + insets.right,
                // Align compose with the footer band; overlays never reserve list height.
                bottom: styles.listContent.paddingBottom,
              },
            ]}
          >
            {showTopButton ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="목록 맨 위로"
                style={({ pressed }) => [
                  styles.topButton,
                  {
                    backgroundColor: pressed ? seasonal.subtle : '#FFFFFF',
                    borderColor: seasonal.border,
                  },
                ]}
                onPress={handlePressTop}
              >
                <Feather name="arrow-up" size={18} color={seasonal.primary} />
              </Pressable>
            ) : null}
            {isCreateActionVisible ? (
              <CtaButton
                testID="community-fixed-create"
                role="primary"
                accessibilityLabel="게시글 작성"
                style={[styles.createButton, { paddingHorizontal: 4 }]}
                onPress={handlePressCreate}
              >
                <CtaText preset="caption" numberOfLines={1} style={{ fontWeight: '800', fontSize: 12 }}>글쓰기</CtaText>
              </CtaButton>
            ) : null}
          </View>
        ) : null}
      </View>

      <ConfirmDialog
        confirmRole="neutral"
        cancelRole="neutral"
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
                    backgroundColor: seasonal.subtle,
                    borderColor: seasonal.border,
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
                        ? seasonal.primary
                        : theme.colors.textPrimary,
                    },
                  ]}
                >
                  {option}개
                </AppText>
                <Feather
                  name={isSelected ? 'check-circle' : 'circle'}
                  size={22}
                  color={isSelected ? seasonal.primary : theme.colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ConfirmDialog>
    </View>
  );
}
