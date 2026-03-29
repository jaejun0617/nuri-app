import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
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
import { usePlaceUserLayer } from '../../hooks/usePlaceUserLayer';
import { useRecentPersonalSearches } from '../../hooks/useRecentPersonalSearches';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import type {
  LocationDiscoveryDomain,
  LocationDiscoveryItem,
  LocationDiscoverySortOption,
} from '../../services/locationDiscovery/types';
import { recordUserSearchLog } from '../../services/supabase/placeTravelUserLayer';
import { getPetPlaceOwnReportLabel } from '../../services/trust/userLayerLabels';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type WalkRoute = RootScreenRoute<'WalkSpotList'>;
type PetFriendlyRoute = RootScreenRoute<'PetFriendlyPlaceList'>;

type Props = {
  domain: LocationDiscoveryDomain;
};

function getDomainCopy(domain: LocationDiscoveryDomain) {
  if (domain === 'walk') {
    return {
      title: '우리동네 산책 리스트',
      sectionTitle: '주변 산책 후보',
      placeholder: '공원, 산책로, 지역 검색',
      helperText:
        '현재 위치 주변 후보가 기본이며, 검색어를 입력한 뒤 검색 버튼으로 직접 찾을 수 있어요.',
      detailRoute: 'WalkSpotDetail' as const,
    };
  }

  return {
    title: '펫동반 카페 / 공간 찾기',
    sectionTitle: '주변 펫동반 카페 / 공간',
    placeholder: '카페명, 식당명, 지역명, 키워드 검색',
    helperText:
      '현재 위치 주변 후보가 기본이며, 상호명·지역명·애견카페·테라스 같은 키워드로도 찾을 수 있어요.',
      detailRoute: 'PetFriendlyPlaceDetail' as const,
  };
}

