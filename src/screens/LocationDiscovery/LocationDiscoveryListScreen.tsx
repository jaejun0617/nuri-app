import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import Screen from '../../components/layout/Screen';
import LocationDiscoveryCard from '../../components/locationDiscovery/LocationDiscoveryCard';
import LocationDiscoverySearchBar from '../../components/locationDiscovery/LocationDiscoverySearchBar';
import {
  LocationDiscoveryStatusCard,
  buildLocationPermissionCopy,
} from '../../components/locationDiscovery/LocationDiscoveryStatusCard';
import { styles } from '../../components/locationDiscovery/LocationDiscovery.styles';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import { useLocationDiscovery } from '../../hooks/useLocationDiscovery';
import { useRecentPersonalSearches } from '../../hooks/useRecentPersonalSearches';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import type {
  LocationDiscoveryItem,
  LocationDiscoverySortOption,
} from '../../services/locationDiscovery/types';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type WalkRoute = RootScreenRoute<'WalkSpotList'>;

function sortWalkItems(
  items: ReadonlyArray<LocationDiscoveryItem>,
  sortOrder: LocationDiscoverySortOption,
) {
  if (sortOrder === 'recommended') {
    return [...items];
  }

  const nextItems = [...items];
  nextItems.sort((left, right) => {
    const leftDistance = left.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    const rightDistance = right.distanceMeters ?? Number.MAX_SAFE_INTEGER;

    if (sortOrder === 'distance-desc') {
      if (leftDistance !== rightDistance) {
        return rightDistance - leftDistance;
      }
    } else if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    return left.name.localeCompare(right.name, 'ko');
  });

  return nextItems;
}

function WalkLoadingSkeleton() {
  return (
    <View style={styles.resultsLoadingWrap}>
      {[0, 1, 2].map(index => (
        <View key={`walk-loading-${index}`} style={styles.resultsLoadingCard}>
          <View style={styles.resultsLoadingThumb} />
          <View style={styles.resultsLoadingBody}>
            <View
              style={[
                styles.resultsLoadingLine,
                styles.resultsLoadingLineShort,
              ]}
            />
            <View style={styles.resultsLoadingLine} />
            <View
              style={[
                styles.resultsLoadingLine,
                styles.resultsLoadingLineMedium,
              ]}
            />
          </View>
        </View>
      ))}
      <AppText preset="caption" style={styles.resultsLoadingText}>
        주변 산책 장소를 정리하고 있어요.
      </AppText>
    </View>
  );
}

