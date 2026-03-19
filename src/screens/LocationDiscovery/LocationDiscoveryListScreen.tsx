import React, { useCallback, useMemo, useState } from 'react';
import {
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import { useLocationDiscovery } from '../../hooks/useLocationDiscovery';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type {
  LocationDiscoveryDomain,
  LocationDiscoveryItem,
  LocationDiscoverySortOption,
} from '../../services/locationDiscovery/types';
import { openMoreDrawer } from '../../store/uiStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  domain: LocationDiscoveryDomain;
};

function getDomainCopy(domain: LocationDiscoveryDomain) {
  if (domain === 'walk') {
    return {
      title: '우리동네 산책 리스트',
      sectionTitle: '주변 산책 추천 코스',
      placeholder: '공원, 산책로, 지역 검색',
      helperText:
        '현재 위치 주변 추천이 기본이며, 검색어를 입력한 뒤 검색 버튼으로 직접 찾을 수 있어요.',
      detailRoute: 'WalkSpotDetail' as const,
    };
  }

  return {
    title: '펫동반 카페 / 공간 찾기',
    sectionTitle: '주변 펫동반 카페 / 공간',
    placeholder: '카페명, 식당명, 지역명, 키워드 검색',
    helperText:
      '현재 위치 주변 추천이 기본이며, 상호명·지역명·애견카페·테라스 같은 키워드로도 찾을 수 있어요.',
      detailRoute: 'PetFriendlyPlaceDetail' as const,
  };
}

export default function LocationDiscoveryListScreen({ domain }: Props) {
  const navigation = useNavigation<Nav>();
  const copy = getDomainCopy(domain);
  const [searchInput, setSearchInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<LocationDiscoverySortOption>('recommended');
  const discoveryState = useLocationDiscovery({
    domain,
    query: submittedQuery,
  });
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
        ? '현재 위치 기준 추천'
        : '최근 확인 위치 기준';
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
  const navigateBackToMore = useCallback(() => {
    navigation.goBack();
    requestAnimationFrame(() => {
      openMoreDrawer();
    });
  }, [navigation]);
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
      <LocationDiscoveryCard item={item} onPress={onPressItem} />
    ),
    [onPressItem],
  );
  const keyExtractor = useCallback(
    (item: LocationDiscoveryItem) => `${domain}:${item.id}`,
    [domain],
  );

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          navigateBackToMore();
          return true;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [navigateBackToMore]),
  );

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.backButton}
            onPress={navigateBackToMore}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
          <AppText preset="headline" style={styles.headerTitle}>
            {copy.title}
          </AppText>
        </View>

        <LocationDiscoverySearchBar
          value={searchInput}
          onChangeText={handleChangeSearchInput}
          onSubmit={handleSubmitSearch}
          placeholder={copy.placeholder}
          helperText={copy.helperText}
          loadingText={
            discoveryState.searching
              ? '검색 중'
              : discoveryState.loading
                ? '불러오는 중'
              : null
          }
        />

        <View style={styles.locationInfoCard}>
          <View style={styles.locationIconWrap}>
            <Feather name="map-pin" size={18} color="#2F8F48" />
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
            style={styles.locationRefreshButton}
            onPress={() => {
              discoveryState.refresh().catch(() => {});
            }}
          >
            <AppText preset="caption" style={styles.locationRefreshButtonText}>
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
                sortOrder === 'recommended' ? styles.sortChipSelected : null,
              ]}
              onPress={() => {
                setSortOrder('recommended');
              }}
            >
              <AppText
                preset="caption"
                style={[
                  styles.sortChipText,
                  sortOrder === 'recommended' ? styles.sortChipTextSelected : null,
                ]}
              >
                추천순
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.sortChip,
                sortOrder === 'distance-asc' ? styles.sortChipSelected : null,
              ]}
              onPress={() => {
                setSortOrder('distance-asc');
              }}
            >
              <AppText
                preset="caption"
                style={[
                  styles.sortChipText,
                  sortOrder === 'distance-asc' ? styles.sortChipTextSelected : null,
                ]}
              >
                가까운순
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.sortChip,
                sortOrder === 'distance-desc' ? styles.sortChipSelected : null,
              ]}
              onPress={() => {
                setSortOrder('distance-desc');
              }}
            >
              <AppText
                preset="caption"
                style={[
                  styles.sortChipText,
                  sortOrder === 'distance-desc' ? styles.sortChipTextSelected : null,
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
              현재는 외부 후보 검색 + 서비스 검증 상태 분리 구조예요
            </AppText>
            <AppText preset="body" style={styles.infoBannerBody}>
              장소 후보는 Kakao Local에서 수집하고, 펫동반 가능 여부는 별도 검증 상태로 표시해요. 자체 Supabase 장소 메타 DB는 아직 없어 방문 전 정책 재확인이 필요해요.
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
                  : '현재 위치 주변 추천을 아직 찾지 못했어요'
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
