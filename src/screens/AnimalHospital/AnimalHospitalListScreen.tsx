import React, { useCallback, useMemo, useState } from 'react';
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
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import AnimalHospitalCard from '../../components/animalHospital/AnimalHospitalCard';
import Screen from '../../components/layout/Screen';
import LocationDiscoverySearchBar from '../../components/locationDiscovery/LocationDiscoverySearchBar';
import {
  LocationDiscoveryStatusCard,
  buildLocationPermissionCopy,
} from '../../components/locationDiscovery/LocationDiscoveryStatusCard';
import { styles } from '../../components/locationDiscovery/LocationDiscovery.styles';
import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import { useAnimalHospitalDiscovery } from '../../hooks/useAnimalHospitalDiscovery';
import { usePrefetchAnimalHospitalThumbnails } from '../../hooks/useAnimalHospitalThumbnail';
import { useRecentPersonalSearches } from '../../hooks/useRecentPersonalSearches';
import type {
  AnimalHospitalPublicHospital,
} from '../../domains/animalHospital/types';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import { buildPetThemePalette } from '../../services/pets/themePalette';
import { usePetStore } from '../../store/petStore';
import { openMoreDrawer } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RootScreenRoute<'AnimalHospitalList'>;

export default function AnimalHospitalListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const theme = useTheme();
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const recentSearches = useRecentPersonalSearches('animal-hospital');
  const [searchInput, setSearchInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  const discoveryState = useAnimalHospitalDiscovery({
    query: submittedQuery,
  });
  usePrefetchAnimalHospitalThumbnails(discoveryState.items);
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

  const openDetail = useCallback(
    (item: AnimalHospitalPublicHospital) => {
      navigation.navigate('AnimalHospitalDetail', {
        item,
      });
    },
    [navigation],
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
    ({ item }: { item: AnimalHospitalPublicHospital }) => (
      <AnimalHospitalCard
        item={item}
        onOpenDetail={openDetail}
      />
    ),
    [openDetail],
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
              <Feather
                name="arrow-left"
                size={20}
                color={theme.colors.textPrimary}
              />
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
          helperText={null}
          accentColor={petTheme.primary}
          loadingText={null}
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
            {discoveryState.error && discoveryState.items.length === 0 ? (
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
                    title="병원을 찾지 못했어요"
                    body="지역명으로 다시 검색해 보세요."
                  />
                )}
              </View>
            ) : (
              <FlatList
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
