import React, { useCallback, useMemo } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import Screen from '../../components/layout/Screen';
import NativeLiteMapPreview from '../../components/maps/NativeLiteMapPreview';
import OptimizedImage from '../../components/images/OptimizedImage';
import { buildAnimalHospitalDetailViewModel } from '../../domains/animalHospital/presentation';
import { createAnimalHospitalDetailStyles } from '../../components/animalHospital/styles';
import { useAnimalHospitalEnrichedItem } from '../../hooks/useAnimalHospitalThumbnail';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { RootScreenRoute } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RootScreenRoute<'AnimalHospitalDetail'>;

function hasValidMapPreviewCoordinate(
  latitude: number | null,
  longitude: number | null,
): boolean {
  if (latitude === null || longitude === null) {
    return false;
  }

  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);

  return (
    !Number.isNaN(numericLatitude) &&
    !Number.isNaN(numericLongitude) &&
    Number.isFinite(numericLatitude) &&
    Number.isFinite(numericLongitude) &&
    numericLatitude >= -90 &&
    numericLatitude <= 90 &&
    numericLongitude >= -180 &&
    numericLongitude <= 180
  );
}

export default function AnimalHospitalDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const theme = useTheme();
  const item = route.params?.item;
  const enrichedItemQuery = useAnimalHospitalEnrichedItem(item ?? null, {
    includeDetails: true,
  });
  const displayItem = enrichedItemQuery.data ?? item ?? null;
  const hasMapPreviewCoordinate = displayItem
    ? hasValidMapPreviewCoordinate(displayItem.latitude, displayItem.longitude)
    : false;
  const canRenderNativeMapPreview =
    hasMapPreviewCoordinate && Platform.OS !== 'android';
  const photoAttributionLabel =
    enrichedItemQuery.overlay?.photoAttributionLabel ?? null;
  const viewModel = useMemo(
    () => (displayItem ? buildAnimalHospitalDetailViewModel(displayItem) : null),
    [displayItem],
  );
  const thumbnailUri = displayItem?.thumbnailUrl ?? null;
  const styles = useMemo(
    () =>
      createAnimalHospitalDetailStyles(
        theme,
        viewModel?.trustTone ?? 'neutral',
      ),
    [theme, viewModel?.trustTone],
  );

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (!displayItem || !viewModel) {
    return (
      <Screen style={styles.screen}>
        <View style={styles.container}>
          <View style={styles.sectionCard}>
            <AppText preset="headline" style={styles.sectionTitle}>
              병원 정보를 찾을 수 없어요
            </AppText>
          </View>
        </View>
      </Screen>
    );
  }

  const callUri = displayItem.links.callUri;
  const mapLink =
    displayItem.links.externalMapUrl ?? displayItem.links.providerPlaceUrl;
  const operatingBadge = displayItem.operatingBadge;
  const operatingBadgeStyle =
    operatingBadge?.kind === 'open24'
      ? styles.operatingBadgeOpen24
      : operatingBadge?.kind === 'open'
        ? styles.operatingBadgeOpen
        : styles.operatingBadgeClosed;
  const operatingBadgeTextStyle =
    operatingBadge?.kind === 'open24'
      ? styles.operatingBadgeTextOpen24
      : operatingBadge?.kind === 'open'
        ? styles.operatingBadgeTextOpen
        : styles.operatingBadgeTextClosed;

  return (
    <Screen style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.heroHeader}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={goBack}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Feather
              name="arrow-left"
              size={20}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32, gap: 18 }}
        >
          <View style={styles.hero}>
            <View style={styles.detailThumbnailMeta}>
              <View style={styles.detailThumbnailWrap}>
                {thumbnailUri ? (
                  <OptimizedImage
                    uri={thumbnailUri}
                    style={styles.detailThumbnail}
                    resizeMode="cover"
                    priority="normal"
                    fallback={false}
                  />
                ) : (
                  <View style={styles.detailThumbnailPlaceholder}>
                    <Feather
                      name="shield"
                      size={24}
                      color={theme.colors.textMuted}
                    />
                  </View>
                )}
              </View>
              {thumbnailUri && photoAttributionLabel ? (
                <AppText preset="caption" style={styles.photoAttributionText}>
                  사진 출처 · {photoAttributionLabel}
                </AppText>
              ) : null}
            </View>

            <View style={styles.heroHeader}>
              <AppText preset="caption" style={styles.eyebrow}>
                우리동네 동물병원
              </AppText>
              <AppText preset="titleSm" style={styles.title}>
                {viewModel.title}
              </AppText>
            </View>

            <View style={styles.trustRow}>
              {operatingBadge ? (
                <View style={[styles.operatingBadge, operatingBadgeStyle]}>
                  <AppText
                    preset="caption"
                    style={[styles.operatingBadgeText, operatingBadgeTextStyle]}
                  >
                    {operatingBadge.label}
                  </AppText>
                </View>
              ) : null}
              <View style={styles.trustBadge}>
                <AppText preset="caption" style={styles.trustBadgeText}>
                  {viewModel.trustLabel}
                </AppText>
              </View>
              <AppText preset="bodySm" style={styles.statusText}>
                {viewModel.statusSummary}
              </AppText>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoBlock}>
              <View style={styles.infoRow}>
                <Feather
                  name="map-pin"
                  size={16}
                  color={theme.colors.textMuted}
                />
                <AppText preset="body" style={styles.infoText}>
                  {viewModel.address}
                </AppText>
              </View>

              <View style={styles.infoRow}>
                <Feather
                  name="navigation"
                  size={16}
                  color={theme.colors.textMuted}
                />
                <AppText preset="body" style={styles.infoText}>
                  {viewModel.distanceLabel}
                </AppText>
              </View>

              <View style={styles.infoRow}>
                <Feather
                  name="phone"
                  size={16}
                  color={theme.colors.textMuted}
                />
                <AppText preset="body" style={styles.infoText}>
                  {viewModel.phoneLabel}
                </AppText>
              </View>

              {viewModel.basisDateLabel ? (
                <View style={styles.infoRow}>
                  <Feather
                    name="calendar"
                    size={16}
                    color={theme.colors.textMuted}
                  />
                  <AppText preset="bodySm" style={styles.subtleText}>
                    {viewModel.basisDateLabel}
                  </AppText>
                </View>
              ) : null}
            </View>

            <View style={styles.ctaRow}>
              {callUri ? (
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.primaryCta}
                  onPress={() => {
                    Linking.openURL(callUri).catch(() => {});
                  }}
                >
                  <AppText preset="body" style={styles.primaryCtaText}>
                    전화하기
                  </AppText>
                </TouchableOpacity>
              ) : null}

              {mapLink ? (
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={callUri ? styles.secondaryCta : styles.primaryCta}
                  onPress={() => {
                    Linking.openURL(mapLink).catch(() => {});
                  }}
                >
                  <AppText
                    preset="body"
                    style={
                      callUri ? styles.secondaryCtaText : styles.primaryCtaText
                    }
                  >
                    {displayItem.links.externalMapUrl ? '길찾기' : '지도에서 보기'}
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.mapSection}>
            <View style={styles.mapSectionHeader}>
              <View style={styles.mapSectionCopy}>
                <AppText preset="headline" style={styles.sectionTitle}>
                  위치
                </AppText>
                <AppText preset="bodySm" style={styles.subtleText}>
                  지도 미리보기에서 위치를 확인하고 길찾기로 이어갈 수 있어요.
                </AppText>
              </View>
              {mapLink ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.mapOpenButton}
                  onPress={() => {
                    Linking.openURL(mapLink).catch(() => {});
                  }}
                >
                  <AppText preset="caption" style={styles.mapOpenButtonText}>
                    열기
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>

            {canRenderNativeMapPreview ? (
              <NativeLiteMapPreview
                latitude={displayItem.latitude}
                longitude={displayItem.longitude}
                title={`${displayItem.name} 위치 미리보기`}
                interactive
              />
            ) : (
              <View style={styles.mapFallbackCard}>
                <Feather
                  name="map-pin"
                  size={20}
                  color={theme.colors.textMuted}
                />
                <AppText preset="bodySm" style={styles.subtleText}>
                  {hasMapPreviewCoordinate
                    ? '위치 정보 준비 중이에요. 길찾기로 외부 지도에서 확인해 주세요.'
                    : '아직 좌표를 가져오지 못해 주소 기준으로 확인해 주세요.'}
                </AppText>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}
