import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import Screen from '../../components/layout/Screen';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import {
  getPetTravelCategories,
  getPetTravelPetAllowedLabel,
  getPetTravelPlaceTypeLabel,
} from '../../services/petTravel/catalog';
import { fetchPetTravelList } from '../../services/petTravel/api';
import type {
  PetTravelCategory,
  PetTravelItem,
} from '../../services/petTravel/types';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';
import { styles } from './PetTravel.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RootScreenRoute<'PetTravelList'>;

function getCategoryIcon(categoryId: PetTravelCategory['id']): string {
  switch (categoryId) {
    case 'stay':
      return 'home';
    case 'restaurant':
      return 'coffee';
    case 'experience':
      return 'flag';
    case 'outdoor':
      return 'sun';
    case 'attraction':
    case 'all':
    default:
      return 'map';
  }
}

function getConfidenceBadgeStyle(label: string) {
  return label === '동반 확인됨' || label === '방문자 확인'
    ? styles.petStatusBadgeConfirmed
    : label === '동반 가능성 높음'
      ? styles.petStatusBadgeConfirmed
      : label === '동반 가능성 있음'
        ? styles.petStatusBadgePossible
        : styles.petStatusBadgeCautious;
}

function getConfidenceBadgeTextStyle(label: string) {
  return label === '동반 확인됨' || label === '방문자 확인'
    ? styles.petStatusBadgeTextConfirmed
    : label === '동반 가능성 높음'
      ? styles.petStatusBadgeTextConfirmed
      : label === '동반 가능성 있음'
        ? styles.petStatusBadgeTextPossible
        : styles.petStatusBadgeTextCautious;
}

function buildResultMeta(params: {
  appliedKeyword: string;
  selectedCategoryLabel: string;
  totalCount: number;
  apiTotalCount: number;
  loading: boolean;
}): string {
  const {
    appliedKeyword,
    selectedCategoryLabel,
    totalCount,
    apiTotalCount,
    loading,
  } = params;

  if (loading) return 'TourAPI 실시간 여행 후보를 확인하는 중';

  const suffix =
    apiTotalCount > totalCount
      ? ` (전체 ${apiTotalCount}건 중 ${totalCount}건 표시)`
      : ` ${totalCount}건`;

  if (!appliedKeyword) {
    return selectedCategoryLabel === '전체'
      ? `전국 반려동물 동반 여행 후보${suffix}`
      : `${selectedCategoryLabel} 여행 후보${suffix}`;
  }

  return `"${appliedKeyword}" 여행 후보${suffix}`;
}