export default function LocationDiscoveryListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<WalkRoute>();
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const recentSearches = useRecentPersonalSearches('walk');
  const listRef = useRef<FlatList<LocationDiscoveryItem> | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [sortOrder, setSortOrder] =
    useState<LocationDiscoverySortOption>('recommended');

  const discoveryState = useLocationDiscovery({
    domain: 'walk',
    query: submittedQuery,
  });
  const selectedPet = useMemo(
    () => pets.find(candidate => candidate.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );
  const sortedItems = useMemo(
    () => sortWalkItems(discoveryState.items, sortOrder),
    [discoveryState.items, sortOrder],
  );

  const locationTitle = useMemo(() => {
    return (
      discoveryState.scope?.displayLabel ??
      discoveryState.district ??
      '현재 위치를 확인하는 중'
    );
  }, [discoveryState.district, discoveryState.scope?.displayLabel]);
  const locationSubtitle = useMemo(() => {
    if (discoveryState.usingStaleLocation && discoveryState.loading) {
      return '새 위치를 빠르게 확인하고 있어요';
    }

    return submittedQuery.trim().length >= 2
      ? '검색어와 현재 위치를 함께 참고하고 있어요'
      : discoveryState.hasFreshLocation
        ? '현재 위치 기준'
        : '최근 확인 위치 기준';
  }, [
    submittedQuery,
    discoveryState.hasFreshLocation,
    discoveryState.loading,
    discoveryState.usingStaleLocation,
  ]);

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

  const openDetail = useCallback(
    (item: LocationDiscoveryItem) => {
      navigation.navigate('WalkSpotDetail', {
        item,
        resultItems: sortedItems,
      });
    },
    [navigation, sortedItems],
  );

  const handleSubmitSearch = useCallback(() => {
    const normalized = searchInput.trim().replace(/\s+/g, ' ');
    if (normalized.length >= 2) {
      recentSearches.save(normalized).catch(() => {});
    }
    setSubmittedQuery(normalized);
  }, [recentSearches, searchInput]);

  const handleChangeSearchInput = useCallback((value: string) => {
    setSearchInput(value);

    if (!value.trim()) {
      setSubmittedQuery('');
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: LocationDiscoveryItem }) => (
      <LocationDiscoveryCard
        item={item}
        onPress={openDetail}
        onPressDetail={openDetail}
        layout="compact"
      />
    ),
    [openDetail],
  );

  const keyExtractor = useCallback(
    (item: LocationDiscoveryItem) => `walk:${item.id}`,
    [],
  );

  const listHeader = (
    <View style={styles.resultsListIntro}>
      <View style={styles.locationInfoCard}>
        <View
          style={[styles.locationIconWrap, { backgroundColor: petTheme.tint }]}
        >
          <Feather name="map-pin" size={18} color={petTheme.primary} />
        </View>
        <View style={styles.locationCopy}>
          <AppText preset="caption" style={styles.locationSubtitle}>
            {locationSubtitle}
          </AppText>
          <AppText preset="body" style={styles.locationTitle}>
            {locationTitle}
          </AppText>
        </View>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.locationRefreshButton,
            { backgroundColor: petTheme.tint },
          ]}
          onPress={() => {
            discoveryState.refresh().catch(() => {});
          }}
        >
          <AppText
            preset="caption"
            style={[styles.locationRefreshButtonText, { color: petTheme.primary }]}
          >
            새로고침
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.sortRow}>
          {([
            ['recommended', '신뢰 우선'],
            ['distance-asc', '가까운순'],
            ['distance-desc', '먼순'],
          ] as const).map(([value, label]) => {
            const selected = sortOrder === value;
            return (
              <TouchableOpacity
                key={value}
                activeOpacity={0.9}
                style={[
                  styles.sortChip,
                  selected
                    ? [
                        styles.sortChipSelected,
                        {
                          borderColor: petTheme.border,
                          backgroundColor: petTheme.tint,
                        },
                      ]
                    : null,
                ]}
                onPress={() => {
                  setSortOrder(value);
                }}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.sortChipText,
                    selected
                      ? [styles.sortChipTextSelected, { color: petTheme.primary }]
                      : null,
                  ]}
                >
                  {label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

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
            우리동네 산책 리스트
          </AppText>
          <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
        </View>

        <LocationDiscoverySearchBar
          value={searchInput}
          onChangeText={handleChangeSearchInput}
          onSubmit={handleSubmitSearch}
          placeholder="공원, 산책로, 지역 검색"
          helperText={null}
          accentColor={petTheme.primary}
          loadingColor={petTheme.primary}
          loadingText={
            discoveryState.searching
              ? '검색 중'
              : discoveryState.loading
                ? '불러오는 중'
                : null
          }
        />

        {recentSearches.searches.length ? (
          <View style={styles.recentSearchSection}>
            <View style={styles.recentSearchHeader}>
              <AppText preset="headline" style={styles.recentSearchTitle}>
                최근 검색
              </AppText>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.recentSearchClearButton}
                onPress={() => {
                  recentSearches.clear().catch(() => {});
                }}
              >
                <AppText
                  preset="caption"
                  style={styles.recentSearchClearButtonText}
                >
                  지우기
                </AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.recentSearchChipRow}>
              {recentSearches.searches.map(entry => (
                <TouchableOpacity
                  key={`walk:recent:${entry.query}`}
                  activeOpacity={0.9}
                  style={styles.recentSearchChip}
                  onPress={() => {
                    setSearchInput(entry.query);
                    setSubmittedQuery(entry.query);
                    recentSearches.save(entry.query).catch(() => {});
                  }}
                >
                  <AppText preset="caption" style={styles.recentSearchChipText}>
                    {entry.query}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.discoveryExperienceShell}>
          <View style={styles.resultsPanel}>
            {discoveryState.loading && sortedItems.length === 0 ? (
              <WalkLoadingSkeleton />
            ) : discoveryState.error && sortedItems.length === 0 ? (
              <View style={styles.resultsEmptyWrap}>
                <LocationDiscoveryStatusCard
                  icon="alert-circle"
                  title="산책 장소를 불러오지 못했어요"
                  body={discoveryState.error}
                />
              </View>
            ) : sortedItems.length === 0 ? (
              <View style={styles.resultsEmptyWrap}>
                {submittedQuery.trim().length >= 2 ? (
                  <LocationDiscoveryStatusCard
                    icon="search"
                    title="검색 결과가 없어요"
                    body="검색어를 조금 바꾸거나 지역명과 함께 다시 검색해 보세요."
                  />
                ) : discoveryState.permission !== 'granted' ? (
                  <LocationDiscoveryStatusCard
                    icon="map-pin"
                    {...buildLocationPermissionCopy(discoveryState.permission)}
                  />
                ) : (
                  <LocationDiscoveryStatusCard
                    icon="map"
                    title="현재 위치 주변 산책 장소를 아직 찾지 못했어요"
                    body="현재 위치를 다시 확인하거나 검색으로 직접 산책 장소를 찾아보세요."
                  />
                )}
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={sortedItems}
                ListHeaderComponent={listHeader}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                style={styles.resultsList}
                contentContainerStyle={styles.resultsListContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                removeClippedSubviews={Platform.OS === 'android'}
                scrollEventThrottle={16}
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                windowSize={7}
                onScrollToIndexFailed={({ index }) => {
                  listRef.current?.scrollToOffset({
                    offset: Math.max(index, 0) * 172,
                    animated: true,
                  });
                }}
                refreshControl={
                  <RefreshControl
                    refreshing={discoveryState.refreshing}
                    onRefresh={() => {
                      discoveryState.refresh().catch(() => {});
                    }}
                  />
                }
              />
            )}
          </View>
        </View>
      </View>
    </Screen>
  );
}
