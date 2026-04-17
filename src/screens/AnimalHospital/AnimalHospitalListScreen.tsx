import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import AnimalHospitalCard from '../../components/animalHospital/AnimalHospitalCard';
import Screen from '../../components/layout/Screen';
import LocationDiscoverySearchBar from '../../components/locationDiscovery/LocationDiscoverySearchBar';
import {
  LocationDiscoveryStatusCard,
  buildLocationPermissionCopy,
} from '../../components/locationDiscovery/LocationDiscoveryStatusCard';
import { styles } from '../../components/locationDiscovery/LocationDiscovery.styles';
import LocationDiscoveryMapPanel, {
  buildLocationDiscoveryMapViewport,
  type LocationDiscoveryMapItem,
} from '../../components/maps/LocationDiscoveryMapPanel';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import { useAnimalHospitalDiscovery } from '../../hooks/useAnimalHospitalDiscovery';
import { useRecentPersonalSearches } from '../../hooks/useRecentPersonalSearches';
import type {
  AnimalHospitalPublicHospital,
} from '../../domains/animalHospital/types';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import {
  consumeMapViewportRestore,
  requestMapViewportRestore,
  saveMapViewport,
  useMapViewportStore,
  type MapViewportSnapshot,
} from '../../store/mapViewportStore';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RootScreenRoute<'AnimalHospitalList'>;