export default function PetTravelListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const categories = useMemo(() => getPetTravelCategories(), []);
  const [queryInput, setQueryInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    PetTravelCategory['id']
  >(categories[0]?.id ?? 'all');
  const [items, setItems] = useState<PetTravelItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [apiTotalCount, setApiTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => categories.find(category => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );
  const selectedPet = useMemo(
    () => pets.find(candidate => candidate.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );
  const onPressBack = useEntryAwareBackAction({
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

  const onPressItem = useCallback(
    (item: PetTravelItem) => {
      navigation.navigate('PetTravelDetail', { item });
    },
    [navigation],
  );

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const result = await fetchPetTravelList({
        searchKeyword: appliedQuery,
        categoryId: selectedCategoryId,
        page: 1,
        size: 40,
      });

      setItems(result.items);
      setTotalCount(result.totalCount);
      setApiTotalCount(result.apiTotalCount);
      setPage(1);
      setHasMore(result.items.length < result.apiTotalCount);
    } catch (error) {
      setItems([]);
      setTotalCount(0);
      setApiTotalCount(0);
      setPage(1);
      setHasMore(true);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '반려동물 여행 후보를 불러오지 못했어요.',
      );
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, selectedCategoryId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const result = await fetchPetTravelList({
        searchKeyword: appliedQuery,
        categoryId: selectedCategoryId,
        page: nextPage,
        size: 40,
      });

      let mergedLength = items.length;
      setItems(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const newItems = result.items.filter(i => !existingIds.has(i.id));
        mergedLength = prev.length + newItems.length;
        return [...prev, ...newItems];
      });
      setTotalCount(mergedLength);
      setPage(nextPage);
      setApiTotalCount(result.apiTotalCount);
      setHasMore(mergedLength < result.apiTotalCount);
    } catch {
      // 추가 로딩 실패는 조용히 무시
    } finally {
      setLoadingMore(false);
    }
  }, [appliedQuery, hasMore, items, loadingMore, page, selectedCategoryId]);

  useEffect(() => {
    loadList().catch(() => {});
  }, [loadList]);

  const submitSearch = useCallback(() => {
    const nextQuery = queryInput.trim();
    if (nextQuery === appliedQuery) {
      loadList().catch(() => {});
      return;
    }

    setPage(1);
    setHasMore(true);
    setItems([]);
    setAppliedQuery(nextQuery);
  }, [appliedQuery, loadList, queryInput]);

  const clearSearch = useCallback(() => {
    setQueryInput('');
    if (!appliedQuery) {
      loadList().catch(() => {});
      return;
    }

    setPage(1);
    setHasMore(true);
    setItems([]);
    setAppliedQuery('');
  }, [appliedQuery, loadList]);

  const renderCategoryChip = useCallback(
    (category: PetTravelCategory) => (
      <TouchableOpacity
        key={category.id}
        activeOpacity={0.9}
        style={[
          styles.chip,
          selectedCategoryId === category.id ? styles.chipSelected : null,
          selectedCategoryId === category.id
            ? {
                borderColor: petTheme.border,
                backgroundColor: petTheme.tint,
              }
            : null,
        ]}
        onPress={() => {
          setSelectedCategoryId(category.id);
          setPage(1);
          setHasMore(true);
          setItems([]);
        }}
      >
        <AppText
          preset="caption"
          style={[
            styles.chipText,
            selectedCategoryId === category.id ? styles.chipTextSelected : null,
            selectedCategoryId === category.id
              ? { color: petTheme.primary }
              : null,
          ]}
        >
          {category.label}
        </AppText>
      </TouchableOpacity>
    ),
    [petTheme.border, petTheme.primary, petTheme.tint, selectedCategoryId],
  );

  const renderItem = useCallback(
    ({ item }: { item: PetTravelItem }) => {
      const confidenceStyle = getConfidenceBadgeStyle(item.petConfidenceLabel);
      const confidenceTextStyle = getConfidenceBadgeTextStyle(
        item.petConfidenceLabel,
      );

      return (
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.card}
          onPress={() => {
            onPressItem(item);
          }}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIcon}>
              <Feather
                name={getCategoryIcon(item.categoryId)}
                size={18}
                color={petTheme.primary}
              />
            </View>
            <View style={styles.cardHeaderCopy}>
              <AppText
                preset="caption"
                style={[styles.cardCategory, { color: petTheme.primary }]}
              >
                {item.categoryLabel}
              </AppText>
              <AppText preset="headline" style={styles.cardTitle}>
                {item.name}
              </AppText>
            </View>
          </View>

          <AppText preset="body" style={styles.cardSummary}>
            {item.summary}
          </AppText>

          <View style={styles.badgeRow}>
            <View style={styles.sourceBadge}>
              <AppText preset="caption" style={styles.sourceBadgeText}>
                {item.source.providerLabel}
              </AppText>
            </View>
            <View style={styles.neutralBadge}>
              <AppText preset="caption" style={styles.neutralBadgeText}>
                {getPetTravelPlaceTypeLabel(item.placeType)}
              </AppText>
            </View>
            <View style={[styles.petStatusBadge, confidenceStyle]}>
              <AppText
                preset="caption"
                style={[styles.petStatusBadgeText, confidenceTextStyle]}
              >
                {item.petConfidenceLabel}
              </AppText>
            </View>
            {item.facilityHighlights.slice(0, 2).map(highlight => (
              <View key={highlight} style={styles.highlightBadge}>
                <AppText preset="caption" style={styles.highlightBadgeText}>
                  {highlight}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.addressRow}>
            <Feather name="map-pin" size={14} color="#7B8597" />
            <AppText preset="caption" style={styles.addressText}>
              {item.address}
            </AppText>
          </View>

          <AppText preset="caption" style={styles.cardNotice}>
            {item.petAllowed === 'confirmed'
              ? item.petNotice
              : `${getPetTravelPetAllowedLabel(item.petAllowed)} · ${item.petNotice}`}
          </AppText>
        </TouchableOpacity>
      );
    },
    [onPressItem, petTheme.primary],
  );

  const resultMetaText = useMemo(
    () =>
      buildResultMeta({
        appliedKeyword: appliedQuery,
        selectedCategoryLabel: selectedCategory?.label ?? '전체',
        totalCount,
        apiTotalCount,
        loading,
      }),
    [appliedQuery, apiTotalCount, loading, selectedCategory, totalCount],
  );

  const helperText = appliedQuery
    ? '지역명 단독 검색은 여행지 중심으로 더 좁게 정제해서 보여줘요.'
    : '검색어가 없으면 공식 areaBasedList2 응답으로 전체 후보를 보여줘요.';

  return (
    <Screen style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSideSlot}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.backButton}
              onPress={onPressBack}
            >
              <Feather name="arrow-left" size={20} color="#102033" />
            </TouchableOpacity>
          </View>
          <AppText preset="headline" style={styles.headerTitle}>
            반려동물과 여행
          </AppText>
          <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
        </View>

        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.listHeaderContent}>
              <View style={styles.searchWrap}>
                <View style={styles.searchInputWrap}>
                  <Feather name="search" size={18} color="#98A1B2" />
                  <TextInput
                    value={queryInput}
                    onChangeText={setQueryInput}
                    onSubmitEditing={submitSearch}
                    placeholder="지역명, 관광지명, 숙소, 야외공간 키워드 검색"
                    placeholderTextColor="#98A1B2"
                    style={styles.searchInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {queryInput ? (
                    <Pressable onPress={clearSearch} hitSlop={10}>
                      <Feather name="x" size={16} color="#98A1B2" />
                    </Pressable>
                  ) : null}
                  <Pressable onPress={submitSearch} hitSlop={10}>
                    <Feather
                      name="arrow-right-circle"
                      size={18}
                      color={petTheme.primary}
                    />
                  </Pressable>
                </View>
                <AppText preset="caption" style={styles.searchHelperText}>
                  {helperText}
                </AppText>
              </View>

              <View style={styles.sectionWrap}>
                <AppText preset="headline" style={styles.sectionTitle}>
                  카테고리
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {categories.map(category => renderCategoryChip(category))}
                </ScrollView>
              </View>

              <View style={styles.resultMetaBar}>
                <AppText preset="caption" style={styles.resultMetaText}>
                  {resultMetaText}
                </AppText>
              </View>

              {errorMessage ? (
                <View style={styles.errorCard}>
                  <AppText preset="headline" style={styles.errorTitle}>
                    실시간 여행 데이터를 불러오지 못했어요
                  </AppText>
                  <AppText preset="body" style={styles.errorBody}>
                    {errorMessage}
                  </AppText>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                      styles.retryButton,
                      { backgroundColor: petTheme.tint },
                    ]}
                    onPress={() => {
                      loadList().catch(() => {});
                    }}
                  >
                    <AppText
                      preset="caption"
                      style={[styles.retryButtonText, { color: petTheme.primary }]}
                    >
                      다시 시도
                    </AppText>
                  </TouchableOpacity>
                </View>
              ) : null}

              {loading ? (
                <View style={styles.loadingCard}>
                  <AppText preset="headline" style={styles.loadingTitle}>
                    여행 후보를 불러오는 중이에요
                  </AppText>
                  <AppText preset="body" style={styles.loadingBody}>
                    한국관광공사 반려동물 동반여행 응답을 확인하고 있어요.
                  </AppText>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading || errorMessage ? null : (
              <View style={styles.emptyCard}>
                <AppText preset="headline" style={styles.emptyTitle}>
                  {appliedQuery
                    ? `"${appliedQuery}" 주변에서 반려동물과\n함께할 여행지를 찾지 못했어요`
                    : '이 지역에서 반려동물과\n함께할 수 있는 여행지를 찾지 못했어요'}
                </AppText>
                <AppText preset="body" style={styles.emptyBody}>
                  {appliedQuery
                    ? '지역명 + 여행지 키워드로 다시 검색해 보세요.\n예: 제주 공원, 강릉 해변, 가평 캠핑'
                    : '지역명이나 여행지 키워드를 입력하면\n반려동물 동반 가능성이 높은 곳부터 보여드려요.'}
                </AppText>
                {appliedQuery ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                      styles.retryButton,
                      { backgroundColor: petTheme.tint },
                    ]}
                    onPress={clearSearch}
                  >
                    <AppText
                      preset="caption"
                      style={[styles.retryButtonText, { color: petTheme.primary }]}
                    >
                      검색어 지우고 전체 보기
                    </AppText>
                  </TouchableOpacity>
                ) : null}
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMoreCard}>
                <AppText preset="caption" style={styles.loadingMoreText}>
                  여행 후보를 더 불러오는 중이에요
                </AppText>
              </View>
            ) : null
          }
        />
      </View>
    </Screen>
  );
}
