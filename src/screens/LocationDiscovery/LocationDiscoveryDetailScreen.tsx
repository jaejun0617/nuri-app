import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import ExpandableBodyText from '../../components/common/ExpandableBodyText';
import Screen from '../../components/layout/Screen';
import NativeLiteMapPreview from '../../components/maps/NativeLiteMapPreview';
import LocationDiscoveryCard from '../../components/locationDiscovery/LocationDiscoveryCard';
import { styles } from '../../components/locationDiscovery/LocationDiscovery.styles';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';
import {
  formatDistanceLabel,
  formatDurationLabel,
} from '../../services/locationDiscovery/service';
import { openExternalMap } from '../../services/locationDiscovery/maps';
import type { LocationDiscoveryItem } from '../../services/locationDiscovery/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RootScreenRoute<'WalkSpotDetail'>;

export default function LocationDiscoveryDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const item = route.params?.item;
  const resultItems = useMemo(
    () => route.params?.resultItems ?? [],
    [route.params?.resultItems],
  );
  const [visibleRelatedCount, setVisibleRelatedCount] = useState(6);

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          goBack();
          return true;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [goBack]),
  );

  const relatedItems = useMemo(
    () => (item ? resultItems.filter(candidate => candidate.id !== item.id) : []),
    [item, resultItems],
  );
  const visibleRelatedItems = useMemo(
    () => relatedItems.slice(0, visibleRelatedCount),
    [relatedItems, visibleRelatedCount],
  );

  useEffect(() => {
    if (!item) {
      return;
    }

    setVisibleRelatedCount(6);
  }, [item]);

  if (!item) {
    return (
      <Screen style={styles.screen}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSideSlot}>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.backButton}
                onPress={goBack}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Feather name="arrow-left" size={20} color="#102033" />
              </TouchableOpacity>
            </View>
            <AppText preset="headline" style={styles.headerTitle}>
              산책 장소 상세
            </AppText>
            <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
          </View>
          <View style={styles.emptyCard}>
            <AppText preset="headline" style={styles.emptyTitle}>
              장소 정보를 찾을 수 없어요
            </AppText>
          </View>
        </View>
      </Screen>
    );
  }

  const durationLabel = formatDurationLabel(item.estimatedMinutes);

  const onPressRelatedItem = (nextItem: LocationDiscoveryItem) => {
    navigation.push('WalkSpotDetail', {
      item: nextItem,
      resultItems,
    });
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSideSlot}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.backButton}
            onPress={goBack}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Feather name="arrow-left" size={20} color="#102033" />
          </TouchableOpacity>
          </View>
          <AppText preset="headline" style={styles.headerTitle}>
            산책 장소 상세
          </AppText>
          <View style={[styles.headerSideSlot, styles.headerSideSlotRight]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailScrollContent}
        >
          <View style={styles.detailHero}>
            <AppText preset="caption" style={styles.detailCategory}>
              {item.categoryLabel}
            </AppText>
            <AppText preset="headline" style={styles.detailTitle}>
              {item.name}
            </AppText>

            <View style={styles.detailMetaGrid}>
              <View style={styles.detailMetaRow}>
                <Feather name="map-pin" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  {item.address}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="navigation" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  {formatDistanceLabel(item.distanceMeters)}
                </AppText>
              </View>
              {durationLabel ? (
                <View style={styles.detailMetaRow}>
                  <Feather name="clock" size={15} color="#7B8597" />
                  <AppText preset="body" style={styles.detailMetaText}>
                    {durationLabel}
                  </AppText>
                </View>
              ) : null}
            </View>

            <ExpandableBodyText
              text={item.description}
              textStyle={styles.detailDescription}
            />

            <View style={styles.detailActionRow}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.primaryActionButton}
                onPress={() => {
                  openExternalMap({
                    latitude: item.latitude,
                    longitude: item.longitude,
                    label: item.name,
                  }).catch(() => {});
                }}
              >
                <AppText preset="body" style={styles.primaryActionButtonText}>
                  지도 보기
                </AppText>
              </TouchableOpacity>
              {item.placeUrl ? (
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.secondaryActionButton}
                  onPress={() => {
                    Linking.openURL(item.placeUrl!).catch(() => {});
                  }}
                >
                  <AppText preset="body" style={styles.secondaryActionButtonText}>
                    장소 링크
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <NativeLiteMapPreview
            latitude={item.latitude}
            longitude={item.longitude}
            title={`${item.name} 지도 미리보기`}
            overlayText={null}
          />

          {visibleRelatedItems.length > 0 ? (
            <View style={styles.relatedSection}>
              <View style={styles.relatedSectionHeader}>
                <AppText preset="headline" style={styles.relatedSectionTitle}>
                  주변 산책 장소
                </AppText>
              </View>

              <View style={styles.relatedList}>
                {visibleRelatedItems.map(relatedItem => (
                  <LocationDiscoveryCard
                    key={`walk-related:${relatedItem.id}`}
                    item={relatedItem}
                    onPress={onPressRelatedItem}
                  />
                ))}
              </View>
              {visibleRelatedItems.length < relatedItems.length ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.secondaryActionButton}
                  onPress={() => {
                    setVisibleRelatedCount(current => current + 6);
                  }}
                >
                  <AppText preset="body" style={styles.secondaryActionButtonText}>
                    더보기
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Screen>
  );
}