export default function LocationDiscoveryListScreen({ domain }: Props) {
  const navigation = useNavigation<Nav>();
  const route = useRoute<WalkRoute | PetFriendlyRoute>();
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const copy = getDomainCopy(domain);
  const [searchInput, setSearchInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<LocationDiscoverySortOption>('recommended');
  const recentSearches = useRecentPersonalSearches(domain);
  const placeUserLayer = usePlaceUserLayer({
    enabled: domain === 'pet-friendly-place',
  });
  const lastLoggedSearchRef = useRef<string | null>(null);
  const discoveryState = useLocationDiscovery({
    domain,
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
        ? '현재 위치 기준 후보'
        : '최근 확인 위치 기준 후보';
  }, [
    submittedQuery,
    discoveryState.hasFreshLocation,
    discoveryState.loading,
    discoveryState.usingStaleLocation,
  ]);
  const sortedItems = useMemo(() => {
    if (sortOrder === 'recommended') {
      return discoveryState.items;
    }

    const items = [...discoveryState.items];

    items.sort((left, right) => {
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

    return items;
  }, [discoveryState.items, sortOrder]);
  const publicLabelCounts = useMemo(() => {
    return sortedItems.reduce(
      (accumulator, item) => {
        accumulator[item.publicTrust.publicLabel] += 1;
        return accumulator;
      },
      {
        candidate: 0,
        needs_verification: 0,
        trust_reviewed: 0,
      },
    );
  }, [sortedItems]);
  const buildCardPersonalState = useCallback(
    (item: LocationDiscoveryItem) => {
      if (domain !== 'pet-friendly-place' || !item.userLayer.targetId) {
        return null;
      }

      const record = placeUserLayer.records.get(item.userLayer.targetId);
      if (!record) {
        return null;
      }

      const badges: string[] = [];
      if (record.isBookmarked) {
        badges.push('저장함');
      }
      if (record.ownReportStatus) {
        badges.push('내가 제보함');
      }

      if (!badges.length) {
        return null;
      }

      const reportLabel = getPetPlaceOwnReportLabel(record.ownReportStatus);
      return {
        badges,
        note: reportLabel
          ? `${reportLabel}. 개인 상태는 공개 라벨을 올리지 않아요.`
          : '개인 상태는 공개 라벨을 올리지 않아요.',
      };
    },
    [domain, placeUserLayer.records],
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
    (item: LocationDiscoveryItem) => {
      if (domain === 'walk') {
        navigation.navigate('WalkSpotDetail', {
          item,
          resultItems: sortedItems,
        });
        return;
      }

      navigation.navigate('PetFriendlyPlaceDetail', {
        item,
        resultItems: sortedItems,
      });
    },
    [domain, navigation, sortedItems],
  );
  const renderItem = useCallback(
    ({ item }: { item: LocationDiscoveryItem }) => (
      <LocationDiscoveryCard
        item={item}
        onPress={onPressItem}
        personalState={buildCardPersonalState(item)}
      />
    ),
    [buildCardPersonalState, onPressItem],
  );
  const keyExtractor = useCallback(
    (item: LocationDiscoveryItem) => `${domain}:${item.id}`,
    [domain],
  );

  useEffect(() => {
    if (domain !== 'pet-friendly-place') {
      return;
    }

    const normalizedQuery = submittedQuery.trim();
    if (normalizedQuery.length < 2) {
      lastLoggedSearchRef.current = null;
      return;
    }

    if (discoveryState.loading || discoveryState.searching || discoveryState.error) {
      return;
    }

    const signature = [
      domain,
      normalizedQuery,
      discoveryState.scope.anchorCoordinates?.latitude?.toFixed(3) ?? 'na',
      discoveryState.scope.anchorCoordinates?.longitude?.toFixed(3) ?? 'na',
      sortedItems.length,
    ].join(':');

    if (lastLoggedSearchRef.current === signature) {
      return;
    }

    lastLoggedSearchRef.current = signature;
    recordUserSearchLog({
      sourceDomain: 'pet-friendly-place',
      queryText: normalizedQuery,
      anchorLatitude: discoveryState.scope.anchorCoordinates?.latitude ?? null,
      anchorLongitude: discoveryState.scope.anchorCoordinates?.longitude ?? null,
      resultCount: sortedItems.length,
      providerMix: ['kakao'],
    }).catch(() => {});
  }, [
    discoveryState.error,
    discoveryState.loading,
    discoveryState.scope.anchorCoordinates?.latitude,
    discoveryState.scope.anchorCoordinates?.longitude,
    discoveryState.searching,
    domain,
    sortedItems.length,
    submittedQuery,
  ]);

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
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
            {copy.title}
          </AppText>
          <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
        </View>

        <LocationDiscoverySearchBar
          value={searchInput}
          onChangeText={handleChangeSearchInput}
          onSubmit={handleSubmitSearch}
          placeholder={copy.placeholder}
          helperText={copy.helperText}
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
                  key={`${domain}:recent:${entry.query}`}
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
            <AppText preset="caption" style={styles.recentSearchCaption}>
              최근 검색은 내 기기 편의를 위한 개인 상태예요. 공개 라벨에는 영향을 주지 않아요.
            </AppText>
          </View>
        ) : null}

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
            {discoveryState.scope ? (
              <AppText preset="caption" style={styles.locationSubtitle}>
                거리 기준: {discoveryState.scope.distanceLabel}
              </AppText>
            ) : null}
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
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.sortChip,
                sortOrder === 'recommended'
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
                setSortOrder('recommended');
              }}
            >
              <AppText
                preset="caption"
                style={[
                  styles.sortChipText,
                  sortOrder === 'recommended'
                    ? [styles.sortChipTextSelected, { color: petTheme.primary }]
                    : null,
                ]}
              >
                신뢰 우선
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.sortChip,
                sortOrder === 'distance-asc'
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
                setSortOrder('distance-asc');
              }}
            >
              <AppText
                preset="caption"
                style={[
                  styles.sortChipText,
                  sortOrder === 'distance-asc'
                    ? [styles.sortChipTextSelected, { color: petTheme.primary }]
                    : null,
                ]}
              >
                가까운순
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.sortChip,
                sortOrder === 'distance-desc'
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
                setSortOrder('distance-desc');
              }}
            >
              <AppText
                preset="caption"
                style={[
                  styles.sortChipText,
                  sortOrder === 'distance-desc'
                    ? [styles.sortChipTextSelected, { color: petTheme.primary }]
                    : null,
                ]}
              >
                먼순
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        <AppText preset="headline" style={styles.sectionTitle}>
          {copy.sectionTitle}
        </AppText>

        {domain === 'pet-friendly-place' ? (
          <View style={styles.infoBanner}>
            <AppText preset="caption" style={styles.infoBannerTitle}>
              검수 반영 {publicLabelCounts.trust_reviewed}곳 · 확인 필요{' '}
              {publicLabelCounts.needs_verification}곳 · 후보{' '}
              {publicLabelCounts.candidate}곳
            </AppText>
            <AppText preset="body" style={styles.infoBannerBody}>
              검수 정보가 없는 후보는 더 보수적으로 낮춰 보여줘요. 외부 원본과 검수 정보가 다를 수 있으니 실제 방문 전 정책을 다시 확인해 주세요.
            </AppText>
          </View>
        ) : null}

        {discoveryState.loading && sortedItems.length === 0 ? (
          <LocationDiscoveryStatusCard
            icon="loader"
            loading
            title="주변 장소를 불러오는 중이에요"
            body="현재 위치와 검색 조건을 바탕으로 장소를 정리하고 있어요. 잠시만 기다려 주세요."
          />
        ) : discoveryState.error && sortedItems.length === 0 ? (
          <LocationDiscoveryStatusCard
            icon="alert-circle"
            title="장소를 불러오지 못했어요"
            body={discoveryState.error}
          />
        ) : sortedItems.length === 0 ? (
          submittedQuery.trim().length >= 2 ? (
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
              title={
                discoveryState.usingStaleLocation
                  ? '현재 위치를 다시 확인하는 중이에요'
                  : domain === 'walk'
                    ? '현재 위치 주변 산책 후보를 아직 찾지 못했어요'
                    : '현재 위치 주변 펫동반 후보를 아직 찾지 못했어요'
              }
              body={
                discoveryState.usingStaleLocation
                  ? '최근 확인 위치는 있지만 최신 GPS가 아직 잡히지 않았어요. 새로고침하거나 검색으로 직접 찾아보세요.'
                  : '현재 위치를 다시 확인하거나 검색으로 직접 장소를 찾아보세요.'
              }
            />
          )
        ) : (
          <FlatList
            data={sortedItems}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets
            removeClippedSubviews={Platform.OS === 'android'}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
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
      </KeyboardAvoidingView>
    </Screen>
  );
}
