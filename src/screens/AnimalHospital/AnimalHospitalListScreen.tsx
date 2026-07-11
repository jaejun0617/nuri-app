import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
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
import {
  selectAnimalHospitalListItems,
  type AnimalHospitalListMode,
} from '../../domains/animalHospital/presentation';
import type { AnimalHospitalPublicHospital } from '../../domains/animalHospital/types';
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
  const [searchInput, setSearchInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const listMode: AnimalHospitalListMode = 'nearby';

  const discoveryState = useAnimalHospitalDiscovery({
    query: submittedQuery,
    open24HoursOnly: false,
    exoticAnimalCareOnly: false,
  });
  const visibleItems = useMemo(
    () => selectAnimalHospitalListItems(discoveryState.items, listMode),
    [discoveryState.items, listMode],
  );
  usePrefetchAnimalHospitalThumbnails(discoveryState.items);
  const selectedPet = useMemo(
    () =>
      pets.find(candidate => candidate.id === selectedPetId) ?? pets[0] ?? null,
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
    setSubmittedQuery(normalized);
  }, [searchInput]);

  const handleChangeSearchInput = useCallback((value: string) => {
    setSearchInput(value);

    if (!value.trim()) {
      setSubmittedQuery('');
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AnimalHospitalPublicHospital }) => (
      <AnimalHospitalCard item={item} onOpenDetail={openDetail} />
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
            style={[
              styles.locationRefreshButtonText,
              { color: petTheme.primary },
            ]}
          >
            새로고침
          </AppText>
        </TouchableOpacity>
      </View>
      {discoveryState.permission === 'granted' &&
      discoveryState.permissionAccuracy === 'approximate' ? (
        <LocationDiscoveryStatusCard
          icon="crosshair"
          title="정확한 위치 권한이 필요해요"
          body="현재 Android가 대략 위치만 허용하고 있어요. 앱에서 정확한 위치를 다시 요청할게요. 계속 대략 위치면 설정에서 정확한 위치를 켜 주세요."
          actionLabel="정확한 위치 요청"
          onPressAction={() => {
            discoveryState
              .requestPreciseRefresh()
              .then(grantedPrecise => {
                if (!grantedPrecise) {
                  Linking.openSettings().catch(() => {});
                }
              })
              .catch(() => {
                Linking.openSettings().catch(() => {});
              });
          }}
        />
      ) : discoveryState.permission === 'granted' &&
        discoveryState.hasWeakLocationSignal ? (
        <LocationDiscoveryStatusCard
          icon="navigation"
          title="GPS 신호가 약해요"
          body="최근 좌표로 먼저 병원을 보여주고 있어요. 실외나 창가에서 새로고침하면 가까운순 정확도가 올라가요."
          actionLabel="새로고침"
          onPressAction={() => {
            discoveryState.refresh().catch(() => {});
          }}
        />
      ) : discoveryState.usingStaleLocation ? (
        <LocationDiscoveryStatusCard
          icon="clock"
          title="최근 위치로 먼저 보여주고 있어요"
          body="새 위치를 확인하는 동안 이전 좌표 기준으로 병원 목록을 유지하고 있어요."
          actionLabel="새로고침"
          onPressAction={() => {
            discoveryState.refresh().catch(() => {});
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
            ) : visibleItems.length === 0 ? (
              <View style={styles.resultsEmptyWrap}>
                <LocationDiscoveryStatusCard
                  icon="search"
                  title="조건에 맞는 병원이 없어요"
                  body="현재 위치 기준 가까운 병원을 다시 확인해 보세요."
                />
              </View>
            ) : (
              <FlatList
                data={visibleItems}
                ListHeaderComponent={listHeader}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                style={styles.resultsList}
                contentContainerStyle={styles.resultsListContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={
                  Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                }
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
