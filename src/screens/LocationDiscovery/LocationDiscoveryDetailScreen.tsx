import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';

import AppText from '../../app/ui/AppText';
import Screen from '../../components/layout/Screen';
import LocationDiscoveryCard from '../../components/locationDiscovery/LocationDiscoveryCard';
import LocationDiscoveryMapPreview from '../../components/locationDiscovery/LocationDiscoveryMapPreview';
import { styles } from '../../components/locationDiscovery/LocationDiscovery.styles';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  formatDistanceLabel,
  formatDurationLabel,
} from '../../services/locationDiscovery/service';
import { openExternalMap } from '../../services/locationDiscovery/maps';
import type {
  LocationDiscoveryDomain,
  LocationDiscoveryItem,
} from '../../services/locationDiscovery/types';
type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  domain: LocationDiscoveryDomain;
};

export default function LocationDiscoveryDetailScreen({ domain }: Props) {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const params = (route.params as
    | {
        item: LocationDiscoveryItem;
        resultItems?: LocationDiscoveryItem[];
      }
    | undefined);
  const item = params?.item;
  const resultItems = useMemo(
    () => params?.resultItems ?? [],
    [params?.resultItems],
  );
  const [visibleRelatedCount, setVisibleRelatedCount] = useState(6);
  const relatedItems = useMemo(
    () =>
      item
        ? resultItems.filter(candidate => candidate.id !== item.id)
        : [],
    [item, resultItems],
  );
  const visibleRelatedItems = useMemo(
    () => relatedItems.slice(0, visibleRelatedCount),
    [relatedItems, visibleRelatedCount],
  );

  useEffect(() => {
    if (!item) return;
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
                onPress={() => navigation.goBack()}
              >
                <Feather name="arrow-left" size={20} color="#102033" />
              </TouchableOpacity>
            </View>
            <AppText preset="headline" style={styles.headerTitle}>
              상세 정보
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
  const verificationBannerStyle = (() => {
    switch (item.verification.tone) {
      case 'positive':
        return {
          container: styles.verificationBannerPositive,
          title: styles.verificationBannerTitlePositive,
          body: styles.verificationBannerBodyPositive,
        };
      case 'critical':
        return {
          container: styles.verificationBannerCritical,
          title: styles.verificationBannerTitleCritical,
          body: styles.verificationBannerBodyCritical,
        };
      case 'caution':
        return {
          container: styles.verificationBannerCaution,
          title: styles.verificationBannerTitleCaution,
          body: styles.verificationBannerBodyCaution,
        };
      default:
        return {
          container: styles.verificationBannerNeutral,
          title: styles.verificationBannerTitleNeutral,
          body: styles.verificationBannerBodyNeutral,
        };
    }
  })();

  const onPressRelatedItem = (nextItem: LocationDiscoveryItem) => {
    if (domain === 'walk') {
      navigation.push('WalkSpotDetail', {
        item: nextItem,
        resultItems,
      });
      return;
    }

    navigation.push('PetFriendlyPlaceDetail', {
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
                onPress={() => navigation.goBack()}
              >
              <Feather name="arrow-left" size={20} color="#102033" />
            </TouchableOpacity>
          </View>
          <AppText preset="headline" style={styles.headerTitle}>
            {domain === 'walk' ? '산책 장소 상세' : '펫동반 장소 상세'}
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
            <AppText preset="body" style={styles.detailDescription}>
              {item.description}
            </AppText>

            {domain === 'pet-friendly-place' ? (
              <View
                style={[styles.verificationBanner, verificationBannerStyle.container]}
              >
                <AppText
                  preset="caption"
                  style={[
                    styles.verificationBannerTitle,
                    verificationBannerStyle.title,
                  ]}
                >
                  {item.verification.label}
                </AppText>
                <AppText
                  preset="body"
                  style={[styles.verificationBannerBody, verificationBannerStyle.body]}
                >
                  {item.verification.description}
                </AppText>
              </View>
            ) : null}

            <View style={styles.detailMetaGrid}>
              <View style={styles.detailMetaRow}>
                <Feather name="layers" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  출처: {item.source.providerLabel}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="shield" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  검증 상태: {item.verification.label}
                </AppText>
              </View>
              {domain === 'pet-friendly-place' ? (
                <View style={styles.detailMetaRow}>
                  <Feather name="info" size={15} color="#7B8597" />
                  <AppText preset="body" style={styles.detailMetaText}>
                    검증 근거: {item.verification.sourceLabel}
                  </AppText>
                </View>
              ) : null}
              <View style={styles.detailMetaRow}>
                <Feather name="map-pin" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  {item.address}
                </AppText>
              </View>
              <View style={styles.detailMetaRow}>
                <Feather name="crosshair" size={15} color="#7B8597" />
                <AppText preset="body" style={styles.detailMetaText}>
                  좌표 {item.coordinateLabel}
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
              {item.operatingStatusLabel ? (
                <View style={styles.detailMetaRow}>
                  <Feather name="clock" size={15} color="#7B8597" />
                  <AppText preset="body" style={styles.detailMetaText}>
                    {item.operatingStatusLabel}
                  </AppText>
                </View>
              ) : null}
              {item.petPolicy.detail ? (
                <View style={styles.detailMetaRow}>
                  <Feather name="info" size={15} color="#7B8597" />
                  <AppText preset="body" style={styles.detailMetaText}>
                    {item.petPolicy.detail}
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText preset="caption" style={styles.relatedSectionCaption}>
              거리 기준: {item.distanceLabel}
            </AppText>

            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.primaryActionButton}
                onPress={() => {
                  openExternalMap({
                    label: item.name,
                    latitude: item.latitude,
                    longitude: item.longitude,
                  }).catch(() => {
                    Alert.alert('지도를 열지 못했어요', '잠시 후 다시 시도해 주세요.');
                  });
                }}
              >
                <AppText preset="body" style={styles.primaryActionButtonText}>
                  지도 보기
                </AppText>
              </TouchableOpacity>

              {item.placeUrl ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.secondaryActionButton}
                  onPress={() => {
                    Linking.openURL(item.placeUrl!).catch(() => {
                      Alert.alert('상세 링크를 열지 못했어요', '잠시 후 다시 시도해 주세요.');
                    });
                  }}
                >
                  <AppText preset="body" style={styles.secondaryActionButtonText}>
                    장소 링크
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <LocationDiscoveryMapPreview
            uri={item.mapPreviewUrl}
            title={`${item.name} 지도 미리보기`}
          />

          {visibleRelatedItems.length > 0 ? (
            <View style={styles.relatedSection}>
              <View style={styles.relatedSectionHeader}>
                <AppText preset="headline" style={styles.relatedSectionTitle}>
                  {domain === 'walk' ? '주변 산책 장소' : '연관 펫동반 장소'}
                </AppText>
                <AppText preset="caption" style={styles.relatedSectionCaption}>
                  현재 결과 컬렉션에서 이어서 둘러볼 수 있어요
                </AppText>
              </View>

              <View style={styles.relatedList}>
                {visibleRelatedItems.map(relatedItem => (
                  <LocationDiscoveryCard
                    key={`${domain}-related:${relatedItem.id}`}
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
