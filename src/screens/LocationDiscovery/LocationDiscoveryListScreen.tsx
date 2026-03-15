import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
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
      placeholder: '장소, 키워드 검색',
      helperText:
        '현재 위치 기준 산책 장소를 먼저 보여드리고, 검색어로도 바로 탐색할 수 있어요.',
      detailRoute: 'WalkSpotDetail' as const,
    };
  }

  return {
    title: '펫동반 카페 / 공간 찾기',
    sectionTitle: '주변 펫동반 카페 / 공간',
    placeholder: '카페, 공간, 지역 검색',
    helperText:
      '현재 위치 주변 펫동반 카페/공간을 먼저 찾고, 상호명이나 지역명으로도 탐색할 수 있어요.',
    detailRoute: 'PetFriendlyPlaceDetail' as const,
  };
}

export default function LocationDiscoveryListScreen({ domain }: Props) {
  const navigation = useNavigation<Nav>();
  const copy = getDomainCopy(domain);
  const [searchInput, setSearchInput] = useState('');
  const [sortOrder, setSortOrder] = useState<'recommended' | 'distance-asc' | 'distance-desc'>(
    'recommended',
  );
  const deferredSearchInput = useDeferredValue(searchInput);
  const discoveryState = useLocationDiscovery({
    domain,
    query: deferredSearchInput,
  });
  const locationTitle = useMemo(() => {
    return (
      discoveryState.scope?.displayLabel ??
      discoveryState.district ??
      '현재 위치를 확인하는 중'
    );
  }, [discoveryState.district, discoveryState.scope?.displayLabel]);
  const locationSubtitle = useMemo(() => {
    return deferredSearchInput.trim().length >= 2
      ? '검색어와 현재 위치를 함께 참고하고 있어요'
      : '현재 위치 기준 추천';
  }, [deferredSearchInput]);
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
  const navigateBackToMore = useCallback(() => {
    navigation.goBack();
    requestAnimationFrame(() => {
      openMoreDrawer();
    });
  }, [navigation]);

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

  const onPressItem = (item: LocationDiscoveryItem) => {
    if (domain === 'walk') {
      navigation.navigate('WalkSpotDetail', {
        item,
        resultItems: sortedItems,
      });
      return;
    }

    navigation.navigate('PetFriendlyPlaceDetail', { item });
  };

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
          onChangeText={setSearchInput}
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

        {domain === 'walk' ? (
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
                  멀리순
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <AppText preset="headline" style={styles.sectionTitle}>
          {copy.sectionTitle}
        </AppText>

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
        ) : domain === 'pet-friendly-place' &&
          discoveryState.verificationStatus !== 'verified' ? (
          <LocationDiscoveryStatusCard
            icon="shield"
            title="검증된 펫동반 데이터 연결이 먼저 필요해요"
            body="현재 Kakao 키워드 검색만으로는 실제 반려동물 동반 가능 여부를 보장할 수 없어, 안전을 위해 결과를 바로 노출하지 않고 있어요. 검증된 제휴/공공데이터 소스를 연결한 뒤 다시 여는 것이 맞습니다."
          />
        ) : sortedItems.length === 0 ? (
          deferredSearchInput.trim().length >= 2 ? (
            <LocationDiscoveryStatusCard
              icon="search"
              title="검색 결과가 없어요"
              body="검색어를 조금 다르게 입력하거나 지역명과 함께 다시 찾아보세요."
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
                '현재 위치 주변 추천을 아직 찾지 못했어요'
              }
              body={
                '현재 위치를 다시 확인하거나 검색으로 직접 장소를 찾아보세요.'
              }
            />
          )
        ) : (
          <FlatList
            data={sortedItems}
            keyExtractor={item => `${domain}:${item.id}`}
            renderItem={({ item }) => (
              <LocationDiscoveryCard item={item} onPress={onPressItem} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets
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