function AnimalHospitalLoadingSkeleton() {
  return (
    <View style={styles.resultsLoadingWrap}>
      {[0, 1, 2].map(index => (
        <View key={`animal-hospital-loading-${index}`} style={styles.resultsLoadingCard}>
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
        현재 위치 기준 병원 후보를 정리하고 있어요.
      </AppText>
    </View>
  );
}

export default function AnimalHospitalListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const recentSearches = useRecentPersonalSearches('animal-hospital');
  const listRef = useRef<FlatList<AnimalHospitalPublicHospital> | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [mapViewport, setMapViewport] = useState<MapViewportSnapshot | null>(null);
  const [isRestoringViewport, setIsRestoringViewport] = useState(false);
  const lastViewportSeedSignatureRef = useRef<string | null>(null);
  const persistedViewport = useMapViewportStore(
    s => s.byDomain['animal-hospital'] ?? null,
  );

  const discoveryState = useAnimalHospitalDiscovery({
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
  const mapItems = useMemo<LocationDiscoveryMapItem[]>(
    () =>
      discoveryState.items
        .filter(
          item => item.latitude !== null && item.longitude !== null,
        )
        .map(item => ({
          id: item.id,
          name: item.name,
          address: item.address,
          latitude: item.latitude!,
          longitude: item.longitude!,
        })),
    [discoveryState.items],
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

  const openDetail = useCallback(
    (item: AnimalHospitalPublicHospital) => {
      if (mapViewport) {
        saveMapViewport('animal-hospital', {
          centerLatitude: mapViewport.centerLatitude,
          centerLongitude: mapViewport.centerLongitude,
          zoomLevel: mapViewport.zoomLevel,
          selectedItemId: item.id,
        });
      }
      requestMapViewportRestore('animal-hospital');
      navigation.navigate('AnimalHospitalDetail', {
        item,
      });
    },
    [mapViewport, navigation],
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

  useEffect(() => {
    if (mapViewport || !persistedViewport) {
      return;
    }

    setMapViewport(persistedViewport);
    setSelectedItemId(persistedViewport.selectedItemId);
  }, [mapViewport, persistedViewport]);

  useFocusEffect(
    useCallback(() => {
      const restoredViewport = consumeMapViewportRestore('animal-hospital');
      if (!restoredViewport) {
        return undefined;
      }

      setIsRestoringViewport(true);
      setMapViewport(restoredViewport);
      setSelectedItemId(restoredViewport.selectedItemId);
      const timer = setTimeout(() => {
        setIsRestoringViewport(false);
      }, 320);

      return () => {
        clearTimeout(timer);
      };
    }, []),
  );

  useEffect(() => {
    if (!discoveryState.items.length) {
      return;
    }

    const signature = `${submittedQuery}:${discoveryState.items
      .map(item => item.id)
      .join(',')}`;
    if (lastViewportSeedSignatureRef.current === signature) {
      return;
    }

    lastViewportSeedSignatureRef.current = signature;
    const seededViewport = buildLocationDiscoveryMapViewport({
      items: mapItems,
      fallbackCoordinates: discoveryState.coordinates
        ? {
            latitude: discoveryState.coordinates.latitude,
            longitude: discoveryState.coordinates.longitude,
          }
        : null,
    });
    if (!seededViewport) {
      return;
    }

    const nextSelectedItemId =
      seededViewport.selectedItemId ?? discoveryState.items[0]?.id ?? null;
    const nextViewport: MapViewportSnapshot = {
      ...seededViewport,
      selectedItemId: nextSelectedItemId,
      updatedAt: new Date().toISOString(),
    };
    setMapViewport(nextViewport);
    setSelectedItemId(nextSelectedItemId);
    saveMapViewport('animal-hospital', {
      centerLatitude: seededViewport.centerLatitude,
      centerLongitude: seededViewport.centerLongitude,
      zoomLevel: seededViewport.zoomLevel,
      selectedItemId: nextSelectedItemId,
    });
  }, [
    discoveryState.coordinates,
    discoveryState.items,
    mapItems,
    submittedQuery,
  ]);

  const selectItem = useCallback(
    (
      item: AnimalHospitalPublicHospital,
      viewportOverride?: Omit<MapViewportSnapshot, 'updatedAt'> | null,
    ) => {
      setSelectedItemId(item.id);
      if (viewportOverride) {
        const nextSnapshot: MapViewportSnapshot = {
          ...viewportOverride,
          updatedAt: new Date().toISOString(),
        };
        setMapViewport(nextSnapshot);
        saveMapViewport('animal-hospital', viewportOverride);
      } else if (mapViewport) {
        saveMapViewport('animal-hospital', {
          centerLatitude: mapViewport.centerLatitude,
          centerLongitude: mapViewport.centerLongitude,
          zoomLevel: mapViewport.zoomLevel,
          selectedItemId: item.id,
        });
      }

      const itemIndex = discoveryState.items.findIndex(candidate => candidate.id === item.id);
      if (itemIndex >= 0) {
        listRef.current?.scrollToIndex({
          index: itemIndex,
          animated: true,
          viewPosition: 0.15,
        });
      }
    },
    [discoveryState.items, mapViewport],
  );

  const selectedCounts = useMemo(
    () =>
      discoveryState.items.reduce(
        (acc, item) => {
          acc[item.publicTrust.publicLabel] += 1;
          return acc;
        },
        {
          candidate: 0,
          needs_verification: 0,
          trust_reviewed: 0,
        },
      ),
    [discoveryState.items],
  );

  const renderItem = useCallback(
    ({ item }: { item: AnimalHospitalPublicHospital }) => (
      <AnimalHospitalCard
        item={item}
        selected={item.id === selectedItemId}
        onSelect={selectItem}
        onOpenDetail={openDetail}
      />
    ),
    [openDetail, selectItem, selectedItemId],
  );

  const keyExtractor = useCallback(
    (item: AnimalHospitalPublicHospital) => `animal-hospital:${item.id}`,
    [],
  );

  const listHeader = (
    <View style={styles.resultsListIntro}>
      <View style={styles.locationInfoCard}>
        <View
          style={[styles.locationIconWrap, { backgroundColor: petTheme.tint }]}
        >
          <Feather name="crosshair" size={18} color={petTheme.primary} />
        </View>
        <View style={styles.locationCopy}>
          <AppText preset="caption" style={styles.locationSubtitle}>
            {discoveryState.scope.distanceLabel}
          </AppText>
          <AppText preset="body" style={styles.locationTitle}>
            {discoveryState.scope.displayLabel}
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

      <View style={localStyles.resultMetaBar}>
        <AppText preset="caption" style={localStyles.resultMetaText}>
          병원 존재와 기본 상태만 안전하게 열고, 운영시간·24시간·특수동물 정보는 숨겨 둬요.
        </AppText>
        <AppText preset="caption" style={localStyles.resultMetaSubtext}>
          검수 반영 {selectedCounts.trust_reviewed}곳 · 확인 필요{' '}
          {selectedCounts.needs_verification}곳 · 후보 {selectedCounts.candidate}곳
        </AppText>
      </View>

      {mapItems.length ? (
        <LocationDiscoveryMapPanel
          title="지도에서 병원 보기"
          caption="선택한 병원에 맞춰 지도와 리스트를 함께 움직여요."
          items={mapItems}
          viewport={mapViewport}
          selectedItemId={selectedItemId}
          restoring={isRestoringViewport}
          onViewportIdle={(nextViewport, _region) => {
            const nextSnapshot: MapViewportSnapshot = {
              ...nextViewport,
              updatedAt: new Date().toISOString(),
            };
            setMapViewport(nextSnapshot);
            setSelectedItemId(nextViewport.selectedItemId);
            saveMapViewport('animal-hospital', nextViewport);
          }}
          onSelectItem={(item, viewportOverride) => {
            const target = discoveryState.items.find(candidate => candidate.id === item.id);
            if (!target) {
              return;
            }
            selectItem(target, {
              centerLatitude: viewportOverride.centerLatitude,
              centerLongitude: viewportOverride.centerLongitude,
              zoomLevel: viewportOverride.zoomLevel,
              selectedItemId: viewportOverride.selectedItemId,
            });
          }}
        />
      ) : null}
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
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Feather name="arrow-left" size={20} color="#102033" />
            </TouchableOpacity>
          </View>
          <AppText preset="headline" style={styles.headerTitle}>
            우리동네 동물병원
          </AppText>
          <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
        </View>

        <LocationDiscoverySearchBar
          value={searchInput}
          onChangeText={handleChangeSearchInput}
          onSubmit={handleSubmitSearch}
          placeholder="병원명, 지역 검색"
          helperText="전화·길찾기와 trust label 중심으로만 먼저 보여드려요."
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
                  key={`animal-hospital:recent:${entry.query}`}
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
            {discoveryState.loading && discoveryState.items.length === 0 ? (
              <AnimalHospitalLoadingSkeleton />
            ) : discoveryState.error && discoveryState.items.length === 0 ? (
              <View style={styles.resultsEmptyWrap}>
                <LocationDiscoveryStatusCard
                  icon="alert-circle"
                  title="병원 후보를 불러오지 못했어요"
                  body={discoveryState.error}
                />
              </View>
            ) : discoveryState.items.length === 0 ? (
              <View style={styles.resultsEmptyWrap}>
                {submittedQuery.trim().length >= 2 ? (
                  <LocationDiscoveryStatusCard
                    icon="search"
                    title="검색 결과가 없어요"
                    body="병원명이나 지역명을 조금 바꿔 다시 검색해 보세요."
                  />
                ) : discoveryState.permission !== 'granted' ? (
                  <LocationDiscoveryStatusCard
                    icon="map-pin"
                    {...buildLocationPermissionCopy(discoveryState.permission)}
                  />
                ) : (
                  <LocationDiscoveryStatusCard
                    icon="map"
                    title="주변 병원 후보를 아직 찾지 못했어요"
                    body="현재 위치를 다시 확인하거나 지역명으로 병원을 검색해 보세요."
                  />
                )}
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={discoveryState.items}
                ListHeaderComponent={listHeader}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                style={styles.resultsList}
                contentContainerStyle={styles.resultsListContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                removeClippedSubviews={Platform.OS === 'android'}
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                windowSize={7}
                onScrollToIndexFailed={({ index }) => {
                  listRef.current?.scrollToOffset({
                    offset: Math.max(index, 0) * 228,
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

const localStyles = StyleSheet.create({
  resultMetaBar: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7EDF5',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    marginBottom: 12,
  },
  resultMetaText: {
    color: '#344255',
    fontWeight: '800',
  },
  resultMetaSubtext: {
    color: '#6E788A',
    fontWeight: '700',
  },
});
